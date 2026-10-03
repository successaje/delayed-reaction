import {
  KeplerVideoSurfaceView,
  VideoPlayer,
} from '@amazon-devices/react-native-w3cmedia';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MediaController, VideoSurfaceProps } from './types';

/**
 * Vega build: Amazon's W3C media pipeline. The player is created and loaded first; the native
 * surface is attached once metadata arrives, following the vega-video-sample lifecycle.
 */
export function VideoSurface({ uri, onController, onStatus }: VideoSurfaceProps) {
  const playerRef = useRef<VideoPlayer | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let disposed = false;
    const player = new VideoPlayer();
    playerRef.current = player;
    onStatus('loading');

    const on = (event: string, fn: () => void) => player.addEventListener(event, fn);
    on('loadedmetadata', () => {
      if (disposed) return;
      setInitialized(true);
      onStatus('ready');
    });
    on('waiting', () => onStatus('buffering'));
    on('playing', () => onStatus('ready'));
    on('seeked', () => onStatus('ready'));
    on('ended', () => onStatus('ended'));
    on('error', () => onStatus('error'));

    player
      .initialize()
      .then(() => {
        if (disposed) return;
        player.autoplay = false;
        player.src = uri;
        player.pause();
        player.load();
        const controller: MediaController = {
          currentTimeMs: () => (player.currentTime ?? 0) * 1000,
          durationMs: () => (player.duration ?? 0) * 1000,
          isPlaying: () => !player.paused && !player.ended,
          play: () => player.play(),
          pause: () => player.pause(),
          seekTo: (ms) => {
            player.currentTime = Math.max(0, ms / 1000);
          },
          seekBy: (delta) => {
            player.currentTime = Math.max(0, (player.currentTime ?? 0) + delta / 1000);
          },
        };
        onController(controller);
      })
      .catch(() => onStatus('error'));

    return () => {
      disposed = true;
      onController(null);
      try {
        player.pause();
        player.deinitializeSync(1500);
      } catch {
        // Already torn down by the system; nothing to release.
      }
      playerRef.current = null;
    };
  }, [uri, onController, onStatus]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {initialized && (
        <KeplerVideoSurfaceView
          style={StyleSheet.absoluteFill}
          onSurfaceViewCreated={(handle: string) => playerRef.current?.setSurfaceHandle(handle)}
          onSurfaceViewDestroyed={(handle: string) => playerRef.current?.clearSurfaceHandle(handle)}
        />
      )}
    </View>
  );
}
