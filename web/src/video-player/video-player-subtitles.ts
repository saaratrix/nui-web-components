import type { VideoPlayer } from './video-player';
import { Subtitle, SubtitleType } from './video-player.models.js';
import type { SubtitlesOctopus, SubtitleOctopusOptions } from './subtitles-octopus/subtitles-octopus';

interface SubtitlesOptions {
  // url to root where all the files are eg: './subtitles-octopus/'
  // must be set or it can't use subtitles octopus library.
  octopusRootUrl: string | undefined;
  // url to default font or it can't play any subtitles. Like, './subtitles-octopus/default.woff2'
  // must be set or it can't use subtitles octopus library.
  octopusDefaultFontUrl: string | undefined;
}

export const subtitlesOptions: SubtitlesOptions = {
  octopusRootUrl: undefined,
  octopusDefaultFontUrl: undefined,
};

export class VideoPlayerSubtitles extends HTMLElement {
  public static csvDelimiter = '|';

  observedAttributes = [];

  shadow: ShadowRoot;

  private hasOctopusScript = false;
  public selectedSubtitle: Subtitle | undefined;
  public subtitles: Subtitle[] = [];

  public parsedSubtitles: Subtitle[] = [];
  public addedSubtitles: Subtitle[] = [];

  public currentOctopus: SubtitlesOctopus | undefined;

  // This is set by the parent when creating the element.
  public videoPlayer!: VideoPlayer;

  // Vertical offset for the subtitle
  private marginVertical: number | undefined;
  private timeOffset: number | undefined;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
      </style>
      <div class="video-player-subtitles">
      </div>
      <div class="popover"></div>
    `;
  }

  connectedCallback() {
    console.log('parent is video player?', this.parentElement);
    if (window.__nuiOctopus) {
      if (this.selectedSubtitle) {
        void this.changeSubtitle(this.selectedSubtitle);
      } else {
        void this.trySetSubtitlesOctopusInstance();
      }

    }
  }

  disconnectedCallback() {
    console.log('element removed');
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

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }
  }
  
  get videoElement(): HTMLVideoElement {
    return this.videoPlayer.video;
  }

  getParsedSubtitlesAsCSV(delimiter: string = VideoPlayerSubtitles.csvDelimiter): string {
    const parts = this.parsedSubtitles.map(p => p.src + delimiter + p.label + delimiter + p.srclang);
    return parts.join(delimiter);
  }

  setParsedSubtitlesFromCSV(subtitlesCsv: string | null, delimiter: string = VideoPlayerSubtitles.csvDelimiter): void {
    subtitlesCsv ??= '';

    const items = subtitlesCsv.split(delimiter);
    const subtitles: Subtitle[] = [];
    for (let i = 0; i < items.length; i += 3) {
      let src = items[i];
      const label = items[i + 1];
      const srclang = items[i + 2];

      if (!src || !label || !srclang) {
        continue;
      }

      src = src.trim();
      const type = src.endsWith('.ass') ? SubtitleType.Ass : SubtitleType.Vtt;

      subtitles.push({
        src,
        label: label.trim(),
        type,
        srclang: srclang.trim(),
      });
    }

    this.parsedSubtitles = subtitles;
    this.subtitles = [...this.parsedSubtitles, ...this.addedSubtitles];

    this.updateSelectedSubtitleReference();
  }

  private updateSelectedSubtitleReference(): void {
    // Just an alias to shorten the later check
    const selected = this.selectedSubtitle;
    // If no subtitle or it's in added subtitles then return early
    if (!selected || this.addedSubtitles.indexOf(selected) >= 0) {
      return;
    }

    let index = this.parsedSubtitles.findIndex(s => s.src === selected.src && s.label === selected.label && s.srclang === selected.srclang);
    // If index exists then we change the list reference because it might have content set.
    if (index >= 0) {
      this.subtitles[index] = selected;
    } else {
      this.clearSelectedSubtitle();
    }
  }

  public async changeSubtitle(subtitle: Subtitle | undefined): Promise<void> {
    if (!subtitle) {
      this.clearSelectedSubtitle();
      return;
    }

    if ((!subtitle.src && !subtitle.content)) {
      console.log('changeSubtitle(): Selected subtitle had no src or content', subtitle);
      this.clearSelectedSubtitle();
      return;
    }

    this.selectedSubtitle = subtitle;
    const loaded = await this.trySetSubtitlesOctopusInstance();
    if (!loaded || !this.currentOctopus) {
      this.clearSelectedSubtitle();
      return;
    }

    if (subtitle.src) {
      this.currentOctopus.setTrackByUrl(subtitle.src);
    } else if (subtitle.content) {
      this.currentOctopus.setTrack(subtitle.content);
    }
  }

  private clearSelectedSubtitle(): void {
    this.selectedSubtitle = undefined;
    this.currentOctopus?.freeTrack();
  }

  private clearOctopusResizeObserver(): void {
    if (!this.currentOctopus) {
      return;
    }

    this.currentOctopus.ro?.disconnect();
    delete this.currentOctopus.ro;
  }

  async trySetSubtitlesOctopusInstance(): Promise<boolean> {
    if (subtitlesOptions.octopusRootUrl === undefined || subtitlesOptions.octopusDefaultFontUrl === undefined) {
      console.error(`Need to set octopusRootUrl or octopusDefaultFontUrl on 'subtitlesOptions'`, subtitlesOptions);
      return false;
    }

    await this.tryLoadOctopusScript();
    if (!window.SubtitlesOctopus || this.currentOctopus) {
      return false;
    }

    if (window.__nuiOctopus) {
      this.currentOctopus = window.__nuiOctopus;
      if (this.currentOctopus.video !== this.videoElement) {
        this.clearOctopusResizeObserver();
        this.currentOctopus.setVideo(this.videoElement);
      }
    } else {
      const options: SubtitleOctopusOptions = {
        video: this.videoElement,
        workerUrl: subtitlesOptions.octopusRootUrl + 'subtitles-octopus-worker.js',
        legacyWorkerUrl: subtitlesOptions.octopusRootUrl + 'subtitles-octopus-worker-legacy.js',
        fallbackFont: subtitlesOptions.octopusDefaultFontUrl,
      };

      this.selectedSubtitle?.src !== undefined && (options.subUrl = this.selectedSubtitle.src);
      this.selectedSubtitle?.content !== undefined && (options.subContent = this.selectedSubtitle.content);

      this.currentOctopus = new window.SubtitlesOctopus(options);
      window.__nuiOctopus = this.currentOctopus;
    }

    return true;
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

customElements.define('video-player-subtitles', VideoPlayerSubtitles);