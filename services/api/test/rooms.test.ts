import { describe, expect, it } from 'vitest';
import { harness } from './helpers';

describe('rooms', () => {
  it('creates a room with a readable code and a host session', async () => {
    const h = harness();
    const session = await h.createRoom();
    expect(session.room.code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    expect(session.room.title).toBe('Arsenal v Spurs');
    expect(session.viewer.name).toBe('Ada');
    expect(session.token).toMatch(/^[a-z0-9]{12}\./);
  });

  it('rejects invalid input with a message a person can act on', async () => {
    const h = harness();
    const res = await h.call('POST', '/v1/rooms', {
      title: '',
      sport: 'football',
      host: { name: 'Ada', clockSource: 'manual' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'invalid_request', message: 'Name the game' });
  });

  it('returns a helpful 404 for unknown and malformed codes', async () => {
    const h = harness();
    for (const code of ['ZZZZZZ', 'nope']) {
      const res = await h.call('GET', `/v1/rooms/${code}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('room_not_found');
    }
  });

  it('lets friends join with distinct colours and lists them in join order', async () => {
    const h = harness();
    const host = await h.createRoom();
    h.tick(1);
    const tunde = await h.join(host.room.code.toLowerCase(), 'Tunde');
    expect(tunde.status).toBe(201);
    expect(tunde.body.viewer.color).not.toBe(host.viewer.color);

    const state = await h.call('GET', `/v1/rooms/${host.room.code}`);
    expect(state.body.viewers.map((v: { name: string }) => v.name)).toEqual(['Ada', 'Tunde']);
    expect(JSON.stringify(state.body)).not.toContain('tokenHash');
  });

  it('restores a session from its token and rejects forged ones', async () => {
    const h = harness();
    const host = await h.createRoom();
    const me = await h.call('GET', `/v1/rooms/${host.room.code}/me`, undefined, host.token);
    expect(me.status).toBe(200);
    expect(me.body.viewer.id).toBe(host.viewer.id);

    const forged = host.token.slice(0, -4) + 'AAAA';
    const bad = await h.call('GET', `/v1/rooms/${host.room.code}/me`, undefined, forged);
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('unauthorized');
  });

  it('links a phone to a TV, but only to a player clock in the same room', async () => {
    const h = harness();
    const host = await h.createRoom();
    const tv = await h.join(host.room.code, 'Living room', { clockSource: 'player' });
    const phone = await h.join(host.room.code, 'Tunde', {
      clockSource: 'linked',
      linkedTo: tv.body.viewer.id,
    });
    expect(phone.status).toBe(201);
    expect(phone.body.viewer.linkedTo).toBe(tv.body.viewer.id);

    const wrong = await h.join(host.room.code, 'Bola', {
      clockSource: 'linked',
      linkedTo: host.viewer.id,
    });
    expect(wrong.status).toBe(400);
  });

  it('serves the program catalog', async () => {
    const h = harness();
    const res = await h.call('GET', '/v1/programs');
    expect(res.body.programs[0].id).toBe('test-final');
  });

  it('only accepts known programs', async () => {
    const h = harness();
    const res = await h.call('POST', '/v1/rooms', {
      title: 'x',
      sport: 'football',
      programId: 'missing',
      host: { name: 'Ada', clockSource: 'player' },
    });
    expect(res.status).toBe(400);
  });
});
