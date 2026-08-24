import { degreeLevel, extractJobTitle, extractRequirements, matchRequirements, normalizeTerm } from './requirement.service.js';
import { buildTailoringPlan } from './tailoring.service.js';
import { buildDetailedReport } from './report.service.js';

const BASE_WEIGHTS = Object.freeze({
  requirements: 35,
  responsibilities: 20,
  experience: 15,
  title: 10,
  education: 10,
  domainKnowledge: 5,
  workAuthorization: 5
});

const SKILL_TYPES = new Set([
  'hardSkill', 'programmingLanguage', 'framework', 'cloudTechnology',
  'database', 'devOpsTool', 'testingTool', 'methodology'
]);

const SCORED_TYPES = new Set([...SKILL_TYPES, 'experience', 'education', 'certification', 'workAuthorization', 'responsibility', 'domainKnowledge']);

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueTerms(items) {
  return [...new Set(items.map((item) => item.term))];
}

function requiredExperience(text) {
  const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  const matches = [...text.matchAll(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s*[-–]\s*\d{1,2}|\+)?\s*(?:years?|yrs?)\b/gi)];
  return matches.length ? Math.max(...matches.map((match) => Number(match[1]) || numberWords[match[1].toLowerCase()])) : 0;
}

function scoreRequirements(matches, coverageField = 'coverage') {
  if (!matches.length) return null;
  const priorityWeight = { required: 1.5, preferred: 1, unspecified: 0.75 };
  const weightFor = (match) => priorityWeight[match.priority] * Math.max(match.tfIdfScore ?? 1, 0.1);
  const total = matches.reduce((sum, match) => sum + weightFor(match), 0);
  const earned = matches.reduce((sum, match) => sum + (match[coverageField] ?? match.coverage) * weightFor(match), 0);
  return clamp((earned / total) * 100);
}

function scoreTitle(jobTitle, resume) {
  if (!jobTitle) return null;
  const normalizedTitle = normalizeTerm(jobTitle);
  if (normalizeTerm(resume.text).includes(normalizedTitle)) return 100;
  const titleTokens = new Set(normalizedTitle.split(' ').filter((word) => word.length > 2));
  const resumeTokens = new Set(normalizeTerm(`${resume.sections.summary} ${resume.sections.experience}`).split(' '));
  const overlap = [...titleTokens].filter((token) => resumeTokens.has(token)).length;
  return clamp((overlap / Math.max(titleTokens.size, 1)) * 70);
}

function scoreEducation(requirementMatches, resume) {
  const requirements = requirementMatches.filter((match) => match.type === 'education');
  if (!requirements.length) return null;
  const requiredLevel = Math.max(...requirements.map((item) => degreeLevel(`${item.term} ${item.source}`)));
  const resumeLevel = degreeLevel(resume.sections.education);
  const allowsEquivalentExperience = requirements.some((item) => /\b(?:or|and\/or)\s+(?:equivalent|comparable|relevant)\s+(?:professional\s+)?experience\b|\bequivalent combination of education and experience\b/i.test(item.source));
  if (requiredLevel === 0) return resume.sections.education ? 100 : (allowsEquivalentExperience && resume.experienceYears > 0 ? 85 : 0);
  const degreeScore = clamp((resumeLevel / requiredLevel) * 100);
  return allowsEquivalentExperience && resume.experienceYears > 0 ? Math.max(degreeScore, 85) : degreeScore;
}

function scoreCategory(matches, type, coverageField = 'coverage') {
  const category = matches.filter((match) => match.type === type);
  return category.length ? scoreRequirements(category, coverageField) : null;
}

