import { MediaType, ControlsPlacement, viewingFailedToLoadEvent, viewingItemChangedEvent, defaultControlsPlacement, ControlsPlacements, controlsPlacementValues, MediaViewerItemChangedEvent, MediaViewerFailedToLoadEvent } from './media-viewer-models.js';
import { MediaViewer } from './media-viewer.js';
import './media-viewer-controls-rotate.js';
import { MediaViewerHotkeyAction, MediaViewerHotkeysHandler } from './media-viewer-hotkeys-handler.js';
import { MediaViewerActions } from './media-viewer-actions.js';
import { isVideoElement } from './media-viewer-shared.js';

type Feature = 'video:audio' | 'video:progress' | 'video:fullscreen' | 'rotate';

export class MediaViewerControls extends HTMLElement {
  static observedAttributes = ['placement'];

  shadow: ShadowRoot;
  featuresElement!: HTMLElement;
  activeFeatures: Set<Feature> = new Set();

  actions = new MediaViewerActions(this);
  hotkeysHandler = new MediaViewerHotkeysHandler();

  videoHotkeyActions: MediaViewerHotkeyAction[] = [
    {
      id: 'video:seekForward',
      key: 'ArrowRight',
      action: (_: KeyboardEvent) => this.actions.seekForwards(),
      preventDefault: true,
    },
    {
      id: 'video:seekBackward',
      key: 'ArrowLeft',
      action: (_: KeyboardEvent) => this.actions.seekBackwards(),
      preventDefault: true,
    },
    {
      id: 'video:togglePlayback',
      key: ' ',
      action: (_: KeyboardEvent) => this.actions.togglePlayback(),
    }
  ];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        .placement-page-left, .placement-page-right {
            position: fixed; top: 0;
        }
        .placement-item-left, .placement-item-right {
            position: absolute; top: 0.5rem;
        }
        
        .placement-page-right .features, .placement-item-right .features {
            justify-content: flex-end;
        }
      
        .controls {
          left: 0.5rem;
          height: 55px;
          width: calc(100% - 2rem);
          
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 0.5rem;
          
          opacity: 0.1;
          transition: opacity 100ms ease-in;
        }
        
        .controls:hover {
          opacity: 0.7
        }
        
        .hidden {
            display: none;
        }
        
        .features {
          display: flex;
        }
        
        .extra-space {
          width: 100%;
          height: 15px;
        }
        
