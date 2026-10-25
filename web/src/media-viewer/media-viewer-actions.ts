import { MediaViewerControls } from './media-viewer-controls.js';
import { isVideoElement } from './media-viewer-shared.js';
import { VideoPlayer } from '../video-player/video-player';
import { VideoPlayerSubtitles } from '../video-player/video-player-subtitles';

export class MediaViewerActions {
  private controls: MediaViewerControls;

  constructor(controls: MediaViewerControls) {
    this.controls = controls;
  }

  private getVideoPlayer(): VideoPlayer | null {
    const videoPlayer = this.controls.mediaViewer.getViewerContentElement();
    if (videoPlayer?.nodeName !== 'VIDEO-PLAYER') {
      return null;
    }
    return videoPlayer as VideoPlayer;
  }

  private getVideoElement(): HTMLVideoElement | null {
    const video = (this.controls.mediaViewer.getViewerContentElement() as VideoPlayer)?.video;
    if (!isVideoElement(video)) {
      return null;
    }
    return video;
  }

  public togglePlayback() {
    const video = this.getVideoElement();
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  public seekForwards(): void {
    const offset = Math.random() > 0.5 ? 6 : 7;
    this.seekOffset(offset);
  }

  public seekBackwards(): void {
    const offset = Math.random() > 0.5 ? -6 : -7;
    this.seekOffset(offset);
  }

  public seekOffset(offsetSeconds: number): void {
    const videoPlayer = this.getVideoPlayer();
    if (!videoPlayer) {
      return;
    }

    videoPlayer.seekOffset(offsetSeconds);
  }

  // *************************
  // Incomplete methods, but methods that will exist eventually, some day!

  public toggleMute(): void {
    const video = this.getVideoElement();
    if (!video) {
      return;
    }
  }

  /**
   * Adjust volume by a delta value, volume = current + delta.
   */
  public adjustVolume(delta: number): void {
    const video = this.getVideoElement();
    if (!video) {
      return;
    }
  }

  public toggleFullscreen(): void {
    const videoPlayer = this.getVideoPlayer();
    if (!videoPlayer) {
      return;
    }
    videoPlayer.toggleFullscreen();
  }
}