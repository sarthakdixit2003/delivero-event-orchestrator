import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  DB_HOST: requireEnv('DB_HOST'),
  DB_PORT: Number(requireEnv('DB_PORT')),
  DB_USER: requireEnv('DB_USER'),
  DB_PASSWORD: requireEnv('DB_PASSWORD'),
  DB_NAME: requireEnv('DB_NAME'),
  REDIS_HOST: requireEnv('REDIS_HOST'),
  REDIS_PORT: Number(requireEnv('REDIS_PORT')),
  TRANSFORM_API_BASE_URL: requireEnv('TRANSFORM_API_BASE_URL'),
};
