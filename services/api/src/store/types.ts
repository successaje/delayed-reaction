import type {
  ClockSource,
  MatchPosition,
  PositionReport,
  ReactionDto,
  SportId,
} from '@delayed-reaction/core';

export interface StoredRoom {
  readonly code: string;
  readonly title: string;
  readonly sport: SportId;
  readonly programId: string | null;
  readonly hostId: string;
  readonly createdAt: number;
  /** Epoch seconds after which the room may be deleted. */
  readonly expiresAt: number;
}

export interface StoredViewer {
  readonly id: string;
  readonly roomCode: string;
  readonly name: string;
  readonly color: string;
  readonly clockSource: ClockSource;
  readonly linkedTo: string | null;
  readonly deviceLabel: string | null;
  readonly joinedAt: number;
  /** SHA-256 of the bearer token. The token itself is never stored. */
  readonly tokenHash: string;
  readonly report: PositionReport | null;
}

export interface StoredReaction {
  readonly id: string;
  readonly roomCode: string;
  readonly viewerId: string;
  readonly position: MatchPosition;
  readonly body: ReactionDto['body'];
  readonly createdAt: number;
  /** Per-room insertion sequence, assigned by the store. */
  readonly seq: number;
}

export interface StoredPrediction {
  readonly viewerId: string;
  readonly home: number;
  readonly away: number;
  readonly createdAt: number;
}

/** A final score entered by someone who watched to the end, pinned to where they were. */
export interface StoredResult {
  readonly home: number;
  readonly away: number;
  readonly position: MatchPosition;
  readonly setBy: string;
}

export interface ReactionQuery {
  /** Serve reactions positioned after this sort key (exclusive); null for "from the start". */
  readonly afterKey: string | null;
  /** ...and up to this sort key (inclusive). */
  readonly untilKey: string;
  /** Also serve reactions inserted after this sequence number that are at or before `untilKey`. */
  readonly afterSeq: number;
}

export interface ReactionQueryResult {
  readonly reactions: StoredReaction[];
  /**
   * Sequence number below which the store guarantees nothing new can appear. A store whose
   * writes can commit out of sequence order returns a value slightly behind its latest
   * sequence, accepting a few duplicates (clients de-duplicate by id) over a missed reaction.
   */
  readonly seenSeq: number;
}

/**
 * Persistence for rooms, viewers and reactions. Implementations: `MemoryRoomStore` (tests and
 * local development) and `DynamoRoomStore` (production).
 */
export interface RoomStore {
  /** Returns false if the code is already taken. */
  createRoom(room: StoredRoom, host: StoredViewer): Promise<boolean>;
  getRoom(code: string): Promise<StoredRoom | null>;
  listViewers(code: string): Promise<StoredViewer[]>;
  getViewer(code: string, viewerId: string): Promise<StoredViewer | null>;
  /** Adds a viewer unless the room already has `maxViewers`. */
  addViewer(viewer: StoredViewer, maxViewers: number): Promise<'ok' | 'full'>;
  updateReport(code: string, viewerId: string, report: PositionReport): Promise<void>;
  /** Idempotent on `id`: returns the existing reaction if one with this id was already stored. */
  addReaction(
    reaction: Omit<StoredReaction, 'seq'>,
  ): Promise<{ reaction: StoredReaction; created: boolean }>;
  queryReactions(code: string, query: ReactionQuery): Promise<ReactionQueryResult>;
  /** Creates or replaces this viewer's prediction. */
  putPrediction(code: string, prediction: StoredPrediction): Promise<void>;
  listPredictions(code: string): Promise<StoredPrediction[]>;
  getResult(code: string): Promise<StoredResult | null>;
  /** First result wins; returns the stored one either way. */
  setResult(code: string, result: StoredResult): Promise<StoredResult>;
}
