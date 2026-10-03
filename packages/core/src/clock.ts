import { PRE_MATCH, position, type MatchPosition } from './position';

/**
 * Where a viewer's sense of "now" comes from.
 * - `player`: a video playhead (Fire TV). Pausing and seeking are handled by the player itself.
 * - `manual`: a wall clock the viewer starts by tapping at kick-off, with pause and nudges.
 * - `linked`: follows another viewer's clock, e.g. a phone paired with the living-room TV.
 */
export type ClockSource = 'player' | 'manual' | 'linked';

/** The local time reading (playhead ms or wall-clock ms) at which a period started. */
export interface PeriodAnchor {
  readonly period: number;
  readonly localStartMs: number;
}

export interface ViewerClock {
  /** Sorted by period, and therefore by `localStartMs`. */
  readonly anchors: readonly PeriodAnchor[];
  /** Manual clocks only: local time at which the viewer paused, or null while running. */
  readonly pausedAtMs: number | null;
}

export const UNSYNCED: ViewerClock = Object.freeze({ anchors: [], pausedAtMs: null });

export function isSynced(clock: ViewerClock): boolean {
  return clock.anchors.length > 0;
}

export function isPaused(clock: ViewerClock): boolean {
  return clock.pausedAtMs !== null;
}

export function currentPeriod(clock: ViewerClock): number {
  return clock.anchors.at(-1)?.period ?? 0;
}

/**
 * Records that `period` started at local time `localMs`. Marking a period again corrects it.
 * Anchors that would contradict the new one are dropped: an earlier period cannot start after it,
 * and a later period cannot start before it.
 */
export function markPeriodStart(clock: ViewerClock, period: number, localMs: number): ViewerClock {
  const kept = clock.anchors.filter(
    (a) =>
      (a.period < period && a.localStartMs < localMs) ||
      (a.period > period && a.localStartMs > localMs),
  );
  const anchors = [...kept, { period, localStartMs: localMs }].sort((a, b) => a.period - b.period);
  return { ...clock, anchors };
}

export function positionAt(clock: ViewerClock, localMs: number): MatchPosition {
  const at = clock.pausedAtMs ?? localMs;
  let active: PeriodAnchor | undefined;
  for (const anchor of clock.anchors) {
    if (anchor.localStartMs <= at) active = anchor;
  }
  return active ? position(active.period, at - active.localStartMs) : PRE_MATCH;
}

export function pause(clock: ViewerClock, localMs: number): ViewerClock {
  return clock.pausedAtMs === null ? { ...clock, pausedAtMs: localMs } : clock;
}

/** Resuming shifts every anchor by the paused duration, so the match position picks up where it stopped. */
export function resume(clock: ViewerClock, localMs: number): ViewerClock {
  if (clock.pausedAtMs === null) return clock;
  const pausedFor = localMs - clock.pausedAtMs;
  return {
    anchors: clock.anchors.map((a) => ({ ...a, localStartMs: a.localStartMs + pausedFor })),
    pausedAtMs: null,
  };
}

/**
 * Corrects drift. A positive delta moves the viewer's position forward
 * ("I'm actually 5 seconds further on").
 */
export function nudge(clock: ViewerClock, deltaMs: number): ViewerClock {
  return {
    ...clock,
    anchors: clock.anchors.map((a) => ({ ...a, localStartMs: a.localStartMs - deltaMs })),
  };
}
