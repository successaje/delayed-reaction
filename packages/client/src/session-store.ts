import type { ClockSource, ViewerClock } from '@delayed-reaction/core';

/** The subset of Web Storage both browsers and React Native storage adapters can provide. */
export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/** Everything a device needs to rejoin a room where it left off. */
export interface SavedSession {
  readonly roomCode: string;
  readonly roomTitle: string;
  readonly viewerId: string;
  readonly token: string;
  readonly name: string;
  readonly clockSource: ClockSource;
  readonly linkedTo: string | null;
  /** Manual clocks persist their anchors, so a refresh doesn't lose sync. */
  readonly clock: ViewerClock | null;
  readonly cursor: string | null;
  readonly savedAt: number;
}

const MAX_REMEMBERED = 20;

/** Device-local memory of the rooms this device has joined. */
export class SessionStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly prefix = 'delayed-reaction:',
    private readonly now: () => number = Date.now,
  ) {}

  async get(roomCode: string): Promise<SavedSession | null> {
    const raw = await this.storage.getItem(this.key(roomCode));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SavedSession;
    } catch {
      await this.storage.removeItem(this.key(roomCode));
      return null;
    }
  }

  async save(session: Omit<SavedSession, 'savedAt'>): Promise<SavedSession> {
    const saved = { ...session, savedAt: this.now() };
    await this.storage.setItem(this.key(session.roomCode), JSON.stringify(saved));
    const codes = (await this.codes()).filter((c) => c !== session.roomCode);
    const next = [session.roomCode, ...codes];
    for (const dropped of next.slice(MAX_REMEMBERED)) {
      await this.storage.removeItem(this.key(dropped));
    }
    await this.storage.setItem(this.indexKey, JSON.stringify(next.slice(0, MAX_REMEMBERED)));
    return saved;
  }

  async update(roomCode: string, patch: Partial<Omit<SavedSession, 'roomCode'>>): Promise<void> {
    const current = await this.get(roomCode);
    if (current) await this.save({ ...current, ...patch });
  }

  async remove(roomCode: string): Promise<void> {
    await this.storage.removeItem(this.key(roomCode));
    const codes = (await this.codes()).filter((c) => c !== roomCode);
    await this.storage.setItem(this.indexKey, JSON.stringify(codes));
  }

  /** Most recently used first. */
  async list(): Promise<SavedSession[]> {
    const sessions = await Promise.all((await this.codes()).map((code) => this.get(code)));
    return sessions.filter((s): s is SavedSession => s !== null);
  }

  private async codes(): Promise<string[]> {
    const raw = await this.storage.getItem(this.indexKey);
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string') : [];
    } catch {
      return [];
    }
  }

  private get indexKey(): string {
    return `${this.prefix}rooms`;
  }

  private key(roomCode: string): string {
    return `${this.prefix}room:${roomCode}`;
  }
}

/** A storage adapter for environments without persistence (tests, private browsing). */
export function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}
