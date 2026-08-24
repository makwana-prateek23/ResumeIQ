import { MongoClient } from 'mongodb';
import env from '../config/env.js';

let connectionPromise;

async function connect() {
  if (!env.databaseUrl) throw Object.assign(new Error('MongoDB Atlas is not configured'), { status: 503 });
  const client = new MongoClient(env.databaseUrl, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const database = client.db(env.databaseName);
  await Promise.all([
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('oauthAccounts').createIndex({ provider: 1, providerId: 1 }, { unique: true }),
    database.collection('oauthAccounts').createIndex({ userId: 1 }),
    database.collection('jobBenchmarks').createIndex({ hash: 1 }, { unique: true }),
    database.collection('jobBenchmarks').createIndex({ companyName: 1, targetRole: 1, updatedAt: -1 }),
    database.collection('atsProfiles').createIndex({ email: 1, targetRoleKey: 1 }, { unique: true })
  ]);
  return database;
}

export function getDatabase() {
  connectionPromise ??= connect().catch((error) => { connectionPromise = undefined; throw error; });
  return connectionPromise;
}
