import {
  extrapolate,
  isPaused,
  isSynced,
  markPeriodStart,
  nudge,
  pause,
  positionAt,
  resume,
  UNSYNCED,
  type MatchPosition,
  type PeriodAnchor,
  type PositionReport,
  type ViewerClock,
} from '@delayed-reaction/core';

/** Where a device is in the match right now. */
export interface Playhead {
  readonly position: MatchPosition;
  readonly playing: boolean;
}

export type PlayheadReader = () => Playhead;

/**
 * A wall-clock based match clock for people watching on a screen we don't control.
 * They tap at kick-off (and each new period); the controller handles pause and nudges.
 */
export class ManualClock {
  private state: ViewerClock;

  constructor(
    initial: ViewerClock = UNSYNCED,
    private readonly now: () => number = Date.now,
    private readonly onChange?: (clock: ViewerClock) => void,
  ) {
    this.state = initial;
  }

  get clock(): ViewerClock {
    return this.state;
  }

  get synced(): boolean {
    return isSynced(this.state);
  }

  get paused(): boolean {
    return isPaused(this.state);
  }

  read: PlayheadReader = () => ({
    position: positionAt(this.state, this.now()),
    playing: this.synced && !this.paused,
  });

  markPeriodStart(period: number): void {
    // Marking a period while paused would anchor it to a frozen clock; resume first.
    const running = resume(this.state, this.now());
    this.set(markPeriodStart(running, period, this.now()));
  }

  pause(): void {
    this.set(pause(this.state, this.now()));
  }

  resume(): void {
    this.set(resume(this.state, this.now()));
  }

  nudge(deltaMs: number): void {
    this.set(nudge(this.state, deltaMs));
  }

  reset(): void {
    this.set(UNSYNCED);
  }

  private set(next: ViewerClock): void {
    if (next === this.state) return;
    this.state = next;
    this.onChange?.(next);
  }
}

/**
 * A clock driven by a video player. Period anchors are media times (from the program's
 * markers, or marked live with the remote), so pausing and seeking need no special handling.
 */
export function playerPlayhead(
  anchors: readonly PeriodAnchor[],
  mediaTimeMs: () => number,
  isPlaying: () => boolean,
): PlayheadReader {
  const clock: ViewerClock = { anchors: [...anchors], pausedAtMs: null };
  return () => ({ position: positionAt(clock, mediaTimeMs()), playing: isPlaying() });
}

/**
 * A clock that follows another device, usually the living-room TV, using its reported
 * position projected forward on the server's clock.
 */
export function linkedPlayhead(
  report: () => PositionReport | null,
  serverNow: () => number,
): PlayheadReader {
  return () => {
    const latest = report();
    if (!latest) return { position: { period: 0, ms: 0 }, playing: false };
    return { position: extrapolate(latest, serverNow()), playing: latest.playing };
  };
}
