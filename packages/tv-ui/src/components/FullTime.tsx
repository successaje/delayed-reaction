import {
  formatPosition,
  judge,
  parseTeams,
  reactionLabel,
  type PredictionsDto,
  type Recap,
  type RecapMoment,
  type Sport,
  type ViewerDto,
} from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { color, radius, safe, space, type } from '../theme';
import { Focusable, TvButton } from './Focusable';

/**
 * Full time: the group's loudest moments, each one a button that replays it from just before.
 */
export function FullTime({
  recap,
  calls,
  title,
  sport,
  viewers,
  onReplay,
  onLeave,
}: {
  recap: Recap | null;
  calls: PredictionsDto | null;
  title: string;
  sport: Sport;
  viewers: readonly ViewerDto[];
  onReplay: (moment: RecapMoment) => void;
  onLeave: () => void;
}) {
  const names = new Map(viewers.map((v) => [v.id, v]));
  const moments = recap?.moments ?? [];
  return (
    <View style={styles.scrim}>
      <View style={styles.columns}>
      <View style={{ flex: 1 }}>
      <Text style={[type.eyebrow, { color: color.amber }]}>Full time</Text>
      <Text style={[type.title, { color: color.chalk, marginTop: space.xs }]}>
        {moments.length ? 'The loudest moments' : recap ? 'A quiet one' : 'Counting reactions…'}
      </Text>
      {recap && (
        <Text style={[type.body, { color: color.chalk2 }]}>
          {recap.total} {recap.total === 1 ? 'reaction' : 'reactions'} from the group
        </Text>
      )}
      <SpatialNavigationView direction="vertical" style={{ gap: space.sm, marginTop: space.lg }}>
        {moments.map((moment, i) => {
          const row = (
            <Focusable key={i} onSelect={() => onReplay(moment)} style={styles.row} focusedStyle={styles.rowFocused}>
              {({ focused }) => (
                <>
                  <Text style={[type.heading, type.mono, { color: focused ? color.ink950 : color.amber, width: 220 }]}>
                    {formatPosition(moment.position, sport)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.label, { color: focused ? color.ink850 : color.chalk3, fontWeight: '400' }]}>
                      {moment.people} {moment.people === 1 ? 'person' : 'people'} · replay from here
                    </Text>
                    <Text style={[type.body, { color: focused ? color.ink950 : color.chalk }]} numberOfLines={1}>
                      {moment.reactions
                        .slice(0, 4)
                        .map((r) => `${names.get(r.viewerId)?.name ?? 'Someone'}: ${reactionLabel(r.body)}`)
                        .join('   ·   ')}
                    </Text>
                  </View>
                </>
              )}
            </Focusable>
          );
          return i === 0 ? <DefaultFocus key={i}>{row}</DefaultFocus> : row;
        })}
        {moments.length === 0 ? (
          <DefaultFocus>
            <TvButton label="Back to the room" onSelect={onLeave} />
          </DefaultFocus>
        ) : (
          <TvButton label="Back to the room" variant="secondary" onSelect={onLeave} />
        )}
      </SpatialNavigationView>
      </View>
      {calls?.result && calls.predictions.length > 0 ? (
        <WhoCalledIt calls={calls} title={title} names={names} />
      ) : null}
      </View>
    </View>
  );
}

/** "Call it" results: the final score and everyone's prediction, best first. */
function WhoCalledIt({
  calls,
  title,
  names,
}: {
  calls: PredictionsDto;
  title: string;
  names: Map<string, ViewerDto>;
}) {
  const result = calls.result!;
  const teams = parseTeams(title);
  const rows = calls.predictions
    .map((p) => ({ p, ...judge(p, result) }))
    .sort((a, b) => b.points - a.points || a.p.createdAt - b.p.createdAt);
  return (
    <View style={styles.calls}>
      <Text style={[type.eyebrow, { color: color.amber }]}>Who called it</Text>
      <Text style={[type.heading, { color: color.chalk, marginTop: space.xs }]}>
        {teams.home} {result.home}–{result.away} {teams.away}
      </Text>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {rows.map(({ p, call }) => (
          <View key={p.viewerId} style={styles.callRow}>
            <Text style={[type.label, { color: names.get(p.viewerId)?.color ?? color.chalk, flex: 1 }]}>
              {names.get(p.viewerId)?.name ?? 'Someone'}
            </Text>
            <Text style={[type.label, type.mono, { color: color.chalk2 }]}>
              {p.home}–{p.away}
            </Text>
            <Text
              style={[
                type.label,
                styles.badge,
                call === 'exact' ? styles.exact : call === 'result' ? styles.right : styles.miss,
              ]}
            >
              {call === 'exact' ? 'CALLED IT' : call === 'result' ? 'RIGHT RESULT' : 'MISSED'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,12,11,0.9)',
    paddingHorizontal: safe.x,
    paddingVertical: safe.y + 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: color.ink850,
  },
  rowFocused: { backgroundColor: color.chalk },
  columns: { flex: 1, flexDirection: 'row', gap: space.xl },
  calls: {
    width: 560,
    backgroundColor: color.ink900,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
    alignSelf: 'flex-start',
  },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontSize: 18 },
  exact: { backgroundColor: color.amber, color: color.ink950 },
  right: { backgroundColor: color.turf, color: color.ink950 },
  miss: { color: color.chalk3 },
});
