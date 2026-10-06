'use client';

import { isApiClientError, type SavedSession } from '@delayed-reaction/client';
import {
  judge,
  outcomeLabel,
  parseTeams,
  type MatchPosition,
  type PredictionsDto,
  type Score,
  type ViewerDto,
} from '@delayed-reaction/core';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cx } from '@/lib/cx';

/**
 * "Call it": predict the score before you've seen a kick, and find out who called it when your
 * own match reaches full time. The server enforces both the lock and the reveal.
 */
export function CallIt({
  session,
  title,
  viewers,
  playhead,
  hasCatalogResult,
}: {
  session: SavedSession;
  title: string;
  viewers: readonly ViewerDto[];
  playhead: MatchPosition;
  hasCatalogResult: boolean;
}) {
  const teams = parseTeams(title);
  const toast = useToast();
  const [state, setState] = useState<PredictionsDto | null>(null);
  const [draft, setDraft] = useState<Score>({ home: 0, away: 0 });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setState(await api.predictions(session.roomCode, session.token));
    } catch {
      // Keep the last known state; the next poll retries.
    }
  }, [session.roomCode, session.token]);

  // Refresh periodically: new calls from friends, the lock passing, the reveal arriving.
  useEffect(() => {
    void load();
    const timer = setInterval(load, 8_000);
    return () => clearInterval(timer);
  }, [load]);

  const mine = state?.predictions.find((p) => p.viewerId === session.viewerId) ?? null;
  const names = new Map(viewers.map((v) => [v.id, v]));

  async function submit(kind: 'predict' | 'result') {
    setBusy(true);
    try {
      const next =
        kind === 'predict'
          ? await api.predict(session.roomCode, session.token, draft)
          : await api.setResult(session.roomCode, session.token, draft);
      setState(next);
      setEditing(false);
      toast.show({
        title: kind === 'predict' ? 'Locked in' : 'Final score saved',
        detail:
          kind === 'predict'
            ? `${teams.home} ${draft.home}–${draft.away} ${teams.away}. Sealed until each person's full time.`
            : 'Friends see it, and who called it, when they reach this point.',
        tone: 'success',
      });
    } catch (error) {
      toast.show({
        title: "That didn't save",
        detail: isApiClientError(error) ? error.message : 'Try again in a moment.',
        tone: 'error',
      });
      void load();
    } finally {
      setBusy(false);
    }
  }

  if (!state) return null;

  // Revealed: who called it.
  if (state.result) {
    const result = state.result;
    const rows = state.predictions
      .map((p) => ({ p, ...judge(p, result) }))
      .sort((a, b) => b.points - a.points || a.p.createdAt - b.p.createdAt);
    return (
      <Card eyebrow="Call it · full time">
        <p className="display text-2xl">
          {teams.home} {result.home}–{result.away} {teams.away}
        </p>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-chalk-2">Nobody called it this time.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {rows.map(({ p, call, points }) => {
              const who = names.get(p.viewerId);
              return (
                <li key={p.viewerId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: who?.color }}>
                      {p.viewerId === session.viewerId ? 'You' : (who?.name ?? 'Someone')}
                    </span>
                    <span className="font-mono text-chalk-3">
                      {p.home}–{p.away}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'rounded-xs px-1.5 py-0.5 text-xs font-semibold',
                      call === 'exact' && 'bg-amber text-ink-950',
                      call === 'result' && 'bg-turf-dim text-turf',
                      call === 'miss' && 'text-chalk-3',
                    )}
                  >
                    {call === 'exact' ? 'Called it · 3' : call === 'result' ? 'Right result · 1' : 'Missed'}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    );
  }

  // Open, and either no call yet or changing it.
  if (state.open && (!mine || editing)) {
    return (
      <Card eyebrow="Call it" lead="Predict the score before you've seen a kick. Locks a minute into your match.">
        <ScoreInput teams={teams} value={draft} onChange={setDraft} />
        <div className="mt-4 flex gap-2">
          <Button onClick={() => submit('predict')} busy={busy} className="flex-1">
            {mine ? 'Update my call' : 'Lock it in'}
          </Button>
          {mine && (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const others = state.predictions.filter((p) => p.viewerId !== session.viewerId).length;
  const canEnterResult = !hasCatalogResult && playhead.period >= 2;

  return (
    <Card eyebrow="Call it">
      {mine ? (
        <p className="text-sm text-chalk">
          You called <span className="font-semibold">{teams.home} {mine.home}–{mine.away} {teams.away}</span>
          <span className="text-chalk-3"> ({outcomeLabel(mine, teams)})</span>
        </p>
      ) : (
        <p className="text-sm text-chalk-2">Predictions closed for you a minute in.</p>
      )}
      <p className="mt-1 text-xs text-chalk-3">
        {others === 0 ? 'No calls from friends yet.' : `${others} ${others === 1 ? 'friend has' : 'friends have'} called it.`}{' '}
        Sealed until your full time.
      </p>
      {state.open && mine && (
        <button onClick={() => { setDraft({ home: mine.home, away: mine.away }); setEditing(true); }} className="mt-2 text-xs text-amber underline underline-offset-4">
          Change my call
        </button>
      )}
      {canEnterResult && (
        <details className="mt-3 border-t border-line pt-3">
          <summary className="cursor-pointer text-xs text-chalk-2">Finished? Add the final score</summary>
          <div className="mt-3">
            <ScoreInput teams={teams} value={draft} onChange={setDraft} />
            <Button size="sm" variant="secondary" className="mt-3" busy={busy} onClick={() => submit('result')}>
              Save final score
            </Button>
          </div>
        </details>
      )}
    </Card>
  );
}

function Card({ eyebrow, lead, children }: { eyebrow: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade rounded-lg border border-line bg-ink-900 p-4 sm:p-5">
      <p className="eyebrow mb-2">{eyebrow}</p>
      {lead && <p className="mb-4 text-sm text-chalk-2">{lead}</p>}
      {children}
    </section>
  );
}

function ScoreInput({
  teams,
  value,
  onChange,
}: {
  teams: { home: string; away: string };
  value: Score;
  /** Receives an updater, so rapid taps on different steppers never overwrite each other. */
  onChange: (update: (score: Score) => Score) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['home', 'away'] as const).map((side) => (
        <div key={side} className="flex flex-col gap-2 rounded-md border border-line-strong p-3">
          <span className="truncate text-xs font-medium text-chalk-2">{teams[side]}</span>
          <div className="flex items-center justify-between">
            <Stepper label={`Fewer goals for ${teams[side]}`} onClick={() => onChange((s) => ({ ...s, [side]: Math.max(0, s[side] - 1) }))}>
              −
            </Stepper>
            <span className="display text-3xl tabular" aria-live="polite">
              {value[side]}
            </span>
            <Stepper label={`More goals for ${teams[side]}`} onClick={() => onChange((s) => ({ ...s, [side]: Math.min(20, s[side] + 1) }))}>
              +
            </Stepper>
          </div>
        </div>
      ))}
    </div>
  );
}

function Stepper({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-sm border border-line-strong text-lg text-chalk transition-colors hover:border-chalk-3 active:scale-95"
    >
      {children}
    </button>
  );
}
