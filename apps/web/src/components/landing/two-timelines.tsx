'use client';

import { formatClock } from '@delayed-reaction/core';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

/** When the penalty goes in, in seconds into the clip. */
const MOMENT = 5.7;
/** How long a reaction stays on screen. */
const SHOW_FOR = 3.4;
/** The late screen trails the live one by this much (standing in for 38 minutes). */
const OFFSET = 3.6;
/** Match clock at the start of the clip, so the moment reads 23:14. */
const CLIP_START_MS = (23 * 60 + 14) * 1000 - MOMENT * 1000;

/**
 * The product in one picture: the same clip on two screens, one live and one late.
 * Ada reacts on the live screen; her reaction reaches the late screen on the same frame.
 */
export function TwoTimelines() {
  const live = useRef<HTMLVideoElement>(null);
  const late = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState({ live: 0, late: -OFFSET });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    if (query.matches) return;

    const a = live.current;
    const b = late.current;
    if (!a || !b) return;
    let frame = 0;
    // Each screen plays and loops on its own; the late one simply starts OFFSET seconds later.
    // Cards follow each video's own playhead, exactly like the real app.
    let lateStarted = false;
    void a.play().catch(() => undefined);
    const delayed = window.setTimeout(() => {
      lateStarted = true;
      void b.play().catch(() => undefined);
    }, OFFSET * 1000);
    // Browsers pause muted videos that scroll away; resume both together when back in view.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        void a.play().catch(() => undefined);
        if (lateStarted) void b.play().catch(() => undefined);
      },
      { threshold: 0.2 },
    );
    observer.observe(a);
    const tick = () => {
      setT({ live: a.currentTime, late: b.paused && b.currentTime === 0 ? -1 : b.currentTime });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      observer.disconnect();
    };
  }, []);

  const liveShows = reduced || (t.live >= MOMENT && t.live < MOMENT + SHOW_FOR);
  const lateShows = reduced || (t.late >= MOMENT && t.late < MOMENT + SHOW_FOR);
  const clock = (s: number) => formatClock(CLIP_START_MS + Math.max(0, s) * 1000);

  return (
    <figure className="relative" aria-label="The same moment on two screens, 38 minutes apart">
      <div className="grid gap-3">
        <Screen
          videoRef={live}
          who="Ada"
          tag="Live"
          tone="live"
          clock={reduced ? '23:14' : clock(t.live)}
          card={liveShows ? { name: 'Ada', text: 'NOOO', color: '#FF8A3D' } : null}
          footnote={liveShows ? 'Sent · Tunde will see this in 38 min' : null}
        />
        <Screen
          videoRef={late}
          who="Tunde"
          tag="38 min later"
          tone="delayed"
          clock={reduced ? '23:14' : t.late < 0 ? clock(0) : clock(t.late)}
          card={lateShows ? { name: 'Ada', text: 'NOOO', color: '#FF8A3D' } : null}
          footnote={lateShows ? 'Same frame. Nothing early.' : null}
        />
      </div>
    </figure>
  );
}

function Screen({
  videoRef,
  who,
  tag,
  tone,
  clock,
  card,
  footnote,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  who: string;
  tag: string;
  tone: 'live' | 'delayed';
  clock: string;
  card: { name: string; text: string; color: string } | null;
  footnote: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-black shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
      <video
        ref={videoRef}
        src="/demo/penalty.mp4"
        poster="/demo/penalty.jpg"
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="aspect-video w-full object-cover"
      />
      <div className="absolute top-3 left-3 flex items-stretch overflow-hidden rounded-xs text-[0.7rem] font-semibold sm:text-xs">
        <span className="bg-amber px-1.5 py-1 font-mono text-ink-950">1H</span>
        <span className="bg-ink-950/90 px-2 py-1 font-mono text-chalk tabular">{clock}</span>
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-ink-950/85 px-2.5 py-1 text-[0.7rem] font-semibold sm:text-xs">
        <span className={cx('h-1.5 w-1.5 rounded-full', tone === 'live' ? 'bg-live' : 'bg-amber')} />
        <span className="text-chalk">{who}</span>
        <span className="text-chalk-3">· {tag}</span>
      </div>
      {card && (
        <div className="absolute right-3 bottom-3 flex animate-slide-in overflow-hidden rounded-sm border border-line bg-ink-900/95">
          <span className="w-1" style={{ backgroundColor: card.color }} />
          <div className="px-3 py-1.5">
            <p className="text-[0.65rem] font-semibold" style={{ color: card.color }}>
              {card.name}
            </p>
            <p className="display text-xl leading-none sm:text-2xl">{card.text}</p>
          </div>
        </div>
      )}
      {footnote && (
        <p className="absolute bottom-3 left-3 animate-fade rounded-xs bg-ink-950/85 px-2 py-1 text-[0.7rem] text-chalk-2 sm:text-xs">
          {footnote}
        </p>
      )}
    </div>
  );
}
