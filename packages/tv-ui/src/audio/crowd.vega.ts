import type { CrowdMood } from '@delayed-reaction/core';
import {
  AudioContentType,
  AudioPlayer,
  AudioUsageType,
} from '@amazon-devices/react-native-w3cmedia';
import { crowdSoundUrl, type CrowdSound } from './types';

/**
 * Vega build: one W3C AudioPlayer per sound, marked as sonification so it plays alongside the
 * match rather than taking over the main media session.
 */
export function createCrowdSound(webUrl: string): CrowdSound {
  const players = new Map<CrowdMood, Promise<AudioPlayer>>();
  let disposed = false;

  const load = (mood: CrowdMood) => {
    let player = players.get(mood);
    if (!player) {
      player = (async () => {
        const audio = new AudioPlayer(
          AudioContentType.CONTENT_TYPE_SONIFICATION,
          AudioUsageType.USAGE_GAME,
        );
        await audio.initialize();
        audio.autoplay = false;
        audio.src = crowdSoundUrl(webUrl, mood);
        audio.load();
        return audio;
      })();
      players.set(mood, player);
    }
    return player;
  };

  // Warm both up so the first crowd moment isn't late.
  void load('cheer').catch(() => undefined);
  void load('groan').catch(() => undefined);

  return {
    play(mood, intensity) {
      void load(mood)
        .then((audio) => {
          if (disposed) return;
          audio.volume = Math.min(1, 0.35 + 0.5 * intensity);
          audio.currentTime = 0;
          audio.play();
        })
        .catch(() => undefined);
    },
    dispose() {
      disposed = true;
      for (const player of players.values()) {
        void player
          .then((audio) => {
            audio.pause();
            audio.deinitializeSync(1_000);
          })
          .catch(() => undefined);
      }
    },
  };
}
