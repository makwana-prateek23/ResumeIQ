import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeMatch } from '../src/services/ats.service.js';
import { buildEditorResume, calculateExperienceFromDates, parseResume } from '../src/services/resume.service.js';

const resumeText = `
Jane Developer
Skills
JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, Git
Experience
Software Engineer with 5 years of experience building REST API services.
Projects
Built a React analytics dashboard and Node.js API using PostgreSQL.
Education
Bachelor of Science in Computer Science
`;

const jobDescription = `
We are hiring a software engineer with 4+ years of experience. The candidate must
have JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS, REST API,
and Git experience. A bachelor's degree is required. You will build scalable
analytics services, improve application performance, and collaborate with product teams.
`;

test('parses recognized resume sections and skills', () => {
  const resume = parseResume(resumeText);
  assert.ok(resume.sectionsFound.includes('experience'));
  assert.ok(resume.sectionsFound.includes('projects'));
  assert.ok(resume.skills.includes('react'));
  assert.equal(resume.experienceYears, 5);
});

test('preserves imported experience without inventing placeholder jobs', () => {
  const parsed = parseResume(`Shital Yadav
AI/ML Engineer
Ahmedabad • shital@example.com
PROFESSIONAL SUMMARY
Machine learning engineer.
EXPERIENCE
Senior AI/ML Engineer — Amoha Recruitment Services
Jan 2026 – Present
• Built production machine learning systems with Python and TensorFlow.
  Improved model monitoring and deployment reliability.
Junior AI/ML Engineer — Lancer IT Solutions
Jun 2025 – Dec 2025
• Developed classification and NLP models.
SKILLS
Python, TensorFlow, SQL
EDUCATION
Masters in Data Science — Purdue University — 2022 - 2024
-- 1 of 1 --`);
  const editor = buildEditorResume(parsed);
  assert.equal(editor.experience.length, 2);
  assert.equal(editor.experience[0].role, 'Senior AI/ML Engineer');
  assert.equal(editor.experience[0].start, 'Jan 2026');
  assert.match(editor.experience[0].bullets[0], /monitoring and deployment reliability/);
  assert.equal(editor.education.length, 1);
  assert.equal(editor.imported, true);
});

test('produces a bounded, deterministic weighted analysis', () => {
  const result = analyzeMatch(parseResume(resumeText), jobDescription);
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
  assert.ok(result.matchedSkills.includes('react'));
  assert.ok(result.missingSkills.includes('aws'));
  assert.equal(result.weights.requirements, 35);
  assert.equal(result.weights.experience, 15);
  assert.equal(result.details.scoringScope, 'ATS terminology plus evidence-backed skills, responsibilities, experience, education, domain knowledge, and work authorization');
  assert.ok(Number.isInteger(result.atsScore));
  assert.ok(Number.isInteger(result.recruiterReadinessScore));
  assert.ok(result.confidence >= 50 && result.confidence <= 100);
  assert.ok(result.requirements.every((item) => item.source && item.status));
});

test('extracts domain phrases that are not in a fixed software dictionary', () => {
  const engineeringResume = parseResume(`
    Alex Engineer
    Summary
    Electrical engineer supporting renewable energy facilities.
    Experience
    6 years coordinating commissioning and energy storage projects.
    Education
    Bachelor of Electrical Engineering
  `);
  const engineeringJob = `
    Power Station Management Engineer
    Five years of electrical engineering experience is required. Candidates must
    have equipment installation, regulatory approvals, technical drawings, system
    integration, project execution, BESS commissioning, and project coordination.
    A bachelor's degree is required. Strong analytical communication is preferred.
  `;
  const result = analyzeMatch(engineeringResume, engineeringJob);
  const terms = result.requirements.map((item) => item.term);
  assert.ok(terms.includes('equipment installation'));
  assert.ok(terms.includes('regulatory approvals'));
  assert.ok(terms.includes('technical drawings'));
  assert.ok(result.missingKeywords.includes('equipment installation'));
  assert.ok(result.matched.some((item) => item.term.includes('commissioning')));
  const equipmentAction = result.tailoringPlan.keywordActions.find((item) => item.term === 'equipment installation');
  assert.ok(['addNewBullet', 'reviseExistingBullet'].includes(equipmentAction.action));
  assert.ok(equipmentAction.suggestedText.includes('equipment installation'));
  assert.ok(equipmentAction.inputsNeeded.length > 0);
  assert.equal(equipmentAction.location.primarySection, 'New Technical Skills section');
  assert.ok(['Experience', 'Experience or Projects'].includes(equipmentAction.location.supportingSection));
  assert.match(equipmentAction.location.missingPart, /skill name/i);
  assert.ok(['JD-to-resume contextual similarity', 'section fallback'].includes(equipmentAction.location.method));
  assert.ok(['high', 'medium', 'low'].includes(equipmentAction.location.confidence));
  assert.equal(Object.hasOwn(result.tailoringPlan, 'safetyNote'), false);
  assert.ok(Number.isInteger(result.report.keywordCoveragePercentage));
  assert.ok('responsibilitiesMatch' in result.report.categoryScores || result.report.missingResponsibilities.length === 0);
  assert.ok(result.report.sectionRecommendations.skills.length > 0);
  assert.ok(result.report.checklist.every((item) => !Object.hasOwn(item, 'requiresUserReview')));
});

