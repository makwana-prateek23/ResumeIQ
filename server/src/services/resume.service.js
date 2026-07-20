import { PDFParse } from 'pdf-parse';

const SKILLS = [
  'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'express',
  'python', 'java', 'c#', 'c++', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
  'html', 'css', 'tailwind', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'git',
  'rest api', 'graphql', 'microservices', 'machine learning', 'data analysis',
  'pandas', 'numpy', 'pytorch', 'tensorflow', 'power bi', 'tableau', 'excel',
  'agile', 'scrum', 'jira', 'figma', 'communication', 'leadership'
];

const SECTION_ALIASES = {
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'career summary'],
  experience: ['experience', 'work experience', 'employment', 'professional experience'],
  projects: ['projects', 'personal projects', 'selected projects'],
  education: ['education', 'academic background'],
  certifications: ['certifications', 'certificates', 'licenses'],
  skills: ['skills', 'technical skills', 'core competencies']
};

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`, 'i').test(text);
}

export function extractSkills(text) {
  const normalized = normalize(text);
  return SKILLS.filter((skill) => containsTerm(normalized, skill));
}

function extractSection(text, aliases) {
  const lines = text.split(/\r?\n/);
  const headings = Object.values(SECTION_ALIASES).flat();
  const start = lines.findIndex((line) => aliases.includes(normalize(line).replace(/:$/, '')));
  if (start < 0) return '';
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const candidate = normalize(lines[index]).replace(/:$/, '');
    if (headings.includes(candidate)) break;
    body.push(lines[index]);
  }
  return body.join('\n').trim();
}

function extractExperienceYears(text) {
  const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const values = [...text.matchAll(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\+)?\s*(?:years?|yrs?)\b/gi)]
    .map((match) => Number(match[1]) || numberWords[match[1].toLowerCase()])
    .filter((value) => value <= 50);
  return values.length ? Math.max(...values) : 0;
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function parseDateToken(token, isEnd = false) {
  if (/^(present|current|now)$/i.test(token.trim())) {
    const now = new Date();
    return now.getUTCFullYear() * 12 + now.getUTCMonth();
  }
  const year = Number(token.match(/(?:19|20)\d{2}/)?.[0]);
  if (!year) return null;
  const monthName = token.trim().slice(0, 3).toLowerCase();
  const month = MONTHS[monthName] ?? (isEnd ? 11 : 0);
  return year * 12 + month;
}

export function calculateExperienceFromDates(text) {
  const dateToken = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)?\\s*(?:19|20)\\d{2}';
  const rangePattern = new RegExp(`(${dateToken})\\s*(?:-|\\u2013|\\u2014|to)\\s*(Present|Current|Now|${dateToken})`, 'gi');
  const ranges = [...text.matchAll(rangePattern)].map((match) => ({
    start: parseDateToken(match[1]),
    end: parseDateToken(match[2], true),
    source: match[0]
  })).filter((range) => range.start !== null && range.end !== null && range.end >= range.start);

  if (!ranges.length) return { years: 0, totalMonths: 0, ranges: [], method: 'notDetected' };
  const sorted = ranges.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end + 1) previous.end = Math.max(previous.end, range.end);
    else merged.push({ start: range.start, end: range.end });
  }
  const totalMonths = merged.reduce((sum, range) => sum + range.end - range.start + 1, 0);
  return { years: Number((totalMonths / 12).toFixed(1)), totalMonths, ranges: ranges.map((range) => range.source), method: 'employmentDates' };
}

export async function extractResumeText(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw Object.assign(new Error('The uploaded file is not a valid PDF'), { status: 415 });
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (result.total > 30) {
      throw Object.assign(new Error('Resume PDFs cannot exceed 30 pages'), { status: 422 });
    }
    const text = result.text?.replace(/\u0000/g, '').trim();
    if (!text || text.length < 30) {
      throw Object.assign(new Error('The PDF contains no readable text'), { status: 422 });
    }
    return text.slice(0, 100_000);
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('The PDF could not be processed'), { status: 422 });
  } finally {
    await parser.destroy().catch(() => {});
  }
}

export function parseResume(text) {
  const sections = Object.fromEntries(
    Object.entries(SECTION_ALIASES).map(([name, aliases]) => [name, extractSection(text, aliases)])
  );
  const dateExperience = calculateExperienceFromDates(sections.experience);
  const explicitExperience = extractExperienceYears(sections.experience || text);
  const experienceYears = dateExperience.years || explicitExperience;
  return {
    text,
    normalizedText: normalize(text),
    skills: extractSkills(text),
    experienceYears,
    experienceCalculation: dateExperience.years
      ? dateExperience
      : { years: explicitExperience, totalMonths: explicitExperience * 12, ranges: [], method: explicitExperience ? 'explicitStatement' : 'notDetected' },
    sections,
    sectionsFound: Object.entries(sections).filter(([, value]) => value).map(([name]) => name)
  };
}
