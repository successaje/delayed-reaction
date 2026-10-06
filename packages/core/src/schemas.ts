import { z } from 'zod';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './ids';
import { MAX_PERIOD } from './position';
import { MAX_TEXT_LENGTH, QUICK_REACTION_IDS } from './reactions';
import { SPORT_IDS, type SportId } from './sport';

/**
 * The API contract, shared by the server and every client. Request schemas validate input;
 * the inferred types describe responses.
 */

export const matchPositionSchema = z.object({
  period: z.number().int().min(0).max(MAX_PERIOD),
  ms: z.number().int().min(0).max(24 * 60 * 60 * 1000),
});

export const roomCodeSchema = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .refine((code) => [...code].every((c) => ROOM_CODE_ALPHABET.includes(c)), 'invalid room code');

export const sportIdSchema = z.enum(SPORT_IDS as [SportId, ...SportId[]]);
export const clockSourceSchema = z.enum(['player', 'manual', 'linked']);

const displayName = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1, 'Add a name so friends know who reacted').max(24));

export const createRoomRequestSchema = z.object({
  title: z
    .string()
    .transform((s) => s.replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(1, 'Name the game').max(60)),
  sport: sportIdSchema,
  /** Optional catalog program, for rooms started from the TV with known kick-off markers. */
  programId: z.string().max(64).optional(),
  host: z.object({
    name: displayName,
    clockSource: clockSourceSchema,
    deviceLabel: z.string().max(32).optional(),
  }),
});

export const joinRoomRequestSchema = z.object({
  name: displayName,
  clockSource: clockSourceSchema,
  /** For `linked` clocks: the viewer (usually a TV) whose clock this device follows. */
  linkedTo: z.string().max(40).optional(),
  deviceLabel: z.string().max(32).optional(),
});

/**
 * One request per tick: reports where the viewer is (so presence and the spoiler gate stay
 * current) and pulls any reactions now within reach.
 */
export const syncRequestSchema = z.object({
  position: matchPositionSchema,
  playing: z.boolean(),
  /** Opaque cursor from the previous page; omit to fetch everything within reach. */
  cursor: z.string().max(200).optional(),
});

export const postReactionRequestSchema = z.object({
  /** Client-generated id, so retries are idempotent. */
  id: z.string().regex(/^[A-Za-z0-9_-]{8,40}$/),
  position: matchPositionSchema,
  body: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('quick'), value: z.enum(QUICK_REACTION_IDS) }),
    z.object({
      kind: z.literal('text'),
      value: z
        .string()
        .transform((s) => s.replace(/\s+/g, ' ').trim())
        .pipe(z.string().min(1).max(MAX_TEXT_LENGTH)),
    }),
  ]),
});

export type CreateRoomRequest = z.input<typeof createRoomRequestSchema>;
export type JoinRoomRequest = z.input<typeof joinRoomRequestSchema>;
export type SyncRequest = z.input<typeof syncRequestSchema>;
export type PostReactionRequest = z.input<typeof postReactionRequestSchema>;

/** A broadcast in the catalog, with the media times at which each period starts. */
export const programSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  title: z.string().min(1).max(80),
  subtitle: z.string().max(120),
  sport: sportIdSchema,
  mediaUrl: z.string().min(1),
  posterUrl: z.string().min(1).nullable(),
  durationMs: z.number().int().positive(),
  markers: z
    .array(z.object({ period: z.number().int().min(1).max(MAX_PERIOD), mediaMs: z.number().int().min(0) }))
    .min(1),
  credit: z.object({
    author: z.string().min(1),
    license: z.string().min(1),
    sourceUrl: z.string().url(),
  }),
  /** The final score, if known. Revealed to each viewer only when they reach the end. */
  result: z.object({ home: z.number().int().min(0), away: z.number().int().min(0) }).optional(),
});

export type ProgramDto = z.infer<typeof programSchema>;

const goals = z.number().int().min(0).max(99);

export const predictRequestSchema = z.object({ home: goals, away: goals });
export const resultRequestSchema = z.object({ home: goals, away: goals });

export type PredictRequest = z.input<typeof predictRequestSchema>;
export type ResultRequest = z.input<typeof resultRequestSchema>;

export interface PredictionDto {
  readonly viewerId: string;
  readonly home: number;
  readonly away: number;
  readonly createdAt: number;
}

export interface PredictionsDto {
  /** Everyone's predictions: safe to show, since they were all locked before anyone saw a kick. */
  readonly predictions: readonly PredictionDto[];
  /** The final score, or null until this viewer reaches the point where it was decided. */
  readonly result: { readonly home: number; readonly away: number } | null;
  /** Whether this viewer can still predict (their own clock is before the lock). */
  readonly open: boolean;
}

// ---- Responses -------------------------------------------------------------------------------

export interface RoomDto {
  readonly code: string;
  readonly title: string;
  readonly sport: SportId;
  readonly programId: string | null;
  readonly createdAt: number;
  readonly hostId: string;
}

export interface ViewerDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly clockSource: z.infer<typeof clockSourceSchema>;
  readonly linkedTo: string | null;
  readonly deviceLabel: string | null;
  readonly joinedAt: number;
  /** Last reported position, or null if this viewer hasn't synced yet. */
  readonly report: {
    readonly position: z.infer<typeof matchPositionSchema>;
    readonly playing: boolean;
    readonly reportedAt: number;
  } | null;
}

export interface ReactionDto {
  readonly id: string;
  readonly viewerId: string;
  readonly position: z.infer<typeof matchPositionSchema>;
  readonly body: z.infer<typeof postReactionRequestSchema>['body'];
  readonly createdAt: number;
}

export interface SessionDto {
  readonly room: RoomDto;
  readonly viewer: ViewerDto;
  /** Bearer token for this viewer. Shown once; store it on the device. */
  readonly token: string;
}

export interface RoomStateDto {
  readonly room: RoomDto;
  readonly viewers: readonly ViewerDto[];
  readonly serverTime: number;
}

export interface ReactionPageDto {
  readonly reactions: readonly ReactionDto[];
  /** Pass back as `after` on the next request. */
  readonly cursor: string;
  /** The position the server actually served up to, after the spoiler gate. */
  readonly servedUntil: z.infer<typeof matchPositionSchema>;
  readonly viewers: readonly ViewerDto[];
  readonly serverTime: number;
}

export interface ApiErrorDto {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
  };
}

export type ApiErrorCode =
  | 'invalid_request'
  | 'room_not_found'
  | 'room_full'
  | 'unauthorized'
  | 'rate_limited'
  | 'internal';

// ---- Shared moments ----------------------------------------------------------------------------

export const shareRequestSchema = z.object({ position: matchPositionSchema });
export type ShareRequest = z.input<typeof shareRequestSchema>;

/** A snapshot of one moment, safe to show to anyone with the link. */
export interface SharedMomentDto {
  readonly id: string;
  readonly title: string;
  readonly sport: SportId;
  readonly position: z.infer<typeof matchPositionSchema>;
  /** For catalog matches: where to play from, and the media time of the moment. */
  readonly media: {
    readonly url: string;
    readonly posterUrl: string | null;
    readonly momentMs: number;
    /** Who filmed it and under what licence; shown with the clip. */
    readonly credit: { readonly author: string; readonly license: string; readonly sourceUrl: string };
  } | null;
  readonly reactions: readonly {
    readonly name: string;
    readonly color: string;
    /** Offset from the moment, in ms (negative = before). */
    readonly offsetMs: number;
    readonly body: ReactionDto['body'];
  }[];
  readonly sharedBy: string;
  readonly createdAt: number;
}
