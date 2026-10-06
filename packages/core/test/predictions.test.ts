import { describe, expect, it } from 'vitest';
import { canPredict, judge, outcomeLabel, parseTeams, position } from '../src';

describe('call it', () => {
  it('parses teams from room titles', () => {
    expect(parseTeams('Arsenal v Spurs')).toEqual({ home: 'Arsenal', away: 'Spurs' });
    expect(parseTeams('Lakers vs. Celtics')).toEqual({ home: 'Lakers', away: 'Celtics' });
    expect(parseTeams('Sunday league')).toEqual({ home: 'Home', away: 'Away' });
  });

  it('closes predictions one minute into the predictor’s own match', () => {
    expect(canPredict(null)).toBe(true);
    expect(canPredict(position(0, 0))).toBe(true);
    expect(canPredict(position(1, 59_000))).toBe(true);
    expect(canPredict(position(1, 61_000))).toBe(false);
    expect(canPredict(position(2, 0))).toBe(false);
  });

  it('scores exact calls, right outcomes and misses', () => {
    const result = { home: 5, away: 2 };
    expect(judge({ home: 5, away: 2 }, result)).toEqual({ call: 'exact', points: 3 });
    expect(judge({ home: 1, away: 0 }, result)).toEqual({ call: 'result', points: 1 });
    expect(judge({ home: 1, away: 1 }, result)).toEqual({ call: 'miss', points: 0 });
    expect(judge({ home: 2, away: 2 }, { home: 0, away: 0 })).toEqual({ call: 'result', points: 1 });
  });

  it('describes outcomes in words', () => {
    const teams = { home: 'RFU', away: 'Japan' };
    expect(outcomeLabel({ home: 5, away: 2 }, teams)).toBe('RFU to win');
    expect(outcomeLabel({ home: 1, away: 1 }, teams)).toBe('a draw');
  });
});
