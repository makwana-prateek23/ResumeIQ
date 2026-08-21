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
  summary: ['summary', 'professional summary', 'profile', 'professional profile', 'career summary', 'career objective', 'objective', 'about me'],
  experience: ['experience', 'work experience', 'employment', 'professional experience', 'work history', 'employment history', 'career history', 'relevant experience', 'internship experience'],
  projects: ['projects', 'personal projects', 'selected projects', 'key projects'],
  education: ['education', 'academic background', 'academic qualifications', 'educational qualifications'],
  certifications: ['certifications', 'certificates', 'licenses', 'licenses & certifications', 'training'],
  skills: ['skills', 'technical skills', 'core competencies', 'key skills', 'core skills', 'areas of expertise', 'technical proficiencies', 'technologies', 'technical expertise']
};

const GENERIC_SECTION_NAMES = new Set([
  ...Object.values(SECTION_ALIASES).flat(), 'awards', 'achievements', 'languages',
  'volunteer experience', 'volunteering', 'publications', 'interests', 'activities',
  'accomplishments', 'honors', 'professional affiliations', 'memberships', 'references',
  'additional information', 'personal details', 'projects', 'certifications',
  'courses', 'coursework', 'professional development', 'conferences', 'patents',
  'presentations', 'research', 'leadership', 'community involvement', 'extracurricular activities'
]);

const ALIAS_TO_SECTION = new Map(
  Object.entries(SECTION_ALIASES)
    .filter(([key]) => ['summary', 'experience', 'skills', 'education'].includes(key))
    .flatMap(([key, aliases]) => aliases.map((alias) => [alias, key]))
);

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9+#])${escaped}($|[^a-z0-9+#])`, 'i').test(text);
}

function isHeadingLine(line, context = {}) {
  const trimmed = line.trim();
  const normalized = normalize(trimmed).replace(/:$/, '');
  if (!trimmed || trimmed.length > 80 || trimmed.includes('@')) return false;
  if (GENERIC_SECTION_NAMES.has(normalized)) return true;
  if (/^[A-Z][A-Z0-9 &/,+-]{2,60}:?$/.test(trimmed) && !/^(?:19|20)\d{2}/.test(trimmed)) return true;
  if (trimmed.endsWith(':') && /^[A-Z][\p{L}\p{N} &/,+()-]{1,60}:$/u.test(trimmed)) return true;

  // Unknown Title Case headings are accepted only at a visual boundary. This
  // catches sections such as "Selected Engagements" without treating every
  // employer or job title as a section.
  const words = trimmed.replace(/:$/, '').split(/\s+/);
  const titleCase = words.length <= 7 && words.every((word) => /^(?:[A-Z][\p{L}\p{N}'&/+.-]*|and|of|for|&|\/)$/u.test(word));
  return Boolean(titleCase && context.hasPreviousSection && (context.previousBlank || context.nextBlank));
}

export function extractSkills(text) {
  const normalized = normalize(text);
  return SKILLS.filter((skill) => containsTerm(normalized, skill));
}

function extractSection(text, aliases) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => aliases.includes(normalize(line).replace(/:$/, '')));
  if (start < 0) return '';
  const body = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isHeadingLine(lines[index], { hasPreviousSection: true, previousBlank: !lines[index - 1]?.trim(), nextBlank: !lines[index + 1]?.trim() })) break;
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
  // Preserve indentation and intentional blank lines. They carry important
  // grouping information in both DOCX and PDF text extraction.
  const lines = text.split(/\r?\n/).map((line) => line.replace(/[ \t]+$/, ''));
  const sections = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^--?\s*\d+\s+of\s+\d+(?:\s*--)?$/i.test(line.trim())) continue;
    const heading = isHeadingLine(line, {
      hasPreviousSection: sections.length > 0,
      previousBlank: index === 0 || !lines[index - 1].trim(),
      nextBlank: index === lines.length - 1 || !lines[index + 1].trim()
    });
    if (heading) {
      const title = line.replace(/:$/, '').trim();
      const canonicalKey = ALIAS_TO_SECTION.get(normalize(title)) || null;
      current = { id: `imported-${sections.length + 1}`, title, content: '', canonicalKey };
      sections.push(current);
    } else if (current) {
      current.content += `${current.content ? '\n' : ''}${line}`;
    }
  }
  return sections
    .map((section) => ({ ...section, content: section.content.replace(/^\n+|\n+$/g, '') }))
    .filter((section) => section.content);
}

