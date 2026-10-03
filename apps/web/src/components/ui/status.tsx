import { cx } from '@/lib/cx';

export type Tone = 'live' | 'delayed' | 'ok' | 'muted' | 'danger';

const dot: Record<Tone, string> = {
  live: 'bg-live',
  delayed: 'bg-amber',
  ok: 'bg-turf',
  muted: 'bg-chalk-3',
  danger: 'bg-danger',
};

export function StatusDot({ tone, pulse }: { tone: Tone; pulse?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx('inline-block h-2 w-2 shrink-0 rounded-full', dot[tone], pulse && 'animate-pulse-dot')}
    />
  );
}

/** A compact status line: dot + label. Announced politely to screen readers. */
export function StatusLabel({
  tone,
  pulse,
  children,
  className,
}: {
  tone: Tone;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span role="status" className={cx('inline-flex items-center gap-2 text-xs text-chalk-2', className)}>
      <StatusDot tone={tone} pulse={pulse} />
      {children}
    </span>
  );
}
