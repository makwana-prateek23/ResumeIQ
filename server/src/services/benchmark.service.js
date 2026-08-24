import { createHash } from 'node:crypto';
import { getDatabase } from '../database/mongodb.js';

function normalized(value = '') {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function contentHash(...values) {
  return createHash('sha256').update(values.map(normalized).join('\n')).digest('hex');
}

export async function saveJobBenchmark({ companyName, jobDescription, analysis, userId }) {
  const database = await getDatabase();
  const now = new Date();
  const company = companyName?.trim() || null;
  const targetRole = analysis.jobTitle?.target || analysis.roleSuitability?.targetRole || null;
  const hash = contentHash(company || 'unidentified', jobDescription);
  await database.collection('jobBenchmarks').updateOne(
    { hash },
    {
      $set: {
        companyName: company,
        targetRole,
        jobDescription,
        requirements: analysis.requirements.map(({ term, type, priority, source }) => ({ term, type, priority, source })),
        updatedAt: now
      },
      $setOnInsert: { hash, submittedBy: userId, createdAt: now },
      $inc: { submissionCount: 1 }
    },
    { upsert: true }
  );
  return { saved: true, companyName: company, targetRole };
}

export async function saveConsentedAtsProfile({ editorData, analysis }) {
  const name = editorData.name?.trim() || null;
  const email = normalized(editorData.email);
  const targetRole = editorData.role?.trim() || null;
  if (!email) return { saved: false, reason: 'No email address could be extracted from the resume.' };

  const database = await getDatabase();
  const now = new Date();
  const result = await database.collection('atsProfiles').updateOne(
    { email, targetRoleKey: normalized(targetRole || '') },
    {
      $set: {
        name,
        email,
        targetRole,
        targetRoleKey: normalized(targetRole || ''),
        atsScore: analysis.atsScore,
        scoreBreakdown: analysis.scoreBreakdown,
        improvementKeys: analysis.improvementChecks.map((check) => check.key),
        consentedAt: now,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now },
      $inc: { checkCount: 1 }
    },
    { upsert: true }
  );
  return { saved: true, profileId: String(result.upsertedId || '') || undefined };
}

export async function findRelevantCompanyBenchmarks(targetRole, limit = 20) {
  if (!targetRole?.trim()) return [];
  const database = await getDatabase();
  const tokens = normalized(targetRole).split(' ').filter((token) => token.length > 2).slice(0, 6);
  if (!tokens.length) return [];
  const rolePattern = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return database.collection('jobBenchmarks')
    .find({ companyName: { $ne: null }, targetRole: { $regex: rolePattern, $options: 'i' } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}
