import { describe, expect, it } from 'vitest';
import {
  createRoomRequestSchema,
  generateRoomCode,
  normalizeRoomCode,
  normalizeText,
  postReactionRequestSchema,
  reactionLabel,
  roomCodeSchema,
  ROOM_CODE_ALPHABET,
} from '../src';

describe('room codes', () => {
  it('generates codes from the unambiguous alphabet', () => {
    let seed = 0;
    const code = generateRoomCode((n) => Uint8Array.from({ length: n }, () => (seed += 37)));
    expect(code).toHaveLength(6);
    expect([...code].every((c) => ROOM_CODE_ALPHABET.includes(c))).toBe(true);
    expect(roomCodeSchema.safeParse(code).success).toBe(true);
  });

  it('normalizes what people type', () => {
    expect(normalizeRoomCode(' kx7-p2m ')).toBe('KX7P2M');
    expect(normalizeRoomCode('KX7P2')).toBeNull();
    expect(normalizeRoomCode('KX0P2M')).toBeNull();
  });
});

describe('request schemas', () => {
  it('trims names and titles and rejects empty ones with a human message', () => {
    const ok = createRoomRequestSchema.parse({
      title: '  Arsenal   v Spurs ',
      sport: 'football',
      host: { name: ' Ada ', clockSource: 'manual' },
    });
    expect(ok.title).toBe('Arsenal v Spurs');
    expect(ok.host.name).toBe('Ada');

    const bad = createRoomRequestSchema.safeParse({
      title: 'x',
      sport: 'football',
      host: { name: '   ', clockSource: 'manual' },
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues[0]?.message).toBe('Add a name so friends know who reacted');
  });

  it('accepts quick and text reactions and rejects unknown quick ids', () => {
    const base = { id: 'abcdefgh12', position: { period: 1, ms: 1000 } };
    expect(
      postReactionRequestSchema.safeParse({ ...base, body: { kind: 'quick', value: 'no' } }).success,
    ).toBe(true);
    expect(
      postReactionRequestSchema.safeParse({ ...base, body: { kind: 'quick', value: 'nope' } })
        .success,
    ).toBe(false);
    const text = postReactionRequestSchema.parse({
      ...base,
      body: { kind: 'text', value: '  what   a save ' },
    });
    expect(text.body.value).toBe('what a save');
  });
});

describe('reaction text', () => {
  it('labels quick reactions and normalizes text', () => {
    expect(reactionLabel({ kind: 'quick', value: 'no' })).toBe('NOOO');
    expect(normalizeText('   ')).toBeNull();
    expect(normalizeText('a'.repeat(100))).toHaveLength(80);
  });
});
