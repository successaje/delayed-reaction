import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadPrograms } from '../src/programs';

const path = fileURLToPath(new URL('../data/programs.json', import.meta.url));

describe('the shipped catalog', () => {
  const programs = loadPrograms(path, 'https://media.example');

  it('validates and resolves media against the CDN', () => {
    expect(programs.length).toBeGreaterThanOrEqual(2);
    for (const program of programs) expect(program.mediaUrl).toMatch(/^https:\/\/media\.example\//);
  });

  it('has period markers in order and inside the media', () => {
    for (const program of programs) {
      const times = program.markers.map((m) => m.mediaMs);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(program.markers.map((m) => m.period)).toEqual(program.markers.map((_, i) => i + 1));
      expect(times.at(-1)!).toBeLessThan(program.durationMs);
    }
  });

  it('credits every piece of footage', () => {
    for (const program of programs) expect(program.credit.author.length).toBeGreaterThan(0);
  });
});
