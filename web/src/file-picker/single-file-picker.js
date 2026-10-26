import './file-picker-preview.js';
import { defaultFullpageDnDCSS, FullpageDragAndDrop } from '../drag-and-drop/fullpage-drag-and-drop.js';
const defaultPreviewMaxSize = 128;
;
// TODO: Change 'or drag & drop it anywhere' to only be visible if fullpage-dnd is enabled.
/**
 * Attributes:
 * fullpage-dnd: Drag & drop a file anywhere and it'll go to this file picker.
 * fullpage-paste: paste almost anywhere and it'll be as pasting to this file picker.
 * expandable-preview: If you click on the preview item it expands it so it's larger.
 * preview-max-size: the max size of the preview item, default is 128.
 * icon-only: Skip 'Choose a file or drag & drop it anywhere'
 *
 * Slots:
 * slot="icon": The selection svg icon. Might not work if not an svg.
 * slot="text": The selection text, "Choose a file ..."
 * slot="dnd-content": The content of the drag & drop if enabled.
 *
 * CSS Parts:
 * ::part(dnd-area): The drag and drop area, surprise!
 * ::part(preview): The preview container
 */
// A.k.a: The Great Chooser of Thingies
export class SingleFilePicker extends HTMLElement {
    // fullpage-dnd meaning if drag & drop is global.
    static observedAttributes = ['accept', 'fullpage-dnd', 'fullpage-paste', 'expandable-preview', 'icon-only', 'no-preview'];
    shadow;
    fileInput;
    selectionTextContainer;
    previewContainer;
    filename;
    size;
    pickerPreview;
    dndAreaElement;
    fullpageDragAndDrop = null;
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
          --remove-btn-active-bg: #ffe7ec;
          --remove-btn-hover-bg: #ffe7ec;
          --remove-btn-hover-color: crimson;
          --remove-btn-bg-border: 1px solid #ffc0cb;
          
