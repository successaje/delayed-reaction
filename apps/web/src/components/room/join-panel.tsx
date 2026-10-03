'use client';

import { isApiClientError } from '@delayed-reaction/client';
import { joinRoomRequestSchema, type RoomStateDto } from '@delayed-reaction/core';
import { useEffect, useState, type FormEvent } from 'react';
import { PageTitle } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Avatar } from '@/components/ui/viewer-chip';
import { rememberedName } from '@/lib/api';
import { cx } from '@/lib/cx';

export function JoinPanel({
  room,
  linkToTv,
  onJoin,
}: {
  room: RoomStateDto;
  linkToTv: string | null;
  onJoin: (input: { name: string; linkTo: string | null }) => Promise<void>;
}) {
  const tv = room.viewers.find((v) => v.id === linkToTv && v.clockSource === 'player') ?? null;
  const people = room.viewers.filter((v) => v.clockSource !== 'linked');
  const [name, setName] = useState('');
  const [followTv, setFollowTv] = useState(Boolean(tv));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(rememberedName()), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = joinRoomRequestSchema.shape.name.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Add your name');
      return;
    }
    setBusy(true);
    try {
      await onJoin({ name: parsed.data, linkTo: followTv && tv ? tv.id : null });
    } catch (err) {
      setError(isApiClientError(err) ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow={`Room ${room.room.code}`} title={room.room.title} />
      {people.length > 0 && (
        <div className="-mt-4 mb-8 flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {people.slice(0, 5).map((v) => (
              <span key={v.id} className="rounded-full ring-2 ring-ink-950">
                <Avatar name={v.name} color={v.color} />
              </span>
            ))}
          </div>
          <p className="text-sm text-chalk-2">
            {people.length === 1
              ? `${people[0]!.name} is in`
              : `${people[0]!.name} and ${people.length - 1} more are in`}
          </p>
        </div>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <Field
          label="Your name"
          placeholder="Tunde"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={24}
          autoComplete="nickname"
          autoFocus
          hint="Friends see this next to your reactions."
          error={error}
        />

        {tv && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-medium text-chalk-2">Your clock</legend>
            <ClockOption
              checked={followTv}
              onSelect={() => setFollowTv(true)}
              title={`Follow ${tv.deviceLabel ?? tv.name}`}
              detail="Your reactions are timed to the TV you scanned. Nothing to set up."
            />
            <ClockOption
              checked={!followTv}
              onSelect={() => setFollowTv(false)}
              title="I'm watching on another screen"
              detail="You'll tap once at kick-off to set your own clock."
            />
          </fieldset>
        )}

        <Button type="submit" size="lg" busy={busy} className="w-full">
          {busy ? 'Joining' : 'Join the room'}
        </Button>
        {!tv && (
          <p className="text-center text-xs text-chalk-3">
            Next, you'll tap once at kick-off so your reactions are timed to the match.
          </p>
        )}
      </form>
    </>
  );
}

function ClockOption({
  checked,
  onSelect,
  title,
  detail,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer gap-3 rounded-md border p-3.5 transition-colors duration-150',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber',
        checked ? 'border-chalk-2 bg-ink-850' : 'border-line-strong hover:border-chalk-3',
      )}
    >
      <input type="radio" checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden
        className={cx(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-amber' : 'border-chalk-3',
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-amber" />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-chalk">{title}</span>
        <span className="mt-0.5 block text-xs text-chalk-2">{detail}</span>
      </span>
    </label>
  );
}
