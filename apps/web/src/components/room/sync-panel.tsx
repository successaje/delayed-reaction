'use client';

import type { ManualClock } from '@delayed-reaction/client';
import type { Sport } from '@delayed-reaction/core';
import { useState, type FormEvent } from 'react';
import { PageTitle } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';

/**
 * Setting a manual clock. The common case is one tap at kick-off; joining mid-match, people
 * read the broadcast clock off their screen instead.
 */
export function SyncPanel({ sport, clock }: { sport: Sport; clock: ManualClock }) {
  const [midMatch, setMidMatch] = useState(false);

  return (
    <div className="animate-rise">
      <PageTitle
        eyebrow="Set your clock"
        title={`Tap at ${sport.startCue}`}
        lead={`When ${sport.startCue} happens on your screen, tap the button. Your reactions are then timed to the match, wherever and whenever you're watching.`}
      />
      {midMatch ? (
        <MidMatchForm sport={sport} clock={clock} onCancel={() => setMidMatch(false)} />
      ) : (
        <>
          <button
            onClick={() => clock.markPeriodStart(1)}
            className="group relative flex aspect-[5/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-amber/40 bg-amber-dim/40 transition-[transform,background-color] duration-150 hover:bg-amber-dim/70 active:scale-[0.985]"
          >
            <span className="display text-4xl text-amber">{sport.startCue}</span>
            <span className="text-xs text-chalk-2">Tap the moment it happens</span>
            <span
              aria-hidden
              className="absolute inset-0 rounded-lg ring-1 ring-amber/0 transition-[box-shadow] duration-500 group-active:ring-8 group-active:ring-amber/30"
            />
          </button>
          <button
            onClick={() => setMidMatch(true)}
            className="mt-5 w-full text-center text-sm text-chalk-2 underline decoration-line-strong underline-offset-4 hover:text-chalk"
          >
            Already started? Enter the match clock
          </button>
        </>
      )}
    </div>
  );
}

function MidMatchForm({ sport, clock, onCancel }: { sport: Sport; clock: ManualClock; onCancel: () => void }) {
  const [period, setPeriod] = useState(String(sport.periods[0]!.period));
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const match = /^(\d{1,3})[:.](\d{2})$/.exec(value.trim()) ?? /^(\d{1,3})$/.exec(value.trim());
    if (!match) {
      setError('Use minutes and seconds, like 23:14.');
      return;
    }
    const minutes = Number(match[1]);
    const seconds = match[2] ? Number(match[2]) : 0;
    if (seconds > 59) {
      setError('Seconds go up to 59.');
      return;
    }
    clock.markPeriodStart(Number(period));
    clock.nudge((minutes * 60 + seconds) * 1000);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 animate-fade">
      <Segmented
        label="Which part of the match?"
        options={sport.periods.slice(0, 4).map((p) => ({ value: String(p.period), label: p.name.replace(/^./, (c) => c.toUpperCase()) }))}
        value={period}
        onChange={setPeriod}
      />
      <Field
        label="Clock on your screen right now"
        placeholder="23:14"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        autoFocus
        className="[&_input]:font-mono [&_input]:text-lg"
        hint="Time into this part of the match, as the broadcast shows it."
        error={error}
      />
      <div className="flex gap-3">
        <Button type="submit" size="lg" className="flex-1">
          Set clock
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}