          --drag-drop-area-bg: #62508f;         
        }
      
        .file-picker {
            display: flex;
            width: 100%;
            box-sizing: border-box;
        }
        
        .selection-icon {
            display: flex;
            cursor: pointer;
            align-items: center;
        }
        
        .selection-icon svg, .selection-icon slot::slotted(svg) {
            border-radius: 25%;
            padding: 0.5em;
        }
        
        .selection-icon:hover svg, .file-picker:has(.selection-text:hover, .selection-text:focus-visible) .selection-icon svg,
        .selection-icon:hover slot::slotted(svg), .file-picker:has(.selection-text:hover, .selection-text:focus-visible) selection-icon slot::slotted(svg) {
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
            min-width: 32px;
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
            flex-shrink: 1;
            min-width: 32px;
            /* For small views it will otherwise oversize. */
            max-width: 100%;
        }
        
        file-picker-preview {
            max-width: 100%;
        }
        
        .preview-body {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            justify-content: space-between;
            flex: 1 1 auto;
            min-width: 6ch;
        }
        
        .info {
            margin-top: 0.5rem;
        }
        
        .remove {
            color: var(--remove-btn-color);
            background: var(--remove-btn-bg);
            padding: 0.3rem 0.75rem;
            margin-top: 0.5rem;
            border-radius: 0.5rem;
            border: var(--remove-btn-bg-border);
        }
        
        .remove:hover {
            background: var(--remove-btn-hover-bg);
            color: var(--remove-btn-hover-color);
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
      <div class="file-picker" for="file-input" part="file-picker-container">
        <div class="selection-icon">
            <slot name="icon">
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
            </slot>
        </div>
        <label class="selection-text" for="file-input">
            <slot name="text">
                <strong>Choose a file</strong>
                <small>or drag and drop it anywhere.</small>
            </slot>
        </label>
        <div class="preview" hidden part="preview">
            <div class="preview-item">
                <file-picker-preview max-size="${this.previewMaxSize}" exportparts="preview-item"></file-picker-preview>
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
      <div class="drag-drop-area" part="dnd-area" hidden>
        <slot name="dnd-content">
          <p>
            Drop file anywhere.
          </p>
        </slot>
      </div>
    `;
        this.fileInput = this.shadow.querySelector('input[type=file]');
        this.shadow.querySelector('.selection-icon').addEventListener('click', () => this.fileInput.click());
        this.selectionTextContainer = this.shadow.querySelector('.selection-text');
        this.previewContainer = this.shadow.querySelector('.preview');
        this.pickerPreview = this.previewContainer.querySelector('file-picker-preview');
        this.previewContainer.querySelector('.remove').addEventListener('click', () => this.clear());
        this.filename = this.previewContainer.querySelector('.file-name');
        this.size = this.previewContainer.querySelector('.size');
        this.dndAreaElement = this.shadow.querySelector('.drag-drop-area');
        this.fileInput.addEventListener('change', (e) => {
            this.classList.toggle('has-selection', (this.files?.length ?? 0) > 0);
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
        const filePickerContainer = this.shadow.querySelector('.file-picker');
        let offsetLeft = null;
        filePickerContainer.addEventListener('click', (e) => {
            if (e.target !== filePickerContainer) {
                return;
            }
            if (this.value) {
                if (offsetLeft === null) {
                    const containerRects = filePickerContainer.getBoundingClientRect();
                    const selectionIconRects = this.shadow.querySelector('.selection-icon').getBoundingClientRect();
                    offsetLeft = selectionIconRects.left - containerRects.left;
                }
                if (e.offsetX > offsetLeft) {
                    return;
                }
            }
            this.fileInput.click();
        });
    }
    get value() {
        return this.fileInput.value;
    }
    set value(value) {
        this.fileInput.value = value;
    }
    get files() {
        return this.fileInput.files;
    }
    get previewMaxSize() {
        const maxSize = parseInt(this.getAttribute('preview-max-size') ?? '', 10);
        if (!Number.isNaN(maxSize)) {
            return maxSize;
        }
        return defaultPreviewMaxSize;
    }
    get skipPreview() {
        return this.hasAttribute('no-preview');
    }
    get showOnlyIcon() {
        return this.hasAttribute('icon-only');
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
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'accept') {
            this.fileInput.accept = newValue ?? '';
        }
        else if (name === 'fullpage-paste') {
            this.onFullpagePasteChanged(newValue);
        }
        else if (name === 'fullpage-dnd') {
            this.onFullpageDnd(newValue);
        }
        else if (name === 'expandable-preview') {
            this.pickerPreview.toggleAttribute('expandable-preview', !!newValue);
        }
        else if (name === 'icon-only') {
            this.selectionTextContainer.hidden = newValue !== null || !this.previewContainer.hidden;
        }
        else if (name === 'no-preview') {
            this.previewContainer.hidden = newValue !== null || !this.selectionTextContainer.hidden;
            if (newValue !== null) {
                this.pickerPreview.clear();
                this.selectionTextContainer.hidden = this.showOnlyIcon;
            }
        }
    }
    dispatchFilesChangedEvent(originalEvent) {
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
        this.clearTexts();
    }
    clearTexts() {
        this.pickerPreview.clear();
        this.previewContainer.title = '';
    }
    onFileChanged(e) {
        this.pickerPreview.clear();
        if (this.skipPreview) {
            return;
        }
        const hasFile = !!this.files?.[0];
        this.selectionTextContainer.hidden = hasFile || this.showOnlyIcon;
        this.previewContainer.hidden = !hasFile;
        if (!hasFile) {
            this.clearTexts();
            return;
        }
        const file = this.files[0];
        this.filename.innerText = file.name;
        this.previewContainer.title = `File: ${file.name}`;
        this.previewContainer.querySelector('.remove').title = `Clear file`;
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
    onFullpagePasteChanged(value) {
        // Turned off!
        if (value === null) {
            this.removeFullPageListener();
        }
        else {
            if (!this.isFullpagePasteEnabled) {
                document.addEventListener('paste', this.onFullpagePaste);
            }
            this.isFullpagePasteEnabled = true;
        }
    }
    removeFullPageListener() {
        document.removeEventListener('paste', this.onFullpagePaste);
        this.isFullpagePasteEnabled = false;
    }
    onFullpagePaste = (event) => {
        const items = (event.clipboardData || window.clipboardData).items;
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
    };
    setEnabledFullpageDnd(enabled) {
        if (enabled && !this.hasAttribute('fullpage-dnd')) {
            this.setAttribute('fullpage-dnd', '');
        }
        else if (!enabled && this.hasAttribute('fullpage-dnd')) {
            this.removeAttribute('fullpage-dnd');
        }
    }
    onFullpageDnd(value) {
        if (value === null) {
            this.removeFullpageDnd();
        }
        else {
            this.addFullpageDnd();
        }
    }
    removeFullpageDnd() {
        this.dndAreaElement.setAttribute('hidden', '');
        this.fullpageDragAndDrop?.destroy();
        this.fullpageDragAndDrop = null;
    }
    addFullpageDnd() {
        if (!this.fullpageDragAndDrop) {
            this.fullpageDragAndDrop = new FullpageDragAndDrop(this.dndAreaElement, {
                onDrop: this.onDragDrop,
            });
        }
        this.dndAreaElement.removeAttribute('hidden');
        this.fullpageDragAndDrop.tryAddEventListeners();
    }
    onDragDrop = (event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length !== 1) {
            return;
        }
        this.fileInput.files = event.dataTransfer.files;
        this.dispatchFilesChangedEvent(event);
    };
}
customElements.define('single-file-picker', SingleFilePicker);
