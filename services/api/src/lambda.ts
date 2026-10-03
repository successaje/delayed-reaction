import { handle } from 'hono/aws-lambda';
import programs from '../data/programs.json';
import { createApp } from './app';
import { resolvePrograms } from './programs';
import { storeFromEnv } from './store';

/**
 * AWS Lambda entry, behind an API Gateway HTTP API. The catalog is bundled into the function;
 * media URLs resolve against MEDIA_BASE_URL (the CloudFront distribution).
 */
const app = createApp({
  store: storeFromEnv(),
  now: Date.now,
  programs: resolvePrograms(programs, process.env.MEDIA_BASE_URL ?? ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});

export const handler = handle(app);
