import type { SavedSession } from '@delayed-reaction/client';
import type { ProgramDto } from '@delayed-reaction/core';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { Focusable, TvButton } from '../components/Focusable';
import { HowItWorks } from '../components/HowItWorks';
import { ProgramCard } from '../components/ProgramCard';
import { Eyebrow, Message, Screen } from '../components/Screen';
import { useServices } from '../services';
import { useAsync } from '../state/use-async';
import { color, radius, space, type } from '../theme';

export function HomeScreen({
  onStart,
  onResume,
  onJoin,
}: {
  onStart: (program: ProgramDto) => void;
  onResume: (session: SavedSession) => void;
  onJoin: () => void;
}) {
  const { api, sessions } = useServices();
  const catalog = useAsync(async () => {
    const [{ programs }, recent] = await Promise.all([api.programs(), sessions.list()]);
    return { programs, recent };
  }, []);

  if (catalog.status === 'loading') {
    return (
      <Screen>
        <Message title="Loading games" />
      </Screen>
    );
  }
  if (catalog.status === 'error') {
    return (
      <Screen>
        <Message title="Can't reach Delayed Reaction" detail={catalog.message}>
          <DefaultFocus>
            <TvButton label="Try again" onSelect={catalog.retry} />
          </DefaultFocus>
        </Message>
      </Screen>
    );
  }

  const { programs, recent } = catalog.data;
  return (
    <Screen>
      <View style={styles.columns}>
      <SpatialNavigationView direction="vertical" style={{ flex: 1 }}>
        <View style={styles.intro}>
          <Text style={[type.display, { color: color.chalk }]}>Watch it late.</Text>
          <Text style={[type.display, { color: color.amber }]}>Watch it together.</Text>
          <Text style={[type.body, styles.lead]}>
            Pick a game and scan the code with your phone. Friends' reactions land at the exact moment
            they happened in the match, and never before.
          </Text>
        </View>

        <Eyebrow>Start a watch</Eyebrow>
        {programs.length === 0 ? (
          <Text style={[type.body, { color: color.chalk3 }]}>No games in the catalog right now.</Text>
        ) : (
          <SpatialNavigationView direction="horizontal" style={styles.row}>
            {programs.map((program, i) =>
              i === 0 ? (
                <DefaultFocus key={program.id}>
                  <ProgramCard program={program} onSelect={() => onStart(program)} />
                </DefaultFocus>
              ) : (
                <ProgramCard key={program.id} program={program} onSelect={() => onStart(program)} />
              ),
            )}
          </SpatialNavigationView>
        )}

        <View style={{ marginTop: space.md }}>
          <Eyebrow>{recent.length ? 'Continue or join' : 'Already have a room?'}</Eyebrow>
          <SpatialNavigationView direction="horizontal" style={styles.row}>
            {recent.slice(0, 3).map((session) => (
              <Focusable key={session.roomCode} onSelect={() => onResume(session)} style={styles.recent}>
                {() => (
                  <>
                    <Text style={[type.label, { color: color.chalk }]} numberOfLines={1}>
                      {session.roomTitle}
                    </Text>
                    <Text style={[type.label, type.mono, { color: color.chalk3, letterSpacing: 4 }]}>
                      {session.roomCode}
                    </Text>
                  </>
                )}
              </Focusable>
            ))}
            <TvButton label="Join with a code" variant="secondary" onSelect={onJoin} />
          </SpatialNavigationView>
        </View>
      </SpatialNavigationView>
      <HowItWorks />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flex: 1, flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' },
  intro: { marginBottom: space.lg, maxWidth: 1100 },
  lead: { color: color.chalk2, marginTop: space.md, maxWidth: 980 },
  row: { flexDirection: 'row', gap: space.md },
  recent: {
    minHeight: 76,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    backgroundColor: color.ink850,
    borderRadius: radius.md,
    minWidth: 320,
  },
});
