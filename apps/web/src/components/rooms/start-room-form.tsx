'use client';

import { createRoomRequestSchema, SPORTS, type SportId } from '@delayed-reaction/core';
import { isApiClientError } from '@delayed-reaction/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { api, rememberedName, rememberName, sessions } from '@/lib/api';

const sportOptions = (Object.keys(SPORTS) as SportId[]).map((id) => ({
  value: id,
  label: SPORTS[id].name,
}));

type Errors = Partial<Record<'title' | 'name' | 'form', string>>;

export function StartRoomForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportId>('football');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(rememberedName()), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const request = { title, sport, host: { name, clockSource: 'manual' as const } };
    const parsed = createRoomRequestSchema.safeParse(request);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] === 'title' ? 'title' : issue.path[0] === 'host' ? 'name' : 'form';
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setBusy(true);
    try {
      const session = await api.createRoom(request);
      rememberName(session.viewer.name);
      await sessions().save({
        roomCode: session.room.code,
        roomTitle: session.room.title,
        viewerId: session.viewer.id,
        token: session.token,
        name: session.viewer.name,
        clockSource: 'manual',
        linkedTo: null,
        clock: null,
        cursor: null,
      });
      router.push(`/r/${session.room.code}?new=1`);
    } catch (error) {
      setErrors({
        form: isApiClientError(error) ? error.message : 'Something went wrong. Try again.',
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Field
        label="The game"
        placeholder="Arsenal v Spurs"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        autoComplete="off"
        autoFocus
        error={errors.title}
      />
      <Segmented label="Sport" options={sportOptions} value={sport} onChange={setSport} />
      <Field
        label="Your name"
        placeholder="Ada"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={24}
        autoComplete="nickname"
        hint="Shown next to your reactions. No account needed."
        error={errors.name}
      />
      {errors.form && (
        <p role="alert" className="rounded-md border border-danger/40 bg-live-dim/40 px-3.5 py-3 text-sm text-chalk">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" busy={busy} className="mt-2 w-full">
        {busy ? 'Creating room' : 'Create room'}
      </Button>
    </form>
  );
}
