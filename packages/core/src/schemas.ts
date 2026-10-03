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

export const heartbeatRequestSchema = z.object({
  position: matchPositionSchema,
  playing: z.boolean(),
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
export type HeartbeatRequest = z.input<typeof heartbeatRequestSchema>;
export type PostReactionRequest = z.input<typeof postReactionRequestSchema>;

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
