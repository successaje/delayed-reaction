/**
 * Quick reactions are the one-tap vocabulary of the reaction pad. They are words, not emoji:
 * on a TV across the room, a bold word in a broadcast lower-third reads faster than a glyph.
 */
export const QUICK_REACTIONS = [
  { id: 'yes', label: 'YES!' },
  { id: 'no', label: 'NOOO' },
  { id: 'ref', label: 'REF?!' },
  { id: 'what', label: 'WHAT.' },
  { id: 'unreal', label: 'UNREAL' },
  { id: 'haha', label: 'HAHA' },
  { id: 'nervous', label: 'NERVES' },
  { id: 'come-on', label: 'COME ON' },
] as const;

export type QuickReactionId = (typeof QUICK_REACTIONS)[number]['id'];

export const QUICK_REACTION_IDS = QUICK_REACTIONS.map((r) => r.id) as [
  QuickReactionId,
  ...QuickReactionId[],
];

export const MAX_TEXT_LENGTH = 80;

export type ReactionBody =
  | { readonly kind: 'quick'; readonly value: QuickReactionId }
  | { readonly kind: 'text'; readonly value: string };

export function reactionLabel(body: ReactionBody): string {
  if (body.kind === 'text') return body.value;
  return QUICK_REACTIONS.find((r) => r.id === body.value)?.label ?? body.value;
}

/** Collapses whitespace and trims. Returns null when nothing meaningful is left. */
export function normalizeText(input: string): string | null {
  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH).trimEnd() : text;
}
