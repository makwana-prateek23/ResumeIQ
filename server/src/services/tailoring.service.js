const SECTION_BY_TYPE = {
  hardSkill: 'experience or projects',
  softSkill: 'experience achievement',
  certification: 'certifications',
  education: 'education',
  workAuthorization: 'work authorization or additional information',
  responsibility: 'most relevant experience bullet',
  domainKnowledge: 'experience or projects',
  experience: 'professional experience',
  keyword: 'most relevant experience bullet'
};

const TYPE_WEIGHT = {
  certification: 5,
  workAuthorization: 5,
  hardSkill: 4,
  experience: 4,
  education: 3,
  responsibility: 4,
  domainKnowledge: 4,
  softSkill: 2,
  keyword: 1
};

const GAP_LOCATION_BY_TYPE = {
  hardSkill: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'skill name and usage evidence' },
  programmingLanguage: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'language name and implementation evidence' },
  framework: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'framework name and project evidence' },
  cloudTechnology: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'platform/service name and deployment evidence' },
  database: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'database name and data-work evidence' },
  devOpsTool: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'tool name and delivery/operations evidence' },
  testingTool: { primarySection: 'Technical Skills', supportingSection: 'Experience or Projects', missingPart: 'testing tool and quality outcome' },
  methodology: { primarySection: 'Technical Skills', supportingSection: 'Experience', missingPart: 'methodology and responsibility evidence' },
  experience: { primarySection: 'Professional Summary', supportingSection: 'Experience', missingPart: 'required years or relevant responsibility evidence' },
  certification: { primarySection: 'Certifications', supportingSection: null, missingPart: 'certification name and issuer' },
  education: { primarySection: 'Education', supportingSection: null, missingPart: 'degree, field, or qualification' },
  workAuthorization: { primarySection: 'Work Authorization', supportingSection: 'Header or Additional Information', missingPart: 'verified authorization status using truthful wording' },
  responsibility: { primarySection: 'Experience', supportingSection: 'Projects', missingPart: 'responsibility evidence with scope and outcome' },
  domainKnowledge: { primarySection: 'Experience', supportingSection: 'Professional Summary', missingPart: 'domain-specific evidence and context' },
  keyword: { primarySection: 'Experience', supportingSection: 'Projects', missingPart: 'JD terminology in an achievement bullet' }
};

const LOCATION_STOP_WORDS = new Set('a an and are as at be by for from has have in into is it of on or that the this to using with years experience required preferred knowledge'.split(' '));
const TECHNICAL_TYPES = new Set(['hardSkill', 'programmingLanguage', 'framework', 'cloudTechnology', 'database', 'devOpsTool', 'testingTool', 'methodology']);

function tokens(value) {
  return new Set(String(value).toLowerCase().match(/[a-z0-9+#.]{2,}/g)?.filter((token) => !LOCATION_STOP_WORDS.has(token)) ?? []);
}

function contextualSimilarity(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.sqrt(leftTokens.size * rightTokens.size);
}

function bestResumeElement(source, resume, sectionNames) {
  const candidates = sectionNames.flatMap((section) => (resume.sections[section] || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•▪◦*]|\d+[.)])\s*/, '').trim())
    .filter((line) => line.length >= 20)
    .map((line) => ({ section, line, score: contextualSimilarity(source, line) })));
  return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
}

function labelSection(section) {
  return ({ summary: 'Professional Summary', skills: 'Technical Skills', experience: 'Experience', projects: 'Projects', education: 'Education', certifications: 'Certifications' })[section] ?? section;
}

function locateGap(item, resume) {
  const fallback = GAP_LOCATION_BY_TYPE[item.type] ?? GAP_LOCATION_BY_TYPE.keyword;
  if (item.status === 'partial' && item.evidence) {
    return {
      ...fallback,
      primarySection: labelSection(item.evidenceSection),
      targetElement: item.evidence,
      placementReason: 'This existing text is the closest detected evidence for the JD requirement.',
      confidence: 'high',
      method: 'existing partial-match evidence'
    };
  }

  const supportingSections = item.type === 'experience' ? ['experience', 'summary'] : ['experience', 'projects'];
  const best = bestResumeElement(item.source, resume, supportingSections);
  const hasReliableElement = best && best.score >= 0.12;
  const primarySection = TECHNICAL_TYPES.has(item.type)
    ? (resume.sections.skills ? 'Technical Skills' : 'New Technical Skills section')
    : hasReliableElement ? labelSection(best.section) : fallback.primarySection;

  return {
    ...fallback,
    primarySection,
    supportingSection: hasReliableElement ? labelSection(best.section) : fallback.supportingSection,
    targetElement: hasReliableElement ? best.line : null,
    placementReason: hasReliableElement
      ? 'This resume element has the strongest contextual overlap with the JD sentence containing the requirement.'
      : 'No sufficiently related existing bullet was found; add a new evidence bullet instead of modifying an unrelated one.',
    confidence: hasReliableElement ? (best.score >= 0.25 ? 'high' : 'medium') : 'low',
    method: hasReliableElement ? 'JD-to-resume contextual similarity' : 'section fallback'
  };
}

function priorityScore(item) {
  const priority = item.priority === 'required' ? 30 : item.priority === 'preferred' ? 20 : 10;
  const status = item.status === 'missing' ? 20 : item.status === 'partial' ? 12 : item.coverage < 1 ? 5 : 0;
  return priority + status + (TYPE_WEIGHT[item.type] ?? 0)
    + Math.min(item.jobDescriptionCount, 5)
    + Math.min(Math.round((item.tfIdfScore ?? 0) * 2), 10);
}

