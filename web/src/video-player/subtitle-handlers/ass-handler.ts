import type { SubtitleHandler } from './subtitle-handler';
import type { Subtitle } from '../video-player.models';
import type { SubtitleOctopusOptions, SubtitlesOctopus, SubtitleStyle } from '../subtitles-octopus/subtitles-octopus';
import type { VideoPlayerSubtitles } from '../video-player-subtitles';

import { subtitlesOptions } from '../video-player-subtitles.js';

export interface OctopusSubtitlesOptions {
  // url to root where all the files are eg: './subtitles-octopus/'
  // must be set or it can't use subtitles octopus library.
  octopusRootUrl: string | undefined;
  // url to default font or it can't play any subtitles. Like, './subtitles-octopus/default.woff2'
  // must be set or it can't use subtitles octopus library.
  octopusDefaultFontUrl: string | undefined;
}

export class AssHandler implements SubtitleHandler {
  private readonly videoPlayerSubtitles: VideoPlayerSubtitles;
  public currentOctopus: SubtitlesOctopus | undefined;

  private hasOctopusScript = false;

  private defaultStyles: SubtitleStyle[] = [];
  private static MarginVerticalOffset = 100;

  constructor(videoPlayerSubtitles: VideoPlayerSubtitles) {
    this.videoPlayerSubtitles = videoPlayerSubtitles;
  }

  public get videoElement() {
    return this.videoPlayerSubtitles.videoElement;
  }

  remove(): void {
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
          octopus.setVideo(null)
        }
      }, { once: true, capture: false });
    }
    this.currentOctopus = undefined;
  }

  async changeSubtitle(subtitle: Subtitle): Promise<boolean> {
    const isPlaying = !this.videoElement.paused;
    const loaded = await this.trySetSubtitlesOctopusInstance(isPlaying);
    if (!loaded || !this.currentOctopus) {
      return false;
    }

    if (subtitle.src) {
      this.currentOctopus.setTrackByUrl(subtitle.src);
    } else if (subtitle.content) {
      this.currentOctopus.setTrack(subtitle.content);
    }

    this.fetchDefaultStyle(() => {
      if (this.videoPlayerSubtitles.isMarginOffsetActive() && this.defaultStyles.length > 0) {
        void this.adjustMargin(1);
      }
    });
    return true;
  }

  public clearSelectedSubtitle() {
    this.currentOctopus?.freeTrack();
    this.defaultStyles = [];
  }

  public canAdjustMargin(): boolean {
    return this.defaultStyles.length > 0;
  }

  async adjustMargin(offsetMultiplier: number): Promise<void> {
    if (!this.currentOctopus) {
      return;
    }

    for (const style of this.defaultStyles) {
      const margin = style.MarginV + offsetMultiplier * AssHandler.MarginVerticalOffset;
      style.MarginV = margin;

      this.currentOctopus.setStyle({ MarginV: margin, Alignment: 2 }, style._index);
    }
  }

  private fetchDefaultStyle(onFetched?: () => void): void {
    if (!this.currentOctopus) {
      return;
    }

    this.currentOctopus.getStyles((styles) => {
      console.log('octopus: All styles', styles);

      const defaultStyles: SubtitleStyle[] = [];
      for (const style of styles) {
        if (style.Name === 'Default' || style.Name === 'Main') {
          defaultStyles.push(style);
        }
      }

      this.defaultStyles = defaultStyles;
      onFetched?.();
    }, () => this.defaultStyles = []);
  }

  private clearOctopusResizeObserver(): void {
    if (!this.currentOctopus) {
      return;
    }

    this.currentOctopus.ro?.disconnect();
    delete this.currentOctopus.ro;
  }

  async trySetSubtitlesOctopusInstance(isPlaying: boolean): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
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
        } else {
          const options: SubtitleOctopusOptions = {
            video: this.videoElement,
            workerUrl: subtitlesOptions.octopusRootUrl! + 'subtitles-octopus-worker.js',
            legacyWorkerUrl: subtitlesOptions.octopusRootUrl! + 'subtitles-octopus-worker-legacy.js',
            fallbackFont: subtitlesOptions.octopusDefaultFontUrl!,
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

  private trySetOctopusVideo(): void {
    if (this.currentOctopus!.video !== this.videoElement) {
      this.clearOctopusResizeObserver();
      this.currentOctopus!.setVideo(this.videoElement);
    }
  }

  /**
   * Create promise if it's not loaded, else re-use existing promise.
   * Subtitle Octopus is a JavaScript wrapper around {@link https://github.com/libass/libass|libass} to handle .ass and .srt files, uses wasm.
   */
  tryLoadOctopusScript(): Promise<void> {
    if (this.hasOctopusScript || window.__nuiOctopusPromise || window.SubtitlesOctopus) {
      this.hasOctopusScript = true;
      return window.__nuiOctopusPromise || Promise.resolve();
    }

    let script = document.getElementById('subtitles-octopus') as HTMLScriptElement | null;
    this.hasOctopusScript = true;

    const rootUrl = subtitlesOptions.octopusRootUrl!.endsWith('/') ? subtitlesOptions.octopusRootUrl : subtitlesOptions.octopusRootUrl + '/';

    const promise = new Promise<void>((resolve, reject) => {
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