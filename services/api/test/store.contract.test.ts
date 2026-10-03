import { position, sortKey } from '@delayed-reaction/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DynamoRoomStore } from '../src/store/dynamo';
import { MemoryRoomStore } from '../src/store/memory';
import type { RoomStore, StoredRoom, StoredViewer } from '../src/store/types';
import { startDynamoLocal } from './dynamo-local';

let dynamo: Awaited<ReturnType<typeof startDynamoLocal>>;
beforeAll(async () => {
  dynamo = await startDynamoLocal();
});
afterAll(async () => {
  await dynamo.stop();
});

const factories: Array<[string, () => RoomStore]> = [
  ['memory', () => new MemoryRoomStore()],
  // A zero safety margin makes both stores behave identically in these sequential tests.
  ['dynamodb', () => new DynamoRoomStore(dynamo.table, dynamo.client, 0)],
];

let n = 0;
const code = () => `T${String(++n).padStart(5, '2').replace(/[01]/g, '2')}`;

function room(c: string): StoredRoom {
  return { code: c, title: 'Test', sport: 'football', programId: null, hostId: 'host00000001', createdAt: 1, expiresAt: 9_999_999_999 };
}
function viewer(c: string, id: string, joinedAt = 1): StoredViewer {
  return { id, roomCode: c, name: id, color: '#fff', clockSource: 'manual', linkedTo: null, deviceLabel: null, joinedAt, tokenHash: 'h', report: null };
}

describe.each(factories)('%s store', (_name, make) => {
  it('creates a room once and rejects a duplicate code', async () => {
    const store = make();
    const c = code();
    expect(await store.createRoom(room(c), viewer(c, 'host00000001'))).toBe(true);
    expect(await store.createRoom(room(c), viewer(c, 'host00000002'))).toBe(false);
    expect((await store.getRoom(c))?.title).toBe('Test');
    expect(await store.getRoom('NOPE22')).toBeNull();
  });

  it('adds viewers up to the limit and lists them in join order', async () => {
    const store = make();
    const c = code();
    await store.createRoom(room(c), viewer(c, 'host00000001', 1));
    expect(await store.addViewer(viewer(c, 'viewer000002', 2), 3)).toBe('ok');
    expect(await store.addViewer(viewer(c, 'viewer000003', 3), 3)).toBe('ok');
    expect(await store.addViewer(viewer(c, 'viewer000004', 4), 3)).toBe('full');
    expect((await store.listViewers(c)).map((v) => v.id)).toEqual(['host00000001', 'viewer000002', 'viewer000003']);
  });

  it('records position reports', async () => {
    const store = make();
    const c = code();
    await store.createRoom(room(c), viewer(c, 'host00000001'));
    const report = { position: position(1, 5_000), playing: true, reportedAt: 42 };
    await store.updateReport(c, 'host00000001', report);
    expect((await store.getViewer(c, 'host00000001'))?.report).toEqual(report);
  });

  it('stores reactions idempotently with increasing sequence numbers', async () => {
    const store = make();
    const c = code();
    await store.createRoom(room(c), viewer(c, 'host00000001'));
    const base = { roomCode: c, viewerId: 'host00000001', body: { kind: 'quick' as const, value: 'no' as const }, createdAt: 1 };
    const a = await store.addReaction({ ...base, id: 'reaction-a', position: position(1, 1_000) });
    const b = await store.addReaction({ ...base, id: 'reaction-b', position: position(1, 500) });
    const again = await store.addReaction({ ...base, id: 'reaction-a', position: position(1, 1_000) });
    expect(a.created && b.created).toBe(true);
    expect(again.created).toBe(false);
    expect(again.reaction.seq).toBe(a.reaction.seq);
    expect(b.reaction.seq).toBeGreaterThan(a.reaction.seq);
  });

  it('queries by position window and by newer sequence numbers', async () => {
    const store = make();
    const c = code();
    await store.createRoom(room(c), viewer(c, 'host00000001'));
    const add = (id: string, ms: number) =>
      store.addReaction({ id, roomCode: c, viewerId: 'host00000001', position: position(1, ms), body: { kind: 'quick', value: 'yes' }, createdAt: 1 });
    await add('early-0001', 1_000);
    await add('later-0002', 9_000);
    await add('ahead-0003', 60_000);

    const first = await store.queryReactions(c, { afterKey: null, untilKey: sortKey(position(1, 10_000)), afterSeq: 0 });
    expect(first.reactions.map((r) => r.id)).toEqual(['early-0001', 'later-0002']);

    // A reply posted behind the cursor still comes back via its sequence number.
    await add('reply-0004', 2_000);
    const next = await store.queryReactions(c, {
      afterKey: sortKey(position(1, 10_000)),
      untilKey: sortKey(position(1, 12_000)),
      afterSeq: first.seenSeq,
    });
    expect(next.reactions.map((r) => r.id)).toEqual(['reply-0004']);

    const ahead = await store.queryReactions(c, {
      afterKey: sortKey(position(1, 12_000)),
      untilKey: sortKey(position(1, 61_000)),
      afterSeq: next.seenSeq,
    });
    expect(ahead.reactions.map((r) => r.id)).toEqual(['ahead-0003']);
  });
});
