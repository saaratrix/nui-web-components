import '../file-picker/single-file-picker.js';
import { subtitlesAddIcon } from './video-player-icons.js';
import type { FilePickerChangeEvent, SingleFilePicker } from '../file-picker/single-file-picker';
import { getSubtitleTypeFromName, SubtitleType } from './video-player.models.js';

export interface SubtitleAddedEvent {
  file: File;
  type: SubtitleType,
  originalEvent: Event;
}

export class VideoPlayerSubtitlesAdder extends HTMLElement {
  static observedAttributes = [];
  shadow: ShadowRoot;

  public filePicker: SingleFilePicker;

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

    this.filePicker = this.shadow.querySelector('single-file-picker') as SingleFilePicker;
    this.filePicker.addEventListener('change', (event) => this.onFileChangeEvent(event as CustomEvent<FilePickerChangeEvent>))
  }

  connectedCallback() {
    this.enableDnd();
  }

  disconnectedCallback() {
    this.disableDnd();
  }

  enableDnd(): void {
    this.filePicker.setEnabledFullpageDnd(true);
  }

  disableDnd(): void {
    this.filePicker.setEnabledFullpageDnd(false);
  }

  private onFileChangeEvent(event: CustomEvent<FilePickerChangeEvent>) {
    for (const file of event.detail.files ?? []) {
      const type = getSubtitleTypeFromName(file.name);
      if (type !== undefined) {
        this.onSubtitleAdded(file, type, event.detail.originalEvent);
      }
    }
  }

  private onSubtitleAdded(file: File, type: SubtitleType, originalEvent: Event): void {
    this.dispatchEvent(new CustomEvent<SubtitleAddedEvent>('subtitleAdded', {
      detail: {
        file,
        type,
        originalEvent
      }
    }));
  }
}

customElements.define('video-player-subtitles-adder', VideoPlayerSubtitlesAdder);