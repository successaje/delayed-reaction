'use client';

import type { SavedSession } from '@delayed-reaction/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { sessions } from '@/lib/api';

/** Rooms this device has joined, most recent first. Device-local: nothing is fetched. */
export function RecentRooms() {
  const [rooms, setRooms] = useState<SavedSession[] | null>(null);

  useEffect(() => {
    void sessions().list().then(setRooms);
  }, []);

  if (!rooms || rooms.length === 0) return null;

  return (
    <section className="mt-12 animate-fade">
      <h2 className="eyebrow mb-3">Your rooms</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
        {rooms.map((room) => (
          <li key={room.roomCode}>
            <Link
              href={`/r/${room.roomCode}`}
              className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-ink-850"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-chalk">{room.roomTitle}</span>
                <span className="block text-xs text-chalk-3">as {room.name}</span>
              </span>
              <span className="font-mono text-xs tracking-[0.2em] text-chalk-3">{room.roomCode}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
