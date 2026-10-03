'use client';

import { normalizeRoomCode, ROOM_CODE_LENGTH } from '@delayed-reaction/core';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
      setError(`Room codes are ${ROOM_CODE_LENGTH} characters, like KX7P2M.`);
      return;
    }
    setBusy(true);
    router.push(`/r/${normalized}`);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        label="Room code"
        placeholder="KX7P2M"
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setError(null);
        }}
        maxLength={9}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        className="[&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.3em]"
        error={error}
      />
      <Button type="submit" size="lg" busy={busy} className="w-full">
        Join room
      </Button>
    </form>
  );
}