function actionFor(item, location) {
  const section = location.primarySection ?? SECTION_BY_TYPE[item.type] ?? 'most relevant resume section';
  if (item.type === 'workAuthorization') {
    return {
      action: item.status === 'missing' ? 'confirmationRequired' : 'keepEvidence',
      suggestionType: 'confirmation',
      guidance: item.status === 'missing'
        ? `Confirmation required: select your work-authorization status and place it in ${section}.`
        : `Keep the verified work-authorization evidence in ${section}.`,
      originalText: location.targetElement ?? null,
      suggestedText: `Work Authorization: [select your actual status]`,
      inputsNeeded: ['Actual work-authorization status'],
      bulletPrompt: null
    };
  }
  if (item.type === 'education' && item.status === 'missing') {
    return {
      action: 'verifyEducation',
      suggestionType: 'confirmation',
      guidance: `Confirmation required: the JD requests ${item.term}. Select the matching earned qualification, if applicable.`,
      originalText: location.targetElement ?? null,
      suggestedText: `[Degree] in [Field] | [Institution] | [Graduation year]`,
      inputsNeeded: ['Earned degree', 'Field of study', 'Institution', 'Graduation year'],
      bulletPrompt: null
    };
  }
  if (item.status === 'missing') {
    const reviseExisting = Boolean(location.targetElement);
    const suggestedText = reviseExisting
      ? `${location.targetElement.replace(/[.!]?$/, '')}; used ${item.term} to [describe how], improving [metric or business result].`
      : `[Action verb] used ${item.term} to [task or responsibility], resulting in [measurable outcome].`;
    return {
      action: reviseExisting ? 'reviseExistingBullet' : 'addNewBullet',
      suggestionType: reviseExisting ? 'revise existing bullet' : 'add new bullet',
      guidance: reviseExisting
        ? `Revise the identified bullet in ${section} to include "${item.term}" with supporting context.`
        : `Add a new bullet under the most relevant role or project in ${section}.`,
      originalText: location.targetElement ?? null,
      suggestedText,
      inputsNeeded: ['How the requirement was used', 'Task or scope', 'Measurable result'],
      bulletPrompt: suggestedText
    };
  }
  if (item.status === 'partial') {
    const originalText = item.evidence || location.targetElement || null;
    const suggestedText = originalText
      ? originalText.replace(new RegExp(item.matchedAlias || item.term, 'i'), item.term)
      : `[Action verb] used ${item.term} to [task], resulting in [measurable outcome].`;
    return {
      action: 'clarifyWording',
      suggestionType: 'revise existing text',
      guidance: `Replace the related wording with the exact JD term "${item.term}" in ${section}.`,
      originalText,
      suggestedText,
      inputsNeeded: ['Confirm the JD term accurately describes the existing evidence'],
      bulletPrompt: suggestedText
    };
  }
  if (item.evidenceSection === 'summary' || item.evidenceSection === 'skills') {
    const suggestedText = `[Action verb] used ${item.term} to [task], improving [measurable result].`;
    return {
      action: 'substantiate',
      suggestionType: 'add evidence bullet',
      guidance: `Add "${item.term}" to an experience or project bullet, not only ${item.evidenceSection}.`,
      originalText: item.evidence || null,
      suggestedText,
      inputsNeeded: ['Relevant role or project', 'How it was used', 'Measurable result'],
      bulletPrompt: suggestedText
    };
  }
  return {
    action: 'keepEvidence',
    guidance: `Keep the existing evidence for “${item.term}” and preserve the wording when tailoring.`,
    bulletPrompt: null
  };
}

export function buildTailoringPlan(analysis, resume) {
  const seenActions = new Set();
  const keywordActions = analysis.requirements
    .map((item) => {
      const location = locateGap(item, resume);
      return {
        term: item.term,
        type: item.type,
        priority: item.priority,
        status: item.status,
        importance: priorityScore(item),
        tfIdfScore: item.tfIdfScore,
        recommendedSection: location.primarySection,
        location,
        evidence: item.evidence || null,
        ...actionFor(item, location)
      };
    })
    .filter((item) => item.action !== 'keepEvidence' || item.priority === 'required')
    .sort((a, b) => b.importance - a.importance)
    .filter((item) => {
      const key = item.term.toLowerCase().replace(/^(?:deep|focus(?:ed)?(?: on)?|some)\s+/, '').trim();
      if (seenActions.has(key)) return false;
      seenActions.add(key);
      return true;
    })
    .slice(0, 15);

  const sectionActions = [];
  if (!analysis.resumeQuality.checks.measurableResults) {
    sectionActions.push({
      section: 'experience',
      priority: 'high',
      action: 'Add metrics to achievement bullets: scale, time, cost, revenue, quality, uptime, volume, or percentage improvement.'
    });
  }
  if (!analysis.resumeQuality.checks.scannableBullets) {
    sectionActions.push({
      section: 'experience',
      priority: 'medium',
      action: 'Use concise, text-readable bullets beginning with strong action verbs.'
    });
  }

  return {
    summary: {
      totalRequirements: analysis.requirements.length,
      matched: analysis.matched.length,
      partial: analysis.partiallyMatched.length,
      missing: analysis.missing.length,
      highPriorityMissing: analysis.missing.filter((item) => item.priority === 'required').length
    },
    keywordActions,
    sectionActions
  };
}
