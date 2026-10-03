/**
 * Sports define how a match is divided into periods. Periods are the unit of sync:
 * every viewer re-anchors at the start of each one, which keeps drift from ads,
 * broadcaster delay and variable breaks bounded to a single period.
 */

export type SportId = 'football' | 'basketball' | 'american-football' | 'other';

export interface PeriodSpec {
  /** 1-based period number. Period 0 is reserved for pre-match. */
  readonly period: number;
  /** Short broadcast-style label, e.g. "1H" or "Q3". */
  readonly label: string;
  /** Spoken label used in prompts, e.g. "second half". */
  readonly name: string;
  /** Nominal length, used only to estimate distances between viewers. */
  readonly nominalMs: number;
}

export interface Sport {
  readonly id: SportId;
  readonly name: string;
  /** What starts the match, as a viewer would say it: "kick-off", "tip-off". */
  readonly startCue: string;
  readonly periods: readonly PeriodSpec[];
}

const MIN = 60_000;

export const SPORTS: Readonly<Record<SportId, Sport>> = {
  football: {
    id: 'football',
    name: 'Football',
    startCue: 'kick-off',
    periods: [
      { period: 1, label: '1H', name: 'first half', nominalMs: 45 * MIN },
      { period: 2, label: '2H', name: 'second half', nominalMs: 45 * MIN },
      { period: 3, label: 'ET1', name: 'extra time, first half', nominalMs: 15 * MIN },
      { period: 4, label: 'ET2', name: 'extra time, second half', nominalMs: 15 * MIN },
      { period: 5, label: 'PENS', name: 'penalties', nominalMs: 15 * MIN },
    ],
  },
  basketball: {
    id: 'basketball',
    name: 'Basketball',
    startCue: 'tip-off',
    periods: [
      { period: 1, label: 'Q1', name: 'first quarter', nominalMs: 12 * MIN },
      { period: 2, label: 'Q2', name: 'second quarter', nominalMs: 12 * MIN },
      { period: 3, label: 'Q3', name: 'third quarter', nominalMs: 12 * MIN },
      { period: 4, label: 'Q4', name: 'fourth quarter', nominalMs: 12 * MIN },
      { period: 5, label: 'OT', name: 'overtime', nominalMs: 5 * MIN },
    ],
  },
  'american-football': {
    id: 'american-football',
    name: 'American football',
    startCue: 'kick-off',
    periods: [
      { period: 1, label: 'Q1', name: 'first quarter', nominalMs: 15 * MIN },
      { period: 2, label: 'Q2', name: 'second quarter', nominalMs: 15 * MIN },
      { period: 3, label: 'Q3', name: 'third quarter', nominalMs: 15 * MIN },
      { period: 4, label: 'Q4', name: 'fourth quarter', nominalMs: 15 * MIN },
      { period: 5, label: 'OT', name: 'overtime', nominalMs: 10 * MIN },
    ],
  },
  other: {
    id: 'other',
    name: 'Something else',
    startCue: 'the start',
    periods: [
      { period: 1, label: 'P1', name: 'first part', nominalMs: 45 * MIN },
      { period: 2, label: 'P2', name: 'second part', nominalMs: 45 * MIN },
      { period: 3, label: 'P3', name: 'third part', nominalMs: 45 * MIN },
    ],
  },
};

export const SPORT_IDS = Object.keys(SPORTS) as SportId[];

export function getSport(id: SportId): Sport {
  return SPORTS[id];
}

export function periodSpec(sport: Sport, period: number): PeriodSpec | undefined {
  return sport.periods.find((p) => p.period === period);
}

export function nextPeriod(sport: Sport, period: number): PeriodSpec | undefined {
  return sport.periods.find((p) => p.period === period + 1);
}
