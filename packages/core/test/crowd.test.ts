import { describe, expect, it } from 'vitest';
import { CROWD_COOLDOWN_MS, detectCrowd, heat, position, type ReactionDto } from '../src';

let n = 0;
const shown = (viewerId: string, value: string, at: number, kind: 'quick' | 'text' = 'quick') => ({
  at,
  reaction: {
    id: `r${++n}`,
    viewerId,
    position: position(1, 1000),
    body: kind === 'quick' ? { kind, value } : { kind, value },
    createdAt: 0,
  } as ReactionDto,
});

describe('crowd moments', () => {
  it('needs at least two different people within the window', () => {
    expect(detectCrowd([shown('ada', 'yes', 0), shown('ada', 'yes', 500)], 600, -Infinity)).toBeNull();
    expect(detectCrowd([shown('ada', 'yes', 0), shown('bola', 'yes', 500)], 600, -Infinity)?.mood).toBe('cheer');
    expect(detectCrowd([shown('ada', 'yes', 0), shown('bola', 'yes', 5_000)], 5_100, -Infinity)).toBeNull();
  });

  it('reads the mood from the words', () => {
    const groan = detectCrowd([shown('ada', 'no', 0), shown('bola', 'ref', 100), shown('cy', 'yes', 200)], 300, -Infinity);
    expect(groan?.mood).toBe('groan');
    expect(detectCrowd([shown('ada', 'hi', 0, 'text'), shown('bola', 'ok', 10, 'text')], 20, -Infinity)).toBeNull();
  });

  it('respects the cooldown and scales intensity', () => {
    const burst = [shown('a', 'yes', 0), shown('b', 'yes', 0), shown('c', 'unreal', 0), shown('d', 'yes', 0)];
    const moment = detectCrowd(burst, 10, -Infinity);
    expect(moment!.intensity).toBeGreaterThan(0.6);
    expect(detectCrowd(burst, 10, 10 - CROWD_COOLDOWN_MS + 1)).toBeNull();
  });

  it('measures heat over the last ten seconds', () => {
    expect(heat([], 0)).toBe(0);
    expect(heat([shown('a', 'yes', 0), shown('b', 'yes', 1_000), shown('c', 'yes', 20_000)], 9_000)).toBeCloseTo(2 / 6);
  });
});
