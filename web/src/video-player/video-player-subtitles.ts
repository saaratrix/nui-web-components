import type { VideoPlayer } from './video-player';
import { getSubtitleTypeFromName, Subtitle, SubtitleType } from './video-player.models.js';
import { subtitleIcon } from './video-player-icons.js';
import { controlsIconCSS } from './video-player-shared.js';
import type { Popover } from '../popover/popover.js';
import '../popover/popover.js';
import './video-player-subtitles-adder.js';
import type { SubtitleAddedEvent, VideoPlayerSubtitlesAdder } from './video-player-subtitles-adder';
import type { SubtitleHandler } from './subtitle-handlers/subtitle-handler.js';
import { AssSsaSubtitleHandler, type OctopusSubtitlesOptions } from './subtitle-handlers/ass-ssa-subtitle-handler.js';
import { SrtSubtitleHandler } from './subtitle-handlers/srt-subtitle-handler.js';
import { VttSubtitleHandler } from './subtitle-handlers/vtt-handler.js';

export const subtitlesOptions: OctopusSubtitlesOptions = {
  octopusRootUrl: undefined,
  octopusDefaultFontUrl: undefined,
};

const marginLocalhostKey = 'meow-margin';

export class VideoPlayerSubtitles extends HTMLElement {
  public static csvDelimiter = '|';

  static observedAttributes = [];

  shadow: ShadowRoot;

  private _selectedSubtitle: Subtitle | undefined;

  private subtitlesDirty = false;
  public subtitles: Subtitle[] = [];

  public configPopover: Popover;
  public subtitlesAdder: VideoPlayerSubtitlesAdder;
  private subtitleHandlers = new Map<SubtitleType, SubtitleHandler>();
  private activeSubtitleHandler: SubtitleHandler | undefined;

  public parsedSubtitles: Subtitle[] = [];
  public addedSubtitles: Subtitle[] = [];

  private languagesElement: HTMLElement;
  private languageRadioElements: Map<Subtitle | undefined, HTMLInputElement> = new Map();

  private marginToggleButton!: HTMLButtonElement;

  // This is set by the parent when creating the element.
  public videoPlayer!: VideoPlayer;

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
            align-items: center;
            justify-content: space-between;
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
                <video-player-subtitles-adder />
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

    this.subtitlesAdder = this.shadow.querySelector('video-player-subtitles-adder') as VideoPlayerSubtitlesAdder;
    this.subtitlesAdder.addEventListener('subtitleAdded', (e) => this.onSubtitleAdded(e as CustomEvent<SubtitleAddedEvent>));

    this.languagesElement = this.shadow.querySelector('.subtitles-config .languages') as HTMLElement;

    // this.configPopover.addEventListener('popover:show', () => this.subtitlesAdder.enableDnd());
    // this.configPopover.addEventListener('popover:hide', () => this.subtitlesAdder.disableDnd());

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
      if (!this.activeSubtitleHandler?.canAdjustMargin()) {
        return;
      }

      const isCurrentlyActive = this.isMarginOffsetActive();
      if (isCurrentlyActive) {
        delete this.marginToggleButton.dataset['active'];
        void this.adjustMargin(-1);
      } else {
        this.marginToggleButton.dataset['active'] = 'true';
        void this.adjustMargin(1);
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
      }
    }

    this.renderSubtitlesList();
  }

  disconnectedCallback() {
    this.activeSubtitleHandler?.remove();

    if (this.addedSubtitles.length > 0) {
      for (const subtitle of this.addedSubtitles) {
        if (subtitle.src) {
          URL.revokeObjectURL(subtitle.src);
        }
      }
      this.addedSubtitles = [];
      this.subtitlesDirty = true;
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

  getSubtitleHandler(type: SubtitleType): SubtitleHandler | undefined {
    if (this.subtitleHandlers.has(type)) {
      return this.subtitleHandlers.get(type)!;
    }

    let subtitleHandler: SubtitleHandler | undefined;
    switch (type) {
      case SubtitleType.Ass:
      case SubtitleType.Ssa:
        subtitleHandler = new AssSsaSubtitleHandler(this);
        this.subtitleHandlers.set(SubtitleType.Ass, subtitleHandler!);
        this.subtitleHandlers.set(SubtitleType.Ssa, subtitleHandler!);
        break;
      case SubtitleType.Srt:
        subtitleHandler = new SrtSubtitleHandler(this);
        this.subtitleHandlers.set(SubtitleType.Srt, subtitleHandler!);
        break;
      case SubtitleType.Vtt:
        subtitleHandler = new VttSubtitleHandler(this);
        this.subtitleHandlers.set(SubtitleType.Vtt, subtitleHandler!);
        break;
    }

    return subtitleHandler;
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
      const type = getSubtitleTypeFromName(src);
      if (!type) {
        console.log(`setParsedSubtitlesFromCSV() Could not parse subtitle type from ${type}`);
        return;
      }

      subtitles.push({
        src,
        label: label.trim(),
        type,
        srclang: srclang.trim(),
      });
    }

    this.parsedSubtitles = subtitles;
    this.subtitlesDirty = true;
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

    if (this.subtitlesDirty) {
      this.subtitles = [...this.parsedSubtitles, ...this.addedSubtitles];
      this.updateSelectedSubtitleReference();
      this.subtitlesDirty = false;
    }

    this.languageRadioElements.clear();
    const fragment = document.createDocumentFragment();
    for (let i = -1; i < this.subtitles.length; i++) {
      fragment.appendChild(this.renderSubtitleListItem(i, this.subtitles[i]));
    }

    // replaceChildren is chrome 86+
    //languagesElement.replaceChildren(fragment);
    this.languagesElement.innerHTML = '';
    this.languagesElement.appendChild(fragment);
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

    const oldSubtitleHandles = this.activeSubtitleHandler;
    this.selectedSubtitle = subtitle;
    this.activeSubtitleHandler = this.getSubtitleHandler(subtitle.type);
    if (oldSubtitleHandles !== this.activeSubtitleHandler) {
      oldSubtitleHandles?.clearSelectedSubtitle();
    }

    try {
      const successful = await this.activeSubtitleHandler?.changeSubtitle(subtitle);
      if (!successful) {
        this.clearSelectedSubtitle();
      }
    } catch (e) {
      this.clearSelectedSubtitle();
    }
  }

  private onSubtitleAdded(event: CustomEvent<SubtitleAddedEvent>) {
    const { file, type } = event.detail;

    if (type === SubtitleType.Srt) {
      console.log('srt not supported yet, be patient.');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    this.addedSubtitles.push({
      label: file.name,
      src: blobUrl,
      type,
      srclang: 'eng',
      title: file.name,
    });

    this.subtitlesDirty = true;
    this.renderSubtitlesList();
  }

  private clearSelectedSubtitle(): void {
    this.activeSubtitleHandler?.clearSelectedSubtitle();
    this.selectedSubtitle = undefined;
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

  public async adjustMargin(offsetMultiplier: number): Promise<void> {
    if (!this.activeSubtitleHandler) {
      return;
    }

    void this.activeSubtitleHandler.adjustMargin(offsetMultiplier);
  }
}

customElements.define('video-player-subtitles', VideoPlayerSubtitles);