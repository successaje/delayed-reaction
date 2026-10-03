import { formatPosition, reactionLabel, type Recap, type RecapMoment, type Sport, type ViewerDto } from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { color, radius, safe, space, type } from '../theme';
import { Focusable, TvButton } from './Focusable';

/**
 * Full time: the group's loudest moments, each one a button that replays it from just before.
 */
export function FullTime({
  recap,
  sport,
  viewers,
  onReplay,
  onLeave,
}: {
  recap: Recap | null;
  sport: Sport;
  viewers: readonly ViewerDto[];
  onReplay: (moment: RecapMoment) => void;
  onLeave: () => void;
}) {
  const names = new Map(viewers.map((v) => [v.id, v]));
  const moments = recap?.moments ?? [];
  return (
    <View style={styles.scrim}>
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
});
