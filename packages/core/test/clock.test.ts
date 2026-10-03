import { describe, expect, it } from 'vitest';
import {
  markPeriodStart,
  nudge,
  pause,
  position,
  positionAt,
  resume,
  UNSYNCED,
  PRE_MATCH,
} from '../src';

describe('viewer clock', () => {
  it('is pre-match until kick-off is marked', () => {
    expect(positionAt(UNSYNCED, 1_000)).toEqual(PRE_MATCH);
  });

  it('measures time into the current period from its anchor', () => {
    let clock = markPeriodStart(UNSYNCED, 1, 10_000);
    expect(positionAt(clock, 70_000)).toEqual(position(1, 60_000));
    clock = markPeriodStart(clock, 2, 3_000_000);
    expect(positionAt(clock, 3_005_000)).toEqual(position(2, 5_000));
    // Half-time: still in the first period until the second is marked.
    expect(positionAt(clock, 2_900_000)).toEqual(position(1, 2_890_000));
  });

  it('freezes while paused and resumes where it stopped', () => {
    let clock = markPeriodStart(UNSYNCED, 1, 0);
    clock = pause(clock, 60_000);
    expect(positionAt(clock, 600_000)).toEqual(position(1, 60_000));
    clock = resume(clock, 600_000);
    expect(positionAt(clock, 610_000)).toEqual(position(1, 70_000));
  });

  it('treats repeated pause and resume as no-ops', () => {
    const running = markPeriodStart(UNSYNCED, 1, 0);
    expect(resume(running, 5)).toBe(running);
    const paused = pause(running, 10);
    expect(pause(paused, 99)).toBe(paused);
  });

  it('nudges forward and backward', () => {
    const clock = markPeriodStart(UNSYNCED, 1, 0);
    expect(positionAt(nudge(clock, 5_000), 60_000)).toEqual(position(1, 65_000));
    expect(positionAt(nudge(clock, -5_000), 60_000)).toEqual(position(1, 55_000));
  });

  it('re-marking a period corrects it and drops contradictory anchors', () => {
    let clock = markPeriodStart(UNSYNCED, 1, 0);
    clock = markPeriodStart(clock, 2, 1_000);
    // Kick-off was actually marked late: correct it to after the old second-half anchor.
    clock = markPeriodStart(clock, 1, 2_000);
    expect(clock.anchors).toEqual([{ period: 1, localStartMs: 2_000 }]);
  });
});
