'use client';

import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

export interface FieldProps extends ComponentPropsWithoutRef<'input'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Rendered inside the input on the right, e.g. a character count. */
  trailing?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-xs font-medium text-chalk-2">
        {label}
      </label>
      <div
        className={cx(
          'flex h-12 items-center rounded-md border bg-ink-900 transition-colors duration-150',
          'focus-within:border-chalk-3',
          error ? 'border-danger/70' : 'border-line-strong',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-base text-chalk outline-none placeholder:text-chalk-3/70"
          {...rest}
        />
        {trailing && <span className="pr-3.5 text-2xs text-chalk-3 tabular">{trailing}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-danger animate-fade">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-chalk-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