export function buildEditorResume(resume) {
  const allLines = nonEmptyLines(resume.text);
  const firstHeadingIndex = allLines.findIndex((line) => GENERIC_SECTION_NAMES.has(normalize(line).replace(/:$/, '')));
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
  // Bullet glyphs from custom/symbol fonts often extract as mangled non-ASCII characters
  // (e.g. a PDF's Wingdings bullet coming out as "ð·") rather than a normal "•" or "-".
  // Matching any short run of non-word leading characters catches those too, so bullets
  // don't get silently dropped or misread as a new job heading.
  const bulletPrefix = /^\s*(?:[-•▪◦*‣⁃●○∙·]|\d+[.)]|[^\w\s]{1,2}(?=\s))\s+/;
  const experience = [];
  for (const line of experienceLines) {
    const date = line.match(datePattern)?.[0];
    const isBullet = bulletPrefix.test(line);
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
      experience.at(-1).bullets.push(line.replace(bulletPrefix, ''));
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
  const degreeWordPattern = /\b(?:masters?|bachelors?|associates?|doctor|ph\.?d|degree|diploma)\b/i;
  // Resumes usually list the degree line, then a separate school + year line right after
  // it — buffer a standalone degree line and attach it to the next entry rather than the
  // previous one, otherwise degrees end up shifted onto the wrong school.
  let pendingDegree = '';
  for (const line of educationLines) {
    if (/^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(line)) continue;
    const year = line.match(/(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2}(?:\s*(?:-|–|—)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(?:19|20)\d{2})?/i)?.[0] ?? '';
    const body = line.replace(year, '').replace(/[|,—-]+\s*$/, '').trim();
    const parts = body.split(/\s+(?:—|–|\bat\b|\bfrom\b)\s+/i);
    if (parts.length > 1) {
      education.push({ id: education.length + 1, degree: pendingDegree || parts[0], school: pendingDegree ? body : parts.slice(1).join(' — '), year });
      pendingDegree = '';
    } else if (year) {
      education.push({ id: education.length + 1, degree: pendingDegree, school: body, year });
      pendingDegree = '';
    } else if (degreeWordPattern.test(body)) {
      if (education.length && !education.at(-1).degree && !pendingDegree) education.at(-1).degree = body;
      else {
        if (pendingDegree) education.push({ id: education.length + 1, degree: pendingDegree, school: '', year: '' });
        pendingDegree = body;
      }
    }
  }
  if (pendingDegree) education.push({ id: education.length + 1, degree: pendingDegree, school: '', year: '' });
  const importedSections = extractDocumentSections(resume.text);
  const sectionOrder = [];
  for (const section of importedSections) {
    const key = section.canonicalKey || section.id;
    if (!sectionOrder.includes(key)) sectionOrder.push(key);
  }
  // Keep editable standard sections available even when a heading was not
  // detected, but never move a detected custom section out of source order.
  for (const key of ['summary', 'experience', 'skills', 'education']) {
    if (resume.sections[key] && !sectionOrder.includes(key)) sectionOrder.push(key);
  }
  return {
    name, role, email, phone, location, linkedin, github, website,
    summary: resume.sections.summary,
    skills: resume.sections.skills || resume.skills.join(', '),
    experience,
    education,
    sectionOrder,
    importedSections,
    imported: true
  };
}
