import {
  addMs,
  clampUntil,
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
