'use client';

import { formatPosition, getSport, reactionLabel, type SharedMomentDto } from '@delayed-reaction/core';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

const LEAD_IN_MS = 3_000;
const LENGTH_MS = 15_000;

/**
 * Replays a shared moment: the clip from just before it, with the group's reactions sliding in
 * at the offsets they were sent. Without media (matches outside the catalog) the reactions
 * play over a still pitch.
 */
export function MomentPlayer({ share }: { share: SharedMomentDto }) {
  const video = useRef<HTMLVideoElement>(null);
  const [offset, setOffset] = useState(-LEAD_IN_MS);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let frame = 0;
    const startAt = performance.now();
    const v = video.current;
    const media = share.media;
    if (v && media) {
      // Seeking needs metadata; play straight after so the clip starts at the build-up.
      // React doesn't reliably reflect `muted` onto server-rendered video, and browsers only
      // autoplay muted media, so set it explicitly before playing.
      v.muted = true;
      const begin = () => {
        v.currentTime = Math.max(0, (media.momentMs - LEAD_IN_MS) / 1000);
        void v.play().then(() => setStarted(true), () => setStarted(false));
      };
      if (v.readyState >= 1) begin();
      else v.addEventListener('loadedmetadata', begin, { once: true });
    } else {
      setStarted(true);
    }
    const tick = () => {
      if (v && media) {
        const t = v.currentTime * 1000 - media.momentMs;
        if (t > LENGTH_MS - LEAD_IN_MS) v.currentTime = Math.max(0, (media.momentMs - LEAD_IN_MS) / 1000);
        setOffset(t);
      } else {
        setOffset((((performance.now() - startAt) % LENGTH_MS) - LEAD_IN_MS));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [share]);

  const visible = share.reactions.filter((r) => offset >= r.offsetMs && offset - r.offsetMs < 4_500).slice(-3);

  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-black">
      {share.media ? (
        <video
          ref={video}
          src={share.media.url}
          poster={share.media.posterUrl ?? undefined}
          muted
          playsInline
          preload="auto"
          className="aspect-video w-full object-cover"
        />
      ) : (
        // No footage: a scoreboard with the match clock running through the moment, so the
        // reactions still read as landing on a time.
        <div className="flex aspect-video w-full flex-col items-start gap-1 bg-[radial-gradient(120%_80%_at_50%_100%,#1f3a26,#0a0c0b)] p-4 sm:p-6">
          <p className="max-w-full truncate text-xs font-semibold tracking-[0.18em] text-chalk-3 uppercase">
            {share.title}
          </p>
          <p className="font-mono text-2xl text-chalk tabular sm:text-4xl" aria-hidden>
            {formatPosition(
              { period: share.position.period, ms: Math.max(0, share.position.ms + offset) },
              getSport(share.sport),
            )}
          </p>
        </div>
      )}
      {!started && share.media && (
        <button
          onClick={() => void video.current?.play().then(() => setStarted(true))}
          className="absolute inset-0 flex items-center justify-center bg-ink-950/50 text-sm font-semibold"
        >
          Tap to play the moment
        </button>
      )}
      <div className="absolute right-3 bottom-3 flex flex-col items-end gap-1.5 sm:right-4 sm:bottom-4">
        {visible.map((r, i) => (
          <div
            key={`${r.name}-${r.offsetMs}-${i}`}
            className="flex animate-slide-in overflow-hidden rounded-sm border border-line bg-ink-900/95"
          >
            <span className="w-1" style={{ backgroundColor: r.color }} />
            <div className="px-3 py-1.5">
              <p className="text-[0.65rem] font-semibold" style={{ color: r.color }}>
                {r.name}
              </p>
              <p className={cx(r.body.kind === 'quick' ? 'display text-xl leading-none sm:text-2xl' : 'text-sm text-chalk')}>
                {reactionLabel(r.body)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
