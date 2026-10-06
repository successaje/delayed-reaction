import { QUICK_REACTIONS } from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { color, radius, safe, space, type } from '../theme';

/**
 * The remote's reaction pad: one row of words along the bottom of the match. The remote drives
 * it directly (◀ ▶ to pick, OK to send), so it never takes focus away from the video.
 */
export function ReactionTray({ selected }: { selected: number }) {
  return (
    <View style={styles.root} accessibilityRole="menu" accessibilityLabel="React to this moment">
      <Text style={[type.eyebrow, { color: color.chalk3 }]}>React at this moment</Text>
      <View style={styles.row}>
        {QUICK_REACTIONS.map((reaction, index) => {
          const active = index === selected;
          return (
            <View
              key={reaction.id}
              accessibilityRole="menuitem"
              accessibilityLabel={reaction.label}
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.word, { color: active ? color.ink950 : color.chalk }]}>{reaction.label}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[type.label, { color: color.chalk2, fontWeight: '400' }]}>
        ◀ ▶ pick · OK sends · ▼ closes
      </Text>
    </View>
  );
}

/** Height the tray takes at the bottom of the screen, so the reaction cards can sit above it. */
export const TRAY_HEIGHT = 250;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    paddingHorizontal: safe.x,
    paddingTop: space.md,
    paddingBottom: safe.y,
    backgroundColor: 'rgba(10,12,11,0.88)',
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  row: { flexDirection: 'row', gap: space.sm },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 84,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.lineStrong,
    backgroundColor: color.ink900,
  },
  chipActive: {
    borderColor: color.amber,
    backgroundColor: color.amber,
    transform: [{ scale: 1.06 }],
  },
  word: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.5 },
});
