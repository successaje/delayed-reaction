import { describe, expect, it } from 'vitest';
import {
  compare,
  estimateGapMs,
  formatPosition,
  fromSortKey,
  getSport,
  position,
  sortKey,
} from '../src';

const football = getSport('football');

describe('match positions', () => {
  it('orders by period, then by time into the period', () => {
    expect(compare(position(1, 50_000), position(2, 0))).toBeLessThan(0);
    expect(compare(position(2, 10), position(2, 5))).toBeGreaterThan(0);
    expect(compare(position(1, 7), position(1, 7))).toBe(0);
  });

  it('produces sort keys whose string order matches match order', () => {
    const positions = [position(2, 0), position(1, 2_820_000), position(1, 9), position(0, 0)];
    const byKey = [...positions].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const byMatch = [...positions].sort(compare);
    expect(byKey).toEqual(byMatch);
  });

  it('round-trips sort keys', () => {
    const p = position(3, 1_234_567);
    expect(fromSortKey(sortKey(p))).toEqual(p);
  });

  it('rejects malformed sort keys and out-of-range periods', () => {
    expect(() => fromSortKey('1x')).toThrow(RangeError);
    expect(() => sortKey({ period: 100, ms: 0 })).toThrow(RangeError);
  });

  it('formats positions the way a broadcast would', () => {
    expect(formatPosition(position(1, 23 * 60_000 + 14_900), football)).toBe('1H 23:14');
    expect(formatPosition(position(2, 47 * 60_000), football)).toBe('2H 47:00');
    expect(formatPosition(position(0, 0), football)).toBe('Pre-match');
  });

  it('estimates gaps across periods using nominal period lengths', () => {
    const a = position(1, 40 * 60_000);
    const b = position(2, 10 * 60_000);
    expect(estimateGapMs(a, b, football)).toBe(15 * 60_000);
    expect(estimateGapMs(b, a, football)).toBe(-15 * 60_000);
  });
});