      </style>
      <div class="controls hidden">
          <div class="features"></div>
          <div class="extra-space"></div>
      </div>
    `;
  }

  private _isUIVisible = false;
  public get isUIVisible() {
    return this._isUIVisible;
  }

  private set isUIVisible(value: boolean) {
    this._isUIVisible = value;
    this.viewerControls.classList.toggle('hidden', !this._isUIVisible);
  }

  get placement(): ControlsPlacement {
    return this.getAttribute('placement') as ControlsPlacement;
  }

  set placement(value: ControlsPlacement | null) {
    if (value == null) {
      this.isUIVisible = false;
      this.removeAttribute('placement');
      return;
    }

    value = value?.toLowerCase() as ControlsPlacement;
    if (!controlsPlacementValues.has(value)) {
      value = defaultControlsPlacement;
    }

    const oldValue = this.placement;
    if (oldValue === value) {
      return;
    }

    this.isUIVisible = true;
    this.setAttribute('placement', value);
    const oldClass = this.getClassNameForPlacement(oldValue);
    const newClass = this.getClassNameForPlacement(value);
    oldClass && this.viewerControls.classList.remove(oldClass);
    this.viewerControls.classList.add(newClass);
  }

  _mediaViewer: MediaViewer | null = null;
  get mediaViewer(): MediaViewer {
    if (!this._mediaViewer) {
      const rootNode = this.getRootNode() as ShadowRoot;
      this._mediaViewer = rootNode.host as MediaViewer;
    }

    return this._mediaViewer;
  }

  _viewerControls: HTMLElement | null = null;
  get viewerControls(): HTMLElement {
    if (!this._viewerControls) {
      this._viewerControls = this.shadow.querySelector('.controls');
    }
    return this._viewerControls!;
  }

  private getClassNameForPlacement(placement: ControlsPlacement | null) {
    switch (placement) {
      case ControlsPlacements.PageLeft:
        return 'placement-page-left';
      case ControlsPlacements.PageRight:
        return 'placement-page-right';
      case ControlsPlacements.ItemLeft:
        return 'placement-item-left';
      case ControlsPlacements.ItemRight:
        return 'placement-item-right';
    }

    return '';
  }

  private updateView(): void {
    const allFeatures = [
      this.activeFeatures.has('video:audio') && `<media-viewer-controls-audio ></media-viewer-controls-audio>`,
      this.activeFeatures.has('video:progress') && `<media-viewer-controls-progress ></media-viewer-controls-progress>`,
      this.activeFeatures.has('video:fullscreen') && `<media-viewer-controls-fullscreen ></media-viewer-controls-fullscreen>`,
      this.activeFeatures.has('rotate') && `<media-viewer-controls-rotate ></media-viewer-controls-rotate>`,
    ];

    // typeof string as has && can return undefined.
    const activeFeatures = allFeatures.filter<string>(f => typeof f === 'string');
    this.featuresElement.innerHTML = activeFeatures.join('\n');
  }

  connectedCallback() {
    this.featuresElement = this.shadow.querySelector('.features') as HTMLElement;
    if (!this.featuresElement) {
      throw new Error("Viewer Controls failed to initialize, bad bad!");
    }

    window.addEventListener(viewingItemChangedEvent, this.onViewingItemChanged);
    window.addEventListener(viewingFailedToLoadEvent, this.onViewingFailedToLoad);

    this.setFeatures();
    this.updateView();
    this.tryOverrideDefaultEvents();

    this.hotkeysHandler.addEventListeners();
  }

  disconnectedCallback() {
    window.removeEventListener(viewingItemChangedEvent, this.onViewingItemChanged);
    window.removeEventListener(viewingFailedToLoadEvent, this.onViewingFailedToLoad);

    this.hotkeysHandler.removeEventListeners();
  }

  private onViewingItemChanged = (e: Event) => {
    const event = e as CustomEvent<MediaViewerItemChangedEvent>;
    if (event.detail.mediaViewer !== this.mediaViewer) {
      return;
    }

    this.setFeatures();
    this.tryOverrideDefaultEvents();
    this.updateView();
  };

  private onViewingFailedToLoad = (e: Event) => {
    const event = e as CustomEvent<MediaViewerFailedToLoadEvent>;
    if (event.detail.mediaViewer !== this.mediaViewer) {
      return;
    }

    this.activeFeatures = new Set();
    this.updateView();
  };

  private setFeatures() {
    const features: Feature[] = [];
    const actions: MediaViewerHotkeyAction[] = [];
    switch (this.mediaViewer.activeMediaType) {
      case MediaType.Video:
        features.push('video:audio', 'video:fullscreen', 'video:progress');
        features.push('rotate');
        actions.push(...this.videoHotkeyActions);
        break;
      case MediaType.Image:
        features.push('rotate');
        break;
      default:
        break;
    }

    this.hotkeysHandler.clearAndAddActions(actions);
    this.activeFeatures = new Set<Feature>(features);
  }

  private tryOverrideDefaultEvents(): void {
    const contentElement = this.mediaViewer.getViewerContentElement();
    if (!isVideoElement(contentElement)) {
      return;
    }
    // Note: Clicking play, volume or fullscreen leaves the browser (chrome) in a focused state that ignores keydown events.
    // Probably so you can press space to toggle play/pause or mute/unmute.
    // So these methods are here to override such behaviour to allow for a smoother keyboard experience.

    contentElement.addEventListener('play', function () {
      this.blur();
    });
    contentElement.addEventListener('pause', function() {
      this.blur();
    });

    contentElement.addEventListener('volumechange', function() {
      this.blur();
    })

    document.addEventListener('fullscreenchange', () => {
      contentElement.blur();
    });


  }
}

customElements.define('media-viewer-controls', MediaViewerControls);