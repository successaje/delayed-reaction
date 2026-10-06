import { describe, expect, it } from 'vitest';
import { harness, program } from './helpers';

const at = (period: number, ms: number) => ({ period, ms });

describe('call it', () => {
  async function setup(programId?: string) {
    const h = harness();
    const res = await h.call('POST', '/v1/rooms', {
      title: 'RFU v Japan',
      sport: 'football',
      programId,
      host: { name: 'Ada', clockSource: 'manual' },
    });
    const ada = res.body;
    const tunde = (await h.join(ada.room.code, 'Tunde')).body;
    const code = ada.room.code;
    const sync = (token: string, period: number, ms: number) =>
      h.call('POST', `/v1/rooms/${code}/sync`, { position: at(period, ms), playing: true }, token);
    const predict = (token: string, home: number, away: number) =>
      h.call('POST', `/v1/rooms/${code}/predictions`, { home, away }, token);
    const get = (token: string) => h.call('GET', `/v1/rooms/${code}/predictions`, undefined, token);
    return { h, ada, tunde, code, sync, predict, get };
  }

  it('accepts predictions before a minute in and refuses them after', async () => {
    const { ada, tunde, sync, predict } = await setup();
    expect((await predict(ada.token, 2, 1)).status).toBe(200);
    expect((await predict(ada.token, 3, 1)).body.predictions).toHaveLength(1); // changed, not added
    await sync(tunde.token, 1, 90_000);
    const late = await predict(tunde.token, 5, 2);
    expect(late.status).toBe(400);
    expect(late.body.error.message).toMatch(/closed/);
  });

  it('reveals a catalog result only once the viewer reaches the end', async () => {
    const { ada, tunde, sync, predict, get } = await setup(program.id);
    await predict(ada.token, 5, 2);
    await predict(tunde.token, 1, 1);

    await sync(tunde.token, 1, 60_000);
    expect((await get(tunde.token)).body.result).toBeNull();

    await sync(tunde.token, 1, program.durationMs);
    const reveal = await get(tunde.token);
    expect(reveal.body.result).toEqual(program.result);
    expect(reveal.body.predictions).toHaveLength(2);
  });

  it('lets someone in the second half enter the score, gated at their position', async () => {
    const { h, ada, tunde, code, sync, get } = await setup();
    await sync(ada.token, 1, 600_000);
    const early = await h.call('POST', `/v1/rooms/${code}/result`, { home: 2, away: 0 }, ada.token);
    expect(early.status).toBe(400);

    await sync(ada.token, 2, 2_800_000);
    const set = await h.call('POST', `/v1/rooms/${code}/result`, { home: 2, away: 0 }, ada.token);
    expect(set.body.result).toEqual({ home: 2, away: 0 });

    await sync(tunde.token, 2, 1_000_000);
    expect((await get(tunde.token)).body.result).toBeNull();
    await sync(tunde.token, 2, 2_800_000);
    expect((await get(tunde.token)).body.result).toEqual({ home: 2, away: 0 });
  });
});
