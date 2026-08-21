import api from './api.js';

export function analyzeResume(resume, jobDescription) {
  const formData = new FormData();
  formData.append('resume', resume);
  formData.append('jobDescription', jobDescription);
  return api.post('/analysis', formData);
}

export function extractResume(resume) {
  const formData = new FormData();
  formData.append('resume', resume);
  return api.post('/analysis/extract', formData);
}

export function checkResumeAts(resume) {
  const formData = new FormData();
  formData.append('resume', resume);
  return api.post('/analysis/ats-check', formData);
}
