/**
 * Room codes are read off a TV across the room and typed on phones, so the alphabet
 * leaves out characters that are easy to confuse (0/O, 1/I). It has exactly 32 symbols,
 * so masking a random byte with 31 picks one without modulo bias.
 */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 6;

export type RandomBytes = (length: number) => Uint8Array;

export function generateRoomCode(randomBytes: RandomBytes): string {
  const bytes = randomBytes(ROOM_CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += ROOM_CODE_ALPHABET[byte & 31];
  return code;
}

/** Accepts what people actually type (lowercase, spaces, dashes) and returns a canonical code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  for (const c of code) if (!ROOM_CODE_ALPHABET.includes(c)) return null;
  return code;
}

/**
 * Viewer colours, assigned in join order. Chosen to stay distinct on a dark TV background
 * and to pass 4.5:1 contrast against it.
 */
export const VIEWER_COLORS = [
  '#FF8A3D', // ember
  '#4FD1C5', // teal
  '#F6C445', // floodlight
  '#9F8CFF', // dusk
  '#FF6B8B', // rose
  '#7BD88F', // turf
  '#5AB0FF', // sky
  '#E2A6FF', // lilac
] as const;

export function viewerColor(index: number): string {
  return VIEWER_COLORS[index % VIEWER_COLORS.length]!;
}
