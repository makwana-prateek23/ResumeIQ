// Word symbol-font bullets can survive extraction as private-use characters or
// mojibake. Keep the source draft intact; normalize only the rendered prefix.
const bulletPrefix = /^\s*(?:[\u2022\u25aa\u25ab\u25cf\u25cb\u25e6\u2023\u2043\u2219\u00b7\ue000-\uf8ff]|\u00f0[\u002e\u00b7\u00a7\u00d8]|\u00ef\u0082\u00b7|\u00e2\u20ac\u00a2|[-*](?=\s))\s*/;

export function cleanImportedSymbols(value) {
  // Invisible PDF layout controls and orphaned symbol-font glyphs cannot be
  // encoded by the standard PDF fonts. A single such glyph can make jsPDF
  // encode the whole line as UTF-16, corrupting otherwise ordinary Latin text.
  return String(value).replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '');
}

export function customSectionLines(content = '') {
  return String(content).split(/\r?\n/).map((line) => {
    const cleaned = cleanImportedSymbols(line);
    const match = cleaned.match(bulletPrefix);
    return { bullet: Boolean(match), text: match ? cleaned.slice(match[0].length).trim() : cleaned };
  });
}
