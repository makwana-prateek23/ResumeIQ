import { extractJobTitle, extractRequirements, matchRequirements, normalizeTerm } from './requirement.service.js';
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
  if (!resume.sections.education) return 0;
  const level = (text) => {
    if (/\b(ph\.?d|doctorate|doctoral)\b/i.test(text)) return 4;
    if (/\b(master'?s?|m\.?s\.?|mba)\b/i.test(text)) return 3;
    if (/\b(bachelor'?s?|b\.?s\.?|b\.?a\.?)\b/i.test(text)) return 2;
    if (/\b(associate'?s?|diploma)\b/i.test(text)) return 1;
    return 0;
  };
  const requiredLevel = Math.max(...requirements.map((item) => level(`${item.term} ${item.source}`)));
  const resumeLevel = level(resume.sections.education);
  return requiredLevel === 0 ? 100 : clamp((resumeLevel / requiredLevel) * 100);
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
  const bulletCount = resume.text.split(/\r?\n/).filter((line) => /^\s*(?:[-•▪◦*]|\d+[.)])\s+/.test(line)).length;
  const checks = {
    appropriateLength: wordCount >= 250 && wordCount <= 1200,
    measurableResults: measurableResults >= 3,
    scannableBullets: bulletCount >= 3
  };
  return {
    score: clamp((Object.values(checks).filter(Boolean).length / Object.keys(checks).length) * 100),
    checks,
    wordCount,
    measurableResults,
    bulletCount
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

  const analysis = {
    overallScore: clamp((weightedOverall(atsBreakdown) * 0.55) + (weightedOverall(breakdown) * 0.45)),
    atsScore: weightedOverall(atsBreakdown),
    recruiterReadinessScore: weightedOverall(breakdown),
    mandatoryCoverage: scoreRequirements(requirementMatches.filter((item) => item.priority === 'required'), 'lexicalCoverage') ?? 100,
    confidence,
    breakdown: Object.fromEntries(Object.entries(breakdown).filter(([, value]) => value !== null)),
    weights: Object.fromEntries(Object.entries(BASE_WEIGHTS).filter(([key]) => breakdown[key] !== null)),
    jobTitle: { target: jobTitle || null, score: jobTitleScore },
    roleSuitability: {
      targetRole: jobTitle || null,
      score: clamp((weightedOverall(atsBreakdown) * 0.55) + (weightedOverall(breakdown) * 0.45)),
      label: 'Combined ATS coverage and recruiter-ready evidence'
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
    strengths,
    weaknesses,
    suggestions,
    details: {
      requiredExperienceYears: requiredYears,
      detectedExperienceYears: resume.experienceYears,
      experienceCalculationMethod: resume.experienceCalculation.method,
      extractedRequirementCount: requirements.length,
      ignoredNonTechnicalRequirementCount: extractedRequirements.length - requirements.length,
      scoringScope: 'ATS terminology plus evidence-backed skills, responsibilities, experience, education, domain knowledge, and work authorization'
    }
  };

  const tailoringPlan = buildTailoringPlan(analysis, resume);
  const completeAnalysis = { ...analysis, tailoringPlan };
  return { ...completeAnalysis, report: buildDetailedReport(completeAnalysis, resume) };
}
