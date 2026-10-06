'use client';

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react';

/**
 * A muted, looping video that plays only while on screen and never for people who prefer
 * reduced motion (they get the poster frame).
 */
export function InViewVideo(props: Omit<ComponentPropsWithoutRef<'video'>, 'autoPlay' | 'muted' | 'loop'>) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    video.muted = true; // see moment-player: the attribute isn't always reflected after SSR
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return <video ref={ref} muted loop playsInline preload="metadata" {...props} />;
}
