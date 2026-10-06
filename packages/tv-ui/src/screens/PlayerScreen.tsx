import { playerPlayhead, TimelineSync, type SavedSession, type SyncStatus } from '@delayed-reaction/client';
import { useTimelineState } from '@delayed-reaction/client/react';
import { compare, detectCrowd, getSport, heat, type Shown, type PredictionsDto, type ProgramDto, type ReactionDto, type Recap, type RecapMoment } from '@delayed-reaction/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus } from 'react-tv-space-navigation';
import { TvButton } from '../components/Focusable';
import { FullTime } from '../components/FullTime';
import { Presence } from '../components/Presence';
import { QrCode } from '../components/QrCode';
import { ReactionCard } from '../components/ReactionCard';
import { Scorebug } from '../components/Scorebug';
import { Message, Screen } from '../components/Screen';
import type { MediaController, MediaStatus } from '../player/types';
import { VideoSurface } from '../player/VideoSurface';
import { createCrowdSound } from '../audio/crowd';
import { RemoteKey } from '../remote/keys';
import { useRemote } from '../remote/use-remote';
import { useServices } from '../services';
import { color, radius, safe, space, type } from '../theme';

const CARD_LIFETIME_MS = 7_000;
const MAX_CARDS = 4;
const SEEK_MS = 10_000;
const CONTROLS_LINGER_MS = 4_000;
/** A reaction behind the playhead posted this recently is a reply from someone watching later. */
const LATE_REPLY_WINDOW_MS = 30_000;

interface Card {
  readonly reaction: ReactionDto;
  readonly late: boolean;
  readonly shownAt: number;
}

/**
 * The match, full screen, with friends' reactions sliding in at the moment they happened.
 * The video playhead *is* the clock: pausing or seeking moves the timeline with it.
 */
