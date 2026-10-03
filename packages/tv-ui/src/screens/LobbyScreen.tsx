import type { SavedSession } from '@delayed-reaction/client';
import { getSport, PRE_MATCH, type ProgramDto } from '@delayed-reaction/core';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { TvButton } from '../components/Focusable';
import { Presence } from '../components/Presence';
import { QrCode } from '../components/QrCode';
import { Eyebrow, Screen } from '../components/Screen';
import { RemoteKey } from '../remote/keys';
import { useRemote } from '../remote/use-remote';
import { useServices } from '../services';
import { color, radius, space, type } from '../theme';

/**
 * Before playing: the room code and a QR code that opens the phone companion already linked
 * to this TV, plus who's in. Presence refreshes every few seconds so new arrivals appear.
 */
export function LobbyScreen({
  session,
  program,
  onPlay,
  onBack,
}: {
  session: SavedSession;
  program: ProgramDto;
  onPlay: () => void;
  onBack: () => void;
}) {
  const { api, webUrl } = useServices();
  const [viewers, setViewers] = useState<Awaited<ReturnType<typeof api.getRoom>>['viewers']>([]);
  const [serverNow, setServerNow] = useState(Date.now());
  const sport = getSport(program.sport);
  const joinUrl = `${webUrl}/r/${session.roomCode}?tv=${session.viewerId}`;

  useRemote((key) => key === RemoteKey.Back && onBack());

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.getRoom(session.roomCode).then(
        (state) => {
          if (cancelled) return;
          setViewers(state.viewers);
          setServerNow(state.serverTime);
        },
        () => undefined,
      );
    void load();
    const timer = setInterval(load, 3_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [api, session.roomCode]);

  const others = viewers.filter((v) => v.id !== session.viewerId);

  return (
    <Screen>
      <View style={styles.layout}>
        <View style={styles.left}>
          <Eyebrow>{program.subtitle}</Eyebrow>
          <Text style={[type.title, { color: color.chalk }]}>{program.title}</Text>
          <View style={styles.codeRow}>
            <Text style={[type.label, { color: color.chalk3 }]}>Room</Text>
            <Text style={[type.title, type.mono, styles.code]}>{session.roomCode}</Text>
          </View>

          <View style={styles.people}>
            <Eyebrow>{others.length ? 'In the room' : 'Waiting for friends'}</Eyebrow>
            {others.length ? (
              <Presence
                viewers={viewers}
                selfId={session.viewerId}
                position={PRE_MATCH}
                sport={sport}
                serverNow={serverNow}
              />
            ) : (
              <Text style={[type.body, { color: color.chalk2, maxWidth: 820 }]}>
                Friends can join now or hours from now. Whenever they react, it reaches this TV at that
                moment in the match.
              </Text>
            )}
          </View>

          <SpatialNavigationView direction="horizontal" style={{ flexDirection: 'row', gap: space.md, marginTop: 'auto' }}>
            <DefaultFocus>
              <TvButton label="Start watching" hint="Press play whenever you're ready" onSelect={onPlay} />
            </DefaultFocus>
            <TvButton label="Back" variant="secondary" onSelect={onBack} />
          </SpatialNavigationView>
        </View>

        <View style={styles.qrPanel}>
          <QrCode value={joinUrl} size={380} />
          <Text style={[type.heading, { color: color.chalk, marginTop: space.md }]}>React from your phone</Text>
          <Text style={[type.label, { color: color.chalk2, fontWeight: '400', textAlign: 'center' }]}>
            Scan to join. Your phone follows this TV's clock, so there's nothing to set up.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row', gap: space.xl },
  left: { flex: 1 },
  codeRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, marginTop: space.md },
  code: { color: color.amber, letterSpacing: 10 },
  people: { marginTop: space.xl },
  qrPanel: {
    width: 520,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.ink900,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
    gap: 8,
  },
});
