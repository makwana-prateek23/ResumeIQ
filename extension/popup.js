const API_URL = 'https://resumeiq-y88i.onrender.com/api/analysis';
const jobDescription = document.querySelector('#jobDescription');
const resume = document.querySelector('#resume');
const error = document.querySelector('#error');
const analyze = document.querySelector('#analyze');

document.querySelector('#extract').addEventListener('click', async () => {
  error.textContent = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selected = window.getSelection()?.toString().trim();
        if (selected?.length >= 100) return selected;
        const selectors = ['[data-testid*="job"]', '[class*="job-description"]', '[class*="jobDescription"]', 'article', 'main'];
        const candidates = selectors.flatMap((selector) => [...document.querySelectorAll(selector)])
          .map((element) => element.innerText?.trim())
          .filter((text) => text && text.length >= 100)
          .sort((a, b) => b.length - a.length);
        return candidates[0] || '';
      }
    });
    if (!result) throw new Error('Select the job description on the page, then try again.');
    jobDescription.value = result;
  } catch (failure) {
    error.textContent = failure.message || 'Could not read this page. Paste the job description instead.';
  }
});

function renderTags(target, values) {
  target.replaceChildren(...(values.length ? values : ['None']).map((value) => {
    const tag = document.createElement('span');
    tag.textContent = value;
    return tag;
  }));
}

analyze.addEventListener('click', async () => {
  error.textContent = '';
  document.querySelector('#results').hidden = true;
  const file = resume.files[0];
  if (!file || !/\.(pdf|docx)$/i.test(file.name)) return void (error.textContent = 'Choose a PDF or DOCX resume.');
  if (file.size > 5 * 1024 * 1024) return void (error.textContent = 'Resume must be 5 MB or smaller.');
  if (jobDescription.value.trim().length < 100) return void (error.textContent = 'Job description must contain at least 100 characters.');
  analyze.disabled = true;
  analyze.textContent = 'Analyzing...';
  try {
    const form = new FormData();
    form.append('resume', file);
    form.append('jobDescription', jobDescription.value.trim());
    const response = await fetch(API_URL, { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');
    document.querySelector('#score').textContent = `${data.roleSuitability?.score ?? data.overallScore}%`;
    renderTags(document.querySelector('#missing'), data.missingSkills || []);
    document.querySelector('#results').hidden = false;
  } catch (failure) {
    error.textContent = failure.message || 'Analysis failed.';
  } finally {
    analyze.disabled = false;
    analyze.textContent = 'Analyze match';
  }
});
