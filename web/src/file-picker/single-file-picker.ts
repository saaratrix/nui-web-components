import type { FilePickerPreview } from './file-picker-preview.js';
import './file-picker-preview.js';

// A.k.a: The Great Chooser of Thingies

/**
 * fullpage-dnd: Drag & drop a file anywhere and it'll go to this file picker.
 * fullpage-paste: paste almost anywhere and it'll be as pasting to this file picker.
 * expandable-preview: If you click on the preview item it expands it so it's larger.
 */
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
         
        }
      
        .file-picker {
            display: flex;
            width: 100%;
            max-width: 480px;
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
        }
        
        .file-name {
            font-weight: bold;
        }
        
        .metadata {
            font-size: 0.85em;
            font-family: monospace;;
        }
        
        .preview-body {
            display: flex;
            flex-direction: column;
            flex-gap: 0.25rem;
            justify-content: space-between;
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
                <file-picker-preview max-size="128"></file-picker-preview>
            </div>
            <div class="preview-body">
                <div>
                    <span class="file-name"></span>
                    <div class="metadata">
                        <span class="size"></span>
                    </div>
                    
                </div>
                <small class="info">Drag and drop another file to replace.</small>
                <div>
                    <button class="strip-button remove" part="remove-button">Remove file</button>
                </div>
            </div>
        </div>
        <input class="file-input" type="file" id="file-input" hidden>  
      </div>
    `;

    this.fileInput = this.shadow.querySelector('input[type=file]') as HTMLInputElement;
    this.selectionTextContainer = this.shadow.querySelector('.selection-text') as HTMLElement;
    this.previewContainer = this.shadow.querySelector('.preview') as HTMLElement;
    this.pickerPreview = this.previewContainer.querySelector('file-picker-preview') as FilePickerPreview;

    this.previewContainer.querySelector('.remove')!.addEventListener('click', () => this.clear());
    this.filename = this.previewContainer.querySelector('.file-name') as HTMLElement;
    this.size = this.previewContainer.querySelector('.size') as HTMLElement;


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

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'accept') {
      this.fileInput.accept = newValue ?? '';
    } else if (name === 'fullpage-paste') {
      this.onFullpagePasteChanged(newValue);
    } else if (name === 'fullpage-dnd') {
      this.onFullpageDnd(newValue);
    } else if (name === 'expandable-preview') {
      newValue ? this.pickerPreview.setAttribute('expandable-preview', '') : this.pickerPreview.removeAttribute('expandable-preview');
    }
  }

  clear() {
    this.fileInput.value = '';
    this.fileInput.dispatchEvent(new CustomEvent('change', {
      detail: {
        files: this.fileInput.files,
        originalEvent: null,
      },
      bubbles: true,
      composed: true,
    }));
    this.pickerPreview.clear();
  }

  private onFileChanged(e: Event) {
    this.pickerPreview.clear();

    const hasFile = !!this.files?.[0];
    this.selectionTextContainer.hidden = hasFile;
    this.previewContainer.hidden = !hasFile;

    if (!hasFile) {
      this.pickerPreview.clear();
      return;
    }
    const file = this.files[0] as File;

    this.filename.innerText = file.name;

    // Size math
    const sizeSuffix = file.size < 1024 * 1024 ? 'KiB' : 'MiB';
    const sizeDivision = sizeSuffix === 'KiB' ? 1024 : 1024 * 1024;
    const formattedSize = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 3,
    }).format(file.size / sizeDivision);
    this.size.innerText = `${formattedSize} ${sizeSuffix}`;

    this.pickerPreview.updateFromFile(file);
  }

  isGlobalPasteEnabled = false;
  private onFullpagePasteChanged(value: string | null) {

  }

  isGlobalDnd = false;
  private onFullpageDnd(value: string | null) {

  }
}

customElements.define('single-file-picker', SingleFilePicker);