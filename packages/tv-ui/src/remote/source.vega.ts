import { RemoteEmitter, RemoteKey, type RemoteSource } from './keys';

/** Maps Vega HWEvent types (TVEventHandler) to remote keys. */
const EVENTS: Record<string, RemoteKey> = {
  up: RemoteKey.Up,
  down: RemoteKey.Down,
  left: RemoteKey.Left,
  right: RemoteKey.Right,
  select: RemoteKey.Select,
  back: RemoteKey.Back,
  playpause: RemoteKey.PlayPause,
  skip_backward: RemoteKey.Rewind,
  rewind: RemoteKey.Rewind,
  skip_forward: RemoteKey.FastForward,
  fastforward: RemoteKey.FastForward,
};

interface HWEvent {
  eventType: string;
  eventKeyAction?: number;
}

function createSource(): RemoteSource {
  const emitter = new RemoteEmitter();
  // TVEventHandler exists on Vega's React Native but not in react-native's public types.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TVEventHandler } = require('react-native') as {
    TVEventHandler: new () => { enable(owner: unknown, cb: (c: unknown, e: HWEvent) => void): void };
  };
  const handler = new TVEventHandler();
  handler.enable(null, (_component, event) => {
    // Key-down only (0); some events omit the action.
    if (event.eventKeyAction !== 0 && event.eventKeyAction !== undefined) return;
    const key = EVENTS[event.eventType];
    if (key) emitter.emit(key);
  });
  return emitter;
}

export const remoteSource: RemoteSource = createSource();
