import {
  addMs,
  buildRecap,
  canPredict,
  compare,
  predictRequestSchema,
  shareRequestSchema,
  type SharedMomentDto,
  resultRequestSchema,
  type MatchPosition,
  type PredictionsDto,
  clampUntil,
  PRE_MATCH,
  type Recap,
  generateRoomCode,
  PREFETCH_MS,
  sortKey,
  viewerColor,
  type CreateRoomRequest,
  type JoinRoomRequest,
  type ProgramDto,
  type ReactionDto,
  type ReactionPageDto,
  type RoomDto,
  type RoomStateDto,
  type SessionDto,
  type ViewerDto,
  createRoomRequestSchema,
  joinRoomRequestSchema,
  postReactionRequestSchema,
  syncRequestSchema,
} from '@delayed-reaction/core';
import type { z } from 'zod';
import { decodeCursor, encodeCursor } from './lib/cursor';
import { ApiError, roomNotFound, unauthorized } from './lib/errors';
import { digestsEqual, hashToken, newId, newToken, parseToken, randomBytes } from './lib/tokens';
import type { RoomStore, StoredReaction, StoredRoom, StoredViewer } from './store/types';

export const MAX_VIEWERS = 50;
const ROOM_TTL_SECONDS = 7 * 24 * 60 * 60;
/** A shared moment covers a little build-up and the reactions that followed. */
const SHARE_BEFORE_MS = 3_000;
const SHARE_AFTER_MS = 12_000;
const SHARE_TTL_SECONDS = 30 * 24 * 60 * 60;
const CODE_ATTEMPTS = 5;

export interface ServiceDeps {
  readonly store: RoomStore;
  readonly now: () => number;
  readonly programs: readonly ProgramDto[];
}

export interface AuthedViewer {
  readonly room: StoredRoom;
  readonly viewer: StoredViewer;
}

/** Room, viewer and reaction rules. Transport-agnostic: routes translate HTTP to these calls. */
export class RoomService {
  constructor(private readonly deps: ServiceDeps) {}

  listPrograms(): readonly ProgramDto[] {
    return this.deps.programs;
  }

