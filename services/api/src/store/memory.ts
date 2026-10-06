import { sortKey, type PositionReport } from '@delayed-reaction/core';
import type {
  StoredPrediction,
  StoredResult,
  ReactionQuery,
  ReactionQueryResult,
  RoomStore,
  StoredReaction,
  StoredRoom,
  StoredViewer,
} from './types';

interface RoomRecord {
  room: StoredRoom;
  viewers: Map<string, StoredViewer>;
  reactions: Map<string, StoredReaction>;
  predictions: Map<string, StoredPrediction>;
  result: StoredResult | null;
  seq: number;
}

/** In-process store. Single-threaded, so every operation is trivially atomic. */
export class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomRecord>();

  async createRoom(room: StoredRoom, host: StoredViewer): Promise<boolean> {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, {
      room,
      viewers: new Map([[host.id, host]]),
      reactions: new Map(),
      predictions: new Map(),
      result: null,
      seq: 0,
    });
    return true;
  }

  async getRoom(code: string): Promise<StoredRoom | null> {
    return this.rooms.get(code)?.room ?? null;
  }

  async listViewers(code: string): Promise<StoredViewer[]> {
    const record = this.rooms.get(code);
    if (!record) return [];
    return [...record.viewers.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async getViewer(code: string, viewerId: string): Promise<StoredViewer | null> {
    return this.rooms.get(code)?.viewers.get(viewerId) ?? null;
  }

  async addViewer(viewer: StoredViewer, maxViewers: number): Promise<'ok' | 'full'> {
    const record = this.require(viewer.roomCode);
    if (record.viewers.size >= maxViewers) return 'full';
    record.viewers.set(viewer.id, viewer);
    return 'ok';
  }

  async updateReport(code: string, viewerId: string, report: PositionReport): Promise<void> {
    const record = this.require(code);
    const viewer = record.viewers.get(viewerId);
    if (viewer) record.viewers.set(viewerId, { ...viewer, report });
  }

  async addReaction(
    reaction: Omit<StoredReaction, 'seq'>,
  ): Promise<{ reaction: StoredReaction; created: boolean }> {
    const record = this.require(reaction.roomCode);
    const existing = record.reactions.get(reaction.id);
    if (existing) return { reaction: existing, created: false };
    const stored = { ...reaction, seq: ++record.seq };
    record.reactions.set(stored.id, stored);
    return { reaction: stored, created: true };
  }

  async queryReactions(code: string, query: ReactionQuery): Promise<ReactionQueryResult> {
    const record = this.rooms.get(code);
    if (!record) return { reactions: [], seenSeq: query.afterSeq };
    const reactions = [...record.reactions.values()]
      .filter((r) => {
        const key = sortKey(r.position);
        if (key > query.untilKey) return false;
        return query.afterKey === null || key > query.afterKey || r.seq > query.afterSeq;
      })
      .sort((a, b) => sortKey(a.position).localeCompare(sortKey(b.position)) || a.seq - b.seq);
    return { reactions, seenSeq: record.seq };
  }

  async putPrediction(code: string, prediction: StoredPrediction): Promise<void> {
    this.require(code).predictions.set(prediction.viewerId, prediction);
  }

  async listPredictions(code: string): Promise<StoredPrediction[]> {
    const record = this.rooms.get(code);
    return record ? [...record.predictions.values()].sort((a, b) => a.createdAt - b.createdAt) : [];
  }

  async getResult(code: string): Promise<StoredResult | null> {
    return this.rooms.get(code)?.result ?? null;
  }

  async setResult(code: string, result: StoredResult): Promise<StoredResult> {
    const record = this.require(code);
    record.result ??= result;
    return record.result;
  }

  private require(code: string): RoomRecord {
    const record = this.rooms.get(code);
    if (!record) throw new Error(`room ${code} does not exist`);
    return record;
  }
}
