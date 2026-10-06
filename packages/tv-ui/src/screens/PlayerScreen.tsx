import { playerPlayhead, TimelineSync, type SavedSession, type SyncStatus } from '@delayed-reaction/client';
import { useTimelineState } from '@delayed-reaction/client/react';
import { compare, detectCrowd, getSport, heat, QUICK_REACTIONS, type Shown, type PredictionsDto, type ProgramDto, type ReactionDto, type Recap, type RecapMoment } from '@delayed-reaction/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus } from 'react-tv-space-navigation';
import { TvButton } from '../components/Focusable';
import { FullTime } from '../components/FullTime';
import { Presence } from '../components/Presence';
import { QrCode } from '../components/QrCode';
import { ReactionCard } from '../components/ReactionCard';
import { ReactionTray, TRAY_HEIGHT } from '../components/ReactionTray';
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
/** The reaction tray closes itself after this long without a press. */
const TRAY_IDLE_MS = 6_000;
/** Presses closer together than this are a bounce, not a second reaction. */
const SEND_GAP_MS = 600;
/** A reaction behind the playhead posted this recently is a reply from someone watching later. */
const LATE_REPLY_WINDOW_MS = 30_000;

interface Card {
  readonly reaction: ReactionDto;
  readonly late: boolean;
  readonly shownAt: number;
  /** Sent from this TV with the remote. */
  readonly own?: boolean;
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
    // Reactions landing now (friends' or this TV's own) feed the crowd sound.
    const hear = (reactions: readonly ReactionDto[], at: number) => {
      recentRef.current = [
        ...recentRef.current.filter((s) => at - s.at < 15_000),
        ...reactions.map((reaction) => ({ reaction, at })),
      ];
      const moment = detectCrowd(recentRef.current, at, lastCrowdRef.current);
      if (moment) {
        lastCrowdRef.current = at;
        crowd.play(moment.mood, moment.intensity);
      }
    };
    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'status') console.warn(`[DelayedReaction] sync ${event.status}`);
      if (event.type === 'own' && event.state === 'sending') {
        const at = Date.now();
        hear([event.reaction], at);
        setCards((all) => [...all, { reaction: event.reaction, late: false, shownAt: at, own: true }].slice(-MAX_CARDS));
        return;
      }
      if (event.type !== 'due' && event.type !== 'history') return;
      const at = Date.now();
      if (event.type === 'due') hear(event.reactions, at);
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

  // The reaction tray: Up opens it, ◀ ▶ pick, OK sends. It remembers the last word used.
  const [tray, setTray] = useState<{ selected: number; until: number } | null>(null);
  const lastPickRef = useRef(0);
  const lastSendRef = useRef(0);
  const [failedAt, setFailedAt] = useState(-Infinity);
  const trayOpen = tray !== null && now < tray.until && media !== 'ended';

  const send = useCallback(
    (index: number) => {
      const at = Date.now();
      if (at - lastSendRef.current < SEND_GAP_MS) return;
      lastSendRef.current = at;
      lastPickRef.current = index;
      const reaction = QUICK_REACTIONS[index];
      if (!reaction) return;
      // The engine retries on its own; only a final failure is worth a word on screen.
      engine.react({ kind: 'quick', value: reaction.id }).catch(() => setFailedAt(Date.now()));
    },
    [engine],
  );

  useRemote((key) => {
    const player = controllerRef.current;
    poke();
    // At full time the moments list owns the remote (via spatial navigation), except Back.
    if (media === 'ended' && key !== RemoteKey.Back) return;
    if (trayOpen) {
      const count = QUICK_REACTIONS.length;
      const until = Date.now() + TRAY_IDLE_MS;
      switch (key) {
        case RemoteKey.Left:
          setTray({ selected: (tray.selected - 1 + count) % count, until });
          return;
        case RemoteKey.Right:
          setTray({ selected: (tray.selected + 1) % count, until });
          return;
        case RemoteKey.Select:
          send(tray.selected);
          setTray(null);
          return;
        case RemoteKey.Up:
          setTray({ ...tray, until });
          return;
        case RemoteKey.Down:
        case RemoteKey.Back:
          setTray(null);
          return;
        default:
          break; // Play/pause and skip keys still drive the match.
      }
    }
    switch (key) {
      case RemoteKey.Up:
        setTray({ selected: lastPickRef.current, until: Date.now() + TRAY_IDLE_MS });
        return;
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
  const controls = !trayOpen && (!playing || now < controlsUntil || media === 'ended');
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
          status={now - failedAt < 4_000 ? "Your reaction didn't send" : statusLine(state.status, media)}
        />
      </View>

      <View style={[styles.cards, { bottom: controls ? 440 : trayOpen ? TRAY_HEIGHT + space.md : 160 }]} pointerEvents="none">
        {visibleCards.map((card) => {
          const author = state.viewers.find((v) => v.id === card.reaction.viewerId);
          return (
            <ReactionCard
              key={card.reaction.id}
              reaction={card.reaction}
              name={card.own ? 'You' : (author?.name ?? 'A friend')}
              accent={card.own ? color.amber : (author?.color ?? color.chalk3)}
              sport={sport}
              late={card.late}
            />
          );
        })}
      </View>

      {trayOpen && <ReactionTray selected={tray.selected} />}

      {media === 'ended' && (
        <FullTime recap={recap} calls={calls} title={program.title} sport={sport} viewers={state.viewers} onReplay={replay} onLeave={onExit} />
      )}

      {controls && media !== 'ended' && (
        <View style={styles.bottom} pointerEvents="none">
          <View style={styles.bottomRow}>
            <View style={{ flex: 1 }}>
              <Text style={[type.heading, { color: color.chalk }]}>{program.title}</Text>
              <Text style={[type.label, { color: color.chalk2, fontWeight: '400' }]}>
                {playing ? '▲ react · OK pauses · ◀ ▶ skip 10 s · Back leaves' : 'Paused · OK to play · ▲ react'}
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
                  Or react from your phone
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
