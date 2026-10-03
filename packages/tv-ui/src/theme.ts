import { Platform, type TextStyle } from 'react-native';

/**
 * TV tokens, in 1920×1080 design units. Mirrors the web palette so the phone and the TV
 * read as one product: floodlit ink, chalk, amber for "delayed", tally red for "live".
 */
export const color = {
  ink950: '#0a0c0b',
  ink900: '#101311',
  ink850: '#151916',
  ink800: '#1b201c',
  line: '#262c28',
  lineStrong: '#39413b',
  chalk: '#f2f0e8',
  chalk2: '#c4c7be',
  chalk3: '#8d948b',
  amber: '#ffb547',
  amberDim: '#3a2a10',
  live: '#ff5a47',
  turf: '#6fd49a',
  danger: '#ff7a6b',
  scrim: 'rgba(10, 12, 11, 0.72)',
} as const;

/** Title-safe area: content stays inside 5% horizontal / 6% vertical margins. */
export const safe = { x: 96, y: 64 } as const;

export const space = { xs: 8, sm: 16, md: 24, lg: 40, xl: 64 } as const;

export const radius = { sm: 6, md: 12, lg: 18 } as const;

const mono = Platform.select({ web: 'JetBrains Mono, ui-monospace, monospace', default: 'monospace' });

/** Ten-foot type: nothing below 22, body at 28. */
export const type = {
  display: { fontSize: 76, lineHeight: 80, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  title: { fontSize: 56, lineHeight: 62, fontWeight: '800' } as TextStyle,
  heading: { fontSize: 36, lineHeight: 44, fontWeight: '700' } as TextStyle,
  body: { fontSize: 28, lineHeight: 38, fontWeight: '400' } as TextStyle,
  label: { fontSize: 22, lineHeight: 28, fontWeight: '600' } as TextStyle,
  eyebrow: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: mono,
  } as TextStyle,
  clock: { fontSize: 44, lineHeight: 52, fontWeight: '700', fontFamily: mono, fontVariant: ['tabular-nums'] } as TextStyle,
  mono: { fontFamily: mono } as TextStyle,
};

export const motion = { quick: 140, base: 220, enter: 360 } as const;
