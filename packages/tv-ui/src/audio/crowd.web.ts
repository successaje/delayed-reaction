import type { CrowdMood } from '@delayed-reaction/core';
import { crowdSoundUrl, type CrowdSound } from './types';

/** Browser build: two preloaded <audio> elements, restarted for each crowd moment. */
export function createCrowdSound(webUrl: string): CrowdSound {
  const clips: Record<CrowdMood, HTMLAudioElement> = {
    cheer: new Audio(crowdSoundUrl(webUrl, 'cheer')),
    groan: new Audio(crowdSoundUrl(webUrl, 'groan')),
  };
  for (const clip of Object.values(clips)) clip.preload = 'auto';
  return {
    play(mood, intensity) {
      const clip = clips[mood];
      clip.volume = Math.min(1, 0.35 + 0.5 * intensity);
      clip.currentTime = 0;
      void clip.play().catch(() => undefined); // autoplay can be refused before any key press
    },
    dispose() {
      for (const clip of Object.values(clips)) clip.pause();
    },
  };
}
