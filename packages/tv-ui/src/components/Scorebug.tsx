import { formatClock, periodSpec, type MatchPosition, type Sport } from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { color, radius, type } from '../theme';

/** Top-left, broadcast-style: period, match clock, and how many friends are in. */
export function Scorebug({
  position,
  sport,
  friends,
  heat = 0,
  status,
}: {
  position: MatchPosition;
  sport: Sport;
  friends: number;
  /** 0–1: how lively the group has been over the last few seconds. */
  heat?: number;
  status: string | null;
}) {
  const lit = Math.round(heat * 5);
  const label = position.period === 0 ? 'PRE' : (periodSpec(sport, position.period)?.label ?? `P${position.period}`);
  return (
    <View style={styles.row}>
      <View style={styles.period}>
        <Text style={[type.label, type.mono, { color: color.ink950 }]}>{label}</Text>
      </View>
      <View style={styles.clock}>
        <Text style={[type.clock, { color: color.chalk }]}>{formatClock(position.ms)}</Text>
      </View>
      {friends > 0 && !status ? (
        <View style={styles.meter} accessibilityLabel={`Group heat ${lit} of 5`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { height: 10 + i * 5, backgroundColor: i < lit ? color.amber : 'rgba(242,240,232,0.18)' },
              ]}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.friends}>
        <Text style={[type.label, { color: status ? color.amber : color.chalk2 }]}>
          {status ?? (friends === 0 ? 'Just you so far' : `With ${friends} ${friends === 1 ? 'friend' : 'friends'}`)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.sm, overflow: 'hidden' },
  period: { backgroundColor: color.amber, paddingHorizontal: 14, justifyContent: 'center' },
  clock: { backgroundColor: 'rgba(10,12,11,0.9)', paddingHorizontal: 18, paddingVertical: 6, justifyContent: 'center' },
  meter: {
    backgroundColor: 'rgba(21,25,22,0.88)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 10,
  },
  bar: { width: 6, borderRadius: 2 },
  friends: { backgroundColor: 'rgba(21,25,22,0.88)', paddingHorizontal: 18, justifyContent: 'center' },
});
