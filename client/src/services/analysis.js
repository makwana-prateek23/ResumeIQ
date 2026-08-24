import api from './api.js';

export function analyzeResume(resume, jobDescription, companyName = '') {
  const formData = new FormData();
  formData.append('resume', resume);
  formData.append('jobDescription', jobDescription);
  formData.append('companyName', companyName);
  return api.post('/analysis', formData);
}

export function extractResume(resume) {
  const formData = new FormData();
  formData.append('resume', resume);
  return api.post('/analysis/extract', formData);
}

export function checkResumeAts(resume, consentToStore = false) {
  const formData = new FormData();
  formData.append('resume', resume);
  formData.append('consentToStore', String(consentToStore));
  return api.post('/analysis/ats-check', formData);
}
