import { useEffect, useRef } from 'react';
import type { RemoteKey } from './keys';
import { remoteSource } from './source';

/** Calls `handler` for every remote press while `active`. */
export function useRemote(handler: (key: RemoteKey) => void, active = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    return remoteSource.subscribe((key) => ref.current(key));
  }, [active]);
}
