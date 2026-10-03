import type { IMediaSessionId } from '@amazon-devices/kepler-media-controls';
import { KeplerMediaControlHandler, type VideoPlayer } from '@amazon-devices/react-native-w3cmedia';

/**
 * Vega Media Controls: transport commands from the remote's media keys, the Fire TV system UI
 * and Alexa ("Alexa, pause", "Alexa, rewind 30 seconds") act on the same W3C player the match
 * clock reads from, so reactions stay in step whoever pressed the button.
 *
 * Default handling covers play, pause and seek. "Start over" means the match, not the file:
 * it returns to kick-off, which may not be at 0:00 in the media.
 */
export class MatchMediaControls extends KeplerMediaControlHandler {
  constructor(
    private readonly player: VideoPlayer,
    private readonly kickoffMs: number,
    private readonly onCommand: () => void,
  ) {
    super();
  }

  override async handlePlay(id?: IMediaSessionId) {
    await super.handlePlay(id);
    this.onCommand();
  }

  override async handlePause(id?: IMediaSessionId) {
    await super.handlePause(id);
    this.onCommand();
  }

  override async handleTogglePlayPause(id?: IMediaSessionId) {
    await super.handleTogglePlayPause(id);
    this.onCommand();
  }

  override async handleStartOver(_id?: IMediaSessionId) {
    this.player.currentTime = this.kickoffMs / 1000;
    this.player.play();
    this.onCommand();
  }
}
