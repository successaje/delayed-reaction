/**
 * Viewer credentials. A token is `<viewerId>.<secret>`: the id locates the viewer, the secret
 * proves possession. Only a SHA-256 hash of the full token is stored, so a leaked database
 * can't be replayed against the API.
 */

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** 12 characters over a 32-symbol alphabet: 60 bits, plenty for ids scoped to one room. */
export function newId(length = 12): string {
  let id = '';
  for (const byte of randomBytes(length)) id += ID_ALPHABET[byte & 31];
  return id;
}

export function newToken(viewerId: string): string {
  return `${viewerId}.${base64url(randomBytes(32))}`;
}

export function parseToken(token: string): { viewerId: string } | null {
  const match = /^([a-z0-9]{12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  return match ? { viewerId: match[1]! } : null;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compares two equal-length hex digests without short-circuiting. */
export function digestsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
