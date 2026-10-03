'use client';

import {
  linkedPlayhead,
  ManualClock,
  TimelineSync,
  type PlayheadReader,
  type SavedSession,
} from '@delayed-reaction/client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, sessions } from '@/lib/api';

/**
 * Builds the device's clock and TimelineSync for a joined session, persists clock
 * changes, and tears everything down on unmount.
 */
export function useRoomEngine(session: SavedSession) {
  const engineRef = useRef<TimelineSync | null>(null);

  const clock = useMemo(() => {
    if (session.clockSource !== 'manual') return null;
    return new ManualClock(session.clock ?? undefined, Date.now, (next) => {
      void sessions().update(session.roomCode, { clock: next });
      engineRef.current?.syncSoon();
    });
    // The clock is created once per session; later changes flow through onChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.roomCode, session.viewerId]);

  const readPlayhead: PlayheadReader = useMemo(() => {
    if (clock) return clock.read;
    const linkedTo = session.linkedTo;
    return linkedPlayhead(
      () => engineRef.current?.currentViewers.find((v) => v.id === linkedTo)?.report ?? null,
      () => engineRef.current?.serverNow() ?? Date.now(),
    );
  }, [clock, session.linkedTo]);

  const [engine, setEngine] = useState<TimelineSync | null>(null);

  useEffect(() => {
    const instance = new TimelineSync({
      api,
      roomCode: session.roomCode,
      token: session.token,
      viewerId: session.viewerId,
      // Start without a cursor: the first sync rebuilds history behind the playhead, so a
      // refreshed page shows what was already said rather than an empty feed.
      readPlayhead,
    });
    engineRef.current = instance;
    instance.start();
    setEngine(instance);
    return () => {
      instance.stop();
      engineRef.current = null;
    };
  }, [session.roomCode, session.token, session.viewerId, readPlayhead]);

  return { engine, clock, readPlayhead };
}

/** Re-renders on an interval with the current playhead, for clock displays. */
export function usePlayhead(read: PlayheadReader, intervalMs = 250) {
  const [playhead, setPlayhead] = useState(read);
  useEffect(() => {
    setPlayhead(read());
    const timer = setInterval(() => setPlayhead(read()), intervalMs);
    return () => clearInterval(timer);
  }, [read, intervalMs]);
  return playhead;
}
