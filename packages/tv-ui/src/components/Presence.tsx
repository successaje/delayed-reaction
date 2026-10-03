import {
  extrapolate,
  formatGap,
  isAway,
  relativeTo,
  type MatchPosition,
  type Sport,
  type ViewerDto,
} from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { color, type } from '../theme';

/** Who else is watching and where they are relative to this TV. Never what they've seen. */
export function Presence({
  viewers,
  selfId,
  position,
  sport,
  serverNow,
  compact,
}: {
  viewers: readonly ViewerDto[];
  selfId: string;
  position: MatchPosition;
  sport: Sport;
  serverNow: number;
  compact?: boolean;
}) {
  const others = viewers.filter((v) => v.id !== selfId);
  if (others.length === 0) return null;
  return (
    <View style={[styles.list, compact && styles.compact]}>
      {others.map((viewer) => (
        <View key={viewer.id} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: viewer.color }]}>
            <Text style={styles.initial}>{viewer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[type.label, { color: color.chalk }]}>{viewer.name}</Text>
          <Text style={[type.label, styles.where]}>{describe(viewer, selfId, position, sport, serverNow)}</Text>
        </View>
      ))}
    </View>
  );
}

function describe(viewer: ViewerDto, selfId: string, me: MatchPosition, sport: Sport, now: number): string {
  if (viewer.linkedTo === selfId) return 'on this TV';
  if (!viewer.report || viewer.report.position.period === 0) return 'not started';
  if (isAway(viewer.report, now)) return 'away';
  const rel = relativeTo(me, extrapolate(viewer.report, now), sport);
  if (rel.relation === 'level') return 'with you';
  return `${formatGap(rel.gapMs)} ${rel.relation}`;
}

const styles = StyleSheet.create({
  list: { gap: 18 },
  compact: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initial: { color: color.ink950, fontWeight: '800', fontSize: 20 },
  where: { color: color.chalk3, fontWeight: '400' },
});
