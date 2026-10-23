import type { VideoPlayer } from './video-player';
import { Subtitle, SubtitleType } from './video-player.models.js';
import { SubtitlesOctopus, SubtitleOctopusOptions, SubtitleStyle } from './subtitles-octopus/subtitles-octopus';
import { subtitleIcon } from './video-player-icons.js';
import { controlsIconCSS } from './video-player-shared.js';
import type { Popover } from '../popover/popover.js';
import '../popover/popover.js';

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

const marginLocalhostKey = 'meow-margin';

export class VideoPlayerSubtitles extends HTMLElement {
  public static csvDelimiter = '|';

  static observedAttributes = [];

  shadow: ShadowRoot;

  private hasOctopusScript = false;
  private _selectedSubtitle: Subtitle | undefined;
  public subtitles: Subtitle[] = [];

  public configPopover: Popover;

  public parsedSubtitles: Subtitle[] = [];
  public addedSubtitles: Subtitle[] = [];

  private languageRadioElements: Map<Subtitle | undefined, HTMLInputElement> = new Map();

  private marginToggleButton!: HTMLButtonElement;

  public currentOctopus: SubtitlesOctopus | undefined;

  // This is set by the parent when creating the element.
  public videoPlayer!: VideoPlayer;

  private defaultStyles: SubtitleStyle[] = [];
  private static MarginVerticalOffset = 100;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        ${controlsIconCSS}
      </style>
      <style id="popover">
        .config-popover {
            max-width: min(80vw, 200px);
        }
      
