import { compare, type MatchPosition } from './position';
import type { ReactionDto } from './schemas';

/** Reactions are grouped into windows this long to find the moments the group reacted to. */
export const RECAP_BUCKET_MS = 30_000;
/** A moment needs at least this many reactions to count as one of the "loudest". */
export const MIN_MOMENT_REACTIONS = 2;

export interface RecapBucket {
  readonly period: number;
  readonly startMs: number;
  readonly count: number;
}

export interface RecapMoment {
  /** The first reaction of the moment. Players replay from a few seconds before it. */
  readonly position: MatchPosition;
  readonly count: number;
  /** Distinct people who reacted. */
  readonly people: number;
  /** The reactions themselves, in match order. */
  readonly reactions: readonly ReactionDto[];
}

export interface Recap {
  /** Everything included is at or before this position. */
  readonly until: MatchPosition;
  readonly total: number;
  readonly buckets: readonly RecapBucket[];
  /** Loudest first. */
  readonly moments: readonly RecapMoment[];
}

/**
 * Summarises the reactions a viewer has already reached. Anything after `until` is ignored, so
 * a recap can never reveal a moment the viewer hasn't watched.
 */
export function buildRecap(
  reactions: readonly ReactionDto[],
  until: MatchPosition,
  options: { bucketMs?: number; limit?: number } = {},
): Recap {
  const bucketMs = options.bucketMs ?? RECAP_BUCKET_MS;
  const limit = options.limit ?? 3;
  const reached = reactions
    .filter((r) => r.position.period > 0 && compare(r.position, until) <= 0)
    .sort((a, b) => compare(a.position, b.position) || a.createdAt - b.createdAt);

  const groups = new Map<string, { period: number; startMs: number; items: ReactionDto[] }>();
  for (const reaction of reached) {
    const startMs = Math.floor(reaction.position.ms / bucketMs) * bucketMs;
    const key = `${reaction.position.period}:${startMs}`;
    const group = groups.get(key) ?? { period: reaction.position.period, startMs, items: [] };
    group.items.push(reaction);
    groups.set(key, group);
  }

  const ordered = [...groups.values()].sort((a, b) => a.period - b.period || a.startMs - b.startMs);
  const moments = ordered
    .filter((g) => g.items.length >= MIN_MOMENT_REACTIONS)
    .map((g) => ({
      position: g.items[0]!.position,
      count: g.items.length,
      people: new Set(g.items.map((r) => r.viewerId)).size,
      reactions: g.items,
    }))
    .sort((a, b) => b.people - a.people || b.count - a.count || compare(a.position, b.position))
    .slice(0, limit);

  return {
    until,
    total: reached.length,
    buckets: ordered.map((g) => ({ period: g.period, startMs: g.startMs, count: g.items.length })),
    moments,
  };
}
