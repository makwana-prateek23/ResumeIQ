const STOP_WORDS = new Set(`
  a an and are as at be been being but by can candidate candidates company could
  each for from has have having in into is it its may more must of on or our role
  should that the their them they this to using we who will with you your
  ability able about including include includes required requirements preferred
  preference qualification qualifications responsibility responsibilities
  experience experienced knowledge strong excellent demonstrated proven working
  require requires requiring skill skills
`.trim().split(/\s+/));

const SOFT_SKILLS = new Set([
  'adaptable', 'analytical', 'collaboration', 'collaborative', 'communication',
  'consistent', 'creative', 'critical thinking', 'decision making', 'detail oriented',
  'flexible', 'leadership', 'mentoring', 'negotiation', 'organization', 'organized',
  'problem solving', 'self motivated', 'teamwork', 'time management'
]);

const SYNONYMS = new Map([
  ['bess', 'energy storage'],
  ['battery energy storage systems', 'energy storage'],
  ['battery energy storage system', 'energy storage'],
  ['js', 'javascript'], ['ts', 'typescript'], ['nodejs', 'node.js'],
  ['postgres', 'postgresql'], ['amazon web services', 'aws'],
  ['google cloud platform', 'gcp'], ['microsoft azure', 'azure'],
  ['project mgmt', 'project management'], ['quality assurance', 'qa'],
  ['development apis', 'api development'], ['development of apis', 'api development'],
  ['continuous integration', 'ci'], ['continuous deployment', 'cd'],
  ['usc', 'us citizen'], ['u.s. citizen', 'us citizen'], ['united states citizen', 'us citizen'],
  ['gc', 'green card'], ['permanent resident', 'green card']
]);

const GENERIC = new Set([
  'activities', 'candidate', 'company', 'environment', 'information', 'position',
  'responsibilities', 'responsibility', 'role', 'team', 'work', 'etc', 'engineering',
  'engineer', 'engineers', 'solution', 'solutions'
]);

const TERM_SPECS = [
  ['aws', ['amazon web services'], 'cloudTechnology'], ['cloud infrastructure', ['infrastructure'], 'cloudTechnology'],
  ['platform reliability', [], 'hardSkill'], ['observability', [], 'devOpsTool'], ['opentelemetry', ['otel'], 'devOpsTool'],
  ['networking', ['network integrations'], 'hardSkill'], ['distributed systems', [], 'hardSkill'],
  ['authentication', ['auth'], 'hardSkill'], ['authorization', ['authz'], 'hardSkill'],
  ['iam', ['identity and access management'], 'hardSkill'], ['oauth', [], 'hardSkill'],
  ['api gateways', ['api gateway'], 'hardSkill'], ['service-to-service authentication', ['service to service auth'], 'hardSkill'],
  ['enterprise security and compliance', ['enterprise security compliance'], 'domainKnowledge'],
  ['protected health information', ['phi', 'patient health information'], 'domainKnowledge'],
  ['healthcare compliance', ['healthcare regulations'], 'domainKnowledge'],
  ['sql', ['database querying language'], 'database'], ['data pipelines', ['data pipeline'], 'devOpsTool'],
  ['full-stack web applications', ['full stack web applications', 'full-stack web development'], 'hardSkill'],
  ['high test coverage', ['automated testing', 'test coverage'], 'testingTool'],
  ['generative ai', ['genai'], 'hardSkill'], ['large language models', ['llm', 'llms'], 'hardSkill'],
  ['amazon bedrock', ['bedrock'], 'framework'], ['langgraph', [], 'framework'], ['litellm', [], 'framework'],
  ['model context protocol', ['mcp'], 'framework'], ['openai api', ['openai apis'], 'framework'],
  ['claude code', [], 'framework'], ['prompt engineering', [], 'hardSkill'],
  ['api development', ['development of apis'], 'hardSkill']
];

