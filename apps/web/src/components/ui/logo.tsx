import Link from 'next/link';
import { cx } from '@/lib/cx';

/**
 * The mark: two offset bars, the same moment on two timelines. The wordmark sets
 * "DELAYED" in amber, a beat behind "REACTION".
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cx('h-6 w-6', className)}>
      <rect x="2" y="5" width="14" height="5" rx="1" fill="var(--color-chalk)" />
      <rect x="8" y="14" width="14" height="5" rx="1" fill="var(--color-amber)" />
    </svg>
  );
}

export function Wordmark({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cx('group inline-flex items-center gap-2.5 text-chalk', className)}
      aria-label="Delayed Reaction home"
    >
      <Mark className="transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
      <span className="display text-[1.15rem] leading-none tracking-tight">
        <span className="text-amber">Delayed</span> Reaction
      </span>
    </Link>
  );
}