test('prioritizes required missing terms above optional matched terms', () => {
  const result = analyzeMatch(parseResume(resumeText), `
    Platform Engineer
    Kubernetes administration and Terraform are required. JavaScript is preferred.
    Candidates will maintain cloud infrastructure, deployment automation, and system reliability.
  `);
  const actions = result.tailoringPlan.keywordActions;
  const requiredMissing = actions.findIndex((item) => item.term.includes('kubernetes'));
  const preferredMatched = actions.findIndex((item) => item.term.includes('javascript'));
  assert.ok(requiredMissing >= 0);
  assert.ok(preferredMatched < 0 || requiredMissing < preferredMatched);
});

test('returns the complete explainable report contract', () => {
  const result = analyzeMatch(parseResume(resumeText), jobDescription);
  assert.ok(Array.isArray(result.report.matchingSkills));
  assert.ok(Array.isArray(result.report.missingSkills));
  assert.ok(Array.isArray(result.report.matchingResponsibilities));
  assert.ok(Array.isArray(result.report.missingResponsibilities));
  assert.ok(Array.isArray(result.report.rewriteSuggestions));
  assert.ok(Object.hasOwn(result.report.categoryScores, 'keywordCoverage'));
  assert.ok(result.report.rewriteSuggestions.every((item) => !Object.hasOwn(item, 'requiresUserConfirmation')));
  assert.ok(Number.isInteger(result.roleSuitability.score));
});

test('scores technical keywords, experience, and required education without adding soft skills', () => {
  const result = analyzeMatch(parseResume(resumeText), `
    Data Platform Engineer
    Five years of experience and PostgreSQL, Docker, AWS, and data pipeline knowledge are required.
    Candidates should be friendly, consistent, communicate clearly, prepare weekly reports,
    and hold a bachelor's degree.
  `);
  const types = new Set(result.requirements.map((item) => item.type));
  assert.ok(types.has('experience'));
  assert.ok([...types].some((type) => ['database', 'devOpsTool', 'cloudTechnology', 'hardSkill', 'industryTerm'].includes(type)));
  assert.equal(types.has('softSkill'), false);
  assert.equal(types.has('education'), true);
  assert.equal(types.has('responsibility'), true);
  assert.equal(result.missingSkills.some((term) => /friendly|consistent|weekly reports/i.test(term)), false);
  assert.deepEqual(Object.keys(result.breakdown).sort(), ['education', 'experience', 'requirements', 'responsibilities', 'title']);
  assert.ok(result.requirements.every((item) => Number.isFinite(item.tfIdfScore) && item.tfIdfScore > 0));
});

test('checks work authorization alternatives and returns exact edit instructions', () => {
  const result = analyzeMatch(parseResume(`
    Taylor Engineer
    Summary
    US Citizen and platform engineer.
    Skills
    Python, AWS
    Experience
    Platform Engineer | Example Corp | Jan 2020 - Present
    - Built Python APIs for cloud services.
    Education
    Bachelor of Science in Computer Science
  `), `
    Senior Platform Engineer
    Python and Kubernetes are mandatory.
    A bachelor's degree is required.
    Applicant must be a US Citizen or Green Card holder.
  `);
  const authorization = result.requirements.find((item) => item.term === 'us citizen or green card');
  const kubernetes = result.tailoringPlan.keywordActions.find((item) => item.term.includes('kubernetes'));
  assert.equal(authorization.status, 'matched');
  assert.equal(result.breakdown.education, 100);
  assert.equal(result.breakdown.workAuthorization, 70);
  assert.ok(['addNewBullet', 'reviseExistingBullet'].includes(kubernetes.action));
  assert.ok(kubernetes.recommendedSection);
  assert.ok(kubernetes.suggestedText.includes('kubernetes'));
  assert.deepEqual(kubernetes.inputsNeeded, ['How the requirement was used', 'Task or scope', 'Measurable result']);
});

