import { compare, type MatchPosition } from './position';

export interface Positioned {
  readonly id: string;
  readonly position: MatchPosition;
}

/** A reaction this close behind the playhead when it arrives is still shown as it happens. */
export const FRESH_WITHIN_MS = 8_000;
/** A playhead step larger than this is a seek, not playback. */
export const MAX_PLAYBACK_STEP_MS = 3_000;

export interface Ingested<T> {
  /** Arrived just behind the playhead: show now. */
  readonly due: T[];
  /** Arrived well behind the playhead (e.g. a reply from someone watching later): history only. */
  readonly past: T[];
}

export interface Advanced<T> {
  /** Crossed during normal playback: show now. */
  readonly due: T[];
  /** Jumped over by a seek or a period change: history only, never a burst of pop-ups. */
  readonly skipped: T[];
}

/**
 * Holds every reaction a device has received, ordered by match position, and decides which
 * ones should appear as the playhead moves. Pure and deterministic: the caller supplies positions.
 */
export class ReactionTimeline<T extends Positioned> {
  private readonly items: T[] = [];
  private readonly ids = new Set<string>();

  get size(): number {
    return this.items.length;
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  /** Everything at or before `position`, oldest first. */
  upTo(position: MatchPosition): T[] {
    return this.items.filter((item) => compare(item.position, position) <= 0);
  }

  /** Count of held reactions strictly after `position` (prefetched, not yet shown). */
  countAfter(position: MatchPosition): number {
    return this.items.filter((item) => compare(item.position, position) > 0).length;
  }

  /**
   * Adds reactions (duplicates are ignored). Reactions ahead of `playhead` wait to be crossed;
   * reactions behind it are either shown immediately (fresh) or filed as history (past).
   */
  ingest(incoming: readonly T[], playhead: MatchPosition | null): Ingested<T> {
    const due: T[] = [];
    const past: T[] = [];
    for (const item of incoming) {
      if (this.ids.has(item.id)) continue;
      this.insert(item);
      if (!playhead || compare(item.position, playhead) > 0) continue;
      if (isFresh(item.position, playhead)) due.push(item);
      else past.push(item);
    }
    return { due, past };
  }

  /** Called on every playhead tick with the previous and current position. */
  advance(previous: MatchPosition | null, current: MatchPosition): Advanced<T> {
    if (!previous) return this.landAt(null, current);
    const order = compare(current, previous);
    if (order <= 0) return { due: [], skipped: [] };

    const isPlayback =
      current.period === previous.period && current.ms - previous.ms <= MAX_PLAYBACK_STEP_MS;
    if (isPlayback) {
      return { due: this.between(previous, current), skipped: [] };
    }
    return this.landAt(previous, current);
  }

  /** A jump: everything passed is skipped, except what is fresh at the landing point. */
  private landAt(previous: MatchPosition | null, current: MatchPosition): Advanced<T> {
    const crossed = previous ? this.between(previous, current) : this.upTo(current);
    const due: T[] = [];
    const skipped: T[] = [];
    for (const item of crossed) {
      (isFresh(item.position, current) ? due : skipped).push(item);
    }
    return { due, skipped };
  }

  /** Items in the half-open interval (from, to]. */
  private between(from: MatchPosition, to: MatchPosition): T[] {
    return this.items.filter(
      (item) => compare(item.position, from) > 0 && compare(item.position, to) <= 0,
    );
  }

  private insert(item: T): void {
    this.ids.add(item.id);
    let i = this.items.length;
    while (i > 0 && compare(this.items[i - 1]!.position, item.position) > 0) i--;
    this.items.splice(i, 0, item);
  }
}

function isFresh(position: MatchPosition, playhead: MatchPosition): boolean {
  return position.period === playhead.period && playhead.ms - position.ms <= FRESH_WITHIN_MS;
}
