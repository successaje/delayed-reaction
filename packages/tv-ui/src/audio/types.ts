import type { CrowdMood } from '@delayed-reaction/core';

/** Plays short crowd sounds over the match. */
export interface CrowdSound {
  play(mood: CrowdMood, intensity: number): void;
  dispose(): void;
}

export const crowdSoundUrl = (webUrl: string, mood: CrowdMood) => `${webUrl}/sounds/${mood}.mp3`;
