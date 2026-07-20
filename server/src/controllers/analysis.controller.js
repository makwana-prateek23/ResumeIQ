import { z } from 'zod';
import { analyzeMatch } from '../services/ats.service.js';
import { extractResumeText, parseResume } from '../services/resume.service.js';

const requestSchema = z.object({
  jobDescription: z.string().trim().min(100).max(20_000)
});

export async function analyzeResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'A resume PDF is required' });
  }

  const validation = requestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Job description must contain between 100 and 20,000 characters'
    });
  }

  const resumeText = await extractResumeText(req.file.buffer);
  const resume = parseResume(resumeText);
  const analysis = analyzeMatch(resume, validation.data.jobDescription);

  return res.status(200).json({
    ...analysis,
    resume: {
      skills: resume.skills,
      experienceYears: resume.experienceYears,
      experienceCalculation: resume.experienceCalculation,
      sectionsFound: resume.sectionsFound
    }
  });
}
