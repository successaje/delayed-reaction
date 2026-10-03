export enum RemoteKey {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
  Select = 'select',
  Back = 'back',
  PlayPause = 'playpause',
  Rewind = 'rewind',
  FastForward = 'fastforward',
}

export type RemoteListener = (key: RemoteKey) => void;

/** One source of remote/keyboard presses per platform. */
export interface RemoteSource {
  subscribe(listener: RemoteListener): () => void;
}

/** A tiny emitter both platform sources share. */
export class RemoteEmitter {
  private readonly listeners = new Set<RemoteListener>();

  emit(key: RemoteKey): void {
    for (const listener of [...this.listeners]) listener(key);
  }

  subscribe(listener: RemoteListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get size(): number {
    return this.listeners.size;
  }
}
