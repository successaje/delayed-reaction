import { describe, expect, it } from 'vitest';
import { buildRecap, position, type ReactionDto } from '../src';

let n = 0;
const r = (viewerId: string, period: number, ms: number): ReactionDto => ({
  id: `r${++n}`,
  viewerId,
  position: position(period, ms),
  body: { kind: 'quick', value: 'no' },
  createdAt: n,
});

describe('recap', () => {
  const reactions = [
    r('ada', 1, 61_000),
    r('tunde', 1, 70_000),
    r('bola', 1, 75_000), // three people around 1:00-1:30
    r('ada', 1, 600_000),
    r('ada', 1, 610_000), // one person twice around 10:00
    r('ada', 2, 30_000), // alone
    r('tunde', 2, 900_000), // ahead of the viewer
  ];

  it('ranks moments by how many people reacted, then by volume', () => {
    const recap = buildRecap(reactions, position(2, 120_000));
    expect(recap.moments.map((m) => [m.position, m.people, m.count])).toEqual([
      [position(1, 61_000), 3, 3],
      [position(1, 600_000), 1, 2],
    ]);
  });

  it('never includes anything after the viewer has reached', () => {
    const recap = buildRecap(reactions, position(1, 65_000));
    expect(recap.total).toBe(1);
    expect(recap.moments).toEqual([]);
    expect(recap.buckets).toEqual([{ period: 1, startMs: 60_000, count: 1 }]);
  });

  it('ignores pre-match chatter in moments', () => {
    const recap = buildRecap([r('ada', 0, 0), r('bola', 0, 0)], position(1, 0));
    expect(recap.total).toBe(0);
  });
});
