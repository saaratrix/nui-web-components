import type { FilePickerPreview } from './file-picker-preview.js';
import './file-picker-preview.js';
import { defaultFullpageDnDCSS, FullpageDragAndDrop } from '../drag-and-drop/fullpage-drag-and-drop.js';

const defaultPreviewMaxSize = 128;
/**
 * Attributes:
 * fullpage-dnd: Drag & drop a file anywhere and it'll go to this file picker.
 * fullpage-paste: paste almost anywhere and it'll be as pasting to this file picker.
 * expandable-preview: If you click on the preview item it expands it so it's larger.
 *
 * Parts:
 * dnd-area: The drag and drop area, surprise!
 */
// A.k.a: The Great Chooser of Thingies
export class SingleFilePicker extends HTMLElement {
  // fullpage-dnd meaning if drag & drop is global.
  //
  static observedAttributes = ['accept', 'fullpage-dnd', 'fullpage-paste', 'expandable-preview'];

  private shadow: ShadowRoot;

  fileInput: HTMLInputElement;
  private selectionTextContainer: HTMLElement;
  private previewContainer: HTMLElement;
  private filename: HTMLElement;
  private size: HTMLElement;
  private pickerPreview: FilePickerPreview;

  private dndAreaElement: HTMLElement;
  private fullpageDragAndDrop: FullpageDragAndDrop | null = null

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        :host {
            --hover-bg-color: linear-gradient(
              rgb(0 0 0 / 10%),
              rgb(0 0 0 / 10%)
          );
          --remove-btn-color: crimson;
          --remove-btn-bg: none;
          --remove-btn-bg-border: 1px solid #ffc0cb;
          --remove-btn-active-bg: #ffe7ec;
          
          --drag-drop-area-bg: #62508f;         
        }
      
        .file-picker {
            display: flex;
            width: 100%;
            max-width: 480px;
            height: ${this.previewMaxSize}px;
        }
        
        .selection-icon {
            display: flex;
            cursor: pointer;
            align-items: center;
        }
        
        .selection-icon svg {
            border-radius: 25%;
            padding: 0.5em;
        }
        
        /* For simplicity this could just be: .file-picker:hover .selection-icon { }  */
        .selection-icon:hover svg, .file-picker:has(.selection-text:hover, .selection-text:focus-visible) .selection-icon svg {
            background-image: var(--hover-bg-color);
        }
        
        .selection-text, .preview {
            display: flex;
            flex: 1 1 auto;
            padding: 0 0.5rem;
        }
        
        .selection-text {
            flex-direction: column;
            justify-content: center;
            cursor: pointer;
        }
        
        .preview {
            gap: 0.5rem;
            /* For not flexbox overflowing */
            min-width: 0;
        }
        
        .file-name {
            /* display & max-width needed to make overflow: hidden work. */
            display: inline-block;
            max-width: 100%;
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
            font-weight: bold;
        }
        
        .metadata {
            font-size: 0.85em;
            font-family: monospace;
        }
        
        .preview-item {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
        }
        
        .preview-body {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            justify-content: space-between;
            flex: 1 1 auto;
            min-width: 0;
        }
        
        .info {
            margin-top: 0.5rem;
        }
        
        .remove {
            color: var(--remove-btn-color);
            background: var(--remove-btn-bg);
            padding: 0.25rem 0.5rem;
            margin-top: 0.5rem;
            border-radius: 0.5rem;
            border: var(--remove-btn-bg-border);
        }
        
        .remove:active {
            background: var(--remove-btn-active-bg);
        }
        
        .strip-button {
          appearance: none;
          -webkit-appearance: none;
          font: inherit;
          cursor: pointer;
        }
        
        [hidden] {
            display: none !important;
        }
        
        ${defaultFullpageDnDCSS}
      </style>
      <div class="file-picker" for="file-input">
        <div class="selection-icon">
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4M12 4L7.5 8.5M12 4L16.5 8.5M5 19V21H19V19"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
              />
        </div>
        <label class="selection-text" for="file-input">
          <strong>Choose a file</strong>
          <small>or drag and drop it anywhere.</small>
        </label>
        <div class="preview" hidden>
            <div class="preview-item">
                <file-picker-preview max-size="${this.previewMaxSize}"></file-picker-preview>
            </div>
            <div class="preview-body">
                <div>
                    <span class="file-name"></span>
                    <div class="metadata">
                        <span class="size"></span>
                    </div>
                    
