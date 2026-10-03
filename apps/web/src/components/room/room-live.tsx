'use client';

import { deliveries, describeDeliveries, type SavedSession } from '@delayed-reaction/client';
import { useTimelineState } from '@delayed-reaction/client/react';
import { getSport, type ReactionBody, type RoomStateDto } from '@delayed-reaction/core';
import { useCallback } from 'react';
import { Wordmark } from '@/components/ui/logo';
import { useToast } from '@/components/ui/toast';
import { ClockBar } from './clock-bar';
import { ConnectionStatus } from './connection-status';
import { Feed } from './feed';
import { InviteCard } from './invite-card';
import { Moments } from './moments';
import { Presence } from './presence';
import { ReactionPad } from './reaction-pad';
import { SyncPanel } from './sync-panel';
import { usePlayhead, useRoomEngine } from './use-room-engine';

/** The joined room: clock, friends, the reactions reaching you, and the pad to send your own. */
export function RoomLive({
  room,
  session,
  isNew,
  onEnded,
}: {
  room: RoomStateDto;
  session: SavedSession;
  isNew: boolean;
  onEnded: () => void;
}) {
  const sport = getSport(room.room.sport);
  const { engine, clock, readPlayhead } = useRoomEngine(session);
  const state = useTimelineState(engine);
  const playhead = usePlayhead(readPlayhead);
  const toast = useToast();

  const viewers = state.viewers.length ? state.viewers : room.viewers;
  const linkedTv = session.linkedTo ? viewers.find((v) => v.id === session.linkedTo) : null;
  const needsKickoff = clock !== null && !clock.synced;

  const send = useCallback(
    async (body: ReactionBody) => {
      if (!engine) return;
      try {
        const reaction = await engine.react(body);
        // The TV this phone follows is in the room with you: say so, rather than "is seeing it now".
        const others = deliveries(reaction.position, engine.currentViewers, session.viewerId, sport, engine.serverNow())
          .filter((d) => d.viewer.id !== session.linkedTo);
        const tv = session.linkedTo ? engine.currentViewers.find((v) => v.id === session.linkedTo) : null;
        const line =
          tv && !others.some((d) => d.when === 'later')
            ? `On the ${tv.deviceLabel ?? tv.name} now.`
            : describeDeliveries(others);
        toast.show({ title: 'Sent', detail: line, tone: 'success', durationMs: 3_500 });
      } catch {
        toast.show({
          title: "That one didn't send",
          detail: "You're offline or the room closed. Try again in a moment.",
          tone: 'error',
        });
      }
    },
    [engine, session.viewerId, sport, toast],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden sm:block">
              <Wordmark />
            </span>
            <span className="hidden h-5 w-px bg-line sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{room.room.title}</p>
              <p className="font-mono text-2xs tracking-[0.18em] text-chalk-3">{room.room.code}</p>
            </div>
          </div>
          <ConnectionStatus status={state.status} onEnded={onEnded} />
        </div>
      </header>

      {needsKickoff ? (
        <main className="mx-auto w-full max-w-md flex-1 px-4 pt-8 pb-16 sm:pt-14">
          <SyncPanel sport={sport} clock={clock!} />
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-rows-[auto_1fr] gap-x-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-1 lg:pt-8">
          <section className="flex min-w-0 flex-col gap-6 pt-4 pb-6 lg:pt-0">
            <ClockBar
              sport={sport}
              playhead={playhead}
              clock={clock}
              linkedName={linkedTv ? (linkedTv.deviceLabel ?? linkedTv.name) : null}
            />
            {isNew && <InviteCard code={room.room.code} title={room.room.title} />}
            <Presence
              viewers={viewers}
              selfId={session.viewerId}
              playhead={playhead.position}
              sport={sport}
              serverNow={engine?.serverNow() ?? Date.now()}
            />
            <Moments session={session} sport={sport} viewers={viewers} />
            <Feed
              entries={state.feed}
              viewers={viewers}
              selfId={session.viewerId}
              sport={sport}
              playhead={playhead.position}
              queued={engine?.queued ?? 0}
            />
          </section>
          <aside className="sticky bottom-0 -mx-4 self-end border-t border-line bg-ink-950/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur sm:-mx-6 sm:px-6 lg:top-22 lg:mx-0 lg:self-start lg:rounded-lg lg:border lg:bg-ink-900 lg:p-5">
            <ReactionPad onSend={send} disabled={!engine || state.status === 'ended'} />
          </aside>
        </main>
      )}
    </div>
  );
}
