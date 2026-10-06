import { describe, expect, it } from 'vitest';
import { harness, program, reactionId } from './helpers';

describe('shared moments', () => {
  it('snapshots a watched moment with the reactions around it', async () => {
    const h = harness();
    const created = await h.call('POST', '/v1/rooms', {
      title: 'RFU v Japan',
      sport: 'football',
      programId: program.id,
      host: { name: 'Ada', clockSource: 'manual' },
    });
    const ada = created.body;
    const code = ada.room.code;
    const react = (ms: number, value: string) =>
      h.call('POST', `/v1/rooms/${code}/reactions`, { id: reactionId(), position: { period: 1, ms }, body: { kind: 'quick', value } }, ada.token);
    await react(5_800, 'no');
    await react(7_000, 'what');
    await react(60_000, 'yes'); // outside the window

    const early = await h.call('POST', `/v1/rooms/${code}/shares`, { position: { period: 1, ms: 5_800 } }, ada.token);
    expect(early.status).toBe(400); // hasn't reached it yet

    await h.call('POST', `/v1/rooms/${code}/sync`, { position: { period: 1, ms: 90_000 }, playing: false }, ada.token);
    const shared = await h.call('POST', `/v1/rooms/${code}/shares`, { position: { period: 1, ms: 5_800 } }, ada.token);
    expect(shared.status).toBe(201);
    expect(shared.body.reactions.map((r: any) => [r.name, r.offsetMs, r.body.value])).toEqual([
      ['Ada', 0, 'no'],
      ['Ada', 1_200, 'what'],
    ]);
    expect(shared.body.media.momentMs).toBe(5_800);

    const pub = await h.call('GET', `/v1/shares/${shared.body.id}`);
    expect(pub.status).toBe(200);
    expect(pub.body.title).toBe('RFU v Japan');
    expect(JSON.stringify(pub.body)).not.toContain(ada.viewer.id);

    expect((await h.call('GET', '/v1/shares/nope')).status).toBe(404);
  });
});
