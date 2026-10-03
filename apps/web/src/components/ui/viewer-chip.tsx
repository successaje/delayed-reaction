import { cx } from '@/lib/cx';

/** A friend's initial in their room colour. */
export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink-950',
        size === 'sm' ? 'h-5 w-5 text-[0.65rem]' : 'h-7 w-7 text-xs',
      )}
      style={{ backgroundColor: color }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
