import { MediaViewerItemChangedEvent, viewingItemChangedEvent } from './media-viewer-models.js';
import { applyMediaViewerSharedCSS } from './media-viewer-shared.js';
import { MediaViewerControls } from './media-viewer-controls';
import { MediaViewer } from './media-viewer';

export class MediaViewerControlsRotate extends HTMLElement {
  shadow: ShadowRoot;

  private _rotation: number = 0;

  mediaViewer!: MediaViewer;
  rotateLeft: HTMLButtonElement | null = null;
  rotateRight: HTMLButtonElement | null = null;

  // TODO: This needs to be updated also if parentContainer changes, not if just view item changes.
  viewContainerSize: { width: number, height: number } | undefined = undefined;

  // Bit excessive typing, was just curious if it works, and it does :P
  translatePart: ` translate(${number}px, ${number}px)` | '' = '';

  get rotation(): number {
    return this._rotation;
  }

  set rotation(value: number) {
    this._rotation = value;
  };

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    applyMediaViewerSharedCSS(this.shadow);

    this.shadow.innerHTML = `
      <style>
          .controls-rotate {
              display: inline-flex;
              gap: 0.5rem;
          }
          
          .icon-action {
          
          }
      </style>
      <div class="controls-rotate">
          <button class="rotate-left icon-action" title="Rotate 90° left.">⟲ 90°</button>
          <button class="rotate-right icon-action" title="Rotate 90° right.">⟳ 90°</button>
      </div>
    `;
  }

  connectedCallback () {
    window.addEventListener(viewingItemChangedEvent, this.onViewingItemChanged)

    this.rotateLeft = this.shadow.querySelector('.rotate-left') as HTMLButtonElement;
    this.rotateRight = this.shadow.querySelector('.rotate-right') as HTMLButtonElement;

    if (!this.mediaViewer) {
      const host = ((this.getRootNode() as ShadowRoot).host as MediaViewerControls);
      this.mediaViewer = host?.mediaViewer;
    }

    if (!this.rotateLeft || !this.rotateRight || !this.mediaViewer) {
      return;
    }

    this.rotateLeft.addEventListener('click', this.onRotateLeft);
    this.rotateRight.addEventListener('click', this.onRotateRight);
  }

  disconnectedCallback () {
    window.removeEventListener(viewingItemChangedEvent, this.onViewingItemChanged)

    if (!this.rotateLeft || !this.rotateRight) {
      return;
    }

    this.rotateLeft.removeEventListener('click', this.onRotateLeft);
    this.rotateRight.removeEventListener('click', this.onRotateRight);
  }

  private onViewingItemChanged = (e: Event) => {
    const event = e as CustomEvent<MediaViewerItemChangedEvent>;
    if (this.mediaViewer !== event.detail.mediaViewer) {
      return;
    }

    this.rotation = 0;
    this.viewContainerSize = undefined;
    this.translatePart = '';
  };

  private onRotateLeft = () => {
    console.log('rotate left!');

    this.rotation -= 90;
    // Need to blur or the :active state gets stuck.
    this.rotateLeft!.blur();
    this.calculateTranslation();
    this.mediaViewer.viewItemElement.style.transform = `rotate(${this.rotation}deg)${this.translatePart}`;
  };

  private onRotateRight = () => {
    this.rotation += 90;
    // Need to blur or the :active state gets stuck.
    this.rotateRight!.blur();
    this.calculateTranslation();
    this.mediaViewer.viewItemElement.style.transform = `rotate(${this.rotation}deg)${this.translatePart}`;
  };

  private calculateTranslation(): void {
    if (!this.viewContainerSize) {
      // For example a too wide image will be pushed too far up so you can't see the full picture.
      const viewItemContainer = this.mediaViewer.parentContainer!;
      this.viewContainerSize = {
        width: viewItemContainer.offsetWidth,
        height: viewItemContainer.offsetHeight,
      }
    }

    const rotation = Math.abs((this.rotation % 360) + 360) % 360;
    if (this.viewContainerSize.width === this.viewContainerSize.height || rotation === 0 || rotation === 180) {
      this.translatePart = '';
      return;
    }

    const direction = rotation === 90 ? 1 : -1;
    if (this.viewContainerSize.width > this.viewContainerSize.height) {
      const difference = (this.mediaViewer.offsetWidth - this.viewContainerSize.height) / 2;
      this.translatePart = ` translate(${difference * direction}px, 0px)`;
    }
    else {
      // I'm not exactly sure why 32 but seems to be related to padding, and a tall image is already capped in some ways width wise.
      const difference = 32;
      this.translatePart = ` translate(0px, ${difference * -direction}px)`;
    }
  }
}

customElements.define('media-viewer-controls-rotate', MediaViewerControlsRotate);