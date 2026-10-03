'use client';

import type { SavedSession } from '@delayed-reaction/client';
import { formatPosition, reactionLabel, type Recap, type Sport, type ViewerDto } from '@delayed-reaction/core';
import { useCallback, useEffect, useState } from 'react';
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
                <li key={`${moment.position.period}:${moment.position.ms}`} className="flex gap-4">
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
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
