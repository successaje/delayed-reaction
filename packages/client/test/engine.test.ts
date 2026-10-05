import { createApp } from '@delayed-reaction/api/src/app';
import { MemoryRoomStore } from '@delayed-reaction/api/src/store/memory';
import { FRESH_WITHIN_MS, getSport, position, type ReactionDto } from '@delayed-reaction/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiClient,
  deliveries,
  describeDeliveries,
  ManualClock,
  playerPlayhead,
  TimelineSync,
  type TimelineEvent,
} from '../src';

const MIN = 60_000;

function world() {
  const app = createApp({ store: new MemoryRoomStore(), now: () => Date.now(), programs: [] });
  const api = new ApiClient({
    baseUrl: 'http://api.test',
    fetch: async (input, init) => app.request(String(input).replace('http://api.test', ''), init),
  });
  return { api };
}

function collect(engine: TimelineSync) {
  const events: TimelineEvent[] = [];
  engine.subscribe((e) => events.push(e));
  const shown = () =>
    events.flatMap((e) => (e.type === 'due' ? e.reactions.map((r: ReactionDto) => r.id) : []));
  const history = () =>
    events.flatMap((e) => (e.type === 'history' ? e.reactions.map((r: ReactionDto) => r.id) : []));
  return { events, shown, history };
}

