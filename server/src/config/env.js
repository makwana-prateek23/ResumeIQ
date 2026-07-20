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
  JWT_SECRET: optionalSecret(32),
  OPENAI_API_KEY: optionalSecret()
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
  jwtSecret: values.JWT_SECRET,
  openAiApiKey: values.OPENAI_API_KEY
});

export default env;
