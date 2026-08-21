import 'dotenv/config';
import { z } from 'zod';

const optionalSecret = (minimumLength = 1) => z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().min(minimumLength).optional()
);

const result = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  DATABASE_URL: z.preprocess((value) => value === '' ? undefined : value, z.string().url().optional()),
  MONGODB_DB_NAME: z.string().trim().min(1).default('resumeiq'),
  JWT_SECRET: optionalSecret(32),
  OPENAI_API_KEY: optionalSecret(),
  API_BASE_URL: z.string().url().default('http://localhost:5000'),
  CLIENT_APP_URL: z.string().url().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: optionalSecret(), GOOGLE_CLIENT_SECRET: optionalSecret(),
  GITHUB_CLIENT_ID: optionalSecret(), GITHUB_CLIENT_SECRET: optionalSecret(),
  LINKEDIN_CLIENT_ID: optionalSecret(), LINKEDIN_CLIENT_SECRET: optionalSecret()
}).safeParse(process.env);

if (!result.success) {
  const details = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

const values = result.data;
const env = Object.freeze({
  nodeEnv: values.NODE_ENV,
  port: values.PORT,
  allowedOrigins: values.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  trustProxy: values.TRUST_PROXY === 'true',
  databaseUrl: values.DATABASE_URL,
  databaseName: values.MONGODB_DB_NAME,
  jwtSecret: values.JWT_SECRET,
  openAiApiKey: values.OPENAI_API_KEY,
  apiBaseUrl: values.API_BASE_URL,
  clientAppUrl: values.CLIENT_APP_URL,
  oauth: {
    google: { clientId: values.GOOGLE_CLIENT_ID, clientSecret: values.GOOGLE_CLIENT_SECRET },
    github: { clientId: values.GITHUB_CLIENT_ID, clientSecret: values.GITHUB_CLIENT_SECRET },
    linkedin: { clientId: values.LINKEDIN_CLIENT_ID, clientSecret: values.LINKEDIN_CLIENT_SECRET }
  }
});

export default env;
