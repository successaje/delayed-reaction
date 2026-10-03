import { describe, expect, it } from 'vitest';
import { harness, reactionId } from './helpers';

const at = (ms: number, period = 1) => ({ period, ms });

describe('reactions and sync', () => {
  async function setup() {
    const h = harness();
    const ada = await h.createRoom('Ada');
    const tunde = (await h.join(ada.room.code, 'Tunde')).body;
    const code = ada.room.code;
    const sync = (token: string, ms: number, cursor?: string, playing = true) =>
      h.call('POST', `/v1/rooms/${code}/sync`, { position: at(ms), playing, cursor }, token);
    const react = (token: string, ms: number, value = 'no', id = reactionId()) =>
      h.call(
        'POST',
        `/v1/rooms/${code}/reactions`,
        { id, position: at(ms), body: { kind: 'quick', value } },
        token,
      );
    return { h, ada, tunde, sync, react };
  }

  it('never serves a reaction before the late viewer reaches it', async () => {
    const { ada, tunde, sync, react } = await setup();
    // Ada, watching live, reacts at 1H 44:00.
    expect((await react(ada.token, 2_640_000)).status).toBe(201);

    // Tunde is 38 minutes behind: nothing for him yet.
    let page = await sync(tunde.token, 2_640_000 - 38 * 60_000);
    expect(page.body.reactions).toEqual([]);

    // Within the prefetch window: delivered just before the moment, to land on the frame.
    page = await sync(tunde.token, 2_637_000, page.body.cursor);
    expect(page.body.reactions.map((r: any) => r.position.ms)).toEqual([2_640_000]);

    // And not again.
    page = await sync(tunde.token, 2_642_000, page.body.cursor);
    expect(page.body.reactions).toEqual([]);
  });

  it('reports presence for everyone in each sync', async () => {
    const { ada, tunde, sync } = await setup();
    await sync(ada.token, 1_000_000);
    const page = await sync(tunde.token, 100_000);
    const adaView = page.body.viewers.find((v: any) => v.id === ada.viewer.id);
    expect(adaView.report.position).toEqual(at(1_000_000));
    expect(adaView.report.playing).toBe(true);
  });

  it('delivers replies posted behind the viewer ("from behind")', async () => {
    const { ada, tunde, sync, react } = await setup();
    let page = await sync(ada.token, 2_000_000);
    // Tunde, watching later, reacts at a moment Ada passed long ago.
    await react(tunde.token, 600_000, 'haha');
    page = await sync(ada.token, 2_001_000, page.body.cursor);
    expect(page.body.reactions).toHaveLength(1);
    expect(page.body.reactions[0].viewerId).toBe(tunde.viewer.id);
  });

  it('is idempotent on reaction ids and rejects ids owned by someone else', async () => {
    const { ada, tunde, react } = await setup();
    const first = await react(ada.token, 10_000, 'yes', 'shared-id-01');
    const retry = await react(ada.token, 10_000, 'yes', 'shared-id-01');
    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.reaction.id).toBe('shared-id-01');
    const stolen = await react(tunde.token, 10_000, 'yes', 'shared-id-01');
    expect(stolen.status).toBe(400);
  });

  it('serves only up to the reported position plus the prefetch window', async () => {
    const { h, ada, tunde, sync, react } = await setup();
    await react(ada.token, 106_000);
    // Even after a long quiet spell, a sync serves from the position it reports now.
    h.tick(60 * 60_000);
    const page = await sync(tunde.token, 100_000);
    expect(page.body.reactions).toEqual([]);
    expect(page.body.servedUntil).toEqual(at(105_000));
  });

  it('rate limits runaway reaction loops', async () => {
    const { ada, react } = await setup();
    const statuses: number[] = [];
    for (let i = 0; i < 14; i++) statuses.push((await react(ada.token, 1_000 + i)).status);
    expect(statuses.filter((s) => s === 429)).toHaveLength(2);
  });

  it('requires a token for sync and reactions', async () => {
    const { ada, h } = await setup();
    const res = await h.call('POST', `/v1/rooms/${ada.room.code}/sync`, {
      position: at(0),
      playing: false,
    });
    expect(res.status).toBe(401);
  });

  it('keeps the furthest served point after seeking backwards', async () => {
    const { ada, tunde, sync, react } = await setup();
    await react(ada.token, 50_000);
    let page = await sync(tunde.token, 60_000);
    expect(page.body.reactions).toHaveLength(1);
    page = await sync(tunde.token, 10_000, page.body.cursor);
    expect(page.body.reactions).toEqual([]);
    page = await sync(tunde.token, 62_000, page.body.cursor);
    expect(page.body.reactions).toEqual([]);
  });
});

describe('recap', () => {
  it('summarises only what the viewer has reached', async () => {
    const h = harness();
    const ada = await h.createRoom('Ada');
    const tunde = (await h.join(ada.room.code, 'Tunde')).body;
    const code = ada.room.code;
    const react = (token: string, ms: number) =>
      h.call(
        'POST',
        `/v1/rooms/${code}/reactions`,
        { id: reactionId(), position: { period: 1, ms }, body: { kind: 'quick', value: 'no' } },
        token,
      );
    await react(ada.token, 61_000);
    await react(tunde.token, 70_000);
    await react(ada.token, 900_000);

    // Tunde has only reached 1H 02:00.
    await h.call('POST', `/v1/rooms/${code}/sync`, { position: { period: 1, ms: 120_000 }, playing: false }, tunde.token);
    const recap = await h.call('GET', `/v1/rooms/${code}/recap`, undefined, tunde.token);
    expect(recap.status).toBe(200);
    expect(recap.body.total).toBe(2);
    expect(recap.body.moments[0].people).toBe(2);
    expect(JSON.stringify(recap.body)).not.toContain('900000');
  });
});
