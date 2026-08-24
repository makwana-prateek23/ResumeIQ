import { z } from 'zod';
import { analyzeMatch, analyzeResumeAts } from '../services/ats.service.js';
import { findRelevantCompanyBenchmarks, saveConsentedAtsProfile, saveJobBenchmark } from '../services/benchmark.service.js';
import { buildEditorResume, extractResumeText, parseResume } from '../services/resume.service.js';

const requestSchema = z.object({
  jobDescription: z.string().trim().min(100),
  companyName: z.string().trim().max(120).optional().default('')
});

async function parseUploadedResume(req) {
  if (!req.file) throw Object.assign(new Error('A PDF or Word (.docx) resume is required'), { status: 400 });
  const resumeText = await extractResumeText(req.file.buffer, { filename: req.file.originalname, mimetype: req.file.mimetype });
  return parseResume(resumeText);
}

export async function extractResumeForEditor(req, res) {
  const resume = await parseUploadedResume(req);
  return res.status(200).json({ editorData: buildEditorResume(resume), sectionsFound: resume.sectionsFound });
}

export async function analyzeResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'A PDF or Word (.docx) resume is required' });
  }

  const validation = requestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Job description must contain at least 100 characters'
    });
  }

  const resume = await parseUploadedResume(req);
  const analysis = analyzeMatch(resume, validation.data.jobDescription);
  const benchmarkStorage = await saveJobBenchmark({
    companyName: validation.data.companyName,
    jobDescription: validation.data.jobDescription,
    analysis,
    userId: req.user._id
  });

  return res.status(200).json({
    ...analysis,
    benchmarkStorage,
    resume: {
      skills: resume.skills,
      experienceYears: resume.experienceYears,
      experienceCalculation: resume.experienceCalculation,
      sectionsFound: resume.sectionsFound,
      editorData: buildEditorResume(resume)
    }
  });
}

export async function checkResumeAts(req, res) {
  const resume = await parseUploadedResume(req);
  const analysis = analyzeResumeAts(resume);
  const editorData = buildEditorResume(resume);
  const consentToStore = req.body.consentToStore === 'true';
  let profileStorage = { saved: false, reason: consentToStore ? 'Storage is unavailable.' : 'Consent was not provided.' };
  let companyCompatibility = [];

  if (consentToStore) {
    try {
      profileStorage = await saveConsentedAtsProfile({ editorData, analysis });
    } catch {
      profileStorage = { saved: false, reason: 'The score was completed, but the profile could not be saved.' };
    }
  }

  try {
    const benchmarks = await findRelevantCompanyBenchmarks(editorData.role);
    const grouped = benchmarks.reduce((groups, benchmark) => {
      const postings = groups.get(benchmark.companyName) || [];
      postings.push(benchmark);
      groups.set(benchmark.companyName, postings);
      return groups;
    }, new Map());
    companyCompatibility = [...grouped.entries()].map(([companyName, postings]) => {
      const matches = postings.slice(0, 5).map((posting) => analyzeMatch(resume, posting.jobDescription));
      const score = Math.round(matches.reduce((sum, match) => sum + match.overallScore, 0) / matches.length);
      const missingRequirements = [...new Set(matches.flatMap((match) => match.missingKeywords))].slice(0, 8);
      const requiredChanges = [...new Set(matches.flatMap((match) => match.suggestions))].slice(0, 5);
      return { companyName, targetRole: editorData.role, score, benchmarkCount: matches.length, missingRequirements, requiredChanges };
    }).sort((a, b) => b.score - a.score);
  } catch {
    companyCompatibility = [];
  }

  return res.status(200).json({
    ...analysis,
    profileStorage,
    companyCompatibility,
    resume: {
      skills: resume.skills,
      experienceYears: resume.experienceYears,
      sectionsFound: resume.sectionsFound,
      editorData
    }
  });
}
