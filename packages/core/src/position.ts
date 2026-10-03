import { periodSpec, type Sport } from './sport';

/**
 * A point in the match, independent of when anyone watched it.
 * `period` 0 means pre-match; `ms` is time elapsed since that period started
 * on the viewer's own broadcast.
 */
export interface MatchPosition {
  readonly period: number;
  readonly ms: number;
}

export const PRE_MATCH: MatchPosition = Object.freeze({ period: 0, ms: 0 });

export const MAX_PERIOD = 99;
/** Ten digits of milliseconds is ~115 days, far beyond any period. */
const MS_DIGITS = 10;

export function position(period: number, ms: number): MatchPosition {
  return { period, ms: Math.max(0, Math.round(ms)) };
}

export function compare(a: MatchPosition, b: MatchPosition): number {
  return a.period - b.period || a.ms - b.ms;
}

export function isBefore(a: MatchPosition, b: MatchPosition): boolean {
  return compare(a, b) < 0;
}

export function isAtOrBefore(a: MatchPosition, b: MatchPosition): boolean {
  return compare(a, b) <= 0;
}

export function max(a: MatchPosition, b: MatchPosition): MatchPosition {
  return compare(a, b) >= 0 ? a : b;
}

export function min(a: MatchPosition, b: MatchPosition): MatchPosition {
  return compare(a, b) <= 0 ? a : b;
}

/** Moves forward within the same period. Prefetch windows never cross a period boundary. */
export function addMs(p: MatchPosition, ms: number): MatchPosition {
  return position(p.period, p.ms + ms);
}

/**
 * Lexicographically sortable key, so a database can range-query reactions by position.
 * "01" + "0000083400" -> period 1, 1:23.4 into the period.
 */
export function sortKey(p: MatchPosition): string {
  if (!Number.isInteger(p.period) || p.period < 0 || p.period > MAX_PERIOD) {
    throw new RangeError(`period out of range: ${p.period}`);
  }
  return String(p.period).padStart(2, '0') + String(Math.round(p.ms)).padStart(MS_DIGITS, '0');
}

export function fromSortKey(key: string): MatchPosition {
  if (!/^\d{12}$/.test(key)) throw new RangeError(`invalid position key: ${key}`);
  return { period: Number(key.slice(0, 2)), ms: Number(key.slice(2)) };
}

/** "23:14" style clock. Minutes are not wrapped, so 1:05:09 prints as "65:09". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "1H 23:14", or "Pre-match" for period 0. */
export function formatPosition(p: MatchPosition, sport: Sport): string {
  if (p.period === 0) return 'Pre-match';
  const label = periodSpec(sport, p.period)?.label ?? `P${p.period}`;
  return `${label} ${formatClock(p.ms)}`;
}

/**
 * Estimated match time between two positions, using nominal period lengths for
 * periods in between. Positive when `b` is later than `a`.
 */
export function estimateGapMs(a: MatchPosition, b: MatchPosition, sport: Sport): number {
  if (compare(a, b) > 0) return -estimateGapMs(b, a, sport);
  if (a.period === b.period) return b.ms - a.ms;
  const nominal = (period: number) => periodSpec(sport, period)?.nominalMs ?? 0;
  let gap = Math.max(0, nominal(a.period) - a.ms);
  for (let p = a.period + 1; p < b.period; p++) gap += nominal(p);
  return gap + b.ms;
}
