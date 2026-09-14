import assert from 'node:assert/strict';
import test from 'node:test';
import { tailorWithGemini } from '../src/services/gemini.service.js';

const input = {
  jobDescription: 'Seeking a software engineer with React and Node.js experience to develop accessible interfaces, maintain APIs, and collaborate with designers.',
  resume: { role: 'Engineer', summary: 'Engineer building React interfaces.', skills: 'React, Node.js', experience: [{ role: 'Engineer', company: 'Example', start: '2022', end: 'Present', bullets: ['Built React interfaces and reduced load times by 20%.'] }], education: [], customSections: [], email: 'private@example.com' }
};
const result = { summary: 'Engineer focused on React interfaces.', experience: [{ index: 0, bullets: ['Reduced load times by 20% while building React interfaces.'] }], strengths: ['React experience'], gaps: ['Accessibility experience not stated'], changes: ['Emphasized React work'] };
const respond = (value) => async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }) });

test('returns validated edits and excludes contact fields from provider input', async () => {
  let request;
  const output = await tailorWithGemini(input, { apiKey: 'test-key', fetchImpl: async (_url, options) => { request = options; return respond(result)(); } });
  assert.deepEqual(output.experience, result.experience);
  assert.equal(request.body.includes('private@example.com'), false);
  assert.equal(request.headers['x-goog-api-key'], 'test-key');
  assert.equal(output.email, undefined);
});
test('rejects invented metrics and changed experience indexes', async () => {
  for (const experience of [[{ index: 0, bullets: ['Improved performance by 99%.'] }], [{ index: 1, bullets: ['Built interfaces.'] }]]) {
    await assert.rejects(tailorWithGemini(input, { apiKey: 'test', fetchImpl: respond({ ...result, experience }) }), /unsupported rewrite/);
  }
});
test('rejects malformed output, blocked and truncated responses', async () => {
  await assert.rejects(tailorWithGemini(input, { apiKey: 'test', fetchImpl: respond({ summary: 'Incomplete' }) }), /unsupported rewrite/);
  await assert.rejects(tailorWithGemini(input, { apiKey: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS' }] }) }) }), /unsupported rewrite/);
});
test('quota and missing-key failures are actionable', async () => {
  await assert.rejects(tailorWithGemini(input, { apiKey: '' }), /not configured/);
  await assert.rejects(tailorWithGemini(input, { apiKey: 'test', fetchImpl: async () => ({ ok: false, status: 429 }) }), /quota/);
});
test('rejects empty resumes before calling Gemini', async () => {
  await assert.rejects(tailorWithGemini({ ...input, resume: { ...input.resume, summary: '', skills: '', experience: [] } }, { apiKey: 'test', fetchImpl: () => { throw new Error('Must not call provider'); } }), /Upload a resume/);
});

test('distinguishes invalid credentials from permission and request errors', async () => {
  for (const [status, message] of [[401, /rejected the API credentials/], [403, /denied access/], [400, /could not accept the request/]]) {
    await assert.rejects(tailorWithGemini(input, { apiKey: 'test', fetchImpl: async () => ({ ok: false, status }) }), message);
  }
});