const BOILERPLATE_PATTERN = /\b(equal opportunity|affirmative action|accommodation|disability|disabled|veteran|gender identity|sexual orientation|race|religion|national origin|privacy policy|recruiting process|application process|background check|drug test|pay transparency|salary range|compensation range|benefits package|submit (?:a )?request|contact recruiting|service-now\.com|askeg)\b/i;
const TECHNICAL_CONTEXT_PATTERN = /\b(experience with|knowledge of|proficien(?:cy|t) in|familiar(?:ity)? with|expertise in|hands-on|skilled in|ability to (?:use|operate|configure|develop|design|implement)|certified in|working with|technologies include|tools include|technical skills?)\b/i;

function isBoilerplateSegment(segment) {
  return BOILERPLATE_PATTERN.test(segment)
    || /https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(segment)
    || /^\s*[$£€]\s*\d[\d,.]*(?:\s*[-–]\s*[$£€]?\s*\d[\d,.]*)?\s*$/i.test(segment);
}

function technicalSectionSegments(jobDescription) {
  const technicalHeadings = /^(technical skills?|requirements?|required qualifications?|preferred qualifications?|qualifications?|what you(?:'|’)ll need|what you bring|tools|technologies)\s*:?\s*$/i;
  const stopHeadings = /^(benefits|about us|about the company|equal opportunity|compensation|salary|application process|legal)\s*:?\s*$/i;
  const values = new Set();
  let active = false;
  for (const rawLine of jobDescription.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (technicalHeadings.test(line)) { active = true; continue; }
    if (stopHeadings.test(line)) { active = false; continue; }
    if (active) {
      values.add(line);
      for (const sentence of line.split(/(?<=[.!?])\s+/)) values.add(sentence.trim());
    }
  }
  return values;
}

export function normalizeTerm(value) {
  let normalized = value.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[.-]+$/g, '')
    .trim();
  for (const [variant, canonical] of SYNONYMS) {
    const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, 'g'), `$1${canonical}`);
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function priorityFor(context) {
  if (/\b(must|required|mandatory|essential|minimum|need(?:ed)?|shall)\b/i.test(context)) return 'required';
  if (/\b(preferred|desired|nice to have|plus|advantage|ideally)\b/i.test(context)) return 'preferred';
  return 'unspecified';
}

function typeFor(term, context) {
  if (/\b(us citizen|usc|green card|permanent resident|work authori[sz]ation|authori[sz]ed to work|sponsorship)\b/i.test(`${term} ${context}`)) return 'workAuthorization';
  if ([...SOFT_SKILLS].some((skill) => term === skill || term.includes(skill))) return 'softSkill';
  if (/\b(bachelor|master|phd|degree|diploma|education)\b/i.test(term)) return 'education';
  if (/\b(certification|certified|certificate|license|licensed)\b/i.test(term)) return 'certification';
  if (/\b(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\+?\s*(?:years?|yrs?)\b/i.test(term)) return 'experience';
  if (/^(?:manage|managed|develop|developed|design|designed|coordinate|coordinated|lead|led|implement|implemented|maintain|maintained|prepare|prepared|support|supported|deliver|delivered|create|created|analyze|analyzed|ensure|ensured)\b/i.test(term)) return 'responsibility';
  if (/\b(aws|azure|gcp|cloud)\b/i.test(term)) return 'cloudTechnology';
  if (/\b(sql|postgres|postgresql|mysql|mongodb|oracle|database|redis)\b/i.test(term)) return 'database';
  if (/\b(docker|kubernetes|terraform|jenkins|devops|ci|cd|pipeline)\b/i.test(term)) return 'devOpsTool';
  if (/\b(testing|test|jest|vitest|cypress|selenium|pytest|junit)\b/i.test(term)) return 'testingTool';
  if (/\b(agile|scrum|kanban|waterfall|methodology|methodologies)\b/i.test(term)) return 'methodology';
  if (/\b(javascript|typescript|python|java|kotlin|swift|golang|ruby|php|c#|c\+\+)\b/i.test(term)) return 'programmingLanguage';
  if (/\b(react|angular|vue|express|django|flask|spring|framework|library)\b/i.test(term)) return 'framework';
  if (/\b(?:iso|iec|ieee|nfpa|ansi|astm|osha)\s*[-:]?\s*\d[\d.-]*\b/i.test(term)) return 'hardSkill';
  if (/\b(software|apis?|platform|system|technology|technologies|tool|framework|language|engineering|installation|commissioning|integration|design|analysis|management|coordination|documentation|testing|compliance|drawing|drawings|approval|approvals|equipment|energy|storage|database|cloud|machine learning|artificial intelligence|agentic ai|data science|algorithm|algorithms|automation|infrastructure|network|security|architecture)\b/i.test(term) || /\b(?:c#|c\+\+)\b/i.test(term)) return 'hardSkill';
  if (TECHNICAL_CONTEXT_PATTERN.test(context)) return 'hardSkill';
  return 'keyword';
}

function acronymPairs(segment) {
  const pairs = [];
  const pattern = /([A-Za-z][A-Za-z0-9/+.-]*(?:\s+(?:and|of|for|the|[A-Za-z][A-Za-z0-9/+.-]*)){1,7})\s*\(([A-Z][A-Z0-9-]{1,9})\)/g;
  for (const match of segment.matchAll(pattern)) {
    const term = cleanChunk(match[1]);
    const alias = normalizeTerm(match[2]);
    if (term && alias && term !== alias) pairs.push({ term, alias });
  }
  return pairs;
}

function cleanChunk(chunk) {
  return normalizeTerm(chunk)
    .split(' ')
    .filter((word) => word && !STOP_WORDS.has(word))
    .join(' ')
    .replace(/^(skills?|proficiency|familiarity|understanding|expertise|deep|some)\s+(in|of|with)?\s*/i, '')
    .replace(/\betc\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidatesFromSegment(segment) {
  return segment
    .split(/[,;:()|]|\s+\+\s+|\s+(?:and|or|with|using|including|such as|as well as|for|to)\s+/i)
    .map(cleanChunk)
    .filter(Boolean)
    .flatMap((chunk) => {
      const words = chunk.split(' ');
      if (words.length <= 4) return [chunk];
      return [];
    });
}

function addKnownTerms(entries, segments) {
  for (const segment of segments) {
    const normalizedSegment = normalizeTerm(segment);
    for (const [term, aliases, type] of TERM_SPECS) {
      if (![term, ...aliases].some((variant) => normalizedSegment.includes(normalizeTerm(variant)))) continue;
      const existing = entries.get(term);
      const priority = priorityFor(segment);
      entries.set(term, {
        term, aliases, type,
        priority: existing?.priority === 'required' || priority === 'required' ? 'required' : priority,
        jobDescriptionCount: (existing?.jobDescriptionCount ?? 0) + 1,
        source: existing?.source ?? segment.slice(0, 240)
      });
    }
  }
}

function addResponsibilities(entries, segments) {
  const actionPattern = /^(?:develop|implement|design|architect|maintain|improve|create|build|partner|mentor|coach|analyze|contribute|work closely|ensure)\b/i;
  for (const segment of segments) {
    if (!actionPattern.test(segment.trim())) continue;
    const term = normalizeTerm(segment).split(' ').slice(0, 12).join(' ');
    if (term.split(' ').length < 3) continue;
    entries.set(term, {
      term, aliases: [], type: 'responsibility', priority: priorityFor(segment),
      jobDescriptionCount: 1, source: segment.slice(0, 240)
    });
  }
}

function validCandidate(term, type) {
  const words = term.split(' ');
  if (!term || words.length > 4 || words.some((word) => GENERIC.has(word))) return false;
  if (/\betc\b|\+|https?|www\.|\.com\b/i.test(term)) return false;
  if (/\b(?:software|platform|data|machine learning|ai ml)?\s*engineer(?:ing)?\s+(?:i|ii|iii|iv|senior|lead)\b/i.test(term)) return false;
  if (/^(?:improve|maintain|contribute|partner|work|analyze|architect)\b/i.test(term) && type !== 'responsibility') return false;
  return true;
}

function deduplicateRequirements(items) {
  const priorityRank = { required: 2, preferred: 1, unspecified: 0 };
  return items.filter((candidate) => !items.some((other) => {
    if (other === candidate || priorityRank[other.priority] < priorityRank[candidate.priority]) return false;
    const candidateTokens = new Set(candidate.term.split(' '));
    const otherTokens = new Set(other.term.split(' '));
    const overlap = [...candidateTokens].filter((token) => otherTokens.has(token)).length;
    const union = new Set([...candidateTokens, ...otherTokens]).size;
    const nestedDuplicate = other.term.includes(candidate.term)
      && other.term.length > candidate.term.length
      && other.jobDescriptionCount >= candidate.jobDescriptionCount;
    const nearDuplicate = overlap / Math.max(union, 1) >= 0.8
      && other.tfIdfScore > candidate.tfIdfScore;
    return nestedDuplicate || nearDuplicate;
  }));
}

export function extractJobTitle(jobDescription) {
  const lines = jobDescription.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labeled = lines.find((line) => /^(job\s+title|position|role)\s*:/i.test(line));
  if (labeled) return labeled.replace(/^[^:]+:\s*/, '').slice(0, 100);
  const first = lines[0] ?? '';
  return first.length >= 3 && first.length <= 80 && !/[.!?]$/.test(first) ? first : '';
}

export function extractRequirements(jobDescription) {
  const entries = new Map();
  const technicalSegments = technicalSectionSegments(jobDescription);
  const segments = jobDescription.split(/\r?\n|(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter((value) => value && !isBoilerplateSegment(value));

  addKnownTerms(entries, segments);
  addResponsibilities(entries, segments);

  for (const segment of segments) {
    for (const pair of acronymPairs(segment)) {
      const existing = entries.get(pair.term);
      const priority = priorityFor(segment);
      entries.set(pair.term, {
        term: pair.term,
        aliases: [...new Set([...(existing?.aliases ?? []), pair.alias])],
        type: 'hardSkill',
        priority: existing?.priority === 'required' || priority === 'required' ? 'required' : priority,
        jobDescriptionCount: (existing?.jobDescriptionCount ?? 0) + 1,
        source: existing?.source ?? segment.slice(0, 240)
      });
    }
    for (const rawTerm of candidatesFromSegment(segment)) {
      const term = normalizeTerm(rawTerm);
      const words = term.split(' ');
      const type = typeFor(term, technicalSegments.has(segment) ? `technical skills ${segment}` : segment);
      if (!validCandidate(term, type) || /^[\d.,$£€]+$/.test(term) || (words.length === 1 && term.length < 3)) continue;
      const existing = entries.get(term);
      const priority = priorityFor(segment);
      const occurrence = existing?.jobDescriptionCount ?? 0;
      entries.set(term, {
        term,
        aliases: existing?.aliases ?? [],
        type,
        priority: existing?.priority === 'required' || priority === 'required' ? 'required' : priority,
        jobDescriptionCount: occurrence + 1,
        source: existing?.source ?? segment.slice(0, 240)
      });
    }
  }

  const addExplicit = (term, aliases, type, pattern) => {
    const source = segments.find((segment) => pattern.test(segment));
    if (!source) return;
    entries.set(term, {
      term,
      aliases,
      type,
      priority: priorityFor(source) === 'preferred' ? 'preferred' : 'required',
      jobDescriptionCount: 1,
      source: source.slice(0, 240)
    });
  };
  addExplicit('us citizen or green card', ['us citizen', 'usc', 'green card', 'gc', 'permanent resident'], 'workAuthorization', /\b(?:(?:u\.?s\.?|united states)\s+citizen(?:ship)?|usc)\b.*\b(?:or|and\/or)\b.*\b(?:green card|gc|permanent resident)\b/i);
  if (!entries.has('us citizen or green card')) {
    addExplicit('us citizen', ['usc', 'u.s. citizen', 'united states citizen'], 'workAuthorization', /\b(?:(?:u\.?s\.?|united states)\s+citizen(?:ship)?|usc)\b/i);
    addExplicit('green card', ['gc', 'permanent resident'], 'workAuthorization', /\b(?:green card|permanent resident|gc holder)\b/i);
  }
  addExplicit('work authorization without sponsorship', ['authorized to work', 'work authorization', 'without sponsorship', 'no sponsorship', 'do not require sponsorship'], 'workAuthorization', /\b(?:authori[sz]ed to work|work authori[sz]ation|without sponsorship|no sponsorship|do not require sponsorship|unable to sponsor)\b/i);
  if (/\b(?:ph\.?d|doctorate|doctoral degree)\b/i.test(jobDescription)) addExplicit('doctoral degree', ['phd', 'ph.d', 'doctorate'], 'education', /\b(?:ph\.?d|doctorate|doctoral degree)\b/i);
  else if (/\b(?:master'?s?|m\.?s\.?|mba)\b/i.test(jobDescription)) addExplicit("master's degree", ['masters degree', 'master degree', 'ms', 'mba'], 'education', /\b(?:master'?s?|m\.?s\.?|mba)\b/i);
  else if (/\b(?:bachelor'?s?|b\.?s\.?|b\.?a\.?)\b/i.test(jobDescription)) addExplicit("bachelor's degree", ['bachelors degree', 'bachelor degree', 'bs', 'ba'], 'education', /\b(?:bachelor'?s?|b\.?s\.?|b\.?a\.?)\b/i);

  // Work-authorization language is eligibility logic, not an ordinary keyword
  // list. Keep only the normalized alternatives above so a single "US Citizen
  // or Green Card" requirement cannot create several contradictory missing hits.
  const normalizedAuthorizationTerms = new Set([
    'us citizen or green card', 'us citizen', 'green card',
    'work authorization without sponsorship'
  ]);
  for (const [term, entry] of entries) {
    if (entry.type === 'workAuthorization' && !normalizedAuthorizationTerms.has(term)) entries.delete(term);
  }

  const documentCount = Math.max(segments.length, 1);
  const normalizedJobDescription = normalizeTerm(jobDescription);
  const weightedEntries = [...entries.values()].map((entry) => {
    const variants = [entry.term, ...(entry.aliases ?? [])];
    const documentFrequency = segments.filter((segment) => variants.some((variant) => normalizeTerm(segment).includes(variant))).length;
    const inverseDocumentFrequency = Math.log((1 + documentCount) / (1 + documentFrequency)) + 1;
    const corpusCount = Math.max(...variants.map((variant) => normalizedJobDescription.split(variant).length - 1), entry.jobDescriptionCount);
    const termFrequency = 1 + Math.log(corpusCount);
    const phraseBoost = 1 + Math.min(entry.term.split(' ').length - 1, 3) * 0.15;
    const priorityBoost = entry.priority === 'required' ? 1.5 : entry.priority === 'preferred' ? 1.2 : 1;
    return {
      ...entry,
      jobDescriptionCount: corpusCount,
      tfIdfScore: Number((termFrequency * inverseDocumentFrequency * phraseBoost * priorityBoost).toFixed(4))
    };
  });

  const sortedRequirements = weightedEntries
    .filter((entry) => {
      const isStandaloneTechnicalTerm = entry.term.split(' ').length === 1 && !['keyword', 'softSkill'].includes(entry.type);
      if (isStandaloneTechnicalTerm) return true;
      return ![...entries.keys()].some((other) => other !== entry.term && other.includes(entry.term) && other.split(' ').length <= 4 && entry.jobDescriptionCount === 1);
    })
    .sort((a, b) => {
      const priority = { required: 2, preferred: 1, unspecified: 0 };
      return priority[b.priority] - priority[a.priority]
        || b.tfIdfScore - a.tfIdfScore
        || b.jobDescriptionCount - a.jobDescriptionCount
        || b.term.split(' ').length - a.term.split(' ').length;
    });
  return deduplicateRequirements(sortedRequirements).slice(0, 80);
}

function termTokens(value) {
  return new Set(normalizeTerm(value).split(' ').map((word) => word.replace(/(ing|ed|es|s)$/i, '')).filter((word) => word.length > 2));
}

function occurrenceCount(text, term, aliases = []) {
  const normalizedText = normalizeTerm(text);
  const variants = [term, ...aliases, ...[...SYNONYMS.entries()].filter(([, canonical]) => canonical === term).map(([variant]) => variant)];
  return Math.max(...variants.map((variant) => normalizedText.split(variant).length - 1));
}

export function matchRequirements(requirements, resume) {
  const sectionEntries = Object.entries(resume.sections).filter(([, text]) => text);
  return requirements.map((requirement) => {
    let resumeCount = occurrenceCount(resume.text, requirement.term, requirement.aliases);
    let status = resumeCount > 0 ? 'matched' : 'missing';
    let matchType = resumeCount > 0 ? 'exactOrEquivalent' : 'none';
    let evidence = '';
    let evidenceSection = '';

    if (requirement.type === 'experience') {
      const numberWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
      const value = requirement.term.match(/\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve/i)?.[0];
      const requested = value ? (Number(value) || numberWords[value.toLowerCase()]) : 0;
      if (requested > 0 && resume.experienceYears >= requested) {
        resumeCount = 1;
        status = 'matched';
        matchType = 'calculatedExperience';
        evidence = `${resume.experienceYears} years explicitly detected in the resume`;
        evidenceSection = 'experience';
      }
    }

    if (requirement.type === 'education' && resume.sections.education) {
      const degree = requirement.term.match(/bachelor|master|ph\.?d|doctorate|associate|diploma/i)?.[0];
      if (!degree || new RegExp(degree, 'i').test(resume.sections.education)) {
        resumeCount = 1;
        status = 'matched';
        matchType = 'educationLevel';
        evidence = resume.sections.education.split(/\r?\n/)[0]?.slice(0, 240) ?? 'Education section';
        evidenceSection = 'education';
      }
    }

    if (resumeCount > 0 && !evidence) {
      const strongestSection = ['experience', 'projects', 'summary', 'skills', 'education', 'certifications']
        .find((section) => occurrenceCount(resume.sections[section] || '', requirement.term, requirement.aliases) > 0);
      const searchableText = strongestSection ? resume.sections[strongestSection] : resume.text;
      const line = searchableText.split(/\r?\n/).find((value) => occurrenceCount(value, requirement.term, requirement.aliases) > 0);
      evidence = line?.trim().slice(0, 240) ?? requirement.term;
      evidenceSection = strongestSection ?? sectionEntries.find(([, text]) => occurrenceCount(text, requirement.term, requirement.aliases) > 0)?.[0] ?? 'resume';
    } else {
      const requiredTokens = termTokens(requirement.term);
      let best = { overlap: 0, line: '' };
      for (const line of resume.text.split(/\r?\n/)) {
        const lineTokens = termTokens(line);
        const overlap = [...requiredTokens].filter((token) => lineTokens.has(token)).length / Math.max(requiredTokens.size, 1);
        if (overlap > best.overlap) best = { overlap, line };
      }
      if (best.overlap >= 0.6) {
        status = best.overlap >= 0.9 ? 'matched' : 'partial';
        matchType = best.overlap >= 0.9 ? 'contextualEvidence' : 'relatedTerms';
        evidence = best.line.trim().slice(0, 240);
      }
    }

    const evidenceStrength = ({ experience: 1, projects: 0.9, summary: 0.7, skills: 0.5, education: 1, certifications: 1, resume: 0.4 })[evidenceSection] ?? 0.5;
    const lexicalCoverage = status === 'matched' ? 1 : status === 'partial' ? 0.6 : 0;
    const coverage = lexicalCoverage * evidenceStrength;
    if (status === 'matched' && evidenceStrength < 0.7 && requirement.priority === 'required') status = 'partial';
    return { ...requirement, status, matchType, resumeCount, coverage, lexicalCoverage, evidenceStrength, evidence, evidenceSection };
  });
}
