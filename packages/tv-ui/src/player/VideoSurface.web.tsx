import { createElement, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MediaController, VideoSurfaceProps } from './types';

/** Browser build: a plain <video> element inside the React Native Web tree. */
export function VideoSurface({ uri, posterUri, onController, onStatus }: VideoSurfaceProps) {
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
