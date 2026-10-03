'use client';

import {
  MAX_TEXT_LENGTH,
  normalizeText,
  QUICK_REACTIONS,
  type ReactionBody,
} from '@delayed-reaction/core';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cx } from '@/lib/cx';

/**
 * One tap to react. Words, not emoji: they read faster on a TV across the room, and they're
 * the words people actually shout.
 */
export function ReactionPad({
  onSend,
  disabled,
}: {
  onSend: (body: ReactionBody) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  function quick(id: (typeof QUICK_REACTIONS)[number]['id']) {
    setFlash(id);
    setTimeout(() => setFlash((current) => (current === id ? null : current)), 260);
    void onSend({ kind: 'quick', value: id });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = normalizeText(text);
    if (!value) return;
    setText('');
    void onSend({ kind: 'text', value });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow hidden lg:block">React</p>
      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_REACTIONS.map((reaction) => (
          <button
            key={reaction.id}
            disabled={disabled}
            onClick={() => quick(reaction.id)}
            className={cx(
              'display h-14 rounded-sm border text-[0.95rem] transition-[background-color,color,transform,border-color] duration-150 active:scale-95 disabled:opacity-40 sm:h-16 sm:text-base',
              flash === reaction.id
                ? 'border-amber bg-amber text-ink-950'
                : 'border-line-strong bg-ink-850 text-chalk hover:border-chalk-3',
            )}
          >
            {reaction.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="reaction-text">
          Say something
        </label>
        <input
          id="reaction-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Say something"
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="send"
          className="h-12 min-w-0 flex-1 rounded-md border border-line-strong bg-ink-900 px-3.5 text-base text-chalk outline-none placeholder:text-chalk-3/70 focus:border-chalk-3"
        />
        <Button type="submit" size="md" className="h-12" disabled={disabled || !normalizeText(text)}>
          Send
        </Button>
      </form>
    </div>
  );
}
