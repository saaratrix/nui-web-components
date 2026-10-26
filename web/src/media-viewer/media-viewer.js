import { controlsPlacementValues, defaultControlsPlacement, dispatchViewingFailedToLoadEvent, dispatchViewingItemChangedEvent, MediaType } from './media-viewer-models.js';
import './media-viewer-controls.js';
import '../video-player/video-player.js';
const mediaAndMimeTypesFromExtension = new Map([
    // Images
    ['.png', [MediaType.Image, 'image/png']],
    ['.jpg', [MediaType.Image, 'image/jpeg']],
    ['.jpeg', [MediaType.Image, 'image/jpeg']],
    ['.gif', [MediaType.Image, 'image/gif']],
    ['.bmp', [MediaType.Image, 'image/bmp']],
    ['.tiff', [MediaType.Image, 'image/tiff']],
    ['.webp', [MediaType.Image, 'image/webp']],
    ['.avif', [MediaType.Image, 'image/avif']],
    // Textures
    ['.tga', [MediaType.Image, 'image/x-tga']],
    // Video
    ['.mp4', [MediaType.Video, 'video/mp4']],
    // Technically 'video/x-matroska', but video/mp4 makes em play in chrome at least.
    ['.mkv', [MediaType.Video, 'video/mp4']],
    ['.flv', [MediaType.Video, 'video/x-flv']],
    ['.webm', [MediaType.Video, 'video/webm']],
    ['.mov', [MediaType.Video, 'video/quicktime']],
    ['.avi', [MediaType.Video, 'video/x-msvideo']],
    ['.m4v', [MediaType.Video, 'video/x-m4v']],
    // Audio
    ['.mp3', [MediaType.Audio, 'audio/mpeg']],
    ['.wav', [MediaType.Audio, 'audio/wav']],
    ['.aac', [MediaType.Audio, 'audio/aac']],
    ['.flac', [MediaType.Audio, 'audio/flac']],
    ['.ogg', [MediaType.Audio, 'audio/ogg']],
    ['.m4a', [MediaType.Audio, 'audio/x-m4a']],
]);
const mimeTypesToMediaType = new Map([...mediaAndMimeTypesFromExtension.values()].map(([mediaType, mimeType]) => [mimeType, mediaType]));
let _createdElements = 0;
export class MediaViewer extends HTMLElement {
    static observedAttributes = ['src', 'mime-type', 'parent', 'auto-height', 'subtitles'];
    shadow;
    activeMediaType = MediaType.Unknown;
    _createdId;
    _controlsElement = null;
    constructor() {
        super();
        this._createdId = _createdElements++;
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
      <style>
        :host, * {
          box-sizing: border-box;
        }
      
        .container {
          line-height: 0;
        }

        .item {
          display: inline-block;
          padding: 0.5rem;
          transition: transform 0.1s ease-in-out;
        }

        .item img,
        .item video {
          user-select: none;
        }

        .item-container {
          position: relative;
          display: inline-block;
        }
      </style>

      <div class="container">
        <div class="item-container">
          <div class="item"></div>
          <media-viewer-controls></media-viewer-controls>
        </div>
      </div>
    `;
    }
    get eventId() {
        return this.id ?? this._createdId;
    }
    get src() {
        return this.getAttribute("src") ?? '';
    }
    set src(value) {
        value == null
            ? this.removeAttribute("src")
            : this.setAttribute("src", value);
    }
    get mimeType() {
        return this.getAttribute("mime-type");
    }
    set mimeType(value) {
        if (!value) {
            this.removeAttribute("mime-type");
        }
        else {
            const valueLower = value.toLowerCase();
            mimeTypesToMediaType.has(valueLower) ? this.setAttribute("mime-type", valueLower) : this.removeAttribute("mime-type");
        }
    }
    _parentContainer = null;
    get parentContainer() {
        if (this._parentContainer) {
            return this._parentContainer;
        }
        const parentContainerQuery = this.getAttribute("parent");
        const parentContainer = (parentContainerQuery && document.querySelector(parentContainerQuery)) || this.parentElement;
        return parentContainer;
    }
    set parentContainer(value) {
        this._parentContainer = value;
    }
    get automaticallyAdjustHeight() {
        const value = this.getAttribute("auto-height") ?? '';
        return value.toLowerCase() === 'true';
    }
    set automaticallyAdjustHeight(value) {
        value == null
            ? this.removeAttribute('auto-height')
            : this.setAttribute('auto-height', value ? 'true' : 'false');
        if (!value && this.viewItemElement?.firstElementChild) {
            this.viewItemElement.firstElementChild.style.maxHeight = '';
        }
    }
    get controlsPlacement() {
        const value = this.getAttribute('controls-placement')?.toLowerCase();
        if (!value) {
            return null;
        }
        return controlsPlacementValues.has(value) ? value : defaultControlsPlacement;
    }
    set controlsPlacement(value) {
        if (!value) {
            this.hideControlsUI();
            return;
        }
        value = value.toLowerCase();
        if (!controlsPlacementValues.has(value)) {
            value = defaultControlsPlacement;
        }
        this.setAttribute("controls-placement", value);
        this.controlsElement.placement = value;
    }
    hideControlsUI() {
        if (!this.controlsElement.isUIVisible) {
            return;
        }
        this.controlsElement.placement = null;
    }
    _viewerContainerElement = null;
    get viewerContainer() {
        if (!this._viewerContainerElement) {
            this._viewerContainerElement = this.shadow.querySelector('.container');
        }
        return this._viewerContainerElement;
    }
    _viewItemElement = null;
    get viewItemElement() {
        if (!this._viewItemElement) {
            this._viewItemElement = this.shadow.querySelector('.item');
        }
        return this._viewItemElement;
    }
    getViewerContentElement() {
        switch (this.activeMediaType) {
            case MediaType.Video:
                return this.viewItemElement.querySelector('video-player');
            case MediaType.Audio:
                return this.viewItemElement.querySelector('audio');
            case MediaType.Image:
                return this.viewItemElement.querySelector('img');
        }
        return null;
    }
    get controlsElement() {
        if (!this._controlsElement) {
            this._controlsElement = this.shadow.querySelector('media-viewer-controls');
        }
        return this._controlsElement;
    }
    connectedCallback() {
        const placement = this.controlsPlacement;
        if (placement) {
            this.controlsElement.placement = placement;
        }
        this.renderViewItem(true);
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'auto-height') {
            const item = this.viewItemElement?.firstElementChild;
            item && this.setMaxDimensions(item);
            return;
        }
        if (name === 'parent') {
            this._parentContainer = null;
        }
        let shouldRender = oldValue !== newValue;
        this.renderViewItem(shouldRender);
    }
    _lastRender;
    renderViewItem(render) {
        if (!render) {
            return;
        }
        const src = this.src;
        const [mediaType, mimeType] = this.getTypes(src) ?? [];
        if (!mediaType || !mimeType) {
            this.viewItemElement.textContent = '';
            this._lastRender = undefined;
            this.activeMediaType = MediaType.Unknown;
            dispatchViewingItemChangedEvent(this.eventId, this, this.activeMediaType);
            return;
        }
        if (this._lastRender?.src === src && this._lastRender?.mediaType === mediaType) {
            return;
        }
        this.activeMediaType = mediaType;
        this.viewItemElement.textContent = '';
        this._lastRender = { src, mediaType };
        if (mediaType === MediaType.Image) {
            this.renderImage(src);
        }
        else if (mediaType == MediaType.Video) {
            this.renderVideo(src, mimeType);
        }
        else if (mediaType === MediaType.Audio) {
            // this.renderAudio(extension);
        }
        dispatchViewingItemChangedEvent(this.eventId, this, this.activeMediaType);
    }
    renderImage(src) {
        const image = new Image();
        image.src = src;
        image.draggable = false;
        image.onerror = () => {
            dispatchViewingFailedToLoadEvent(this.eventId, this);
        };
        this.setMaxDimensions(image);
        this.viewItemElement.appendChild(image);
    }
    getTypes(src) {
        if (!src) {
            return undefined;
        }
        const result = this.getTypesFromSrc(src);
        if (result) {
            return result;
        }
        return this.tryGetTypesFromMimeTypeAttribute();
    }
    tryGetTypesFromMimeTypeAttribute() {
        const existingMimeType = this.mimeType;
        if (!existingMimeType) {
            return undefined;
        }
        return mimeTypesToMediaType.has(existingMimeType) ? [mimeTypesToMediaType.get(existingMimeType), existingMimeType] : undefined;
    }
    getTypesFromSrc(src) {
        if (!src) {
            return undefined;
        }
        const extension = '.' + src.split('.').pop().toLowerCase();
        if (mediaAndMimeTypesFromExtension.has(extension)) {
            return mediaAndMimeTypesFromExtension.get(extension);
        }
        return undefined;
    }
    renderSubtitles() {
        const subtitlesValue = this.getAttribute('subtitles');
        if (subtitlesValue) {
            return `subtitles=${subtitlesValue} `;
        }
        else {
            return '';
        }
    }
    renderVideo(src, mimeType) {
        const subtitlesHtml = this.renderSubtitles();
        this.viewItemElement.innerHTML = `<video-player autoplay ${subtitlesHtml} draggable="false">
        <source slot="sources" src="${src}" type="${mimeType}">
      </video-player>`;
        const videoElement = this.viewItemElement.querySelector('video-player');
        this.setMaxDimensions(videoElement);
        videoElement.querySelector('source').onerror = () => this.handleMediaError(src);
    }
    getOccupiedHeight(parentContainer, itemStyle) {
        const parentStyle = window.getComputedStyle(parentContainer);
        const bodyPaddingHeight = parseInt(parentStyle.paddingTop) + parseInt(parentStyle.paddingBottom);
        const itemPaddingHeight = parseInt(itemStyle.paddingTop) + parseInt(itemStyle.paddingBottom);
        let siblingHeight = 0;
        if (parentContainer.childElementCount > 1) {
            for (let i = 0; i < parentContainer.children.length; i++) {
                const child = parentContainer.children.item(i);
                if (!child || child === this || !(child instanceof HTMLElement) || child.offsetParent === null) {
                    continue;
                }
                const cs = window.getComputedStyle(child);
                const siblingMargin = parseFloat(cs.marginTop || "0") + parseFloat(cs.marginBottom || "0");
                siblingHeight += child.getBoundingClientRect().height + siblingMargin;
            }
        }
        return bodyPaddingHeight + itemPaddingHeight + siblingHeight;
    }
    setMaxDimensions(element) {
        const parentContainer = this.parentContainer;
        const viewItem = this.viewItemElement;
        const viewItemStyle = getComputedStyle(viewItem);
        const maxHeight = window.innerHeight - this.getOccupiedHeight(parentContainer, viewItemStyle);
        const horizontalPadding = parseInt(viewItemStyle.paddingLeft) + parseInt(viewItemStyle.paddingRight);
        const scrollbarWidth = 19;
        const containerWidth = parentContainer?.clientWidth ?? 0;
        element.style.maxWidth = `${containerWidth - scrollbarWidth - horizontalPadding}px`;
        if (this.automaticallyAdjustHeight) {
            element.style.maxHeight = `${maxHeight}px`;
        }
    }
    handleMediaError(url) {
        console.log(`Failed to load media ${url}`);
        dispatchViewingFailedToLoadEvent(this.eventId, this);
    }
}
customElements.define("media-viewer", MediaViewer);
