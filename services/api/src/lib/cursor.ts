/**
 * Sync cursors remember two things: how far along the match the device has been served
 * (`k`, a position sort key) and which reactions it has seen by insertion order (`s`).
 * The second part catches reactions posted *behind* the device's position, typically
 * replies from friends watching even later.
 */
export interface SyncCursor {
  readonly k: string;
  readonly s: number;
}

export function encodeCursor(cursor: SyncCursor): string {
  return btoa(JSON.stringify(cursor)).replace(/=+$/, '');
}

export function decodeCursor(raw: string | undefined): SyncCursor | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(atob(raw));
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as SyncCursor).k === 'string' &&
      /^\d{12}$/.test((value as SyncCursor).k) &&
      Number.isInteger((value as SyncCursor).s) &&
      (value as SyncCursor).s >= 0
    ) {
      return { k: (value as SyncCursor).k, s: (value as SyncCursor).s };
    }
  } catch {
    // fall through: a malformed cursor is treated as no cursor
  }
  return null;
}