export function PlayerScreen({
  session,
  program,
  onExit,
}: {
  session: SavedSession;
  program: ProgramDto;
  onExit: () => void;
}) {
  const { api, webUrl } = useServices();
  const sport = getSport(program.sport);
  const controllerRef = useRef<MediaController | null>(null);
  const [media, setMedia] = useState<MediaStatus>('loading');
  const [cards, setCards] = useState<Card[]>([]);
  const [controlsUntil, setControlsUntil] = useState(() => Date.now() + CONTROLS_LINGER_MS);
  const [now, setNow] = useState(Date.now());

  const readPlayhead = useMemo(
    () =>
      playerPlayhead(
        program.markers.map((m) => ({ period: m.period, localStartMs: m.mediaMs })),
        () => controllerRef.current?.currentTimeMs() ?? 0,
        () => controllerRef.current?.isPlaying() ?? false,
      ),
    [program],
  );

  const engine = useMemo(
    () =>
      new TimelineSync({
        api,
        roomCode: session.roomCode,
        token: session.token,
        viewerId: session.viewerId,
        readPlayhead,
      }),
    [api, session.roomCode, session.token, session.viewerId, readPlayhead],
  );
  const state = useTimelineState(engine);

  // Crowd sound: when several friends react together, the room hears it.
  const crowd = useMemo(() => createCrowdSound(webUrl), [webUrl]);
  useEffect(() => () => crowd.dispose(), [crowd]);
  const recentRef = useRef<Shown[]>([]);
  const lastCrowdRef = useRef(-Infinity);

  useEffect(() => {
    engine.start();
    const unsubscribe = engine.subscribe((event) => {
      if (event.type !== 'due' && event.type !== 'history') return;
      const at = Date.now();
      if (event.type === 'due') {
        recentRef.current = [
          ...recentRef.current.filter((s) => at - s.at < 15_000),
          ...event.reactions.map((reaction) => ({ reaction, at })),
        ];
        const moment = detectCrowd(recentRef.current, at, lastCrowdRef.current);
        if (moment) {
          lastCrowdRef.current = at;
          crowd.play(moment.mood, moment.intensity);
        }
      }
      const serverNow = engine.serverNow();
      const fresh = event.reactions
        .filter((r) => r.viewerId !== session.viewerId)
        .filter((r) => event.type === 'due' || serverNow - r.createdAt < LATE_REPLY_WINDOW_MS)
        .map((reaction) => ({ reaction, late: event.type === 'history', shownAt: at }));
      if (fresh.length) setCards((all) => [...all, ...fresh].slice(-MAX_CARDS));
    });
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine, session.viewerId, crowd]);

  // One clock for the overlay: playhead display, card expiry, control fade.
  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setCards((all) => (all.some((c) => t - c.shownAt > CARD_LIFETIME_MS) ? all.filter((c) => t - c.shownAt <= CARD_LIFETIME_MS) : all));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const poke = useCallback(() => setControlsUntil(Date.now() + CONTROLS_LINGER_MS), []);

  // At full time, give the final position a moment to reach the server, then fetch the recap.
  const [recap, setRecap] = useState<Recap | null>(null);
  const [calls, setCalls] = useState<PredictionsDto | null>(null);
  useEffect(() => {
    if (media !== 'ended') return;
    engine.syncSoon();
    const timer = setTimeout(() => {
      api.recap(session.roomCode, session.token).then(setRecap, () => setRecap({ until: { period: 0, ms: 0 }, total: 0, buckets: [], moments: [] }));
      api.predictions(session.roomCode, session.token).then(setCalls, () => setCalls(null));
    }, 1_500);
    return () => clearTimeout(timer);
  }, [media, api, engine, session.roomCode, session.token]);

  /** Replays a moment from five seconds before it, so the build-up is on screen. */
  const replay = useCallback(
    (moment: RecapMoment) => {
      const player = controllerRef.current;
      const marker = program.markers.find((m) => m.period === moment.position.period);
      if (!player || !marker) return;
      setRecap(null);
      setCards([]);
      player.seekTo(marker.mediaMs + Math.max(0, moment.position.ms - 5_000));
      player.play();
      setMedia('ready');
      engine.syncSoon();
    },
    [program.markers, engine],
  );

  useRemote((key) => {
    const player = controllerRef.current;
    poke();
    // At full time the moments list owns the remote (via spatial navigation), except Back.
    if (media === 'ended' && key !== RemoteKey.Back) return;
    switch (key) {
      case RemoteKey.Back:
        onExit();
        return;
      case RemoteKey.Select:
      case RemoteKey.PlayPause:
        if (!player) return;
        if (player.isPlaying()) player.pause();
        else player.play();
        engine.syncSoon();
        return;
      case RemoteKey.Left:
      case RemoteKey.Rewind:
        player?.seekBy(-SEEK_MS);
        return;
      case RemoteKey.Right:
      case RemoteKey.FastForward:
        player?.seekBy(SEEK_MS);
        return;
      default:
        return;
    }
  }, media !== 'error');

  // Alexa or the system UI moved the player: show controls and sync straight away.
  const onExternalCommand = useCallback(() => {
    poke();
    engine.syncSoon();
  }, [poke, engine]);

  const onController = useCallback((controller: MediaController | null) => {
    controllerRef.current = controller;
  }, []);

  if (media === 'error') {
    return (
      <Screen>
        <Message
          title="This video won't play"
          detail="The stream couldn't be loaded on this TV. Your room and its reactions are safe; try again or pick another game."
        >
          <DefaultFocus>
            <TvButton label="Back to the room" onSelect={onExit} />
          </DefaultFocus>
        </Message>
      </Screen>
    );
  }

  const playhead = readPlayhead();
  const playing = playhead.playing;
  const controls = !playing || now < controlsUntil || media === 'ended';
  const friends = state.viewers.filter((v) => v.id !== session.viewerId && v.clockSource !== 'linked').length;
  const duration = controllerRef.current?.durationMs() ?? program.durationMs;
  const current = controllerRef.current?.currentTimeMs() ?? 0;
  const visibleCards = cards.filter((c) => c.late || compare(c.reaction.position, playhead.position) <= 0);

  return (
    <View style={styles.root}>
      <VideoSurface
        uri={program.mediaUrl}
        posterUri={program.posterUrl}
        kickoffMs={program.markers[0]?.mediaMs ?? 0}
        onController={onController}
        onStatus={setMedia}
        onExternalCommand={onExternalCommand}
      />

      <View style={[styles.top, media === 'ended' && { opacity: 0 }]} pointerEvents="none">
        <Scorebug
          position={playhead.position}
          sport={sport}
          friends={friends}
          heat={heat(recentRef.current, now)}
          status={statusLine(state.status, media)}
        />
      </View>

      <View style={[styles.cards, { bottom: controls ? 440 : 160 }]} pointerEvents="none">
        {visibleCards.map((card) => {
          const author = state.viewers.find((v) => v.id === card.reaction.viewerId);
          return (
            <ReactionCard
              key={card.reaction.id}
              reaction={card.reaction}
              name={author?.name ?? 'A friend'}
              accent={author?.color ?? color.chalk3}
              sport={sport}
              late={card.late}
            />
          );
        })}
      </View>

      {media === 'ended' && (
        <FullTime recap={recap} calls={calls} title={program.title} sport={sport} viewers={state.viewers} onReplay={replay} onLeave={onExit} />
      )}

      {controls && media !== 'ended' && (
        <View style={styles.bottom} pointerEvents="none">
          <View style={styles.bottomRow}>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: color.chalk }]}>{program.title}</Text>
              <Text style={[type.label, { color: color.chalk2, fontWeight: '400' }]}>
                {playing ? 'OK pauses · ◀ ▶ skip 10 s · Back leaves' : 'Paused · OK to play'}
              </Text>
              <View style={{ marginTop: space.md }}>
                <Presence
                  viewers={state.viewers}
                  selfId={session.viewerId}
                  position={playhead.position}
                  sport={sport}
                  serverNow={engine.serverNow()}
                  compact
                />
              </View>
            </View>
            {!playing && (
              <View style={styles.qr}>
                <QrCode value={`${webUrl}/r/${session.roomCode}?tv=${session.viewerId}`} size={200} />
                <Text style={[type.label, { color: color.chalk2, fontWeight: '400', marginTop: 10 }]}>
                  React from your phone
                </Text>
              </View>
            )}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${duration ? Math.min(100, (current / duration) * 100) : 0}%` }]} />
          </View>
        </View>
      )}
    </View>
  );
}

function statusLine(sync: SyncStatus, media: MediaStatus): string | null {
  if (media === 'loading') return 'Loading the match';
  if (media === 'buffering') return 'Buffering';
  if (sync === 'connecting') return 'Connecting to the room';
  if (sync === 'reconnecting') return 'Reconnecting';
  if (sync === 'offline') return 'Offline · reactions paused';
  if (sync === 'ended') return 'Room closed';
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: safe.y, left: safe.x },
  cards: {
    position: 'absolute',
    right: safe.x,
    gap: space.sm,
    alignItems: 'flex-end',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: safe.x,
    paddingBottom: safe.y,
    paddingTop: space.lg,
    backgroundColor: 'rgba(10,12,11,0.84)',
    borderTopWidth: 1,
    borderTopColor: color.line,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.lg },
  qr: { alignItems: 'center' },
  track: { height: 6, borderRadius: radius.sm, backgroundColor: 'rgba(242,240,232,0.18)', marginTop: space.lg, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.amber },
});
