import { memo, createElement, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MediaController, VideoSurfaceProps } from './types';

/** Browser build: a plain <video> element inside the React Native Web tree. */
function Surface({ uri, posterUri, onController, onStatus }: VideoSurfaceProps) {
  // Browsers have no system media session wired up here; kickoffMs and onExternalCommand are Vega-only.
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    onStatus('loading');
    const controller: MediaController = {
      currentTimeMs: () => video.currentTime * 1000,
      durationMs: () => (Number.isFinite(video.duration) ? video.duration * 1000 : 0),
      isPlaying: () => !video.paused && !video.ended && video.readyState > 2,
      play: () => void video.play().catch(() => onStatus('error')),
      pause: () => video.pause(),
      seekTo: (ms) => {
        video.currentTime = Math.max(0, ms / 1000);
      },
      seekBy: (delta) => {
        video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + delta / 1000));
      },
    };
    const listeners: Array<[string, () => void]> = [
      ['loadedmetadata', () => onStatus('ready')],
      ['waiting', () => onStatus('buffering')],
      ['playing', () => onStatus('ready')],
      ['seeked', () => onStatus('ready')],
      ['ended', () => onStatus('ended')],
      ['error', () => onStatus('error')],
    ];
    for (const [event, fn] of listeners) video.addEventListener(event, fn);
    onController(controller);
    return () => {
      for (const [event, fn] of listeners) video.removeEventListener(event, fn);
      onController(null);
    };
  }, [uri, onController, onStatus]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {createElement('video', {
        ref,
        src: uri,
        poster: posterUri ?? undefined,
        preload: 'auto',
        playsInline: true,
        style: { width: '100%', height: '100%', objectFit: 'contain', background: '#000' },
      })}
    </View>
  );
}

/**
 * Memoised: the player's overlay re-renders four times a second for the clock, and the video
 * surface must not re-render with it (each render costs frames on a Fire TV Stick).
 */
export const VideoSurface = memo(Surface);