describe('TimelineSync, end to end against the API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T19:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it("lands Ada's live reaction on Tunde's TV at the same match moment, 38 minutes later", async () => {
    const { api } = world();
    const ada = await api.createRoom({
      title: 'RFU v Japan',
      sport: 'football',
      host: { name: 'Ada', clockSource: 'manual' },
    });
    const tunde = await api.joinRoom(ada.room.code, { name: 'Tunde', clockSource: 'player' });

    // Ada watches live: kick-off now.
    const adaClock = new ManualClock(undefined, Date.now);
    adaClock.markPeriodStart(1);
    const adaSync = new TimelineSync({
      api,
      roomCode: ada.room.code,
      token: ada.token,
      viewerId: ada.viewer.id,
      readPlayhead: adaClock.read,
    });

    // Tunde starts the recording 38 minutes later; kick-off is at 0:00 in the media.
    let tundeMediaMs = 0;
    let tundePlaying = false;
    const tundeSync = new TimelineSync({
      api,
      roomCode: ada.room.code,
      token: tunde.token,
      viewerId: tunde.viewer.id,
      readPlayhead: playerPlayhead(
        [{ period: 1, localStartMs: 0 }],
        () => tundeMediaMs,
        () => tundePlaying,
      ),
    });
    const tundeSaw = collect(tundeSync);

    adaSync.start();
    await vi.advanceTimersByTimeAsync(23 * MIN + 14_000);
    const noooo = await adaSync.react({ kind: 'quick', value: 'no' });
    expect(noooo.position).toEqual(position(1, 23 * MIN + 14_000));

    await vi.advanceTimersByTimeAsync(38 * MIN - 23 * MIN - 14_000);
    tundeSync.start();
    tundePlaying = true;
    // Play Tunde's recording in real time, sampling as a player would.
    const timer = setInterval(() => (tundeMediaMs += 100), 100);

    await vi.advanceTimersByTimeAsync(23 * MIN + 10_000);
    expect(tundeSaw.shown()).toEqual([]); // 4 seconds before the moment: nothing yet

    // Step through the moment. The invariant: never before 23:14, and shown while still fresh.
    // (Token hashing is real async work, so on a slow machine the sync can land a little late
    // in fake time; the engine then shows it immediately because it's within the fresh window.)
    const moment = 23 * MIN + 14_000;
    let shownAt: number | null = null;
    while (shownAt === null && tundeMediaMs < moment + FRESH_WITHIN_MS) {
      await vi.advanceTimersByTimeAsync(200);
      if (tundeSaw.shown().length) shownAt = tundeMediaMs;
    }
    expect(tundeSaw.shown()).toEqual([noooo.id]);
    expect(shownAt).toBeGreaterThanOrEqual(moment);
    expect(shownAt! - moment).toBeLessThanOrEqual(FRESH_WITHIN_MS);

    // Ada sees presence: Tunde is ~38 minutes behind her.
    const tundeView = adaSync.currentViewers.find((v) => v.id === tunde.viewer.id);
    // Reports trail the playhead by up to a sync interval or two (more on slow CI).
    expect(tundeView?.report?.position.ms).toBeGreaterThan(22 * MIN);

    clearInterval(timer);
    adaSync.stop();
    tundeSync.stop();
  });

  it('files reactions skipped by a seek as history, without a burst', async () => {
    const { api } = world();
    const host = await api.createRoom({
      title: 'Test',
      sport: 'football',
      host: { name: 'Ada', clockSource: 'manual' },
    });
    const viewer = await api.joinRoom(host.room.code, { name: 'Tunde', clockSource: 'player' });
    let mediaMs = 0;
    const tunde = new TimelineSync({
      api,
      roomCode: host.room.code,
      token: viewer.token,
      viewerId: viewer.viewer.id,
      readPlayhead: playerPlayhead([{ period: 1, localStartMs: 0 }], () => mediaMs, () => true),
    });
    const ada = new TimelineSync({
      api,
      roomCode: host.room.code,
      token: host.token,
      viewerId: host.viewer.id,
      readPlayhead: () => ({ position: position(1, 10 * MIN), playing: true }),
    });
    await ada.react({ kind: 'quick', value: 'yes' });
    const saw = collect(tunde);
    tunde.start();
    await vi.advanceTimersByTimeAsync(1_000);
    mediaMs = 20 * MIN; // seek far past the reaction
    await vi.advanceTimersByTimeAsync(3_000);
    expect(saw.shown()).toEqual([]);
    expect(saw.history()).toHaveLength(1);
    tunde.stop();
  });

  it('reports reconnecting, then offline, and recovers', async () => {
    let online = true;
    const { api: real } = world();
    const host = await real.createRoom({
      title: 'Test',
      sport: 'football',
      host: { name: 'Ada', clockSource: 'manual' },
    });
    const flaky = new ApiClient({
      baseUrl: 'http://api.test',
      fetch: (input, init) =>
        online ? (real as any).fetchImpl(input, init) : Promise.reject(new TypeError('offline')),
    });
    const engine = new TimelineSync({
      api: flaky,
      roomCode: host.room.code,
      token: host.token,
      viewerId: host.viewer.id,
      readPlayhead: () => ({ position: position(1, 0), playing: true }),
    });
    const statuses: string[] = [];
    engine.subscribe((e) => e.type === 'status' && statuses.push(e.status));
    engine.start();
    await vi.advanceTimersByTimeAsync(500);
    online = false;
    await vi.advanceTimersByTimeAsync(40_000);
    online = true;
    // Step through time so real async work (token hashing) keeps pace with the fake clock.
    for (let i = 0; i < 40 && statuses.at(-1) !== 'live'; i++) {
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(statuses).toEqual(['live', 'reconnecting', 'offline', 'live']);
    engine.stop();
  });

  it('stops when the room no longer recognises the device', async () => {
    const { api } = world();
    const engine = new TimelineSync({
      api,
      roomCode: 'ZZZZZZ',
      token: 'aaaaaaaaaaaa.' + 'A'.repeat(43),
      viewerId: 'aaaaaaaaaaaa',
      readPlayhead: () => ({ position: position(1, 0), playing: true }),
    });
    const statuses: string[] = [];
    engine.subscribe((e) => e.type === 'status' && statuses.push(e.status));
    engine.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(statuses).toEqual(['ended']);
  });
});

describe('delivery estimates', () => {
  const football = getSport('football');
  const viewer = (id: string, name: string, ms: number, extra = {}) => ({
    id,
    name,
    color: '#fff',
    clockSource: 'manual' as const,
    linkedTo: null,
    deviceLabel: null,
    joinedAt: 0,
    report: { position: position(1, ms), playing: false, reportedAt: 0 },
    ...extra,
  });

  it('tells the reactor when each friend will see it', () => {
    const list = deliveries(
      position(1, 40 * MIN),
      [
        viewer('me', 'Ada', 40 * MIN),
        viewer('t', 'Tunde', 2 * MIN),
        viewer('b', 'Bola', 40 * MIN + 3_000),
        viewer('tv', 'TV phone', 0, { clockSource: 'linked' }),
      ],
      'me',
      football,
      1_000,
    );
    expect(list.map((d) => [d.viewer.name, d.when])).toEqual([
      ['Tunde', 'later'],
      ['Bola', 'now'],
    ]);
    expect(describeDeliveries(list)).toBe('Tunde will see this in 38 min.');
  });

  it('has a sensible line when nobody else is syncing', () => {
    expect(describeDeliveries([])).toBe('Saved for anyone who watches later.');
  });
});
