import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

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

const GENERIC_SECTION_NAMES = new Set([
  ...Object.values(SECTION_ALIASES).flat(), 'awards', 'achievements', 'languages',
  'volunteer experience', 'volunteering', 'publications', 'interests', 'activities'
]);

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

function cleanExtractedText(text, fileType) {
  const cleaned = text?.replace(/\u0000/g, '').trim();
  if (!cleaned || cleaned.length < 30) {
    throw Object.assign(new Error(`The ${fileType} contains no readable text`), { status: 422 });
  }
  return cleaned.slice(0, 100_000);
}

async function extractPdfText(buffer) {
  if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw Object.assign(new Error('The uploaded file is not a valid PDF'), { status: 415 });
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    if (result.total > 30) {
      throw Object.assign(new Error('Resume PDFs cannot exceed 30 pages'), { status: 422 });
    }
    return cleanExtractedText(result.text, 'PDF');
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('The PDF could not be processed'), { status: 422 });
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocxText(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw Object.assign(new Error('The uploaded file is not a valid Word document'), { status: 415 });
  }
  try {
    const result = await mammoth.extractRawText({ buffer });
    return cleanExtractedText(result.value, 'Word document');
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('The Word document could not be processed'), { status: 422 });
  }
}

export async function extractResumeText(buffer, file = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw Object.assign(new Error('The uploaded resume is invalid'), { status: 415 });
  }
  const filename = file.filename?.toLowerCase() ?? '';
  if (filename.endsWith('.pdf') || file.mimetype === 'application/pdf') return extractPdfText(buffer);
  if (filename.endsWith('.docx') || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return extractDocxText(buffer);
  throw Object.assign(new Error('Only PDF and Word (.docx) files are allowed'), { status: 415 });
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

function nonEmptyLines(value = '') {
  return value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !/^--?\s*\d+\s+of\s+\d+(?:\s*--)?$/i.test(line));
}

function extractDocumentSections(text) {
  const lines = nonEmptyLines(text);
  const sections = [];
  let current = null;
  for (const line of lines) {
    const normalized = normalize(line).replace(/:$/, '');
    const looksLikeHeading = GENERIC_SECTION_NAMES.has(normalized)
      || (/^[A-Z][A-Z &/+-]{2,40}:?$/.test(line) && !line.includes('@'));
    if (looksLikeHeading) {
      current = { id: `imported-${sections.length + 1}`, title: line.replace(/:$/, '').trim(), content: '' };
      sections.push(current);
    } else if (current) {
      current.content += `${current.content ? '\n' : ''}${line}`;
    }
  }
  return sections.filter((section) => section.content);
}