                </div>
                <small class="info">Drop another file to replace.</small>
                <div>
                    <button class="strip-button remove" part="remove-button">Clear</button>
                </div>
            </div>
        </div>
        <input class="file-input" type="file" id="file-input" hidden>  
      </div>
      <div class="drag-drop-area">
        <slot name="dnd-content">
          <p>
            Drop file anywhere.
          </p>
        </slot>
      </div>
    `;

    this.fileInput = this.shadow.querySelector('input[type=file]') as HTMLInputElement;
    this.shadow.querySelector('.selection-icon')!.addEventListener('click', () => this.fileInput.click());
    this.selectionTextContainer = this.shadow.querySelector('.selection-text') as HTMLElement;
    this.previewContainer = this.shadow.querySelector('.preview') as HTMLElement;
    this.pickerPreview = this.previewContainer.querySelector('file-picker-preview') as FilePickerPreview;

    this.previewContainer.querySelector('.remove')!.addEventListener('click', () => this.clear());
    this.filename = this.previewContainer.querySelector('.file-name') as HTMLElement;
    this.size = this.previewContainer.querySelector('.size') as HTMLElement;

    this.dndAreaElement = this.shadow.querySelector('.drag-drop-area') as HTMLElement;

    this.fileInput.addEventListener('change', (e) => {
      this.onFileChanged(e);
      this.dispatchEvent(new CustomEvent('change', {
        detail: {
          files: this.fileInput.files,
          originalEvent: e,
        },
        bubbles: true,
        composed: true,
      }));
    });
  }

  get files(): FileList | null {
    return this.fileInput.files;
  }

  get previewMaxSize(): number {
    const maxSize = parseInt(this.getAttribute('preview-max-size') ?? '', 10);
    if (!Number.isNaN(maxSize)) {
      return maxSize;
    }

    return defaultPreviewMaxSize;
  }

  connectedCallback() {
    if (this.hasAttribute('fullpage-paste') && !this.isFullpagePasteEnabled) {
      document.addEventListener('paste', this.onFullpagePaste);
      this.isFullpagePasteEnabled = true;
    }

    if (this.hasAttribute('fullpage-dnd')) {
      this.addFullpageDnd();
    }
  }

  disconnectedCallback() {
    this.removeFullPageListener();
    this.removeFullpageDnd();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'accept') {
      this.fileInput.accept = newValue ?? '';
    } else if (name === 'fullpage-paste') {
      this.onFullpagePasteChanged(newValue);
    } else if (name === 'fullpage-dnd') {
      this.onFullpageDnd(newValue);
    } else if (name === 'expandable-preview') {
      this.pickerPreview.toggleAttribute('expandable-preview', !!newValue);
    }
  }

  dispatchFilesChangedEvent(originalEvent: Event | DragEvent | null) {
    this.fileInput.dispatchEvent(new CustomEvent('change', {
      detail: {
        files: this.fileInput.files,
        originalEvent,
      },
      bubbles: true,
      composed: true,
    }));
  }

  clear() {
    this.fileInput.value = '';
    this.dispatchFilesChangedEvent(null);
    this.pickerPreview.clear();
    this.previewContainer.title = '';
  }

  private onFileChanged(e: Event) {
    this.pickerPreview.clear();

    const hasFile = !!this.files?.[0];
    this.selectionTextContainer.hidden = hasFile;
    this.previewContainer.hidden = !hasFile;

    if (!hasFile) {
      this.previewContainer.title = '';
      this.pickerPreview.clear();
      return;
    }
    const file = this.files[0] as File;

    this.filename.innerText = file.name;
    this.previewContainer.title = `File: ${file.name}`;
    (this.previewContainer.querySelector('.remove') as HTMLElement).title = `Clear file`;

    // Size math
    const sizeSuffix = file.size < 1024 * 1024 ? 'KiB' : 'MiB';
    const sizeDivision = sizeSuffix === 'KiB' ? 1024 : 1024 * 1024;
    const formattedSize = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(file.size / sizeDivision);
    this.size.innerText = `${formattedSize} ${sizeSuffix}`;

    this.pickerPreview.updateFromFile(file);
  }

  isFullpagePasteEnabled = false;
  private onFullpagePasteChanged(value: string | null) {
    // Turned off!
    if (value === null) {
      this.removeFullPageListener();
    } else {
      if (!this.isFullpagePasteEnabled) {
        document.addEventListener('paste', this.onFullpagePaste);
      }
      this.isFullpagePasteEnabled = true;
    }
  }

  private removeFullPageListener(): void {
    document.removeEventListener('paste', this.onFullpagePaste);
    this.isFullpagePasteEnabled = false;
  }

  private onFullpagePaste = (event: ClipboardEvent) => {
    const items = (event.clipboardData || (window as any).clipboardData).items;

    for (let index in items) {
      const item = items[index];
      // Check if the item is an image file
      if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();

        // For simplicity, handling only the first image found
        if (!file) {
          break;
        }
        const dt = new DataTransfer();
        dt.items.add(file);
        this.fileInput.files = dt.files;
        this.dispatchFilesChangedEvent(event);
        break;
      }
    }
  }

  private onFullpageDnd(value: string | null) {
    if (value === null) {
      this.removeFullpageDnd();
    } else {
      this.addFullpageDnd();
    }
  }

  private removeFullpageDnd(): void {
    this.dndAreaElement.classList.add('hidden');
    this.fullpageDragAndDrop?.removeEventListeners();
  }

  private addFullpageDnd(): void {
    if (!this.fullpageDragAndDrop) {
      this.fullpageDragAndDrop = new FullpageDragAndDrop(this.dndAreaElement, {
        onDrop: this.onDragDrop,
      });
    }

    this.dndAreaElement.classList.remove('hidden');
    this.fullpageDragAndDrop!.tryAddEventListeners();
  }

  private onDragDrop = (event: DragEvent) => {
    const files = event.dataTransfer?.files;
      if (!files || files.length !== 1) {
        return;
      }

      this.fileInput.files = event.dataTransfer.files;
      this.dispatchFilesChangedEvent(event);
  }
}

customElements.define('single-file-picker', SingleFilePicker);