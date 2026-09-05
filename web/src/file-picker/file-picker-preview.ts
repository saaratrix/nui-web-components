import { getFilePreviewSvg } from './get-file-preview-svg.js';

export const PreviewType = {
  Unknown: 'unknown',
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
} as const;

const previewItemPart = 'preview-item';
// Because we're dealing with File type we need to extract a thumbnail etc out of it.
export class FilePickerPreview extends HTMLElement {
  previewObjectUrl: string = '';

  private shadow: ShadowRoot;
  private container: HTMLElement;

  static defaultMaxSize = 64;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
    <style>
        .container {
            display: flex;
            justify-content: center;
            width: ${this.maxSize}px;
        }
        
        img, video, audio {
            max-width: 100%;
        }
        
        img, video {
            max-height: ${this.maxSize}px;
        }
    </style>
    <div class="container"></div>
    `;

    this.container = this.shadow.querySelector('.container') as HTMLElement;
  }

  disconnectedCallback() {
    this.clear();
  }

  get maxSize(): number {
    const attr = this.getAttribute('max-size') ?? '';
    const size = parseInt(attr, 10);
    if (Number.isNaN(size)) {
      return FilePickerPreview.defaultMaxSize;
    }

    return size;
  }

  get previewContainer(): HTMLElement {
    return this.container;
  }

  get previewItem(): HTMLImageElement | HTMLVideoElement | HTMLAudioElement | HTMLOrSVGElement | null {
    const item = this.container.firstElementChild;
    if (!item) {
      return null;
    }

    const node = item.nodeName;
    switch (node) {
      case 'AUDIO':
        return item as HTMLAudioElement;
      case 'IMG':
        return item as HTMLImageElement;
      case 'SVG':
        return item as SVGElement;
      case 'VIDEO':
        return item as HTMLVideoElement;
    }

    return null;
  }

  clear() {
    URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = '';

    while (this.container.firstChild) { this.container.removeChild(this.container.firstChild); }
    this.container.style.maxWidth = '';
    this.container.style.maxHeight = '';
    this.container.style.width = '';
  }

  updateFromFile(file: File) {
    if (this.previewObjectUrl !== '') {
      this.clear();
    }

    this.previewObjectUrl = URL.createObjectURL(file);

    const previewType = FilePickerPreview.getPreviewType(file);
    switch (previewType) {
      case PreviewType.Image:
        this.previewImage(file);
        break;
      case PreviewType.Video:
        this.previewVideo(file);
        break;
      case PreviewType.Audio:
        this.previewAudio(file);
        break;
      default:
        // If unknown just draw a square with file type.
        this.previewUnknownIcon(file);
        break;
    }
  }

  public async getThumbnailAsBase64(size?: number): Promise<string> {
    const container = this.container;
    const image = container.querySelector('img');
    size ??= this.maxSize;
    if (image) {
      return this.getThumbnailAsBase64FromImage(image, size);
    }
    const video = container.querySelector('video');
    if (video) {
      return this.getThumbnailAsBase64FromVideo(video, size);
    }

    return '';
  }

  private getThumbnailAsBase64FromImage(image: HTMLImageElement, size: number) {
    let thumbnailSize = Math.min(size, Math.max(image.naturalWidth, image.naturalHeight));

    const widthRatio = thumbnailSize / image.width;
    const heightRatio = thumbnailSize / image.height;
    const scale = Math.min(widthRatio, heightRatio);

    const canvasWidth = scale * image.width;
    const canvasHeight = scale * image.height;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);

    const dataUrl = canvas.toDataURL();
    return dataUrl;
  }

  /**
   * Get thumbnail from video as base 64, currently doesn't seek or anything so whatever the user has the frame as, we'll use that.
   * @param video
   * @private
   */
  private getThumbnailAsBase64FromVideo(video: HTMLVideoElement, size: number): Promise<string> {
    const currentTime = video.currentTime;
    video.currentTime = 0;

    return new Promise<string>(res => {
      video.addEventListener('seeked', () => {
        const thumbnailSize = Math.min(size, Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        const scale = Math.min(thumbnailSize / video.videoWidth, thumbnailSize / video.videoHeight);

        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL();

        video.currentTime = currentTime;
        res(dataUrl);
      }, { once: true });
    });
  }

  private previewImage(_: File): void {
    const img = document.createElement('img');
    img.part =  previewItemPart;
    const container = this.container;

    img.addEventListener('load', () => {
      // Change the size of preview element to better vertically center the image so there is less padding from upload button and image if the image is smaller than preview.
      const imageMax =  Math.max(img.naturalWidth, img.naturalHeight);
      const maxSize = this.maxSize;

      const containerWidth = container.offsetWidth || maxSize;
      const max = Math.min(imageMax, containerWidth, maxSize);
      container.style.maxWidth = `${max}px`;
      container.style.maxHeight = `${max}px`;

      // Eg for a 1024x512 image we take 128 / 1024 and get 1 / 8
      const sizeRatio = Math.min(max / imageMax, 1);
      const width = img.naturalWidth * sizeRatio;

      this.container.style.width = `${width}px`;

    }, { once: true });

    container.appendChild(img);
    img.src = this.previewObjectUrl;
  }

  private previewVideo(file: File): void {
    const video = document.createElement('video');
    video.controls = true;
    video.part = previewItemPart;

    video.addEventListener('loadedmetadata', () => {
      const imageMax =  Math.max(video.videoWidth, video.videoHeight);
      const containerWidth = this.container.offsetWidth || this.maxSize;
      const max = Math.min(imageMax, containerWidth, this.maxSize);
      this.container.style.maxWidth = `${max}px`;
      this.container.style.maxHeight = `${max}px`;
    }, { once: true });

    const source = document.createElement('source');
    source.type = file.type;
    source.src = this.previewObjectUrl;
    video.appendChild(source);
    this.container.appendChild(video);
  }

  private previewAudio(file: File): void {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.part = previewItemPart;
    audio.innerHTML = `<source src="${this.previewObjectUrl}" type="${file.type}">`

    this.container.appendChild(audio);
  }

  static getPreviewType(file: File | undefined): typeof PreviewType[keyof typeof PreviewType] {
    if (!file) {
      return PreviewType.Unknown;
    }

    if (file.type.startsWith('image')) {
      return PreviewType.Image;
    } else if (file.type.startsWith('video')) {
      return PreviewType.Video
    } else if (file.type.startsWith('audio')) {
      return PreviewType.Audio;
    }

    return PreviewType.Unknown;
  }

  private previewUnknownIcon(file: File) {
    const extension = file.name.split('.').pop() || '';
    const svg = getFilePreviewSvg(extension);

    this.container.innerHTML = svg;
  }
}

customElements.define('file-picker-preview', FilePickerPreview);