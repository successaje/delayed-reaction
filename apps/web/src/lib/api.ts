'use client';

import {
  ApiClient,
  memoryStorage,
  SessionStore,
  type KeyValueStorage,
} from '@delayed-reaction/client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export const api = new ApiClient({ baseUrl: API_URL });

/**
 * localStorage can be missing or throw (private mode, blocked storage). Fall back to memory
 * so the product still works for the length of the visit.
 */
function browserStorage(): KeyValueStorage {
  try {
    const probe = '__dr_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

let store: SessionStore | null = null;
let prefs: KeyValueStorage | null = null;

export function sessions(): SessionStore {
  store ??= new SessionStore(browserStorage());
  return store;
}

const NAME_KEY = 'delayed-reaction:name';

export function rememberedName(): string {
  prefs ??= browserStorage();
  return (prefs.getItem(NAME_KEY) as string | null) ?? '';
}

export function rememberName(name: string): void {
  prefs ??= browserStorage();
  void prefs.setItem(NAME_KEY, name);
}
