import type { ProgramDto, SessionDto } from '@delayed-reaction/core';
import { createApp } from '../src/app';
import { MemoryRoomStore } from '../src/store/memory';

export const program: ProgramDto = {
  id: 'test-final',
  title: 'Test v Final',
  subtitle: 'A test',
  sport: 'football',
  mediaUrl: 'http://media.test/final.mp4',
  posterUrl: null,
  durationMs: 600_000,
  markers: [{ period: 1, mediaMs: 0 }],
  result: { home: 5, away: 2 },
  credit: { author: 'Test', license: 'CC0', sourceUrl: 'https://example.com' },
};

/** A test harness with a controllable clock. */
export function harness() {
  let now = 1_000_000;
  const app = createApp({ store: new MemoryRoomStore(), now: () => now, programs: [program] });

  async function call<T = any>(
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<{ status: number; body: T }> {
    const res = await app.request(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as T };
  }

  async function createRoom(name = 'Ada') {
    const res = await call<SessionDto>('POST', '/v1/rooms', {
      title: 'Arsenal v Spurs',
      sport: 'football',
      host: { name, clockSource: 'manual' },
    });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
    return res.body;
  }

  async function join(code: string, name: string, extra: Record<string, unknown> = {}) {
    return call<SessionDto>('POST', `/v1/rooms/${code}/viewers`, {
      name,
      clockSource: 'manual',
      ...extra,
    });
  }

  return {
    app,
    call,
    createRoom,
    join,
    tick: (ms: number) => (now += ms),
    get now() {
      return now;
    },
  };
}

let counter = 0;
export const reactionId = () => `reaction${String(++counter).padStart(4, '0')}`;
