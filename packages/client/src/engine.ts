import {
  compare,
  ReactionTimeline,
  type MatchPosition,
  type ReactionBody,
  type ReactionDto,
  type ViewerDto,
} from '@delayed-reaction/core';
import { isApiClientError, type ApiClient, type ApiClientError } from './api';
import type { Playhead, PlayheadReader } from './playheads';

export type SyncStatus =
  /** First contact not made yet. */
  | 'connecting'
  /** Syncing normally. */
  | 'live'
  /** A sync failed; retrying with backoff. Reactions already received keep playing. */
  | 'reconnecting'
  /** Several syncs failed in a row. Still retrying, less often. */
  | 'offline'
  /** The server no longer recognises this device (room expired or token invalid). Stopped. */
  | 'ended';

export type OwnReactionState = 'sending' | 'sent' | 'failed';

export type TimelineEvent =
  /** Reactions to show now: crossed by the playhead, or arrived just behind it. */
  | { readonly type: 'due'; readonly reactions: readonly ReactionDto[] }
  /** Reactions for history only: jumped over, or arrived from far behind (replies from later watchers). */
  | { readonly type: 'history'; readonly reactions: readonly ReactionDto[] }
  | { readonly type: 'presence'; readonly viewers: readonly ViewerDto[] }
  | { readonly type: 'status'; readonly status: SyncStatus; readonly error: ApiClientError | null }
  | { readonly type: 'own'; readonly reaction: ReactionDto; readonly state: OwnReactionState }
  | { readonly type: 'cursor'; readonly cursor: string };

export interface TimelineSyncOptions {
  readonly api: ApiClient;
  readonly roomCode: string;
  readonly token: string;
  readonly viewerId: string;
  readonly readPlayhead: PlayheadReader;
  readonly cursor?: string | null;
  readonly now?: () => number;
  /** How often the playhead is sampled to release reactions. */
  readonly tickMs?: number;
  readonly syncEveryMs?: { readonly playing: number; readonly paused: number };
  readonly newId?: () => string;
}

const BACKOFF_MS = [2_000, 4_000, 8_000, 15_000];
const OFFLINE_AFTER_FAILURES = 3;
const POST_ATTEMPTS = 3;

/**
 * Runs a device's side of Delayed Reaction: samples the playhead, syncs with the API on a
 * cadence (and immediately on pause, seek or period change), and releases each reaction at
 * the moment the playhead crosses it. UI layers subscribe to events; they never poll.
 */
export class TimelineSync {
  private readonly timeline = new ReactionTimeline<ReactionDto>();
  private readonly listeners = new Set<(event: TimelineEvent) => void>();
  private readonly now: () => number;
  private readonly tickMs: number;
  private readonly syncEvery: { playing: number; paused: number };
  private readonly newId: () => string;

  private cursor: string | null;
  private last: Playhead | null = null;
  private nextSyncAt = 0;
  private inFlight = false;
  private failures = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private status: SyncStatus = 'connecting';
  private viewers: readonly ViewerDto[] = [];
  private serverOffsetMs = 0;

  constructor(private readonly options: TimelineSyncOptions) {
    this.now = options.now ?? Date.now;
    this.tickMs = options.tickMs ?? 200;
    this.syncEvery = { playing: 1_500, paused: 5_000, ...options.syncEveryMs };
    this.newId = options.newId ?? randomId;
    this.cursor = options.cursor ?? null;
  }

