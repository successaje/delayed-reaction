import type { ReactionDto } from './schemas';

/**
 * Crowd moments: when several friends react within a couple of seconds, the TV plays a short
 * crowd swell (or groan) over the match, so a late watcher alone on the sofa hears the group.
 */
export type CrowdMood = 'cheer' | 'groan';

export const CROWD_WINDOW_MS = 3_000;
export const CROWD_COOLDOWN_MS = 6_000;
/** Distinct people needed for a crowd moment: one person spamming is not a crowd. */
export const CROWD_MIN_PEOPLE = 2;

const MOOD: Record<string, CrowdMood> = {
  yes: 'cheer',
  unreal: 'cheer',
  'come-on': 'cheer',
  haha: 'cheer',
  no: 'groan',
  ref: 'groan',
  what: 'groan',
  nervous: 'groan',
};

export interface Shown {
  readonly reaction: ReactionDto;
  /** Local time the reaction appeared on screen. */
  readonly at: number;
}

export interface CrowdMoment {
  readonly mood: CrowdMood;
  /** 0–1, from how many people and reactions are in the window. */
  readonly intensity: number;
}

/**
 * Decides whether the reactions that just appeared make a crowd moment. Pure: the caller keeps
 * the recent history and the time of the last crowd moment.
 */
export function detectCrowd(
  recent: readonly Shown[],
  now: number,
  lastCrowdAt: number,
): CrowdMoment | null {
  if (now - lastCrowdAt < CROWD_COOLDOWN_MS) return null;
  const inWindow = recent.filter((s) => s.at <= now && now - s.at <= CROWD_WINDOW_MS);
  const people = new Set(inWindow.map((s) => s.reaction.viewerId)).size;
  if (people < CROWD_MIN_PEOPLE) return null;

  let cheer = 0;
  let groan = 0;
  for (const { reaction } of inWindow) {
    if (reaction.body.kind !== 'quick') continue;
    const mood = MOOD[reaction.body.value];
    if (mood === 'cheer') cheer++;
    else if (mood === 'groan') groan++;
  }
  if (cheer === 0 && groan === 0) return null;
  return {
    mood: groan > cheer ? 'groan' : 'cheer',
    intensity: Math.min(1, 0.4 + 0.15 * (people - 2) + 0.1 * (inWindow.length - 2)),
  };
}

/** How lively the room is right now, 0–1, for the scorebug meter. */
export function heat(recent: readonly Shown[], now: number, windowMs = 10_000): number {
  const count = recent.filter((s) => s.at <= now && now - s.at <= windowMs).length;
  return Math.min(1, count / 6);
}
