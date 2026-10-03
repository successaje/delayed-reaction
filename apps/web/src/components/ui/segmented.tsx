'use client';

import { useId } from 'react';
import { cx } from '@/lib/cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** A radio group styled as a row of options. Arrow keys move between options natively. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium text-chalk-2">{label}</legend>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              'flex h-11 cursor-pointer items-center justify-center rounded-sm border px-2 text-center text-xs font-semibold transition-colors duration-150',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber',
              value === option.value
                ? 'border-chalk bg-chalk text-ink-950'
                : 'border-line-strong text-chalk-2 hover:border-chalk-3 hover:text-chalk',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
