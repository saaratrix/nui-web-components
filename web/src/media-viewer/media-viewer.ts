import { dispatchViewingFailedToLoadEvent, MediaType, MediaTypes, ControlsPlacement, controlsPlacementValues, defaultControlsPlacement, dispatchViewingItemChangedEvent, Subtitle } from './media-viewer-models.js';
import type { MediaViewerControls } from './media-viewer-controls.js';
import './media-viewer-controls.js';

type MediaAndMimeType = [mediaType: MediaTypes, mimeType: string];

const mediaAndMimeTypesFromExtension = new Map<string, MediaAndMimeType>([
  // Images
  ['.png',  [MediaType.Image, 'image/png'] ],
  ['.jpg',  [MediaType.Image, 'image/jpeg'] ],
  ['.jpeg', [MediaType.Image, 'image/jpeg'] ],
  ['.gif',  [MediaType.Image, 'image/gif'] ],
  ['.bmp',  [MediaType.Image, 'image/bmp'] ],
  ['.tiff', [MediaType.Image, 'image/tiff'] ],
  ['.webp', [MediaType.Image, 'image/webp'] ],
  ['.avif', [MediaType.Image, 'image/avif'] ],

  // Textures
  ['.tga',  [MediaType.Image, 'image/x-tga']],
  // Video
  ['.mp4', [MediaType.Video, 'video/mp4'] ],
  // Technically 'video/x-matroska', but video/mp4 makes em play in chrome at least.
  ['.mkv', [MediaType.Video, 'video/mp4']],
  ['.flv', [MediaType.Video, 'video/x-flv'] ],
  ['.webm',[MediaType.Video, 'video/webm'] ],
  ['.mov', [MediaType.Video, 'video/quicktime'] ],
  ['.avi', [MediaType.Video, 'video/x-msvideo'] ],
  ['.m4v', [MediaType.Video, 'video/x-m4v'] ],
  // Audio
  ['.mp3', [MediaType.Audio, 'audio/mpeg'] ],
  ['.wav', [MediaType.Audio, 'audio/wav'] ],
  ['.aac', [MediaType.Audio, 'audio/aac'] ],
  ['.flac', [MediaType.Audio, 'audio/flac'] ],
  ['.ogg', [MediaType.Audio, 'audio/ogg'] ],
  ['.m4a', [MediaType.Audio, 'audio/x-m4a'] ],
]);

const mimeTypesToMediaType = new Map<string, MediaTypes>(
  [...mediaAndMimeTypesFromExtension.values()].map(
    ([mediaType, mimeType]) => [mimeType, mediaType]
  )
);

let _createdElements = 0;
export class MediaViewer extends HTMLElement {
  static observedAttributes = ['src', 'mime-type', 'parent', 'auto-height', 'subtitles'];

  shadow: ShadowRoot;
  activeMediaType: MediaTypes = MediaType.Unknown;

