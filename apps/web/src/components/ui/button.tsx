'use client';

import Link from 'next/link';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'amber';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold ' +
  'transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out ' +
  'active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100';

const variants: Record<Variant, string> = {
  primary: 'bg-chalk text-ink-950 hover:bg-white',
  amber: 'bg-amber text-ink-950 hover:bg-[#ffc46b]',
  secondary: 'border border-line-strong text-chalk hover:border-chalk-3 hover:bg-ink-850',
  ghost: 'text-chalk-2 hover:text-chalk hover:bg-ink-850',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs rounded-sm',
  md: 'h-11 px-4 text-sm rounded-md',
  lg: 'h-14 px-6 text-base rounded-md',
};

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: Variant;
  size?: Size;
  /** Shows a progress bar under the label and disables the button. Label stays, so width doesn't jump. */
  busy?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', busy, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(base, variants[variant], sizes[size], busy && 'cursor-progress', className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {icon}
      {children}
      {busy && <BusyBar />}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}

function BusyBar() {
  return (
    <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-0.5 overflow-hidden rounded-full">
      <span className="block h-full w-1/3 animate-[busy_1s_var(--ease-in-out)_infinite] rounded-full bg-current opacity-60" />
    </span>
  );
}
