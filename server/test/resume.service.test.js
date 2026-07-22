import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEditorResume, parseResume } from '../src/services/resume.service.js';

test('preserves imported section content and extracts professional links', () => {
  const text = `Jordan Lee
Software Engineer
Boston, MA • jordan@example.com • linkedin.com/in/jordan • github.com/jordan • jordan.dev
PROFESSIONAL SUMMARY
Builds reliable products without rewriting source content.
PROJECTS
Project Atlas — github.com/jordan/atlas
Kept this custom project description.
CERTIFICATIONS
Cloud Certification — 2025`;

  const editor = buildEditorResume(parseResume(text));

  assert.equal(editor.linkedin, 'linkedin.com/in/jordan');
  assert.equal(editor.github, 'github.com/jordan');
  assert.equal(editor.website, 'jordan.dev');
  assert.deepEqual(editor.importedSections.map(({ title, content }) => ({ title, content })), [
    { title: 'PROFESSIONAL SUMMARY', content: 'Builds reliable products without rewriting source content.' },
    { title: 'PROJECTS', content: 'Project Atlas — github.com/jordan/atlas\nKept this custom project description.' },
    { title: 'CERTIFICATIONS', content: 'Cloud Certification — 2025' }
  ]);
});
