import '../file-picker/single-file-picker.js';
import { subtitlesAddIcon } from './video-player-icons.js';
import { getSubtitleTypeFromName } from './video-player.models.js';
export class VideoPlayerSubtitlesAdder extends HTMLElement {
    static observedAttributes = [];
    shadow;
    filePicker;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        const svgIcon = subtitlesAddIcon.replace('<svg', '<svg slot="icon"');
        this.shadow.innerHTML = `
      <style>
        svg {
            width: 1.75rem;
            height: 1.75rem;
        }
      </style>
      <div class="uploader">
        <single-file-picker title="Add .ass, .ssa, .srt or .vtt" accept=".ass,.ssa,.srt,.vtt" icon-only no-preview>
            ${svgIcon}
            <p slot="dnd-content">Drop subtitle anywhere.</p>
        </single-file-picker>
      </div>
    `;
        this.filePicker = this.shadow.querySelector('single-file-picker');
        this.filePicker.addEventListener('change', (event) => this.onFileChangeEvent(event));
    }
    connectedCallback() {
        this.enableDnd();
    }
    disconnectedCallback() {
        this.disableDnd();
    }
    enableDnd() {
        this.filePicker.setEnabledFullpageDnd(true);
    }
    disableDnd() {
        this.filePicker.setEnabledFullpageDnd(false);
    }
    onFileChangeEvent(event) {
        for (const file of event.detail.files ?? []) {
            const type = getSubtitleTypeFromName(file.name);
            if (type !== undefined) {
                this.onSubtitleAdded(file, type, event.detail.originalEvent);
            }
        }
    }
    onSubtitleAdded(file, type, originalEvent) {
        this.dispatchEvent(new CustomEvent('subtitleAdded', {
            detail: {
                file,
                type,
                originalEvent
            }
        }));
    }
}
customElements.define('video-player-subtitles-adder', VideoPlayerSubtitlesAdder);
