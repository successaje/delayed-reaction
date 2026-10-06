import { compare, position, type MatchPosition } from './position';

/**
 * "Call it": everyone predicts the final score before they've seen anything, and each person
 * finds out who called it when their own playhead reaches full time.
 */

/** Predictions close one minute into the match on the predictor's own clock. */
export const PREDICTION_LOCK = position(1, 60_000);

export interface Score {
  readonly home: number;
  readonly away: number;
}

export interface Teams {
  readonly home: string;
  readonly away: string;
}

/** "Arsenal v Spurs" → { home: Arsenal, away: Spurs }. Falls back to Home/Away. */
export function parseTeams(title: string): Teams {
  const parts = title.split(/\s+(?:v|vs\.?|versus|–|-)\s+/i);
  if (parts.length === 2 && parts[0]!.trim() && parts[1]!.trim()) {
    return { home: parts[0]!.trim(), away: parts[1]!.trim() };
  }
  return { home: 'Home', away: 'Away' };
}

/** Whether a viewer at `at` may still make or change a prediction. */
export function canPredict(at: MatchPosition | null): boolean {
  return !at || compare(at, PREDICTION_LOCK) <= 0;
}

export type Call = 'exact' | 'result' | 'miss';

/** Exact score: 3 points. Right winner or draw: 1. */
export function judge(prediction: Score, result: Score): { call: Call; points: number } {
  if (prediction.home === result.home && prediction.away === result.away) {
    return { call: 'exact', points: 3 };
  }
  const outcome = (s: Score) => Math.sign(s.home - s.away);
  return outcome(prediction) === outcome(result) ? { call: 'result', points: 1 } : { call: 'miss', points: 0 };
}

export function outcomeLabel(score: Score, teams: Teams): string {
  if (score.home === score.away) return 'a draw';
  return `${score.home > score.away ? teams.home : teams.away} to win`;
}