  _createdId: number;
  private _showControls = false;
  private _controlsElement: MediaViewerControls | null = null;

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
          transition: transform 100ms ease-in-out;
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
          <!-- Controls will be inserted here. -->
        </div>
      </div>
    `;
  }

  get eventId(): string {
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

  get mimeType(): string | null {
    return this.getAttribute("mime-type");
  }

  set mimeType(value: string | null | undefined) {
    if (!value) {
      this.removeAttribute("mime-type");
    } else {
      const valueLower = value.toLowerCase();
      mimeTypesToMediaType.has(valueLower) ? this.setAttribute("mime-type", valueLower) : this.removeAttribute("mime-type");
    }
  }

  private _parentContainer: HTMLElement | null = null;
  get parentContainer(): HTMLElement {
    if (this._parentContainer) {
      return this._parentContainer;
    }

    const parentContainerQuery = this.getAttribute("parent");
    const parentContainer = (parentContainerQuery && document.querySelector<HTMLElement>(parentContainerQuery)) || this.parentElement;

    return parentContainer!;
  }

  set parentContainer(value: HTMLElement | null) {
    this._parentContainer = value;
  }

  get automaticallyAdjustHeight(): boolean {
    const value = this.getAttribute("auto-height") ?? '';
    return value.toLowerCase() === 'true';
  }

  set automaticallyAdjustHeight(value: boolean | null) {
    value == null
      ? this.removeAttribute('auto-height')
      : this.setAttribute('auto-height', value ? 'true' : 'false');

    if (!value && this.viewItemElement?.firstElementChild) {
      (this.viewItemElement.firstElementChild as HTMLElement).style.maxHeight = '';
    }
  }

  get controlsPlacement(): ControlsPlacement | null {
    const value = this.getAttribute('controls-placement')?.toLowerCase();
    if (!value) {
      return null;
    }
    return controlsPlacementValues.has(value as ControlsPlacement) ? value as ControlsPlacement : defaultControlsPlacement;
  }

  set controlsPlacement(value: ControlsPlacement | null) {
    if (!value) {
      this.hideControls();
      return;
    }

    value = value.toLowerCase() as ControlsPlacement;
    if (!controlsPlacementValues.has(value)) {
      value = defaultControlsPlacement;
    }
    this.setAttribute("controls-placement", value);
    this.showControls(value);
  }

  private showControls(placement: ControlsPlacement) {
    if (this._showControls) {
      this.controlsElement!.placement = placement;
      return;
    }
    this._showControls = true;
    let controlsElement = this.controlsElement;
    if (!controlsElement) {
      controlsElement = document.createElement('media-viewer-controls') as MediaViewerControls;
    }

    const containerItem = this.shadow.querySelector<HTMLElement>('.item-container');
    containerItem?.appendChild(controlsElement);
    controlsElement.placement = placement;
  }

  private hideControls() {
    if (!this._showControls) {
      return;
    }
    this._showControls = false;
    this.controlsElement?.remove();
  }

  private _viewerContainerElement: HTMLElement | null = null;
  get viewerContainer(): HTMLElement {
    if (!this._viewerContainerElement) {
      this._viewerContainerElement = this.shadow.querySelector('.container');
    }
    return this._viewerContainerElement!;
  }

  private _viewItemElement: HTMLElement | null = null;
  get viewItemElement(): HTMLElement {
    if (!this._viewItemElement) {
      this._viewItemElement = this.shadow.querySelector('.item');
    }

    return this._viewItemElement!;
  }

  private _subtitles: Subtitle[] | null = null;
  get subtitles(): Subtitle[] | null {
    if (this._subtitles) {
      return this._subtitles;
    }

    const subtitlesRaw = this.getAttribute("subtitles");
    if (!subtitlesRaw) {
      return null;
    }

    let result: Subtitle[] = [];
    const items = subtitlesRaw.split('|');
    for (let i = 0; i < items.length; i += 3) {
      const src = items[i];
      const label = items[i + 1];
      const srclang = items[i + 2];

      if (!src || !label || !srclang) {
        continue;
      }

      result.push({
        src: src.trim(),
        label: label.trim(),
        srclang: srclang.trim(),
      });
    }

    this._subtitles = result;
    return result;
  }

  set subtitles(subtitles: Subtitle[] | null) {
    this._subtitles = subtitles;
    if (!subtitles) {
      this.removeAttribute('subtitles');
    } else {
      const subtitlesRaw = subtitles.map(s => [s.src, s.label, s.srclang]).join(',');
      this.setAttribute("subtitles", subtitlesRaw);
    }
  }

  get controlsElement(): MediaViewerControls | null {
    if (!this._controlsElement) {
      this._controlsElement = this.shadow.querySelector('media-viewer-controls');
    }
    return this._controlsElement;
  }

  connectedCallback() {
    const placement = this.controlsPlacement;
    if (placement) {
      this.showControls(placement);
    }
    this.renderViewItem(true);
  }

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown) {
    if (name === 'auto-height') {
      const item = this.viewItemElement?.firstElementChild as HTMLElement | null;
      item && this.setMaxDimensions(item);
      return;
    }

    if (name === 'parent') {
      this._parentContainer = null;
    }

    let shouldRender = oldValue !== newValue;
    this.renderViewItem(shouldRender);
  }

  _lastRender: { src: string, mediaType: MediaTypes } | undefined;
  renderViewItem(render: boolean) {
    if (!render) {
      return;
    }

    const src = this.src;
    const [mediaType, mimeType] = this.getTypes(src) ?? [];
    if (!mediaType || !mimeType) {
      this.viewItemElement.replaceChildren();
      this._lastRender = undefined;
      this.activeMediaType = MediaType.Unknown;
      dispatchViewingItemChangedEvent(this.eventId, this, this.activeMediaType);
      return;
    }
    if (this._lastRender?.src === src && this._lastRender?.mediaType === mediaType) {
      return;
    }

    this.activeMediaType = mediaType;
    this.viewItemElement.replaceChildren();
    this._lastRender = { src, mediaType };

    if (mediaType === MediaType.Image) {
      this.renderImage(src);
    } else if (mediaType == MediaType.Video) {
      this.renderVideo(src, mimeType);
    } else if (mediaType === MediaType.Audio) {
      // this.renderAudio(extension);
    }

    dispatchViewingItemChangedEvent(this.eventId, this, this.activeMediaType);
  }

  renderImage(src: string) {
    const image = new Image();
    image.src = src;
    image.draggable = false;

    image.onerror = () => {
      dispatchViewingFailedToLoadEvent(this.eventId, this);
    }

    this.setMaxDimensions(image);
    this.viewItemElement.appendChild(image);
  }

  getTypes(src: string | undefined): MediaAndMimeType | undefined {
    if (!src) {
      return undefined;
    }

    const result = this.getTypesFromSrc(src);
    if (result) {
      return result;
    }

    return this.tryGetTypesFromMimeTypeAttribute();
  }

  tryGetTypesFromMimeTypeAttribute(): MediaAndMimeType | undefined {
    const existingMimeType = this.mimeType;
    if (!existingMimeType) {
      return undefined;
    }

    return mimeTypesToMediaType.has(existingMimeType) ? [mimeTypesToMediaType.get(existingMimeType)!, existingMimeType] as const : undefined;
  }

  getTypesFromSrc(src: string | undefined): MediaAndMimeType | undefined {
    if (!src) {
      return undefined;
    }

    const extension = '.' + src.split('.').pop()!.toLowerCase();
    if (mediaAndMimeTypesFromExtension.has(extension)) {
      return mediaAndMimeTypesFromExtension.get(extension);
    }

    return undefined;
  }

  renderSubtitles(): string {
    const subtitles = this.subtitles;
    if (!subtitles) {
      return '';
    }

    let subtitlesHtml = '';

    for (const subtitle of subtitles) {
      // TODO: This should be setting or something.
      const defaultHtml = subtitle.srclang === 'en' ? 'default' : '';

      const html = `
<track
  label=${subtitle.label}
  src="${subtitle.src}"
  srclang=${subtitle.srclang}
  kind="subtitles"
  ${defaultHtml}
/>`;
      subtitlesHtml += html;
    }

    return subtitlesHtml;
  }

  renderVideo(src: string, mimeType: string) {
    const subtitlesHtml = this.renderSubtitles();

    this.viewItemElement.innerHTML = `<video controls autoplay draggable="false">
        <source src="${ src }" type="${ mimeType }">
        ${subtitlesHtml}
      </video>`;

    const videoElement = this.viewItemElement.querySelector('video') as HTMLVideoElement;
    this.setMaxDimensions(videoElement);

    videoElement.querySelector<HTMLSourceElement>('source')!.onerror = () => this.handleMediaError(src);
  }

  private getOccupiedHeight(parentContainer: HTMLElement, itemStyle: CSSStyleDeclaration): number {
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

  private setMaxDimensions(element: HTMLElement): void {
    const parentContainer = this.parentContainer;
    const viewItem = this.viewItemElement;
    const viewItemStyle = getComputedStyle(viewItem);
    const maxHeight = window.innerHeight - this.getOccupiedHeight(parentContainer,  viewItemStyle);

    const horizontalPadding = parseInt(viewItemStyle.paddingLeft) + parseInt(viewItemStyle.paddingRight);
    const scrollbarWidth = 19;
    const containerWidth = parentContainer?.clientWidth ?? 0;
    element.style.maxWidth = `${ containerWidth - scrollbarWidth - horizontalPadding }px`;

    if (this.automaticallyAdjustHeight) {
      element.style.maxHeight = `${maxHeight}px`;
    }
  }

  private handleMediaError(url: string) {
    console.log(`Failed to load media ${url}`);
    dispatchViewingFailedToLoadEvent(this.eventId, this);
  }
}

customElements.define("media-viewer", MediaViewer);