import { describe, expect, it } from 'vitest';
import { position, ReactionTimeline, type MatchPosition } from '../src';

const r = (id: string, period: number, ms: number) => ({ id, position: position(period, ms) });
const ids = (items: { id: string }[]) => items.map((i) => i.id);

function timelineWith(...items: { id: string; position: MatchPosition }[]) {
  const t = new ReactionTimeline<{ id: string; position: MatchPosition }>();
  t.ingest(items, null);
  return t;
}

describe('reaction timeline', () => {
  it('releases reactions as the playhead crosses them during playback', () => {
    const t = timelineWith(r('a', 1, 10_000), r('b', 1, 11_000), r('c', 1, 20_000));
    expect(ids(t.advance(position(1, 9_000), position(1, 10_000)).due)).toEqual(['a']);
    expect(ids(t.advance(position(1, 10_000), position(1, 12_000)).due)).toEqual(['b']);
    expect(t.advance(position(1, 12_000), position(1, 13_000)).due).toEqual([]);
  });

  it('keeps reactions sorted regardless of arrival order and ignores duplicates', () => {
    const t = timelineWith(r('late', 1, 30_000), r('early', 1, 5_000));
    t.ingest([r('early', 1, 5_000)], null);
    expect(t.size).toBe(2);
    expect(ids(t.upTo(position(1, 60_000)))).toEqual(['early', 'late']);
  });

  it('files reactions jumped over by a seek as skipped, never as a burst', () => {
    const t = timelineWith(r('a', 1, 10_000), r('b', 1, 100_000), r('c', 1, 598_000));
    const result = t.advance(position(1, 5_000), position(1, 600_000));
    expect(ids(result.skipped)).toEqual(['a', 'b']);
    expect(ids(result.due)).toEqual(['c']);
  });

  it('shows nothing when seeking backwards, and replays when crossing again', () => {
    const t = timelineWith(r('a', 1, 10_000));
    t.advance(position(1, 9_000), position(1, 11_000));
    expect(t.advance(position(1, 11_000), position(1, 8_000)).due).toEqual([]);
    expect(ids(t.advance(position(1, 9_000), position(1, 10_500)).due)).toEqual(['a']);
  });

  it('treats a period change as a jump', () => {
    const t = timelineWith(r('halftime', 1, 2_900_000), r('kickoff', 2, 1_000));
    const result = t.advance(position(1, 2_800_000), position(2, 2_000));
    expect(ids(result.skipped)).toEqual(['halftime']);
    expect(ids(result.due)).toEqual(['kickoff']);
  });

  it('shows reactions that arrive just behind the playhead, and files older ones as past', () => {
    const t = new ReactionTimeline<{ id: string; position: MatchPosition }>();
    const result = t.ingest(
      [r('fresh', 1, 58_000), r('old', 1, 10_000), r('ahead', 1, 61_000)],
      position(1, 60_000),
    );
    expect(ids(result.due)).toEqual(['fresh']);
    expect(ids(result.past)).toEqual(['old']);
    expect(t.countAfter(position(1, 60_000))).toBe(1);
  });

  it('on first tick, shows fresh reactions and skips the rest', () => {
    const t = timelineWith(r('a', 1, 1_000), r('b', 1, 59_000));
    const result = t.advance(null, position(1, 60_000));
    expect(ids(result.due)).toEqual(['b']);
    expect(ids(result.skipped)).toEqual(['a']);
  });
});
