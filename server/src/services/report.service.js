const SKILL_TYPES = new Set([
  'hardSkill', 'programmingLanguage', 'framework', 'cloudTechnology', 'database',
  'devOpsTool', 'testingTool', 'methodology'
]);

function coverage(items) {
  if (!items.length) return null;
  const earned = items.reduce((sum, item) => sum + item.coverage, 0);
  return Math.round((earned / items.length) * 100);
}

function groupByType(requirements) {
  return requirements.reduce((groups, item) => {
    (groups[item.type] ??= []).push(item);
    return groups;
  }, {});
}

export function buildDetailedReport(analysis, resume) {
  const grouped = groupByType(analysis.requirements);
  const skills = analysis.requirements.filter((item) => SKILL_TYPES.has(item.type));
  const responsibilities = [];
  const projectEvidence = analysis.matched.filter((item) => item.evidenceSection === 'projects');

  const categoryScores = {
    skillsMatch: coverage(skills),
    experienceMatch: analysis.breakdown.experience,
    keywordCoverage: coverage(analysis.requirements)
  };

  const sectionRecommendations = {
    professionalSummary: [],
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    workAuthorization: []
  };

  const missingSkills = analysis.missing.filter((item) => SKILL_TYPES.has(item.type));
  if (missingSkills.length) sectionRecommendations.skills.push(`Add priority skills: ${missingSkills.slice(0, 8).map((item) => item.term).join(', ')}.`);
  sectionRecommendations.skills.push('Order skills by job-description priority and repeat the most important ones in experience or projects.');

  const weakEvidence = analysis.partiallyMatched.concat(analysis.matched.filter((item) => ['summary', 'skills'].includes(item.evidenceSection)));
  if (weakEvidence.length) sectionRecommendations.experience.push(`Strengthen evidence for: ${weakEvidence.slice(0, 6).map((item) => item.term).join(', ')}.`);
  if (!analysis.resumeQuality.checks.measurableResults) sectionRecommendations.experience.push('Add scope and outcomes to bullets using numbers and measurable results.');

  const missingEducation = analysis.missing.filter((item) => item.type === 'education');
  if (missingEducation.length) sectionRecommendations.education.push('Verify the requested degree against the Education section; never claim a degree that was not earned.');
  const missingAuthorization = analysis.missing.filter((item) => item.type === 'workAuthorization');
  if (missingAuthorization.length) sectionRecommendations.workAuthorization.push('Confirm your actual work authorization before adding USC, Green Card, sponsorship, or authorization wording.');

  if (!resume.sections.projects) sectionRecommendations.projects.push('Add a projects section only when projects provide relevant evidence not already clear from employment.');
  else if (!projectEvidence.length) sectionRecommendations.projects.push('Reorder or rewrite project bullets to show evidence for the job’s highest-priority requirements.');


  const rewriteSuggestions = analysis.tailoringPlan.keywordActions
    .filter((item) => item.bulletPrompt)
    .slice(0, 8)
    .map((item) => ({
      target: item.term,
      section: item.recommendedSection,
      prompt: item.bulletPrompt,
      reason: item.guidance
    }));

  const checklist = [
    { item: 'Required technical keywords are addressed', passed: !analysis.missing.some((item) => item.priority === 'required') },
    { item: 'Important technical skills have experience or project evidence', passed: !analysis.matched.some((item) => ['summary', 'skills'].includes(item.evidenceSection)) },
    { item: 'Required experience level is met', passed: analysis.breakdown.experience >= 100 },
    { item: 'Required education is verified', passed: !analysis.missing.some((item) => item.type === 'education' && item.priority === 'required') },
    { item: 'Work authorization requirement is verified', passed: !analysis.missing.some((item) => item.type === 'workAuthorization' && item.priority === 'required') }
  ];

  return {
    categoryScores: Object.fromEntries(Object.entries(categoryScores).filter(([, value]) => value !== null)),
    keywordCoveragePercentage: categoryScores.keywordCoverage ?? 0,
    matchingSkills: skills.filter((item) => item.status === 'matched'),
    missingSkills: skills.filter((item) => item.status === 'missing'),
    matchingResponsibilities: responsibilities.filter((item) => item.status === 'matched'),
    missingResponsibilities: responsibilities.filter((item) => item.status === 'missing'),
    sectionRecommendations,
    rewriteSuggestions,
    checklist
  };
}