  subscribe(listener: (event: TimelineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get currentStatus(): SyncStatus {
    return this.status;
  }

  get currentViewers(): readonly ViewerDto[] {
    return this.viewers;
  }

  /** Server time, estimated from the last sync. Use for presence math. */
  serverNow(): number {
    return this.now() + this.serverOffsetMs;
  }

  /** Reactions already received but still ahead of the playhead. */
  get queued(): number {
    return this.last ? this.timeline.countAfter(this.last.position) : this.timeline.size;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Ask for a sync on the next tick, e.g. after the user marks a period or nudges the clock. */
  syncSoon(): void {
    this.nextSyncAt = 0;
  }

  /**
   * Posts a reaction pinned to the current playhead. Shown locally at once; retried with the
   * same id if the network fails, so it is never duplicated.
   */
  async react(body: ReactionBody): Promise<ReactionDto> {
    const playhead = this.options.readPlayhead();
    const reaction: ReactionDto = {
      id: this.newId(),
      viewerId: this.options.viewerId,
      position: playhead.position,
      body,
      createdAt: this.serverNow(),
    };
    this.timeline.ingest([reaction], null);
    this.emit({ type: 'own', reaction, state: 'sending' });

    for (let attempt = 1; ; attempt++) {
      try {
        const { reaction: saved } = await this.options.api.postReaction(
          this.options.roomCode,
          this.options.token,
          { id: reaction.id, position: reaction.position, body },
        );
        this.emit({ type: 'own', reaction: saved, state: 'sent' });
        return saved;
      } catch (error) {
        const retry = isApiClientError(error) && error.retryable && attempt < POST_ATTEMPTS;
        if (!retry) {
          this.emit({ type: 'own', reaction, state: 'failed' });
          throw error;
        }
        await delay(500 * attempt);
      }
    }
  }

  private loop(): void {
    if (!this.running) return;
    this.tick();
    this.timer = setTimeout(() => this.loop(), this.tickMs);
  }

  private tick(): void {
    const current = this.options.readPlayhead();
    const previous = this.last;
    this.last = current;

    const { due, skipped } = this.timeline.advance(previous?.position ?? null, current.position);
    if (due.length) this.emit({ type: 'due', reactions: due });
    if (skipped.length) this.emit({ type: 'history', reactions: skipped });

    const discontinuity =
      !previous ||
      previous.playing !== current.playing ||
      previous.position.period !== current.position.period ||
      compare(current.position, previous.position) < 0 ||
      current.position.ms - previous.position.ms > this.tickMs * 4;
    if (discontinuity && this.failures === 0) this.nextSyncAt = 0;

    const now = this.now();
    if (!this.inFlight && now >= this.nextSyncAt) void this.sync(current, now);
  }

  private async sync(playhead: Playhead, startedAt: number): Promise<void> {
    this.inFlight = true;
    try {
      const page = await this.options.api.sync(this.options.roomCode, this.options.token, {
        position: playhead.position,
        playing: playhead.playing,
        cursor: this.cursor ?? undefined,
      });
      const finishedAt = this.now();
      this.serverOffsetMs = page.serverTime - (startedAt + finishedAt) / 2;
      this.failures = 0;
      this.nextSyncAt =
        finishedAt + (playhead.playing ? this.syncEvery.playing : this.syncEvery.paused);

      const position: MatchPosition = this.last?.position ?? playhead.position;
      const { due, past } = this.timeline.ingest(page.reactions, position);
      if (due.length) this.emit({ type: 'due', reactions: due });
      if (past.length) this.emit({ type: 'history', reactions: past });

      this.viewers = page.viewers;
      this.emit({ type: 'presence', viewers: page.viewers });
      this.cursor = page.cursor;
      this.emit({ type: 'cursor', cursor: page.cursor });
      this.setStatus('live', null);
    } catch (error) {
      this.handleSyncError(error);
    } finally {
      this.inFlight = false;
    }
  }

  private handleSyncError(error: unknown): void {
    if (isApiClientError(error) && (error.code === 'unauthorized' || error.code === 'room_not_found')) {
      this.setStatus('ended', error);
      this.stop();
      return;
    }
    this.failures++;
    const wait = BACKOFF_MS[Math.min(this.failures - 1, BACKOFF_MS.length - 1)]!;
    this.nextSyncAt = this.now() + wait;
    this.setStatus(
      this.failures >= OFFLINE_AFTER_FAILURES ? 'offline' : 'reconnecting',
      isApiClientError(error) ? error : null,
    );
  }

  private setStatus(status: SyncStatus, error: ApiClientError | null): void {
    if (status === this.status) return;
    this.status = status;
    this.emit({ type: 'status', status, error });
  }

  private emit(event: TimelineEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 20 random characters. Uses Web Crypto when present (browsers, Node, Hermes polyfills). */
export function randomId(): string {
  const bytes = new Uint8Array(20);
  const cryptoImpl = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoImpl?.getRandomValues) cryptoImpl.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  let id = '';
  for (const byte of bytes) id += ID_CHARS[byte % ID_CHARS.length];
  return id;
}
