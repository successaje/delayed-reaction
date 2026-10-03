import { addMs, estimateGapMs, type MatchPosition } from './position';
import type { Sport } from './sport';

/** What a viewer last told the server about their clock. */
export interface PositionReport {
  readonly position: MatchPosition;
  readonly playing: boolean;
  /** Server wall-clock time of the report, epoch ms. */
  readonly reportedAt: number;
}

/** A viewer who hasn't reported for this long is shown as away rather than at a stale position. */
export const AWAY_AFTER_MS = 60_000;
/** Viewers closer than this are "watching with you". */
export const LEVEL_WITHIN_MS = 15_000;

/**
 * Where a viewer probably is now, assuming they kept playing since their last report.
 * `capMs` bounds how far a stale report may be projected.
 */
export function extrapolate(report: PositionReport, now: number, capMs = Infinity): MatchPosition {
  if (!report.playing || report.position.period === 0) return report.position;
  return addMs(report.position, Math.min(capMs, Math.max(0, now - report.reportedAt)));
}

export function isAway(report: PositionReport | null, now: number): boolean {
  return !report || now - report.reportedAt > AWAY_AFTER_MS;
}

export type Relation = 'ahead' | 'behind' | 'level';

export interface RelativePosition {
  readonly relation: Relation;
  /** Estimated distance in match time, always positive. */
  readonly gapMs: number;
}

/** How `them` relates to `me`: "Ada is 38 min ahead of you". */
export function relativeTo(me: MatchPosition, them: MatchPosition, sport: Sport): RelativePosition {
  const gap = estimateGapMs(me, them, sport);
  if (Math.abs(gap) < LEVEL_WITHIN_MS) return { relation: 'level', gapMs: Math.abs(gap) };
  return { relation: gap > 0 ? 'ahead' : 'behind', gapMs: Math.abs(gap) };
}

/** "38 min", "45 s", "1 h 12 min". Rounded for people, not for machines. */
export function formatGap(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
