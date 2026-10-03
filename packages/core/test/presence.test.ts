import { describe, expect, it } from 'vitest';
import { extrapolate, formatGap, getSport, isAway, position, relativeTo } from '../src';

const football = getSport('football');

describe('presence', () => {
  it('describes friends ahead, behind and level', () => {
    const me = position(1, 10 * 60_000);
    expect(relativeTo(me, position(1, 48 * 60_000), football)).toEqual({
      relation: 'ahead',
      gapMs: 38 * 60_000,
    });
    expect(relativeTo(me, position(1, 60_000), football).relation).toBe('behind');
    expect(relativeTo(me, position(1, 10 * 60_000 + 5_000), football).relation).toBe('level');
  });

  it('extrapolates only while playing', () => {
    const report = { position: position(1, 1_000), playing: true, reportedAt: 0 };
    expect(extrapolate(report, 4_000)).toEqual(position(1, 5_000));
    expect(extrapolate({ ...report, playing: false }, 4_000)).toEqual(position(1, 1_000));
  });

  it('marks quiet viewers as away', () => {
    expect(isAway(null, 0)).toBe(true);
    const report = { position: position(1, 0), playing: true, reportedAt: 0 };
    expect(isAway(report, 30_000)).toBe(false);
    expect(isAway(report, 120_000)).toBe(true);
  });

  it('formats gaps for people', () => {
    expect(formatGap(45_000)).toBe('45 s');
    expect(formatGap(38 * 60_000)).toBe('38 min');
    expect(formatGap(72 * 60_000)).toBe('1 h 12 min');
    expect(formatGap(120 * 60_000)).toBe('2 h');
  });
});