        .subtitles-config {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        h3 {
            margin: 0;
        }
        
        hr {
            width: 100%;
        }
        
        .margin-button {
            height: 2.5rem;
            font-size: 1.25em;
        }
        .margin-button[data-active] {
            background-color: #badbad;            
        }
        
        .group {
            display: flex;
            gap: 0.25rem;
        }
        
        .languages {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .languages label {
            display: flex;
            cursor: pointer;
        }
        
        .languages label:hover {
            opacity: 0.95;
        }
        
        .languages input[type="radio"] {
            display: none;
        }
        
        .checkmark {
            visibility: hidden;
        }
        
        .checkmark:has(+ input[name="language"]:checked) {
            visibility: visible;
        }
      </style>
      <div class="video-player-subtitles">
        <i class="icon icon-subtitles">${subtitleIcon}</i>
      </div>
      <nui-popover class="config-popover" trigger="click">
        <div class="subtitles-config" slot="content">
            <div class="header">
                <h3>Subtitles</h3>
                <hr>
            </div>
            <div class="group">
                <button class="margin-button">Meow!</button>
            </div>
            <hr>
            <fieldset class="languages-container">
              <legend>Languages</legend>
              <div class="languages"></div>
            </fieldset>            
        </div>
      </nui-popover>
    `;

    this.configPopover = this.shadow.querySelector('nui-popover') as Popover;
    this.configPopover.setAnchor(this.shadow.querySelector('.video-player-subtitles') as HTMLElement);

    this.initMarginButton();

    this.addEventListener('subtitleChanged', (event) => {
      for (const [subtitle, element] of this.languageRadioElements.entries()) {
        element.checked = (event as CustomEvent<Subtitle | undefined>).detail == subtitle;
      }
    });
  }

  private initMarginButton() {
    const isInitiallyActive = this.isMarginOffsetActive();
    // Meow button, to adjust if cat is in front of the telly.
    this.marginToggleButton = this.shadow.querySelector('.margin-button') as HTMLButtonElement;
    if (isInitiallyActive) {
      this.marginToggleButton.dataset['active'] = 'true';
    }

    this.marginToggleButton.addEventListener('click', () => {
      if (!this.defaultStyles) {
        return;
      }

      const isCurrentlyActive = this.isMarginOffsetActive();
      if (isCurrentlyActive) {
        delete this.marginToggleButton.dataset['active'];
        void this.adjustMargin(-VideoPlayerSubtitles.MarginVerticalOffset);
      } else {
        this.marginToggleButton.dataset['active'] = 'true';
        void this.adjustMargin(VideoPlayerSubtitles.MarginVerticalOffset);
      }

      try {
        // Since we flipped currently active, set the opposite to local storage.
        localStorage.setItem(marginLocalhostKey, isCurrentlyActive ? '0' : 'true');
      } catch { }
    });
  }

  connectedCallback() {
    if (window.__nuiOctopus) {
      if (this.selectedSubtitle) {
        void this.changeSubtitle(this.selectedSubtitle);
      } else {
        const isPlaying = !this.videoPlayer.video.paused;
        void this.trySetSubtitlesOctopusInstance(isPlaying);
      }
    }

    this.renderSubtitlesList();
  }

  disconnectedCallback() {
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

  public get selectedSubtitle(): Subtitle | undefined {
    return this._selectedSubtitle;
  }
  public set selectedSubtitle(value: Subtitle | undefined) {
    if (this._selectedSubtitle === value) {
      return;
    }
    this._selectedSubtitle = value;
    this.dispatchEvent(new CustomEvent('subtitleChanged', {
      detail: value
    }));
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
    this.renderSubtitlesList();
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

  renderSubtitlesList(): void {
    if (!this.isConnected) {
      return;
    }

    const languagesElement = this.shadow.querySelector('.subtitles-config .languages') as HTMLElement;
    this.languageRadioElements.clear();
    const fragment = document.createDocumentFragment();
    for (let i = -1; i < this.subtitles.length; i++) {
      fragment.appendChild(this.renderSubtitleListItem(i, this.subtitles[i]));
    }

    // replaceChildren is chrome 86+
    //languagesElement.replaceChildren(fragment);
    languagesElement.innerHTML = '';
    languagesElement.appendChild(fragment);
  }

  private renderSubtitleListItem(index: number, subtitle: Subtitle | undefined): HTMLElement {
    const label = document.createElement('label');

    const text = subtitle?.label ?? 'Off';

    const checked = this.selectedSubtitle == subtitle;

    label.innerHTML = `
      <span class="checkmark">✓</span>
      ${text}
      <input name="language" type="radio" value="${index}">`;

    const radioButton = label.querySelector('input[type="radio"]') as HTMLInputElement;
    radioButton.checked = checked;
    radioButton.addEventListener('change', () => {
      if (radioButton.checked) {
        void this.changeSubtitle(subtitle);
      }
    });

    this.languageRadioElements.set(subtitle, radioButton);
    return label;
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

    const isPlaying = !this.videoPlayer.video.paused;

    this.selectedSubtitle = subtitle;
    const loaded = await this.trySetSubtitlesOctopusInstance(isPlaying);
    if (!loaded || !this.currentOctopus) {
      this.clearSelectedSubtitle();
      return;
    }

    if (subtitle.src) {
      this.currentOctopus.setTrackByUrl(subtitle.src);
    } else if (subtitle.content) {
      this.currentOctopus.setTrack(subtitle.content);
    }

    this.fetchDefaultStyle(() => {
      if (this.isMarginOffsetActive() && this.defaultStyles.length > 0) {
        void this.adjustMargin(VideoPlayerSubtitles.MarginVerticalOffset);
      }
    });
  }

  private fetchDefaultStyle(onFetched?: () => void): void {
    if (!this.currentOctopus) {
      return;
    }

    this.currentOctopus.getStyles((styles) => {
      console.log('octopus: All styles', styles);

      const defaultStyles: SubtitleStyle[] = [];
      for (const style of styles) {
        if (style.Name === 'Default') {
          defaultStyles.push(style);
        }
      }

      this.defaultStyles = defaultStyles;
      onFetched?.();
    }, () => this.defaultStyles = []);
  }

  private clearSelectedSubtitle(): void {
    this.selectedSubtitle = undefined;
    this.currentOctopus?.freeTrack();
    this.defaultStyles = [];
  }

  public isMarginOffsetActive(): boolean {
    if (this.marginToggleButton) {
      return 'active' in this.marginToggleButton.dataset;
    }

    try {
      return localStorage.getItem(marginLocalhostKey) === 'true';
    } catch { }

    return false;
  }

  public async adjustMargin(offset: number): Promise<void> {
    if (!this.currentOctopus) {
      return;
    }

    for (const style of this.defaultStyles) {
      const margin = style.MarginV + offset;
      style.MarginV = margin;

      this.currentOctopus.setStyle({ MarginV: margin, Alignment: 2 }, style._index);

    }
  }

  private clearOctopusResizeObserver(): void {
    if (!this.currentOctopus) {
      return;
    }

    this.currentOctopus.ro?.disconnect();
    delete this.currentOctopus.ro;
  }

  async trySetSubtitlesOctopusInstance(isPlaying: boolean): Promise<boolean> {
    if (this.currentOctopus) {
      this.trySetOctopusVideo();
      return true;
    }

    if (subtitlesOptions.octopusRootUrl === undefined || subtitlesOptions.octopusDefaultFontUrl === undefined) {
      console.error(`Need to set octopusRootUrl or octopusDefaultFontUrl on 'subtitlesOptions'`, subtitlesOptions);
      return false;
    }

    console.log('started loading octopus');
    const start = performance.now();
    this.videoPlayer.video.pause();
    await this.tryLoadOctopusScript();
    if (!window.SubtitlesOctopus) {
      return false;
    }

    if (window.__nuiOctopus) {
      this.currentOctopus = window.__nuiOctopus;
      this.trySetOctopusVideo();
    } else {
      const options: SubtitleOctopusOptions = {
        video: this.videoElement,
        workerUrl: subtitlesOptions.octopusRootUrl + 'subtitles-octopus-worker.js',
        legacyWorkerUrl: subtitlesOptions.octopusRootUrl + 'subtitles-octopus-worker-legacy.js',
        fallbackFont: subtitlesOptions.octopusDefaultFontUrl,
        onReady: () => {
          if (isPlaying) {
            void this.videoPlayer.video.play();
          }
          console.log('finished loading octopus', performance.now() - start);
        }
      };

      this.selectedSubtitle?.src !== undefined && (options.subUrl = this.selectedSubtitle.src);
      this.selectedSubtitle?.content !== undefined && (options.subContent = this.selectedSubtitle.content);

      this.currentOctopus = new window.SubtitlesOctopus(options);
      window.__nuiOctopus = this.currentOctopus;
    }

    return true;
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

customElements.define('video-player-subtitles', VideoPlayerSubtitles);