export function buildEditorResume(resume) {
  const allLines = nonEmptyLines(resume.text);
  const headingNames = Object.values(SECTION_ALIASES).flat();
  const firstHeadingIndex = allLines.findIndex((line) => headingNames.includes(normalize(line).replace(/:$/, '')));
  const headerLines = allLines.slice(0, firstHeadingIndex < 0 ? 8 : firstHeadingIndex);
  const email = resume.text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? '';
  const phone = resume.text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? '';
  const linkedin = resume.text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,]+/i)?.[0] ?? '';
  const github = resume.text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,]+/i)?.[0] ?? '';
  const urls = [...resume.text.matchAll(/(?:https?:\/\/|www\.)[^\s|,]+|(?<!@)\b[a-z0-9-]+\.(?:com|net|org|io|me|co|ai|app|dev|design|tech|site)(?:\/[^\s|,]*)?/gi)]
    .map((match) => match[0].replace(/[.;)]+$/, ''));
  const website = urls.find((url) => !/linkedin\.com|github\.com/i.test(url)) ?? '';
  const name = headerLines.find((line) => !line.includes('@') && !/\d{3}/.test(line) && line.length <= 60) ?? '';
  const role = headerLines.find((line) => line !== name && !line.includes('@') && !line.includes('linkedin') && !/\d{3}/.test(line) && line.length <= 80) ?? '';
  const contactLine = allLines.find((line) => line.includes(email) && email) ?? '';
  const location = contactLine.split(/[•|]/)[0]?.trim() ?? '';
  const experienceLines = nonEmptyLines(resume.sections.experience);
  const datePattern = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:Present|Current|Now|(?:19|20)\d{2})/i;
  const experience = [];
  for (const line of experienceLines) {
    const date = line.match(datePattern)?.[0];
    const isBullet = /^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(line);
    const title = line.replace(date ?? '', '').replace(/[|,]+\s*$/, '').trim();
    const isRoleHeading = !isBullet && ((date && title) || (!date && /\s+(?:—|–|\bat\b)\s+/i.test(line)));
    if (isRoleHeading || (!experience.length && !isBullet && !date)) {
      let jobRole = '';
      let company = '';
      let jobLocation = '';
      if (title.includes('|')) {
        const pipeParts = title.split('|').map((value) => value.trim()).filter(Boolean);
        const primaryParts = pipeParts[0].split(/\s+(?:—|–|\bat\b)\s+/i).map((value) => value.trim()).filter(Boolean);
        if (primaryParts.length > 1) {
          [jobRole = '', company = ''] = primaryParts;
          jobLocation = pipeParts.slice(1).join(' | ');
        } else if (/\b(?:engineer|developer|development|manager|analyst|designer|consultant|intern|specialist|architect|administrator|scientist|lead|director|coordinator)\b/i.test(pipeParts[1] || '')) {
          [company = '', jobRole = '', jobLocation = ''] = pipeParts;
        } else {
          [jobRole = '', jobLocation = ''] = pipeParts;
        }
      } else {
        [jobRole = '', company = ''] = title.split(/\s+(?:—|–|\bat\b)\s+/i);
      }
      const [start = '', end = ''] = (date ?? '').split(/\s*(?:-|–|—|to)\s*/i);
      experience.push({ id: experience.length + 1, role: jobRole, company, location: jobLocation, start, end, bullets: [] });
    } else if (date && experience.length) {
      const [start = '', end = ''] = date.split(/\s*(?:-|–|—|to)\s*/i);
      experience.at(-1).start = start;
      experience.at(-1).end = end;
    } else if (isBullet && experience.length) {
      experience.at(-1).bullets.push(line.replace(/^\s*(?:[-•▪◦*]|\d+[.)])\s+/, ''));
    } else if (experience.length && experience.at(-1).bullets.length) {
      const bullets = experience.at(-1).bullets;
      bullets[bullets.length - 1] = `${bullets.at(-1)} ${line}`.replace(/\s+/g, ' ').trim();
    }
  }
  const educationLines = nonEmptyLines(resume.sections.education).reduce((lines, line) => {
    if (/^(?:19|20)\d{2}\s*(?:-|–|—)\s*(?:19|20)\d{2}$/.test(line) && lines.length) lines[lines.length - 1] += ` ${line}`;
    else lines.push(line);
    return lines;
  }, []);
  const education = [];
  for (const line of educationLines) {
    if (/^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(line)) continue;
    const year = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2}(?:\s*(?:-|–|—)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2})?/i)?.[0] ?? '';
    const body = line.replace(year, '').replace(/[|,—-]+\s*$/, '').trim();
    const parts = body.split(/\s+(?:—|–|\bat\b|\bfrom\b)\s+/i);
    if (parts.length > 1) {
      education.push({ id: education.length + 1, degree: parts[0], school: parts.slice(1).join(' — '), year });
    } else if (year) {
      education.push({ id: education.length + 1, degree: '', school: body, year });
    } else if (education.length && !education.at(-1).degree && /\b(?:masters?|bachelors?|associates?|doctor|ph\.?d|degree|diploma)\b/i.test(body)) {
      education.at(-1).degree = body;
    }
  }
  return {
    name, role, email, phone, location, linkedin, github, website,
    summary: resume.sections.summary,
    skills: resume.sections.skills || resume.skills.join(', '),
    experience,
    education,
    sectionOrder: ['summary', 'experience', 'skills', 'education'],
    importedSections: extractDocumentSections(resume.text),
    imported: true
  };
}
