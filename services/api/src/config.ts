import { fileURLToPath } from 'node:url';

/** Process configuration, read once from the environment. See `.env.example`. */
export const config = {
  port: Number(process.env.PORT ?? 8787),
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  programsPath:
    process.env.PROGRAMS_PATH ?? fileURLToPath(new URL('../data/programs.json', import.meta.url)),
  mediaBaseUrl: process.env.MEDIA_BASE_URL ?? 'http://localhost:3000/media/',
};
