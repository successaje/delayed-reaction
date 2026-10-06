import type { CrowdMood } from '@delayed-reaction/core';
import {
  AudioContentType,
  AudioPlayer,
  AudioUsageType,
} from '@amazon-devices/react-native-w3cmedia';
import { crowdSoundUrl, type CrowdSound } from './types';

// Warning level: the device suppresses info logs during the burst of media logging at playback.
const log = (message: string) => console.warn(`[DelayedReaction] crowd ${message}`);

/**
 * Vega build: one W3C AudioPlayer per sound, marked as sonification so it plays alongside the
 * match rather than taking over the main media session. A sound is only played once its media
 * is ready; a crowd moment that arrives earlier is skipped rather than queued (it would be late).
 */
export function createCrowdSound(webUrl: string): CrowdSound {
  const players = new Map<CrowdMood, Promise<AudioPlayer>>();
  const ready = new Set<CrowdMood>();
  let disposed = false;

  const load = (mood: CrowdMood) => {
    let player = players.get(mood);
    if (!player) {
      player = (async () => {
        const audio = new AudioPlayer(
          AudioContentType.CONTENT_TYPE_SONIFICATION,
          AudioUsageType.USAGE_GAME,
        );
        // Log focus changes: if the system takes focus away, the sound goes silent.
        for (const event of ['audiofocuspaused', 'audiofocuslost']) {
          audio.addEventListener(event, () => log(`${mood} ${event}`));
        }
        await audio.initialize();
        const markReady = () => {
          if (!ready.has(mood)) log(`${mood} ready`);
          ready.add(mood);
        };
        audio.addEventListener('canplay', markReady);
        audio.addEventListener('loadeddata', markReady);
        audio.addEventListener('error', () => log(`${mood} media error`));
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
  void load('cheer').catch((error) => log(`cheer init failed: ${String(error)}`));
  void load('groan').catch((error) => log(`groan init failed: ${String(error)}`));

  return {
    play(mood, intensity) {
      if (!ready.has(mood)) {
        log(`${mood} skipped: not loaded yet`);
        return;
      }
      void load(mood)
        .then(async (audio) => {
          if (disposed) return;
          audio.volume = Math.min(1, 0.35 + 0.5 * intensity);
          if (audio.currentTime > 0) audio.currentTime = 0;
          log(`${mood} play at volume ${Math.min(1, 0.35 + 0.5 * intensity).toFixed(2)}`);
          await audio.play();
        })
        .catch((error) => log(`${mood} play failed: ${String(error)}`));
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
