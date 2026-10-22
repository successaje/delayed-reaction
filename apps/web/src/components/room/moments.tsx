'use client';

import type { SavedSession } from '@delayed-reaction/client';
import { formatPosition, reactionLabel, type Recap, type Sport, type ViewerDto } from '@delayed-reaction/core';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import type { MatchPosition } from '@delayed-reaction/core';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

/**
 * The group's loudest moments so far, built only from what this device has already reached.
 * Collapsed by default: it's for half-time and full-time, not mid-play.
 */
export function Moments({
  session,
  sport,
  viewers,
}: {
  session: SavedSession;
  sport: Sport;
  viewers: readonly ViewerDto[];
}) {
  const [open, setOpen] = useState(false);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const load = useCallback(async () => {
    setState('loading');
    try {
      setRecap(await api.recap(session.roomCode, session.token));
      setState('idle');
    } catch {
      setState('error');
    }
  }, [session.roomCode, session.token]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const names = new Map(viewers.map((v) => [v.id, v]));
  const toast = useToast();
  const [sharing, setSharing] = useState<string | null>(null);
  // Links already made, keyed by moment: shown in the row so a blocked copy never loses one.
  const [links, setLinks] = useState<Record<string, string>>({});

  async function share(position: MatchPosition) {
    const key = `${position.period}:${position.ms}`;
    setSharing(key);
    let url: string;
    try {
      const moment = await api.share(session.roomCode, session.token, { position });
      url = `${window.location.origin}/m/${moment.id}`;
      setLinks((all) => ({ ...all, [key]: url }));
    } catch {
      toast.show({ title: "Couldn't share that", detail: 'Try again in a moment.', tone: 'error' });
      return;
    } finally {
      setSharing(null);
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: 'Deract', text: 'This moment.', url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ title: 'Link copied', detail: 'It plays the moment with everyone’s reactions.', tone: 'success' });
    } catch {
      // Some browsers refuse the clipboard once the request has round-tripped; the row has the link.
      toast.show({ title: 'Link ready', detail: 'Open it from the moment to copy or send it.', tone: 'neutral' });
    }
  }

  return (
    <section className="rounded-lg border border-line bg-ink-900">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left sm:px-5"
      >
        <span>
          <span className="block text-sm font-semibold">Loudest moments so far</span>
          <span className="block text-xs text-chalk-3">Only from what you've already watched</span>
        </span>
        <span aria-hidden className={`text-chalk-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="animate-fade border-t border-line px-4 py-4 sm:px-5">
          {state === 'loading' && !recap && <p className="text-sm text-chalk-3">Counting reactions…</p>}
          {state === 'error' && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-chalk-2">Couldn't load the moments.</p>
              <Button size="sm" variant="secondary" onClick={load}>
                Try again
              </Button>
            </div>
          )}
          {recap && recap.moments.length === 0 && (
            <p className="text-sm text-chalk-2">
              No big moments yet. When two or more reactions land within half a minute, they show up here.
            </p>
          )}
          {recap && recap.moments.length > 0 && (
            <ol className="flex flex-col gap-3">
              {recap.moments.map((moment) => (
                <li key={`${moment.position.period}:${moment.position.ms}`} className="flex items-start gap-4">
                  <span className="w-20 shrink-0 font-mono text-xs text-amber tabular">
                    {formatPosition(moment.position, sport)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-chalk-3">
                      {moment.people} {moment.people === 1 ? 'person' : 'people'} · {moment.count} reactions
                    </p>
                    <p className="mt-0.5 truncate text-sm">
                      {moment.reactions.slice(0, 4).map((r, i) => (
                        <span key={r.id}>
                          {i > 0 && <span className="text-chalk-3"> · </span>}
                          <span style={{ color: names.get(r.viewerId)?.color }}>{names.get(r.viewerId)?.name ?? 'Someone'}</span>{' '}
                          <span className="font-semibold">{reactionLabel(r.body)}</span>
                        </span>
                      ))}
                    </p>
                  </div>
                  {links[`${moment.position.period}:${moment.position.ms}`] ? (
                    <a
                      href={links[`${moment.position.period}:${moment.position.ms}`]}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto shrink-0 rounded-sm px-2.5 py-1.5 text-sm font-semibold text-amber hover:underline focus-visible:outline-2 focus-visible:outline-amber"
                    >
                      Open link
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto shrink-0"
                      busy={sharing === `${moment.position.period}:${moment.position.ms}`}
                      onClick={() => share(moment.position)}
                    >
                      Share
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
