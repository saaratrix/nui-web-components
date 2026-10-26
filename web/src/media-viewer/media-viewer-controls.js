import { MediaType, viewingFailedToLoadEvent, viewingItemChangedEvent, defaultControlsPlacement, ControlsPlacements, controlsPlacementValues } from './media-viewer-models.js';
import './media-viewer-controls-rotate.js';
import { MediaViewerHotkeysHandler } from './media-viewer-hotkeys-handler.js';
import { MediaViewerActions } from './media-viewer-actions.js';
import { isVideoElement } from './media-viewer-shared.js';
export class MediaViewerControls extends HTMLElement {
    static observedAttributes = ['placement'];
    shadow;
    featuresElement;
    activeFeatures = new Set();
    actions = new MediaViewerActions(this);
    hotkeysHandler = new MediaViewerHotkeysHandler();
    videoHotkeyActions = [
        {
            id: 'video:seekForward',
            key: 'ArrowRight',
            action: (_) => this.actions.seekForwards(),
            preventDefault: true,
        },
        {
            id: 'video:seekBackward',
            key: 'ArrowLeft',
            action: (_) => this.actions.seekBackwards(),
            preventDefault: true,
        },
        {
            id: 'video:togglePlayback',
            key: ' ',
            action: (_) => this.actions.togglePlayback(),
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
          transition: opacity 0.1s ease-in;
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
    _isUIVisible = false;
    get isUIVisible() {
        return this._isUIVisible;
    }
    set isUIVisible(value) {
        this._isUIVisible = value;
        this.viewerControls.classList.toggle('hidden', !this._isUIVisible);
    }
    get placement() {
        return this.getAttribute('placement');
    }
    set placement(value) {
        if (value == null) {
            this.isUIVisible = false;
            this.removeAttribute('placement');
            return;
        }
        value = value?.toLowerCase();
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
    _mediaViewer = null;
    get mediaViewer() {
        if (!this._mediaViewer) {
            const rootNode = this.getRootNode();
            this._mediaViewer = rootNode.host;
        }
        return this._mediaViewer;
    }
    _viewerControls = null;
    get viewerControls() {
        if (!this._viewerControls) {
            this._viewerControls = this.shadow.querySelector('.controls');
        }
        return this._viewerControls;
    }
    getClassNameForPlacement(placement) {
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
    updateView() {
        const allFeatures = [
            this.activeFeatures.has('video:audio') && `<media-viewer-controls-audio ></media-viewer-controls-audio>`,
            this.activeFeatures.has('video:progress') && `<media-viewer-controls-progress ></media-viewer-controls-progress>`,
            this.activeFeatures.has('video:fullscreen') && `<media-viewer-controls-fullscreen ></media-viewer-controls-fullscreen>`,
            this.activeFeatures.has('rotate') && `<media-viewer-controls-rotate ></media-viewer-controls-rotate>`,
        ];
        // typeof string as has && can return undefined.
        const activeFeatures = allFeatures.filter(f => typeof f === 'string');
        this.featuresElement.innerHTML = activeFeatures.join('\n');
    }
    connectedCallback() {
        this.featuresElement = this.shadow.querySelector('.features');
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
    onViewingItemChanged = (e) => {
        const event = e;
        if (event.detail.mediaViewer !== this.mediaViewer) {
            return;
        }
        this.setFeatures();
        this.tryOverrideDefaultEvents();
        this.updateView();
    };
    onViewingFailedToLoad = (e) => {
        const event = e;
        if (event.detail.mediaViewer !== this.mediaViewer) {
            return;
        }
        this.activeFeatures = new Set();
        this.updateView();
    };
    setFeatures() {
        const features = [];
        const actions = [];
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
        this.activeFeatures = new Set(features);
    }
    tryOverrideDefaultEvents() {
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
        contentElement.addEventListener('pause', function () {
            this.blur();
        });
        contentElement.addEventListener('volumechange', function () {
            this.blur();
        });
        document.addEventListener('fullscreenchange', () => {
            contentElement.blur();
        });
    }
}
customElements.define('media-viewer-controls', MediaViewerControls);
