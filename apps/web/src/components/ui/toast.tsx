'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cx } from '@/lib/cx';

type ToastTone = 'neutral' | 'success' | 'error';

interface Toast {
  id: number;
  title: string;
  detail?: string;
  tone: ToastTone;
}

interface ToastApi {
  show(toast: { title: string; detail?: string; tone?: ToastTone; durationMs?: number }): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Minimal toasts: one region, newest at the bottom, auto-dismiss, announced via aria-live.
 * Positioned above the thumb zone on phones so they never cover the reaction pad.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show({ title, detail, tone = 'neutral', durationMs = 4_000 }) {
        const id = nextId.current++;
        setToasts((all) => [...all.slice(-2), { id, title, detail, tone }]);
        setTimeout(() => dismiss(id), durationMs);
      },
    }),
    [dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 sm:top-auto sm:bottom-6"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cx(
              'pointer-events-auto w-full max-w-sm animate-rise rounded-md border bg-ink-850/95 px-4 py-3 text-left shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur',
              t.tone === 'error' ? 'border-danger/50' : t.tone === 'success' ? 'border-turf/40' : 'border-line-strong',
            )}
          >
            <p className="text-sm font-semibold text-chalk">{t.title}</p>
            {t.detail && <p className="mt-0.5 text-xs text-chalk-2">{t.detail}</p>}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
