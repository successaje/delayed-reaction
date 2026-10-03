'use client';

import type { ManualClock, Playhead } from '@delayed-reaction/client';
import { formatClock, nextPeriod, periodSpec, type Sport } from '@delayed-reaction/core';
import { Button } from '@/components/ui/button';
import { cx } from '@/lib/cx';

/**
 * The match clock as this device sees it, broadcast-scorebug style, with the controls a
 * manual clock needs: pause, nudge, and starting the next period.
 */
export function ClockBar({
  sport,
  playhead,
  clock,
  linkedName,
}: {
  sport: Sport;
  playhead: Playhead;
  clock: ManualClock | null;
  linkedName: string | null;
}) {
  const { position } = playhead;
  const label = position.period === 0 ? 'PRE' : (periodSpec(sport, position.period)?.label ?? `P${position.period}`);
  const next = nextPeriod(sport, position.period);
  const paused = clock?.paused ?? !playhead.playing;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-lg border border-line bg-ink-900 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="rounded-xs bg-amber px-1.5 py-0.5 font-mono text-xs font-semibold text-ink-950">
          {label}
        </span>
        <span
          className={cx(
            'font-mono text-[2.6rem] leading-none font-semibold tracking-tight tabular transition-opacity',
            paused && 'opacity-50',
          )}
          aria-label={`Match clock ${formatClock(position.ms)}`}
        >
          {formatClock(position.ms)}
        </span>
        {paused && <span className="eyebrow">Paused</span>}
      </div>

      {clock ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => clock.nudge(-5_000)} aria-label="Back 5 seconds">
            −5s
          </Button>
          <Button size="sm" variant="secondary" onClick={() => clock.nudge(5_000)} aria-label="Forward 5 seconds">
            +5s
          </Button>
          <Button size="sm" variant="secondary" onClick={() => (clock.paused ? clock.resume() : clock.pause())}>
            {clock.paused ? 'Resume' : 'Pause'}
          </Button>
          {next && (
            <Button size="sm" variant="amber" onClick={() => clock.markPeriodStart(next.period)}>
              Start {next.label}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-chalk-2">
          Following <span className="font-semibold text-chalk">{linkedName ?? 'the TV'}</span>
        </p>
      )}
    </div>
  );
}