test('rejects sentence fragments and normalizes platform and healthcare JD concepts', () => {
  const result = analyzeMatch(parseResume(`
    Summary
    Engineer experienced with AWS, OpenTelemetry, distributed systems, IAM, OAuth, and API security.
    Experience
    - Built reliable AWS services with OpenTelemetry monitoring.
  `), `
    Senior Software Engineer II
    Deep AWS + infrastructure experience.
    Auth/authz experience (IAM, OAuth, API gateways, service-to-service auth, etc.).
    Improve AI/ML infrastructure for model development, training, and deployment.
    Maintain the security of protected patient health information and ensure compliance with relevant regulations.
    Contribute to the development of APIs and interfaces for generative AI capabilities.
  `);
  const terms = result.requirements.map((item) => item.term);
  assert.ok(terms.includes('aws'));
  assert.ok(terms.includes('protected health information'));
  assert.ok(terms.includes('api development'));
  assert.equal(result.matchedSkills.concat(result.missingSkills).some((term) => term === 'etc' || /security protected patient|deep aws|improve ai ml infrastructure|software engineer ii/i.test(term)), false);
  assert.equal(result.matchedSkills.some((term) => /engineer/i.test(term)), false);
});

test('uses TF-IDF weights to rank technical JD phrases deterministically', () => {
  const result = analyzeMatch(parseResume(resumeText), `
    Cloud Engineer
    Kubernetes and Terraform are required for cloud infrastructure automation.
    Kubernetes supports deployment automation and Kubernetes operations.
    PostgreSQL knowledge is preferred for platform reporting.
  `);
  const kubernetes = result.requirements.find((item) => item.term === 'kubernetes');
  const postgres = result.requirements.find((item) => item.term === 'postgresql');
  assert.ok(kubernetes);
  assert.ok(postgres);
  assert.ok(kubernetes.tfIdfScore > postgres.tfIdfScore);
});

test('removes recruiting, accommodation, URL, and compensation boilerplate', () => {
  const result = analyzeMatch(parseResume(resumeText), `
    AI Platform Engineer
    Python, machine learning, agentic AI, APIs, and cloud infrastructure are required.
    If you need accommodation due to a disability during the application or recruiting process,
    please submit a request at https://expedia.service-now.com/askeg?id=job_accommodation.
    The compensation range is $120,500.00 - $180,000.00.
    Expedia Group is an equal opportunity employer.
  `);
  const terms = result.requirements.map((item) => item.term).join(' | ');
  assert.match(terms, /machine learning/);
  assert.match(terms, /agentic ai/);
  assert.doesNotMatch(terms, /accommodation|disability|recruiting|service-now|askeg|500\.00|expedia group/i);
  assert.doesNotMatch(result.missingKeywords.join(' | '), /accommodation|disability|recruiting|service-now|askeg|500\.00/i);
});

test('calculates experience from dates without double-counting overlapping jobs', () => {
  const calculation = calculateExperienceFromDates(`
    Engineer | January 2020 - December 2023
    Consultant | June 2021 - June 2022
  `);
  assert.equal(calculation.method, 'employmentDates');
  assert.equal(calculation.years, 4);
  assert.equal(calculation.ranges.length, 2);
});

test('uses date-derived experience before explicit statements', () => {
  const resume = parseResume(`
    Experience
    Engineer | January 2019 - December 2022
    Summary
    Professional with ten years of general exposure.
  `);
  assert.equal(resume.experienceYears, 4);
  assert.equal(resume.experienceCalculation.method, 'employmentDates');
});

test('deduplicates nested technical phrases with equal occurrence counts', () => {
  const result = analyzeMatch(parseResume(resumeText), `
    Cloud Engineer
    Cloud infrastructure automation is required for this role.
    Terraform and Kubernetes are required.
  `);
  const terms = result.requirements.map((item) => item.term);
  assert.ok(terms.includes('cloud infrastructure automation'));
  assert.equal(terms.includes('cloud infrastructure'), false);
});

test('detects unfamiliar technical terms from requirement sections and context cues', () => {
  const result = analyzeMatch(parseResume(`
    Experience
    Controls Engineer with 4 years of experience using SCADA and PLC systems.
  `), `
    Controls Engineer
    Requirements:
    SCADA
    SAP S/4HANA
    IEC 61850
    CNC machining
    Programmable Logic Controllers (PLC)
    Experience with ServiceNow and Maximo.
    Benefits:
    Flexible work and employee assistance are provided.
  `);
  const terms = result.requirements.map((item) => item.term);
  assert.ok(terms.includes('scada'));
  assert.ok(terms.some((term) => term.includes('sap')));
  assert.ok(terms.some((term) => term.includes('iec 61850')));
  assert.ok(terms.includes('cnc machining'));
  assert.ok(terms.includes('servicenow'));
  assert.ok(terms.includes('maximo'));
  assert.ok(result.matched.some((item) => item.aliases?.includes('plc')));
  assert.equal(terms.some((term) => /flexible work|employee assistance/i.test(term)), false);
});
