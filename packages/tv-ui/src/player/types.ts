/** The slice of a media player Delayed Reaction needs: a clock and transport controls. */
export interface MediaController {
  currentTimeMs(): number;
  durationMs(): number;
  isPlaying(): boolean;
  play(): void;
  pause(): void;
  seekBy(deltaMs: number): void;
}

export type MediaStatus = 'loading' | 'ready' | 'buffering' | 'ended' | 'error';

export interface VideoSurfaceProps {
  uri: string;
  posterUri: string | null;
  onController(controller: MediaController | null): void;
  onStatus(status: MediaStatus): void;
}
