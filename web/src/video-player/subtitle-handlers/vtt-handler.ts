import type { Subtitle } from '../video-player.models';
import type { VideoPlayerSubtitles } from '../video-player-subtitles';
import type { SubtitleHandler } from './subtitle-handler';

export class VttSubtitleHandler implements SubtitleHandler {

  private readonly videoPlayerSubtitles: VideoPlayerSubtitles

  constructor(videoPlayerSubtitles: VideoPlayerSubtitles) {
    this.videoPlayerSubtitles = videoPlayerSubtitles;
  }

  remove(): void {
  }

  changeSubtitle(subtitle: Subtitle): Promise<boolean> {
    return Promise.resolve(false);
  }

  adjustMargin(offsetMultiplier: number): Promise<void> {
    return Promise.resolve(undefined);
  }

  canAdjustMargin(): boolean {
    return false;
  }

  clearSelectedSubtitle(): void {
  }
}