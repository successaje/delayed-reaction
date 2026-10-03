'use client';

import { isApiClientError, type SavedSession } from '@delayed-reaction/client';
import { normalizeRoomCode, type RoomStateDto } from '@delayed-reaction/core';
import { useCallback, useEffect, useState } from 'react';
import { api, rememberName, sessions } from '@/lib/api';

export type RoomPhase =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'join'; room: RoomStateDto }
  | { kind: 'ready'; room: RoomStateDto; session: SavedSession };

/**
 * Resolves what this device should see for a room: the join form, or its existing session
 * (verified with the server, so a stale token falls back to joining rather than failing later).
 */
export function useRoomSession(rawCode: string) {
  const code = normalizeRoomCode(rawCode);
  const [phase, setPhase] = useState<RoomPhase>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!code) {
      setPhase({ kind: 'not-found' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const room = await api.getRoom(code);
        const saved = await sessions().get(code);
        if (saved) {
          try {
            await api.me(code, saved.token);
            if (!cancelled) setPhase({ kind: 'ready', room, session: saved });
            return;
          } catch (error) {
            if (!isApiClientError(error) || error.code !== 'unauthorized') throw error;
            await sessions().remove(code);
          }
        }
        if (!cancelled) setPhase({ kind: 'join', room });
      } catch (error) {
        if (cancelled) return;
        if (isApiClientError(error) && error.code === 'room_not_found') {
          setPhase({ kind: 'not-found' });
        } else {
          setPhase({
            kind: 'error',
            message: isApiClientError(error) ? error.message : 'Something went wrong.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  const retry = useCallback(() => {
    setPhase({ kind: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const join = useCallback(
    async (input: { name: string; linkTo: string | null }) => {
      if (!code || phase.kind !== 'join') return;
      const session = await api.joinRoom(code, {
        name: input.name,
        clockSource: input.linkTo ? 'linked' : 'manual',
        linkedTo: input.linkTo ?? undefined,
      });
      rememberName(session.viewer.name);
      const saved = await sessions().save({
        roomCode: session.room.code,
        roomTitle: session.room.title,
        viewerId: session.viewer.id,
        token: session.token,
        name: session.viewer.name,
        clockSource: session.viewer.clockSource,
        linkedTo: session.viewer.linkedTo,
        clock: null,
        cursor: null,
      });
      setPhase({ kind: 'ready', room: phase.room, session: saved });
    },
    [code, phase],
  );

  /** The server stopped recognising this device mid-session: forget it and offer to rejoin. */
  const forget = useCallback(async () => {
    if (!code) return;
    await sessions().remove(code);
    retry();
  }, [code, retry]);

  return { code, phase, retry, join, forget };
}
