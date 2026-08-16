import { MediaViewerControls } from './media-viewer-controls.js';
import { isVideoElement } from './video-utils.js';

export class MediaViewerActions {
  private controls: MediaViewerControls;

  constructor(controls: MediaViewerControls) {
    this.controls = controls;
  }

  private getVideoElement(): HTMLVideoElement | null {
    const video = this.controls.mediaViewer.getViewerContentElement();
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
    const video = this.getVideoElement();
    if (!video) {
      return;
    }

    const time = Math.min(Math.max(video.currentTime + offsetSeconds, 0), video.duration);
    if (video.fastSeek) {
      video.fastSeek(time);
    } else {
      video.currentTime = time;
    }
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
    const video = this.getVideoElement();
    if (!video) {
      return;
    }
  }
}