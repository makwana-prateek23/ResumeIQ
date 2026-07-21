import { z } from 'zod';
import { analyzeMatch } from '../services/ats.service.js';
import { buildEditorResume, extractResumeText, parseResume } from '../services/resume.service.js';

const requestSchema = z.object({
  jobDescription: z.string().trim().min(100)
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

  return res.status(200).json({
    ...analysis,
    resume: {
      skills: resume.skills,
      experienceYears: resume.experienceYears,
      experienceCalculation: resume.experienceCalculation,
      sectionsFound: resume.sectionsFound,
      editorData: buildEditorResume(resume)
    }
  });
}
