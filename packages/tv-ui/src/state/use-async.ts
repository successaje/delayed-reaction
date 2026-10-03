import { isApiClientError } from '@delayed-reaction/client';
import { useCallback, useEffect, useState } from 'react';

export type Async<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** Runs `load` on mount and on `retry()`, exposing loading / error / ready. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): Async<T> & { retry: () => void } {
  const [state, setState] = useState<Async<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    load().then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) =>
        !cancelled &&
        setState({
          status: 'error',
          message: isApiClientError(error) ? error.message : 'Something went wrong.',
        }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
