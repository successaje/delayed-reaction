import { describe, expect, it } from 'vitest';
import { clampUntil, MAX_PROJECTION_MS, position, PREFETCH_MS, PRE_MATCH } from '../src';

const report = (ms: number, playing: boolean, reportedAt: number) => ({
  position: position(1, ms),
  playing,
  reportedAt,
});

describe('spoiler gate', () => {
  it('gives an unsynced device nothing past pre-match', () => {
    expect(clampUntil(position(2, 0), null, 0)).toEqual(PRE_MATCH);
  });

  it('lets a device fetch at most its position plus the prefetch window', () => {
    const until = clampUntil(position(2, 0), report(60_000, false, 0), 30_000);
    expect(until).toEqual(position(1, 60_000 + PREFETCH_MS));
  });

  it('projects a playing device forward by the time since its report', () => {
    const until = clampUntil(position(2, 0), report(60_000, true, 1_000), 3_000);
    expect(until).toEqual(position(1, 62_000 + PREFETCH_MS));
  });

  it('never projects a stale report beyond the projection cap', () => {
    const until = clampUntil(position(2, 0), report(60_000, true, 0), 3_600_000);
    expect(until).toEqual(position(1, 60_000 + MAX_PROJECTION_MS + PREFETCH_MS));
  });

  it('honours requests that are already within the gate', () => {
    expect(clampUntil(position(1, 10), report(60_000, true, 0), 0)).toEqual(position(1, 10));
  });

  it('does not let the prefetch window reach into the next period', () => {
    const until = clampUntil(position(3, 0), report(2_700_000, false, 0), 0);
    expect(until.period).toBe(1);
  });
});