  async createRoom(input: CreateRoomRequest): Promise<SessionDto> {
    const request = createRoomRequestSchema.parse(input);
    if (request.programId && !this.findProgram(request.programId)) {
      throw new ApiError('invalid_request', 'That program is no longer available.');
    }
    const now = this.deps.now();
    const hostId = newId();
    const token = newToken(hostId);

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const code = generateRoomCode(randomBytes);
      const room: StoredRoom = {
        code,
        title: request.title,
        sport: request.sport,
        programId: request.programId ?? null,
        hostId,
        createdAt: now,
        expiresAt: Math.floor(now / 1000) + ROOM_TTL_SECONDS,
      };
      const host: StoredViewer = {
        id: hostId,
        roomCode: code,
        name: request.host.name,
        color: viewerColor(0),
        clockSource: request.host.clockSource,
        linkedTo: null,
        deviceLabel: request.host.deviceLabel ?? null,
        joinedAt: now,
        tokenHash: await hashToken(token),
        report: null,
      };
      if (await this.deps.store.createRoom(room, host)) {
        return { room: toRoomDto(room), viewer: toViewerDto(host), token };
      }
    }
    throw new ApiError('internal', "Couldn't create a room right now. Try again in a moment.");
  }

  async getRoomState(code: string): Promise<RoomStateDto> {
    const room = await this.requireRoom(code);
    const viewers = await this.deps.store.listViewers(code);
    return {
      room: toRoomDto(room),
      viewers: viewers.map(toViewerDto),
      serverTime: this.deps.now(),
    };
  }

  async joinRoom(code: string, input: JoinRoomRequest): Promise<SessionDto> {
    const request = joinRoomRequestSchema.parse(input);
    const room = await this.requireRoom(code);
    const existing = await this.deps.store.listViewers(code);

    let linkedTo: string | null = null;
    if (request.clockSource === 'linked') {
      const target = existing.find((v) => v.id === request.linkedTo);
      if (!target || target.clockSource !== 'player') {
        throw new ApiError(
          'invalid_request',
          "The TV you scanned isn't in this room any more. Scan its code again.",
        );
      }
      linkedTo = target.id;
    }

    const id = newId();
    const token = newToken(id);
    const viewer: StoredViewer = {
      id,
      roomCode: code,
      name: request.name,
      color: viewerColor(existing.length),
      clockSource: request.clockSource,
      linkedTo,
      deviceLabel: request.deviceLabel ?? null,
      joinedAt: this.deps.now(),
      tokenHash: await hashToken(token),
      report: null,
    };
    if ((await this.deps.store.addViewer(viewer, MAX_VIEWERS)) === 'full') {
      throw new ApiError('room_full', `This room is full (${MAX_VIEWERS} people). Start a new one.`);
    }
    return { room: toRoomDto(room), viewer: toViewerDto(viewer), token };
  }

  async authenticate(code: string, authorization: string | undefined): Promise<AuthedViewer> {
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    const parsed = token ? parseToken(token) : null;
    if (!token || !parsed) throw unauthorized();
    const room = await this.requireRoom(code);
    const viewer = await this.deps.store.getViewer(code, parsed.viewerId);
    if (!viewer || !digestsEqual(viewer.tokenHash, await hashToken(token))) throw unauthorized();
    return { room, viewer };
  }

  session({ room, viewer }: AuthedViewer): Omit<SessionDto, 'token'> {
    return { room: toRoomDto(room), viewer: toViewerDto(viewer) };
  }

  /**
   * Records where the viewer is, then serves every reaction they're allowed to have and
   * haven't seen: newly within reach by position, or newly posted behind them.
   */
  async sync({ room, viewer }: AuthedViewer, input: z.input<typeof syncRequestSchema>) {
    const request = syncRequestSchema.parse(input);
    const now = this.deps.now();
    const report = { position: request.position, playing: request.playing, reportedAt: now };
    await this.deps.store.updateReport(room.code, viewer.id, report);

    const servedUntil = clampUntil(addMs(request.position, PREFETCH_MS), report, now);
    const cursor = decodeCursor(request.cursor);
    const untilKey = sortKey(servedUntil);
    const result = await this.deps.store.queryReactions(room.code, {
      afterKey: cursor?.k ?? null,
      untilKey,
      afterSeq: cursor?.s ?? 0,
    });
    const viewers = await this.deps.store.listViewers(room.code);

    const page: ReactionPageDto = {
      reactions: result.reactions.map(toReactionDto),
      // After a backwards seek, keep the furthest point already served.
      cursor: encodeCursor({
        k: cursor && cursor.k > untilKey ? cursor.k : untilKey,
        s: result.seenSeq,
      }),
      servedUntil,
      viewers: viewers.map(toViewerDto),
      serverTime: now,
    };
    return page;
  }

  /**
   * The loudest moments so far, for this viewer: built only from reactions at or before the
   * viewer's last reported position, so a recap can't spoil anything.
   */
  async recap({ room, viewer }: AuthedViewer): Promise<Recap> {
    const fresh = await this.deps.store.getViewer(room.code, viewer.id);
    const until = fresh?.report?.position ?? PRE_MATCH;
    const { reactions } = await this.deps.store.queryReactions(room.code, {
      afterKey: null,
      untilKey: sortKey(until),
      afterSeq: 0,
    });
    return buildRecap(reactions.map(toReactionDto), until);
  }

  /**
   * Everyone's predictions, plus the final score only if this viewer has reached the point
   * where it was decided.
   */
  async predictions({ room, viewer }: AuthedViewer): Promise<PredictionsDto> {
    const at = (await this.deps.store.getViewer(room.code, viewer.id))?.report?.position ?? null;
    const [predictions, result] = await Promise.all([
      this.deps.store.listPredictions(room.code),
      this.finalScore(room),
    ]);
    const reached = result !== null && at !== null && compare(at, result.position) >= 0;
    return {
      predictions,
      result: reached ? { home: result.home, away: result.away } : null,
      open: canPredict(at),
    };
  }

  async predict({ room, viewer }: AuthedViewer, input: unknown): Promise<PredictionsDto> {
    const score = predictRequestSchema.parse(input);
    const at = (await this.deps.store.getViewer(room.code, viewer.id))?.report?.position ?? null;
    if (!canPredict(at)) {
      throw new ApiError('invalid_request', 'Predictions closed a minute into your match. Next game!');
    }
    await this.deps.store.putPrediction(room.code, {
      viewerId: viewer.id,
      home: score.home,
      away: score.away,
      createdAt: this.deps.now(),
    });
    return this.predictions({ room, viewer });
  }

  /**
   * Records the final score for matches outside the catalog. Only someone in the second period
   * or later can enter it, and it's pinned to where they are, so later viewers only see it
   * once they get there too.
   */
  async setResult({ room, viewer }: AuthedViewer, input: unknown): Promise<PredictionsDto> {
    const score = resultRequestSchema.parse(input);
    if (this.catalogResult(room)) {
      throw new ApiError('invalid_request', 'This match already has its final score.');
    }
    const at = (await this.deps.store.getViewer(room.code, viewer.id))?.report?.position ?? null;
    if (!at || at.period < 2) {
      throw new ApiError('invalid_request', 'You can add the final score once you reach the second half.');
    }
    await this.deps.store.setResult(room.code, { ...score, position: at, setBy: viewer.id });
    return this.predictions({ room, viewer });
  }

  private async finalScore(
    room: StoredRoom,
  ): Promise<{ home: number; away: number; position: MatchPosition } | null> {
    return this.catalogResult(room) ?? (await this.deps.store.getResult(room.code));
  }

  /** A catalog program's known result, decided at the end of its media. */
  private catalogResult(room: StoredRoom) {
    const program = room.programId ? this.findProgram(room.programId) : undefined;
    if (!program?.result) return null;
    const last = program.markers[program.markers.length - 1]!;
    return {
      ...program.result,
      position: { period: last.period, ms: Math.max(0, program.durationMs - last.mediaMs - 1_000) },
    };
  }

  /**
   * Snapshots a moment the viewer has already watched, with the reactions around it, as a
   * public link. Only what's in the window leaves the room.
   */
  async share({ room, viewer }: AuthedViewer, input: unknown): Promise<SharedMomentDto> {
    const { position: at } = shareRequestSchema.parse(input);
    const reached = (await this.deps.store.getViewer(room.code, viewer.id))?.report?.position ?? null;
    if (!reached || compare(reached, at) < 0) {
      throw new ApiError('invalid_request', "You can only share moments you've already watched.");
    }
    const from = { period: at.period, ms: Math.max(0, at.ms - SHARE_BEFORE_MS) };
    const to = compare(reached, { period: at.period, ms: at.ms + SHARE_AFTER_MS }) < 0
      ? reached
      : { period: at.period, ms: at.ms + SHARE_AFTER_MS };
    const [{ reactions }, viewers] = await Promise.all([
      this.deps.store.queryReactions(room.code, {
        afterKey: from.ms === 0 ? null : sortKey({ period: from.period, ms: from.ms - 1 }),
        untilKey: sortKey(to),
        afterSeq: Number.MAX_SAFE_INTEGER,
      }),
      this.deps.store.listViewers(room.code),
    ]);
    const people = new Map(viewers.map((v) => [v.id, v]));
    const program = room.programId ? this.findProgram(room.programId) : undefined;
    const marker = program?.markers.find((m) => m.period === at.period);
    const now = this.deps.now();
    const share: SharedMomentDto = {
      id: newId(),
      title: room.title,
      sport: room.sport,
      position: at,
      media:
        program && marker
          ? { url: program.mediaUrl, posterUrl: program.posterUrl, momentMs: marker.mediaMs + at.ms }
          : null,
      reactions: reactions
        .filter((r) => r.position.period === at.period)
        .map((r) => ({
          name: people.get(r.viewerId)?.name ?? 'A friend',
          color: people.get(r.viewerId)?.color ?? '#8d948b',
          offsetMs: r.position.ms - at.ms,
          body: r.body,
        })),
      sharedBy: viewer.name,
      createdAt: now,
    };
    await this.deps.store.putShare(share, Math.floor(now / 1000) + SHARE_TTL_SECONDS);
    return share;
  }

  async getShare(id: string): Promise<SharedMomentDto> {
    const share = /^[a-z0-9]{12}$/.test(id) ? await this.deps.store.getShare(id) : null;
    if (!share) throw new ApiError('room_not_found', 'That moment link has expired or never existed.');
    return share;
  }

  async postReaction(
    { room, viewer }: AuthedViewer,
    input: z.input<typeof postReactionRequestSchema>,
  ): Promise<{ reaction: ReactionDto; created: boolean }> {
    const request = postReactionRequestSchema.parse(input);
    const { reaction, created } = await this.deps.store.addReaction({
      id: request.id,
      roomCode: room.code,
      viewerId: viewer.id,
      position: request.position,
      body: request.body,
      createdAt: this.deps.now(),
    });
    if (reaction.viewerId !== viewer.id) {
      throw new ApiError('invalid_request', 'That reaction id is already in use.');
    }
    return { reaction: toReactionDto(reaction), created };
  }

  private async requireRoom(code: string): Promise<StoredRoom> {
    const room = await this.deps.store.getRoom(code);
    if (!room || room.expiresAt * 1000 < this.deps.now()) throw roomNotFound();
    return room;
  }

  private findProgram(id: string): ProgramDto | undefined {
    return this.deps.programs.find((p) => p.id === id);
  }
}

export function toRoomDto(room: StoredRoom): RoomDto {
  return {
    code: room.code,
    title: room.title,
    sport: room.sport,
    programId: room.programId,
    createdAt: room.createdAt,
    hostId: room.hostId,
  };
}

export function toViewerDto(viewer: StoredViewer): ViewerDto {
  return {
    id: viewer.id,
    name: viewer.name,
    color: viewer.color,
    clockSource: viewer.clockSource,
    linkedTo: viewer.linkedTo,
    deviceLabel: viewer.deviceLabel,
    joinedAt: viewer.joinedAt,
    report: viewer.report,
  };
}

export function toReactionDto(reaction: StoredReaction): ReactionDto {
  return {
    id: reaction.id,
    viewerId: reaction.viewerId,
    position: reaction.position,
    body: reaction.body,
    createdAt: reaction.createdAt,
  };
}
