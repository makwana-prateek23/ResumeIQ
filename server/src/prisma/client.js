import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import env from '../config/env.js';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required when the database client is used');
}

const adapter = new PrismaPg({ connectionString: env.databaseUrl });
const prisma = new PrismaClient({ adapter });

export default prisma;
