import { RemoteEmitter, RemoteKey, type RemoteSource } from './keys';

const KEYS: Record<string, RemoteKey> = {
  ArrowUp: RemoteKey.Up,
  ArrowDown: RemoteKey.Down,
  ArrowLeft: RemoteKey.Left,
  ArrowRight: RemoteKey.Right,
  Enter: RemoteKey.Select,
  Escape: RemoteKey.Back,
  Backspace: RemoteKey.Back,
  ' ': RemoteKey.PlayPause,
  MediaPlayPause: RemoteKey.PlayPause,
  ',': RemoteKey.Rewind,
  '.': RemoteKey.FastForward,
};

/** Keyboard stands in for the remote in the browser build. */
function createSource(): RemoteSource {
  const emitter = new RemoteEmitter();
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (event) => {
      const key = KEYS[event.key];
      if (!key) return;
      // Typing into a field shouldn't steer focus.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName) && key !== RemoteKey.Back) return;
      event.preventDefault();
      emitter.emit(key);
    });
  }
  return emitter;
}

export const remoteSource: RemoteSource = createSource();