function searchabilityChecks(resume) {
  const text = resume.text;
  const checks = {
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
    phone: /(?:\+?\d[\d\s().-]{7,}\d)/.test(text),
    summary: Boolean(resume.sections.summary),
    experienceSection: Boolean(resume.sections.experience),
    educationSection: Boolean(resume.sections.education),
    dates: /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[a-z]*\s+\d{4}\b|\b(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|present|current)\b/i.test(text),
    professionalLink: /(?:linkedin\.com|github\.com|https?:\/\/|www\.)/i.test(text)
  };
  return {
    score: clamp((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100),
    checks
  };
}

function qualityChecks(resume) {
  const wordCount = resume.text.match(/\b[\w+#.-]+\b/g)?.length ?? 0;
  const measurableResults = resume.text.match(/(?:\b\d+(?:\.\d+)?%|\$\s?\d|\b\d+\s*(?:users?|projects?|clients?|hours?|days?|months?)\b)/gi)?.length ?? 0;
  const bulletLines = resume.text.split(/\r?\n/).filter((line) => /^\s*(?:[-•▪◦*‣⁃●○∙·]|\d+[.)]|[^\w\s]{1,3}(?=\s))\s+/.test(line));
  const bulletCount = bulletLines.length;
  const actionVerbPattern = /^\s*(?:[-•▪◦*‣⁃●○∙·]|\d+[.)]|[^\w\s]{1,3}(?=\s))\s+(?:achieved|analyzed|automated|built|created|cut|delivered|designed|developed|drove|engineered|established|generated|grew|implemented|improved|increased|launched|led|managed|optimized|reduced|resolved|saved|scaled|streamlined|supported|tested)\b/i;
  const actionOrientedBullets = bulletLines.filter((line) => actionVerbPattern.test(line)).length;
  const averageBulletWords = bulletCount ? bulletLines.reduce((sum, line) => sum + (line.match(/\b[\w+#.-]+\b/g)?.length ?? 0), 0) / bulletCount : 0;
  const checks = {
    appropriateLength: wordCount >= 250 && wordCount <= 1200,
    measurableResults: measurableResults >= 3,
    scannableBullets: bulletCount >= 3,
    actionOrientedBullets: bulletCount >= 3 && actionOrientedBullets / bulletCount >= 0.6,
    conciseBullets: bulletCount >= 3 && averageBulletWords <= 35
  };
  return {
    score: clamp((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100),
    checks,
    wordCount,
    measurableResults,
    bulletCount,
    actionOrientedBullets,
    averageBulletWords: Number(averageBulletWords.toFixed(1))
  };
}

function usRecruitingChecks(resume, searchability, resumeQuality) {
  const sensitivePersonalDetails = /\b(?:date of birth|dob|marital status|gender|sex|religion|race|ethnicity|nationality|social security number|ssn)\s*[:|-]/i.test(resume.text);
  const checks = {
    contactBasics: searchability.checks.email && searchability.checks.phone,
    standardSections: searchability.checks.experienceSection && searchability.checks.educationSection,
    datedExperience: searchability.checks.dates,
    quantifiedImpact: resumeQuality.measurableResults >= 2,
    actionOrientedBullets: resumeQuality.checks.actionOrientedBullets,
    conciseBullets: resumeQuality.checks.conciseBullets,
    professionalLink: searchability.checks.professionalLink,
    noSensitivePersonalDetails: !sensitivePersonalDetails
  };
  return { score: clamp((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100), checks, standard: 'US private-sector recruiter readiness' };
}

function scoreChecks(checks) {
  return clamp((Object.values(checks).filter(Boolean).length / Math.max(Object.keys(checks).length, 1)) * 100);
}

function grammarAndWritingChecks(resume) {
  const lines = resume.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines.filter((line) => /^(?:[-•▪◦*]|\d+[.)])\s+/.test(line));
  const repeatedWords = [...resume.text.matchAll(/\b([a-z]{2,})\s+\1\b/gi)].map((match) => match[0]);
  const commonTypos = [...resume.text.matchAll(/\b(?:recieve|seperate|occured|managment|developement|responsibilites|experiance|acheived|succesfully|maintainance)\b/gi)].map((match) => match[0]);
  const spacingErrors = lines.filter((line) => /\w\s{2,}\w|\s+[,.!?;:]/.test(line));
  const firstPersonUses = resume.text.match(/\b(?:I|me|my|mine|we|our|ours)\b/g)?.length ?? 0;
  const punctuatedBullets = bulletLines.filter((line) => /[.!?;:]$/.test(line)).length;
  const punctuationRatio = bulletLines.length ? punctuatedBullets / bulletLines.length : 1;
  const checks = {
    noRepeatedWords: repeatedWords.length === 0,
    noCommonTypos: commonTypos.length === 0,
    cleanWordSpacing: spacingErrors.length === 0,
    resumeVoice: firstPersonUses === 0,
    consistentBulletPunctuation: bulletLines.length < 3 || punctuationRatio <= 0.2 || punctuationRatio >= 0.8
  };
  const issues = [
    ...repeatedWords.slice(0, 5).map((text) => ({ type: 'Repeated word', text, suggestion: 'Remove the duplicated word.' })),
    ...commonTypos.slice(0, 5).map((text) => ({ type: 'Possible spelling issue', text, suggestion: 'Review and correct this word.' })),
    ...spacingErrors.slice(0, 3).map((text) => ({ type: 'Spacing issue', text: text.slice(0, 120), suggestion: 'Use a single space between words and no space before punctuation.' }))
  ];
  if (firstPersonUses) issues.push({ type: 'Resume voice', text: `${firstPersonUses} first-person reference${firstPersonUses === 1 ? '' : 's'} found`, suggestion: 'Start bullets with action verbs and omit I, me, my, we, and our.' });
  if (!checks.consistentBulletPunctuation) issues.push({ type: 'Inconsistent punctuation', text: 'Bullet endings use mixed punctuation.', suggestion: 'Use one punctuation style consistently.' });
  return { score: scoreChecks(checks), checks, issues, note: 'Potential writing issues detected with resume-focused rules; review in context.' };
}

function redFlagChecks(resume, resumeQuality) {
  const checks = {
    noSensitivePersonalDetails: !/\b(?:date of birth|dob|marital status|gender|sex|religion|race|ethnicity|social security number|ssn)\s*[:|-]/i.test(resume.text),
    noSalaryDetails: !/\b(?:current salary|salary expectation|expected salary|compensation requirement)\b/i.test(resume.text),
    noReferencesStatement: !/\breferences available upon request\b/i.test(resume.text),
    noObjectiveCliches: !/\b(?:seeking a challenging position|objective\s*:|hardworking team player|results-driven professional)\b/i.test(resume.text),
    reasonableLength: resumeQuality.wordCount <= 1200,
    noContactInBody: !(resume.sections.experience && /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resume.sections.experience))
  };
  return { score: scoreChecks(checks), checks };
}

function essentialSectionChecks(resume, searchability) {
  const checks = {
    contactInformation: searchability.checks.email && searchability.checks.phone,
    professionalSummary: Boolean(resume.sections.summary),
    workExperience: Boolean(resume.sections.experience),
    education: Boolean(resume.sections.education),
    skills: Boolean(resume.sections.skills || resume.skills?.length),
    datedWorkHistory: searchability.checks.dates
  };
  return { score: scoreChecks(checks), checks, standard: 'Common U.S. private-sector resume essentials' };
}

function atsEssentialChecks(resume, searchability, resumeQuality) {
  const checks = {
    searchableContactDetails: searchability.checks.email && searchability.checks.phone,
    recognizableHeadings: searchability.checks.experienceSection && searchability.checks.educationSection,
    keywordReadySkills: Boolean(resume.sections.skills || resume.skills?.length),
    chronologicalSignals: searchability.checks.dates,
    scannableBullets: resumeQuality.checks.scannableBullets,
    readableLength: resumeQuality.checks.appropriateLength,
    professionalLink: searchability.checks.professionalLink
  };
  return { score: scoreChecks(checks), checks };
}

export function analyzeResumeAts(resume) {
  const searchability = searchabilityChecks(resume);
  const resumeQuality = qualityChecks(resume);
  const usRecruiting = usRecruitingChecks(resume, searchability, resumeQuality);
  const grammarAndWriting = grammarAndWritingChecks(resume);
  const redFlags = redFlagChecks(resume, resumeQuality);
  const essentialSections = essentialSectionChecks(resume, searchability);
  const atsEssentials = atsEssentialChecks(resume, searchability, resumeQuality);
  // Canonical scoring ledger: explanatory categories may reuse a signal, but
  // every signal earns or loses points exactly once here.
  const checkGroups = [
    { key: 'email', passed: searchability.checks.email, group: 'Parseability', weight: 7 },
    { key: 'phone', passed: searchability.checks.phone, group: 'Parseability', weight: 5 },
    { key: 'experienceSection', passed: searchability.checks.experienceSection, group: 'Parseability', weight: 8 },
    { key: 'educationSection', passed: searchability.checks.educationSection, group: 'Parseability', weight: 5 },
    { key: 'dates', passed: searchability.checks.dates, group: 'Parseability', weight: 7 },
    { key: 'skills', passed: essentialSections.checks.skills, group: 'Parseability', weight: 8 },
    { key: 'measurableResults', passed: resumeQuality.checks.measurableResults, group: 'Evidence quality', weight: 8 },
    { key: 'scannableBullets', passed: resumeQuality.checks.scannableBullets, group: 'Evidence quality', weight: 6 },
    { key: 'actionOrientedBullets', passed: resumeQuality.checks.actionOrientedBullets, group: 'Evidence quality', weight: 8 },
    { key: 'conciseBullets', passed: resumeQuality.checks.conciseBullets, group: 'Evidence quality', weight: 4 },
    { key: 'appropriateLength', passed: resumeQuality.checks.appropriateLength, group: 'Evidence quality', weight: 4 },
    ...Object.entries(grammarAndWriting.checks).map(([key, passed]) => ({ key, passed, group: 'Writing quality', weight: 3 })),
    { key: 'noSensitivePersonalDetails', passed: redFlags.checks.noSensitivePersonalDetails, group: 'Recruiter red flags', weight: 4 },
    { key: 'noSalaryDetails', passed: redFlags.checks.noSalaryDetails, group: 'Recruiter red flags', weight: 3 },
    { key: 'noReferencesStatement', passed: redFlags.checks.noReferencesStatement, group: 'Recruiter red flags', weight: 2 },
    { key: 'noObjectiveCliches', passed: redFlags.checks.noObjectiveCliches, group: 'Recruiter red flags', weight: 3 },
    { key: 'noContactInBody', passed: redFlags.checks.noContactInBody, group: 'Recruiter red flags', weight: 3 }
  ];
  const totalWeight = checkGroups.reduce((sum, check) => sum + check.weight, 0);
  const atsScore = clamp(checkGroups.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0) / totalWeight * 100);
  const scoreBreakdown = Object.fromEntries([...new Set(checkGroups.map((check) => check.group))].map((group) => {
    const checks = checkGroups.filter((check) => check.group === group);
    const weight = checks.reduce((sum, check) => sum + check.weight, 0);
    return [group, { score: clamp(checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0) / weight * 100), weight }];
  }));
  return {
    atsScore,
    scoreBreakdown,
    searchability,
    resumeQuality,
    usRecruiting,
    grammarAndWriting,
    redFlags,
    essentialSections,
    atsEssentials,
    passedChecks: checkGroups.filter((item) => item.passed),
    improvementChecks: checkGroups.filter((item) => !item.passed),
    details: {
      detectedExperienceYears: resume.experienceYears,
      experienceCalculationMethod: resume.experienceCalculation.method,
      sectionsFound: resume.sectionsFound,
      scoringScope: 'Standalone ATS readability and U.S. private-sector recruiter readiness; no job description matching',
      scoringMethod: 'One canonical checklist; each signal contributes to the score exactly once',
      scoredCheckCount: checkGroups.length
    }
  };
}

function weightedOverall(breakdown) {
  const applicable = Object.entries(breakdown).filter(([, value]) => value !== null);
  const totalWeight = applicable.reduce((sum, [key]) => sum + BASE_WEIGHTS[key], 0);
  return clamp(applicable.reduce((sum, [key, value]) => sum + value * BASE_WEIGHTS[key], 0) / totalWeight);
}

export function analyzeMatch(resume, jobDescription) {
  const extractedRequirements = extractRequirements(jobDescription);
  const requirements = extractedRequirements.filter((item) => SCORED_TYPES.has(item.type));
  const requirementMatches = matchRequirements(requirements, resume);
  const requiredYears = requiredExperience(jobDescription);
  const jobTitle = extractJobTitle(jobDescription);
  const searchability = searchabilityChecks(resume);
  const resumeQuality = qualityChecks(resume);
  const usRecruiting = usRecruitingChecks(resume, searchability, resumeQuality);
  const jobTitleScore = scoreTitle(jobTitle, resume);
  const experienceScore = requiredYears
    ? clamp((resume.experienceYears / requiredYears) * 100)
    : null;

  const breakdown = {
    requirements: scoreRequirements(requirementMatches.filter((item) => SKILL_TYPES.has(item.type) || item.type === 'certification')),
    responsibilities: scoreCategory(requirementMatches, 'responsibility'),
    experience: experienceScore,
    title: jobTitleScore,
    education: scoreEducation(requirementMatches, resume),
    domainKnowledge: scoreCategory(requirementMatches, 'domainKnowledge'),
    workAuthorization: scoreCategory(requirementMatches, 'workAuthorization')
  };
  const atsBreakdown = {
    requirements: scoreRequirements(requirementMatches.filter((item) => SKILL_TYPES.has(item.type) || item.type === 'certification'), 'lexicalCoverage'),
    responsibilities: scoreCategory(requirementMatches, 'responsibility', 'lexicalCoverage'),
    experience: experienceScore,
    title: jobTitleScore,
    education: scoreEducation(requirementMatches, resume),
    domainKnowledge: scoreCategory(requirementMatches, 'domainKnowledge', 'lexicalCoverage'),
    workAuthorization: scoreCategory(requirementMatches, 'workAuthorization', 'lexicalCoverage')
  };

  const matched = requirementMatches.filter((item) => item.status === 'matched');
  const partiallyMatched = requirementMatches.filter((item) => item.status === 'partial');
  const missing = requirementMatches.filter((item) => item.status === 'missing');
  const parseSignals = [requirements.length >= 5, Boolean(resume.sections.experience), Boolean(resume.sections.education), resume.text.length >= 500];
  const confidence = clamp(50 + (parseSignals.filter(Boolean).length / parseSignals.length) * 50);

  const strengths = [];
  if (breakdown.requirements >= 70) strengths.push('Strong coverage of requirements extracted from the job description.');
  if (breakdown.experience >= 80) strengths.push('The explicitly stated experience meets the role requirement.');
  if (!strengths.length) strengths.push('Some relevant evidence was found, but tailoring can improve alignment.');

  const weaknesses = missing.slice(0, 8).map((item) => `Missing ${item.priority === 'required' ? 'required ' : ''}${item.type}: ${item.term}.`);

  const suggestions = [
    ...missing.slice(0, 6).map((item) => `Add “${item.term}” to the most relevant skills, experience, or projects section.`),
    'Demonstrate important requirements inside achievement bullets instead of keyword stuffing.'
  ];

  const recruiterEvidenceScore = weightedOverall(breakdown);
  const recruiterReadinessScore = clamp((recruiterEvidenceScore * 0.85) + (usRecruiting.score * 0.15));
  const analysis = {
    overallScore: clamp((weightedOverall(atsBreakdown) * 0.55) + (recruiterReadinessScore * 0.45)),
    atsScore: weightedOverall(atsBreakdown),
    recruiterReadinessScore,
    mandatoryCoverage: scoreRequirements(requirementMatches.filter((item) => item.priority === 'required'), 'lexicalCoverage') ?? 100,
    confidence,
    breakdown: Object.fromEntries(Object.entries(breakdown).filter(([, value]) => value !== null)),
    weights: Object.fromEntries(Object.entries(BASE_WEIGHTS).filter(([key]) => breakdown[key] !== null)),
    jobTitle: { target: jobTitle || null, score: jobTitleScore },
    roleSuitability: {
      targetRole: jobTitle || null,
      score: clamp((weightedOverall(atsBreakdown) * 0.55) + (recruiterReadinessScore * 0.45)),
      label: 'Combined ATS coverage and U.S. recruiter-ready evidence'
    },
    requirements: requirementMatches,
    matched,
    partiallyMatched,
    missing,
    matchedSkills: uniqueTerms(matched.filter((item) => SKILL_TYPES.has(item.type))),
    missingSkills: uniqueTerms(missing.filter((item) => SKILL_TYPES.has(item.type))),
    missingKeywords: uniqueTerms(missing),
    possibleTechnicalKeywords: extractedRequirements
      .filter((item) => item.type === 'keyword')
      .slice(0, 12)
      .map((item) => ({ term: item.term, priority: item.priority, source: item.source, tfIdfScore: item.tfIdfScore })),
    searchability,
    resumeQuality,
    usRecruiting,
    strengths,
    weaknesses,
    suggestions,
    details: {
      requiredExperienceYears: requiredYears,
      detectedExperienceYears: resume.experienceYears,
      experienceCalculationMethod: resume.experienceCalculation.method,
      extractedRequirementCount: requirements.length,
      ignoredNonTechnicalRequirementCount: extractedRequirements.length - requirements.length,
      scoringScope: 'ATS terminology plus evidence-backed skills, responsibilities, experience, education, domain knowledge, work authorization, and U.S. recruiter-readiness signals'
    }
  };

  const tailoringPlan = buildTailoringPlan(analysis, resume);
  const completeAnalysis = { ...analysis, tailoringPlan };
  return { ...completeAnalysis, report: buildDetailedReport(completeAnalysis, resume) };
}
