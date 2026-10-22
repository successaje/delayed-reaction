import { isApiClientError, type SavedSession } from '@delayed-reaction/client';
import { normalizeRoomCode, type ProgramDto } from '@delayed-reaction/core';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import './remote/configure';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TvButton } from './components/Focusable';
import { Message, Screen } from './components/Screen';
import { HomeScreen } from './screens/HomeScreen';
import { JoinCodeScreen } from './screens/JoinCodeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { PickProgramScreen } from './screens/PickProgramScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { TvServicesProvider, useServices, type TvConfig } from './services';
import { color } from './theme';

type Route =
  | { name: 'home' }
  | { name: 'join' }
  | { name: 'busy'; title: string }
  | { name: 'failed'; title: string; detail: string }
  | { name: 'pick'; session: SavedSession }
  | { name: 'lobby'; session: SavedSession; program: ProgramDto }
  | { name: 'player'; session: SavedSession; program: ProgramDto };

/** The Deract TV app. Platform shells provide config (API, storage) and mount it. */
export function DelayedReactionTV({ config }: { config: TvConfig }) {
  return (
    <TvServicesProvider config={config}>
      <View style={styles.root}>
        <Router />
      </View>
    </TvServicesProvider>
  );
}

function Router() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const home = useCallback(() => setRoute({ name: 'home' }), []);
  return (
    <ErrorBoundary onReset={home}>
      <Routes route={route} setRoute={setRoute} home={home} />
    </ErrorBoundary>
  );
}

function Routes({
  route,
  setRoute,
  home,
}: {
  route: Route;
  setRoute: (route: Route) => void;
  home: () => void;
}) {
  const { api, sessions, deviceName } = useServices();

  const fail = (title: string, error: unknown) =>
    setRoute({
      name: 'failed',
      title,
      detail: isApiClientError(error) ? error.message : 'Something went wrong. Try again.',
    });

  async function save(session: Awaited<ReturnType<typeof api.createRoom>>): Promise<SavedSession> {
    return sessions.save({
      roomCode: session.room.code,
      roomTitle: session.room.title,
      viewerId: session.viewer.id,
      token: session.token,
      name: session.viewer.name,
      clockSource: 'player',
      linkedTo: null,
      clock: null,
      cursor: null,
    });
  }

  async function openRoom(session: SavedSession, programId: string | null) {
    const program = programId
      ? (await api.programs()).programs.find((p) => p.id === programId)
      : undefined;
    setRoute(program ? { name: 'lobby', session, program } : { name: 'pick', session });
  }

  async function start(program: ProgramDto) {
    setRoute({ name: 'busy', title: 'Opening a room' });
    try {
      const created = await api.createRoom({
        title: program.title,
        sport: program.sport,
        programId: program.id,
        host: { name: deviceName, clockSource: 'player', deviceLabel: `${deviceName} TV` },
      });
      setRoute({ name: 'lobby', session: await save(created), program });
    } catch (error) {
      fail("Couldn't open a room", error);
    }
  }

  async function join(rawCode: string) {
    const code = normalizeRoomCode(rawCode);
    if (!code) throw new Error('invalid code');
    const joined = await api.joinRoom(code, {
      name: deviceName,
      clockSource: 'player',
      deviceLabel: `${deviceName} TV`,
    });
    await openRoom(await save(joined), joined.room.programId);
  }

  async function resume(session: SavedSession) {
    setRoute({ name: 'busy', title: `Opening ${session.roomTitle}` });
    try {
      const me = await api.me(session.roomCode, session.token);
      await openRoom(session, me.room.programId);
    } catch (error) {
      if (isApiClientError(error) && (error.code === 'unauthorized' || error.code === 'room_not_found')) {
        await sessions.remove(session.roomCode);
        fail('That room has closed', new Error());
        return;
      }
      fail("Couldn't open the room", error);
    }
  }

  switch (route.name) {
    case 'home':
      return (
        <SpatialNavigationRoot>
          <HomeScreen onStart={start} onResume={resume} onJoin={() => setRoute({ name: 'join' })} />
        </SpatialNavigationRoot>
      );
    case 'join':
      return (
        <SpatialNavigationRoot>
          <JoinCodeScreen onSubmit={join} onBack={home} />
        </SpatialNavigationRoot>
      );
    case 'busy':
      return (
        <Screen>
          <Message title={route.title} />
        </Screen>
      );
    case 'failed':
      return (
        <SpatialNavigationRoot>
          <Screen>
            <Message title={route.title} detail={route.detail}>
              <TvButton label="Back to start" onSelect={home} />
            </Message>
          </Screen>
        </SpatialNavigationRoot>
      );
    case 'pick':
      return (
        <SpatialNavigationRoot>
          <PickProgramScreen
            roomTitle={route.session.roomTitle}
            onPick={(program) => setRoute({ name: 'lobby', session: route.session, program })}
            onBack={home}
          />
        </SpatialNavigationRoot>
      );
    case 'lobby':
      return (
        <SpatialNavigationRoot>
          <LobbyScreen
            session={route.session}
            program={route.program}
            onPlay={() => setRoute({ name: 'player', session: route.session, program: route.program })}
            onBack={home}
          />
        </SpatialNavigationRoot>
      );
    case 'player':
      return (
        <SpatialNavigationRoot>
          <PlayerScreen
            session={route.session}
            program={route.program}
            onExit={() => setRoute({ name: 'lobby', session: route.session, program: route.program })}
          />
        </SpatialNavigationRoot>
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950 },
});
