import assert from 'node:assert/strict';
import test from 'node:test';
import { customSectionLines } from '../src/utils/resume-sections.js';

test('normalizes symbol-font and garbled PDF bullets without changing wording', () => {
  for (const prefix of ['\uf0b7', '\uf0a7', '\uf02e', '\uf0fc', '\ufeff\uf02e', '\u200b\uf0b7', '\u00f0.', '\u00f0\u00b7', '\u00e2\u20ac\u00a2', '•', '- ']) {
    assert.deepEqual(customSectionLines(`${prefix} Coordinated project plans, improving reporting by 25%.`), [{ bullet: true, text: 'Coordinated project plans, improving reporting by 25%.' }]);
  }
});
test('preserves project titles, continuation lines, blank lines, and punctuation', () => {
  assert.deepEqual(customSectionLines('Enterprise Reporting\n  Continued description\n\n-20% cost'), [
    { bullet: false, text: 'Enterprise Reporting' },
    { bullet: false, text: '  Continued description' },
    { bullet: false, text: '' },
    { bullet: false, text: '-20% cost' }
  ]);
});
