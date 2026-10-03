import { formatClock, periodSpec, type MatchPosition, type Sport } from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { color, radius, type } from '../theme';

/** Top-left, broadcast-style: period, match clock, and how many friends are in. */
export function Scorebug({
  position,
  sport,
  friends,
  status,
}: {
  position: MatchPosition;
  sport: Sport;
  friends: number;
  status: string | null;
}) {
  const label = position.period === 0 ? 'PRE' : (periodSpec(sport, position.period)?.label ?? `P${position.period}`);
  return (
    <View style={styles.row}>
      <View style={styles.period}>
        <Text style={[type.label, type.mono, { color: color.ink950 }]}>{label}</Text>
      </View>
      <View style={styles.clock}>
        <Text style={[type.clock, { color: color.chalk }]}>{formatClock(position.ms)}</Text>
      </View>
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
  friends: { backgroundColor: 'rgba(21,25,22,0.88)', paddingHorizontal: 18, justifyContent: 'center' },
});
