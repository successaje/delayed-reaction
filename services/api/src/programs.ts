import { programSchema, type ProgramDto } from '@delayed-reaction/core';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

/**
 * Loads the program catalog. Relative media URLs are resolved against `mediaBaseUrl`, so the
 * same catalog works locally (served by the web app) and in production (served by a CDN).
 */
export function loadPrograms(path: string, mediaBaseUrl: string): ProgramDto[] {
  return resolvePrograms(JSON.parse(readFileSync(path, 'utf8')), mediaBaseUrl);
}

/** Validates a catalog and resolves its relative media URLs. */
export function resolvePrograms(raw: unknown, mediaBaseUrl: string): ProgramDto[] {
  const programs = z.array(programSchema).parse(raw);
  return programs.map((program) => ({
    ...program,
    mediaUrl: resolve(program.mediaUrl, mediaBaseUrl),
    posterUrl: program.posterUrl ? resolve(program.posterUrl, mediaBaseUrl) : null,
  }));
}

function resolve(url: string, base: string): string {
  if (/^https?:\/\//.test(url) || !base) return url;
  return new URL(url.replace(/^\//, ''), withSlash(base)).href;
}

function withSlash(base: string): string {
  return base.endsWith('/') ? base : `${base}/`;
}
