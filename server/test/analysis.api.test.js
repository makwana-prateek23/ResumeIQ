import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/app.js';

async function withServer(callback) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('requires a PDF or Word resume', async () => {
  await withServer(async (baseUrl) => {
    const form = new FormData();
    form.append('jobDescription', 'A'.repeat(120));
    const response = await fetch(`${baseUrl}/api/analysis`, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'A PDF or Word (.docx) resume is required');
  });
});

test('rejects a spoofed Word document using its file signature', async () => {
  await withServer(async (baseUrl) => {
    const form = new FormData();
    form.append('jobDescription', 'Software engineering role requiring React and Node.js. '.repeat(4));
    form.append('resume', new Blob(['not really a docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'resume.docx');
    const response = await fetch(`${baseUrl}/api/analysis`, { method: 'POST', body: form });
    assert.equal(response.status, 415);
    assert.equal((await response.json()).error, 'The uploaded file is not a valid Word document');
  });
});

test('rejects a spoofed PDF using its file signature', async () => {
  await withServer(async (baseUrl) => {
    const form = new FormData();
    form.append('jobDescription', 'Software engineering role requiring React and Node.js. '.repeat(4));
    form.append('resume', new Blob(['not really a pdf'], { type: 'application/pdf' }), 'resume.pdf');
    const response = await fetch(`${baseUrl}/api/analysis`, { method: 'POST', body: form });
    assert.equal(response.status, 415);
    assert.equal((await response.json()).error, 'The uploaded file is not a valid PDF');
  });
});

test('allows a valid Chrome extension origin through CORS', async () => {
  await withServer(async (baseUrl) => {
    const origin = 'chrome-extension://gbmiehmhaoeoibkcoapajaebeipakjjf';
    const response = await fetch(`${baseUrl}/api/analysis`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  });
});
