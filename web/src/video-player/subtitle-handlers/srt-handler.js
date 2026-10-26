export class SrtHandler {
    videoPlayerSubtitles;
    constructor(videoPlayerSubtitles) {
        this.videoPlayerSubtitles = videoPlayerSubtitles;
    }
    remove() {
    }
    changeSubtitle(subtitle) {
        return Promise.resolve(false);
    }
    adjustMargin(offsetMultiplier) {
        return Promise.resolve(undefined);
    }
    canAdjustMargin() {
        return false;
    }
    clearSelectedSubtitle() {
    }
}
