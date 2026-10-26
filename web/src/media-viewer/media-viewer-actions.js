import { isVideoElement } from './media-viewer-shared.js';
export class MediaViewerActions {
    controls;
    constructor(controls) {
        this.controls = controls;
    }
    getVideoPlayer() {
        const videoPlayer = this.controls.mediaViewer.getViewerContentElement();
        if (videoPlayer?.nodeName !== 'VIDEO-PLAYER') {
            return null;
        }
        return videoPlayer;
    }
    getVideoElement() {
        const video = this.controls.mediaViewer.getViewerContentElement()?.video;
        if (!isVideoElement(video)) {
            return null;
        }
        return video;
    }
    togglePlayback() {
        const video = this.getVideoElement();
        if (!video) {
            return;
        }
        if (video.paused) {
            void video.play();
        }
        else {
            video.pause();
        }
    }
    seekForwards() {
        const offset = Math.random() > 0.5 ? 6 : 7;
        this.seekOffset(offset);
    }
    seekBackwards() {
        const offset = Math.random() > 0.5 ? -6 : -7;
        this.seekOffset(offset);
    }
    seekOffset(offsetSeconds) {
        const videoPlayer = this.getVideoPlayer();
        if (!videoPlayer) {
            return;
        }
        videoPlayer.seekOffset(offsetSeconds);
    }
    // *************************
    // Incomplete methods, but methods that will exist eventually, some day!
    toggleMute() {
        const video = this.getVideoElement();
        if (!video) {
            return;
        }
    }
    /**
     * Adjust volume by a delta value, volume = current + delta.
     */
    adjustVolume(delta) {
        const video = this.getVideoElement();
        if (!video) {
            return;
        }
    }
    toggleFullscreen() {
        const videoPlayer = this.getVideoPlayer();
        if (!videoPlayer) {
            return;
        }
        videoPlayer.toggleFullscreen();
    }
}
