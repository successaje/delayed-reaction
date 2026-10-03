import { cx } from '@/lib/cx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'block animate-pulse-dot rounded-sm bg-ink-800 [animation-duration:2.2s]',
        className,
      )}
    />
  );
}
