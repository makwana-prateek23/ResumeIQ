const SECTION_BY_TYPE = {
  hardSkill: 'experience or projects',
  softSkill: 'experience achievement',
  certification: 'certifications',
  education: 'education',
  experience: 'professional experience',
  keyword: 'most relevant experience bullet'
};

const TYPE_WEIGHT = {
  certification: 5,
  hardSkill: 4,
  experience: 4,
  education: 3,
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
  keyword: { primarySection: 'Experience', supportingSection: 'Projects', missingPart: 'JD terminology in an achievement bullet' }
};

function priorityScore(item) {
  const priority = item.priority === 'required' ? 30 : item.priority === 'preferred' ? 20 : 10;
  const status = item.status === 'missing' ? 20 : item.status === 'partial' ? 12 : item.coverage < 1 ? 5 : 0;
  return priority + status + (TYPE_WEIGHT[item.type] ?? 0)
    + Math.min(item.jobDescriptionCount, 5)
    + Math.min(Math.round((item.tfIdfScore ?? 0) * 2), 10);
}

function actionFor(item) {
  const section = SECTION_BY_TYPE[item.type] ?? 'most relevant resume section';
  if (item.status === 'missing') {
    return {
      action: 'addKeyword',
      guidance: `Add "${item.term}" to ${section}.`,
      bulletPrompt: `[Action verb] used ${item.term} to [task or responsibility], resulting in [measurable outcome].`
    };
  }
  if (item.status === 'partial') {
    return {
      action: 'clarifyWording',
      guidance: `Replace the related wording with the exact JD term "${item.term}" in ${section}.`,
      bulletPrompt: `Rewrite with "${item.term}": ${item.evidence || '[existing resume bullet]'}`
    };
  }
  if (item.evidenceSection === 'summary' || item.evidenceSection === 'skills') {
    return {
      action: 'substantiate',
      guidance: `Add "${item.term}" to an experience or project bullet, not only ${item.evidenceSection}.`,
      bulletPrompt: `[Action verb] used ${item.term} to [task], improving [result].`
    };
  }
  return {
    action: 'keepEvidence',
    guidance: `Keep the existing evidence for “${item.term}” and preserve the wording when tailoring.`,
    bulletPrompt: null
  };
}

export function buildTailoringPlan(analysis) {
  const keywordActions = analysis.requirements
    .map((item) => ({
      term: item.term,
      type: item.type,
      priority: item.priority,
      status: item.status,
      importance: priorityScore(item),
      tfIdfScore: item.tfIdfScore,
      recommendedSection: SECTION_BY_TYPE[item.type] ?? 'relevant resume section',
      location: GAP_LOCATION_BY_TYPE[item.type] ?? GAP_LOCATION_BY_TYPE.keyword,
      evidence: item.evidence || null,
      ...actionFor(item)
    }))
    .filter((item) => item.action !== 'keepEvidence' || item.priority === 'required')
    .sort((a, b) => b.importance - a.importance)
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
