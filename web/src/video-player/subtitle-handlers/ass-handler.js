import { subtitlesOptions } from '../video-player-subtitles.js';
export class AssHandler {
    videoPlayerSubtitles;
    currentOctopus;
    hasOctopusScript = false;
    defaultStyles = [];
    static MarginVerticalOffset = 100;
    constructor(videoPlayerSubtitles) {
        this.videoPlayerSubtitles = videoPlayerSubtitles;
    }
    get videoElement() {
        return this.videoPlayerSubtitles.videoElement;
    }
    remove() {
        this.currentOctopus?.freeTrack();
        if (this.currentOctopus?.video === this.videoElement) {
            document.addEventListener("fullscreenchange", this.currentOctopus.resizeWithTimeout, false);
            document.addEventListener("mozfullscreenchange", this.currentOctopus.resizeWithTimeout, false);
            document.addEventListener("webkitfullscreenchange", this.currentOctopus.resizeWithTimeout, false);
            document.addEventListener("msfullscreenchange", this.currentOctopus.resizeWithTimeout, false);
            window.removeEventListener("resize", this.currentOctopus.resizeWithTimeout, false);
            this.clearOctopusResizeObserver();
            const octopus = this.currentOctopus;
            // Pause event happens slightly later so we want to remove octopus video element after that to not throw due to self.video == null
            this.videoElement.addEventListener('pause', () => {
                if (this.videoElement === octopus.video) {
                    octopus.setVideo(null);
                }
            }, { once: true, capture: false });
        }
        this.currentOctopus = undefined;
    }
    async changeSubtitle(subtitle) {
        const isPlaying = !this.videoElement.paused;
        const loaded = await this.trySetSubtitlesOctopusInstance(isPlaying);
        if (!loaded || !this.currentOctopus) {
            return false;
        }
        if (subtitle.src) {
            this.currentOctopus.setTrackByUrl(subtitle.src);
        }
        else if (subtitle.content) {
            this.currentOctopus.setTrack(subtitle.content);
        }
        this.fetchDefaultStyle(() => {
            if (this.videoPlayerSubtitles.isMarginOffsetActive() && this.defaultStyles.length > 0) {
                void this.adjustMargin(1);
            }
        });
        return true;
    }
    clearSelectedSubtitle() {
        this.currentOctopus?.freeTrack();
        this.defaultStyles = [];
    }
    canAdjustMargin() {
        return this.defaultStyles.length > 0;
    }
    async adjustMargin(offsetMultiplier) {
        if (!this.currentOctopus) {
            return;
        }
        for (const style of this.defaultStyles) {
            const margin = style.MarginV + offsetMultiplier * AssHandler.MarginVerticalOffset;
            style.MarginV = margin;
            this.currentOctopus.setStyle({ MarginV: margin, Alignment: 2 }, style._index);
        }
    }
    fetchDefaultStyle(onFetched) {
        if (!this.currentOctopus) {
            return;
        }
        this.currentOctopus.getStyles((styles) => {
            console.log('octopus: All styles', styles);
            const defaultStyles = [];
            for (const style of styles) {
                if (style.Name === 'Default' || style.Name === 'Main') {
                    defaultStyles.push(style);
                }
            }
            this.defaultStyles = defaultStyles;
            onFetched?.();
        }, () => this.defaultStyles = []);
    }
    clearOctopusResizeObserver() {
        if (!this.currentOctopus) {
            return;
        }
        this.currentOctopus.ro?.disconnect();
        delete this.currentOctopus.ro;
    }
    async trySetSubtitlesOctopusInstance(isPlaying) {
        return new Promise((res, rej) => {
            if (this.currentOctopus) {
                this.trySetOctopusVideo();
                return res(true);
            }
            if (subtitlesOptions.octopusRootUrl === undefined || subtitlesOptions.octopusDefaultFontUrl === undefined) {
                console.error(`Need to set octopusRootUrl or octopusDefaultFontUrl on 'subtitlesOptions'`, subtitlesOptions);
                return res(false);
            }
            this.videoPlayerSubtitles.videoPlayer.video.pause();
            this.tryLoadOctopusScript().then(() => {
                if (!window.SubtitlesOctopus) {
                    return res(false);
                }
                if (window.__nuiOctopus) {
                    this.currentOctopus = window.__nuiOctopus;
                    this.trySetOctopusVideo();
                    return res(true);
                }
                else {
                    const options = {
                        video: this.videoElement,
                        workerUrl: subtitlesOptions.octopusRootUrl + 'subtitles-octopus-worker.js',
                        legacyWorkerUrl: subtitlesOptions.octopusRootUrl + 'subtitles-octopus-worker-legacy.js',
                        fallbackFont: subtitlesOptions.octopusDefaultFontUrl,
                        // Initialize with an empty subcontent, it'll get replaced if there is a pending subtitle to load right after.
                        subContent: `
            [Script Info]
            Title:
            ScriptType: v4.00+
            WrapStyle: 0
            PlayResX: 1
            PlayResY: 1
            `,
                        onReady: () => {
                            // We have a setTimeout to let web worker etc set itself up, if we change subtitle right away there is a higher chance that the very first line fails.
                            // It visible shows then flashes itself away.
                            // Magic number of 75, 50 still had the flash.
                            setTimeout(() => {
                                res(true);
                                if (isPlaying) {
                                    void this.videoPlayerSubtitles.videoPlayer.video.play();
                                }
                            }, 75);
                        }
                    };
                    this.currentOctopus = new window.SubtitlesOctopus(options);
                    window.__nuiOctopus = this.currentOctopus;
                }
            })
                .catch(rej);
        });
    }
    trySetOctopusVideo() {
        if (this.currentOctopus.video !== this.videoElement) {
            this.clearOctopusResizeObserver();
            this.currentOctopus.setVideo(this.videoElement);
        }
    }
    /**
     * Create promise if it's not loaded, else re-use existing promise.
     * Subtitle Octopus is a JavaScript wrapper around {@link https://github.com/libass/libass|libass} to handle .ass and .srt files, uses wasm.
     */
    tryLoadOctopusScript() {
        if (this.hasOctopusScript || window.__nuiOctopusPromise || window.SubtitlesOctopus) {
            this.hasOctopusScript = true;
            return window.__nuiOctopusPromise || Promise.resolve();
        }
        let script = document.getElementById('subtitles-octopus');
        this.hasOctopusScript = true;
        const rootUrl = subtitlesOptions.octopusRootUrl.endsWith('/') ? subtitlesOptions.octopusRootUrl : subtitlesOptions.octopusRootUrl + '/';
        const promise = new Promise((resolve, reject) => {
            // Not sure if this can be true if __nuiOctopus is false && SubtitlesOctopus is false.
            if (!script) {
                script = document.createElement('script');
                script.id = 'subtitles-octopus';
                script.type = 'text/javascript';
                script.async = true;
                script.src = `${rootUrl}subtitles-octopus.js`;
                document.head.appendChild(script);
            }
            // Just some extra precaution in case of race conditions or something odd.
            const before = window.SubtitlesOctopusOnLoad;
            window.SubtitlesOctopusOnLoad = before ? () => {
                before();
                resolve();
            } : () => resolve();
            script.addEventListener('error', () => reject('Failed to load subtitle octopus script.'));
        });
        promise.then(() => delete window.__nuiOctopusPromise);
        return promise;
    }
}
