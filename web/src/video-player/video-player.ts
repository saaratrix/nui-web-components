import type { VideoPlayerSubtitles } from './video-player-subtitles';

import './video-player-subtitles.js';
import { exitfullscreenIcon, fullscreenIcon } from './video-player-icons.js';
import { controlsIconCSS } from './video-player-shared.js';

/**
 * Properties:
 * subtitles: CSV with | as delimiter for each {@link Subtitle} src,label,srclang
 */
export class VideoPlayer extends HTMLElement {
  static observedAttributes = ['subtitles', 'poster'];

  shadow: ShadowRoot;

  private _container: HTMLElement | null = null;
  public video: HTMLVideoElement;
  // The sources slot gets copied into video, having <video><slot /></video> did not work.
  private videoSources: HTMLSlotElement;
  private isSourcesDirty = true;
  private videoControls: HTMLElement;
  private fullscreenButton: HTMLElement;

  private _subtitlesElement: VideoPlayerSubtitles | null = null;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        :host {
            display: inline-flex;
            --icon-size: 40px;
            --icon-size-svg: 22px;
            --controls-opacity: 1;
        }
        
        :host(:fullscreen) {
            display: block;
            video: 100%;
            height: 100%;
        }
      
        .video-player {
            display: flex;
            position: relative;
        }
        
        .video-player:fullscreen {
            
        }
        
        .video-container {
            font-size: 0;
        }
        
        .video-container, video {
            width: 100%;
        }
        
        .video-click-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 64px;
            background: transparent;
        }
        
        .video-controls {
            display: flex;
            justify-content: right;
            position: absolute;
            box-sizing: border-box;
            width: 100%;
            top: 0;
            padding: 0.25rem 0.5rem;
            opacity: var(--controls-opacity);
        }     
        
        .controls-group {
            display: flex;
        }   
        
        ${controlsIconCSS}
      </style>
      <div class="video-player" tabindex="0">
        <div class="video-container">
            <video controls playsinline></video>
            <div class="video-click-overlay"></div>
        </div>
        <div class="video-controls">
            <div class="controls-group">
                <i class="icon icon-fullscreen action" tabindex="0">${fullscreenIcon}</i>
            </div>
        </div>
      </div>
      <slot name="sources"></slot>
    `;

    this.video = this.shadow.querySelector('video') as HTMLVideoElement;
    this.videoSources = this.shadow.querySelector('slot[name="sources"]') as HTMLSlotElement;
    this.videoControls = this.shadow.querySelector('.video-controls') as HTMLElement;

    this.fullscreenButton = this.shadow.querySelector('.icon-fullscreen') as HTMLElement;
    this.initEvents();
  }

  private initEvents(): void {
    this.container.addEventListener('click', this.onVideoContainerClick, false);
    this.container.addEventListener('dblclick', this.onVideoContainerDblClick, false);
    this.addEventListener('fullscreenchange', this.onFullscreenChanged, false);

    this.fullscreenButton.addEventListener('click', this.onFullscreenButtonClick, false);

    this.addEventListener('keydown', this.onKeyDown, false);
  }

  isFirstConnectedCallback = true;
  async connectedCallback() {
    this.initEvents();

    if (this.isSourcesDirty) {
      const video = this.video;
      while (video.firstChild) {
        video.removeChild(video.firstChild);
      }

      const sources = this.videoSources.assignedElements();
      for (const source of sources) {
        if (source instanceof HTMLSourceElement) {
          video.appendChild(source.cloneNode(true));
        }
      }
    }

    // We only need to set up subtitles on the very first connected callback, otherwise it happens through attributeChangedCallback
    if (this.isFirstConnectedCallback) {
      const subtitlesCsv = this.subtitlesCSV;
      if (subtitlesCsv) {
        this.subtitlesElement.setParsedSubtitlesFromCSV(subtitlesCsv);
      }
    }

    this.isFirstConnectedCallback = false;
  }

  disconnectedCallback() {
  }

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'subtitles') {
      this.subtitlesCSV = newValue as string | null;
    }
  }

  public get container(): HTMLElement {
    return this._container ||= this.shadow.querySelector('.video-player') as HTMLElement;
  }

  public get subtitlesElement(): VideoPlayerSubtitles {
    if (!this._subtitlesElement) {

      this._subtitlesElement = document.createElement('video-player-subtitles') as VideoPlayerSubtitles;
      this._subtitlesElement.videoPlayer = this;
      this._subtitlesElement.classList.add('action');
      const controlsGroup = this.videoControls.querySelector('.controls-group') as HTMLElement;
      controlsGroup.insertBefore(this._subtitlesElement, this.fullscreenButton);
    }

    return this._subtitlesElement;
  }

  public get isFullScreen(): boolean {
    return document.fullscreenElement === this;
  }

  public get subtitlesCSV(): string | null {
    return this.getAttribute('subtitles');
  }

  public set subtitlesCSV(csv: string | null) {
    csv ? this.setAttribute('subtitles', csv) : this.removeAttribute('subtitles');
    this.subtitlesElement.setParsedSubtitlesFromCSV(csv);
  }

  private onVideoClick = (event: MouseEvent): void => {
    const allowClick = this.isClickAllowed(event);
    if (!allowClick) {
      event.preventDefault();
    }
  };

  playbackToggleTimeout: number | null = null;
  private onVideoContainerClick = (event: MouseEvent): void => {
    if (!this.isClickAllowed(event)) {
      return;
    }

    if (this.playbackToggleTimeout) {
      return;
    }

    this.playbackToggleTimeout = setTimeout(() => {
      this.togglePlayback();
      this.clearplaybackToggleTimeout();
    }, 225);
  }

  private onVideoContainerDblClick = (event: MouseEvent): void => {
    if (!this.isClickAllowed(event)) {
      return;
    }

    this.clearplaybackToggleTimeout();
    void this.toggleFullscreen();
  };

  private clearplaybackToggleTimeout(): void {
    if (this.playbackToggleTimeout) {
      clearTimeout(this.playbackToggleTimeout);
    }
    this.playbackToggleTimeout = null;
  }

  private onFullscreenButtonClick = (event: PointerEvent): void => {
    void this.toggleFullscreen();
  };

  private onFullscreenChanged = (event: Event): void => {
    this.fullscreenButton.innerHTML = this.isFullScreen ? exitfullscreenIcon : fullscreenIcon;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case ' ':
        this.togglePlayback();
        break;
      case 'ArrowLeft':
        this.seekBackwards();
        break;
      case 'ArrowRight':
        this.seekForwards();
        break;
    }
  }

  private isClickAllowed(event: MouseEvent): boolean {
     return (this.video.offsetHeight - event.clientY) >= 64 && !(event.target as HTMLElement).closest('.action');
  }

  public async toggleFullscreen(): Promise<void> {
    const isFullscreen = this.isFullScreen;

    if (isFullscreen) {
      await document.exitFullscreen();
    } else {
      await this.requestFullscreen();
    }
  }

  public togglePlayback(): void {
    if (this.video.paused) {
      void this.video.play();
    } else {
      this.video.pause();
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
    const time = Math.min(Math.max(this.video.currentTime + offsetSeconds, 0), this.video.duration);
    if (this.video.fastSeek) {
      this.video.fastSeek(time);
    } else {
      this.video.currentTime = time;
    }
  }

}

customElements.define('video-player', VideoPlayer);