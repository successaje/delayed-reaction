'use client';

import type { FeedEntry } from '@delayed-reaction/client/react';
import {
  formatPosition,
  reactionLabel,
  type MatchPosition,
  type Sport,
  type ViewerDto,
} from '@delayed-reaction/core';
import { cx } from '@/lib/cx';

/**
 * Reactions as they reach this device, newest first. Live arrivals slide in like a broadcast
 * lower-third; history (received late, or skipped by a seek) sits quieter.
 */
export function Feed({
  entries,
  viewers,
  selfId,
  sport,
}: {
  entries: readonly FeedEntry[];
  viewers: readonly ViewerDto[];
  selfId: string;
  sport: Sport;
  playhead: MatchPosition;
  queued: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong px-5 py-8">
        <p className="display text-lg text-chalk-2">Reactions land here</p>
        <p className="max-w-sm text-sm text-chalk-3">
          Each one appears at the moment it happened in the match on your clock. If friends are
          ahead of you, theirs are waiting for you to catch up, and you won't see a thing early.
        </p>
      </div>
    );
  }

  const byId = new Map(viewers.map((v) => [v.id, v]));
  return (
    <ol className="flex flex-col gap-2" aria-label="Reactions" aria-live="polite">
      {entries.map((entry) => {
        const author = byId.get(entry.reaction.viewerId);
        const mine = entry.reaction.viewerId === selfId;
        const color = author?.color ?? '#8d948b';
        return (
          <li
            key={entry.reaction.id}
            className={cx(
              'relative flex items-stretch overflow-hidden rounded-md border border-line bg-ink-900',
              entry.kind === 'live' && 'animate-slide-in',
              entry.kind === 'own' && 'animate-rise',
              entry.kind === 'history' && !mine && 'opacity-70',
            )}
          >
            <span aria-hidden className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs text-chalk-2">
                  <span className="font-semibold" style={{ color }}>
                    {mine ? 'You' : (author?.name ?? 'Someone')}
                  </span>
                  {entry.kind === 'history' && !mine && <span className="text-chalk-3">· caught up</span>}
                  {entry.ownState === 'sending' && <span className="text-chalk-3">· sending</span>}
                  {entry.ownState === 'failed' && <span className="text-danger">· not sent</span>}
                </p>
                <p
                  className={cx(
                    'mt-0.5 break-words',
                    entry.reaction.body.kind === 'quick' ? 'display text-2xl' : 'text-base text-chalk',
                  )}
                >
                  {reactionLabel(entry.reaction.body)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs text-chalk-3 tabular">
                {formatPosition(entry.reaction.position, sport)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
