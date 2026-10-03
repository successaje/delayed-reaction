import { addMs, min, PRE_MATCH, type MatchPosition } from './position';
import { extrapolate, type PositionReport } from './presence';

/**
 * How far past its own position a device may fetch. Small enough to never reveal a moment
 * meaningfully early, large enough to absorb network jitter so reactions land on the frame.
 */
export const PREFETCH_MS = 5_000;

/**
 * Heartbeats arrive every few seconds; a report older than this is not projected further,
 * so a device that went quiet can't fetch its way through the match.
 */
export const MAX_PROJECTION_MS = 10_000;

/**
 * The spoiler invariant, in one place: a device may receive reactions only up to where it
 * is in the match (extrapolated from its last report) plus the prefetch window.
 * A device that has never reported a position gets nothing past pre-match.
 */
export function clampUntil(
  requested: MatchPosition,
  report: PositionReport | null,
  now: number,
): MatchPosition {
  if (!report) return min(requested, PRE_MATCH);
  const ceiling = addMs(extrapolate(report, now, MAX_PROJECTION_MS), PREFETCH_MS);
  return min(requested, ceiling);
}
