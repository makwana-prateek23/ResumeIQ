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

test('keeps mixed-case custom sections out of the preceding standard section', () => {
  const text = `Jordan Lee
Product Designer
New York, NY | jordan@example.com
Professional Summary
Designs accessible enterprise products.
Work Experience
Senior Product Designer at Acme
Jan 2022 - Present
- Led the design system.
Awards
2025 Product Design Award
Languages
English, Spanish
Technical Skills
Figma, research, prototyping`;

  const parsed = parseResume(text);
  const editor = buildEditorResume(parsed);

  assert.doesNotMatch(parsed.sections.experience, /Product Design Award|English, Spanish|Figma/);
  assert.equal(editor.name, 'Jordan Lee');
  assert.equal(editor.role, 'Product Designer');
  assert.deepEqual(editor.importedSections.map(({ title }) => title), [
    'Professional Summary', 'Work Experience', 'Awards', 'Languages', 'Technical Skills'
  ]);
  assert.equal(editor.importedSections.find(({ title }) => title === 'Awards').content, '2025 Product Design Award');
  assert.equal(editor.importedSections.find(({ title }) => title === 'Languages').content, 'English, Spanish');
});

test('preserves imported line indentation and keyword order', () => {
  const editor = buildEditorResume(parseResume(`Alex Morgan
Technical Skills
Languages: JavaScript, TypeScript
    Frameworks: React, Express
Experience
Developer at Example Corp
  - Built accessible React applications`));

  assert.equal(
    editor.importedSections.find(({ title }) => title === 'Technical Skills').content,
    'Languages: JavaScript, TypeScript\n    Frameworks: React, Express'
  );
  assert.match(
    editor.importedSections.find(({ title }) => title === 'Experience').content,
    /\n  - Built accessible React applications$/
  );
});

test('detects unknown title-case sections and preserves spacing and source order', () => {
  const editor = buildEditorResume(parseResume(`Taylor Reed
Data Analyst
taylor@example.com

Professional Summary
Turns complex data into clear decisions.

Selected Engagements
Client migration
  Preserved nested detail

  Second paragraph after an intentional blank line.

Technical Skills
SQL, Tableau`));

  const custom = editor.importedSections.find(({ title }) => title === 'Selected Engagements');
  assert.ok(custom);
  assert.equal(custom.content, 'Client migration\n  Preserved nested detail\n\n  Second paragraph after an intentional blank line.');
  assert.deepEqual(editor.sectionOrder, ['summary', custom.id, 'skills']);
});

test('adds every recognized non-standard section to the imported document model', () => {
  const editor = buildEditorResume(parseResume(`Morgan Chen
Engineer

EXPERIENCE
Engineer at Example
- Shipped a reliable service.

PATENTS
Adaptive workflow system, 2024

COMMUNITY INVOLVEMENT
Volunteer mentor`));

  assert.deepEqual(editor.importedSections.map(({ title }) => title), [
    'EXPERIENCE', 'PATENTS', 'COMMUNITY INVOLVEMENT'
  ]);
  assert.deepEqual(editor.sectionOrder, ['experience', 'imported-2', 'imported-3']);
});
