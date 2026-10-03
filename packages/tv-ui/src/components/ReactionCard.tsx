import { formatPosition, reactionLabel, type ReactionDto, type Sport } from '@delayed-reaction/core';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { color, motion, radius, type } from '../theme';

/**
 * A reaction as a broadcast lower-third: slides in from the right edge, colour bar for
 * who said it, the word itself big enough to read from the sofa.
 */
export function ReactionCard({
  reaction,
  name,
  accent,
  sport,
  late,
}: {
  reaction: ReactionDto;
  name: string;
  accent: string;
  sport: Sport;
  /** Posted by someone watching behind you: a reply from later. */
  late?: boolean;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: motion.enter,
      easing: Easing.out(Easing.cubic),
      // The native driver doesn't exist on React Native Web; there it falls back to JS.
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [enter]);

  const quick = reaction.body.kind === 'quick';
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: enter,
          transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.meta}>
          <Text style={[type.label, { color: accent }]}>{name}</Text>
          {late ? <Text style={[type.label, styles.late]}>replied later</Text> : null}
          <Text style={[type.label, type.mono, styles.position]}>{formatPosition(reaction.position, sport)}</Text>
        </View>
        <Text style={quick ? styles.quick : styles.text} numberOfLines={2}>
          {reactionLabel(reaction.body)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    width: 560,
    backgroundColor: 'rgba(16, 19, 17, 0.92)',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.line,
  },
  bar: { width: 10 },
  body: { flex: 1, paddingVertical: 16, paddingHorizontal: 22 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  late: { color: color.chalk3, fontWeight: '400' },
  position: { marginLeft: 'auto', color: color.chalk3, fontWeight: '400' },
  quick: { color: color.chalk, fontSize: 54, lineHeight: 60, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  text: { color: color.chalk, fontSize: 32, lineHeight: 42, marginTop: 4 },
});
