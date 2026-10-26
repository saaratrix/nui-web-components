import './video-player-subtitles.js';
import { exitfullscreenIcon, fullscreenIcon } from './video-player-icons.js';
import { controlsIconCSS } from './video-player-shared.js';
/**
 * Properties:
 * subtitles: CSV with | as delimiter for each {@link Subtitle} src,label,srclang
 */
export class VideoPlayer extends HTMLElement {
    static observedAttributes = ['subtitles', 'poster', 'autoplay'];
    shadow;
    _container = null;
    video;
    // The sources slot gets copied into video, having <video><slot /></video> did not work.
    videoSources;
    isSourcesDirty = true;
    videoControls;
    fullscreenButton;
    _subtitlesElement = null;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
      <style>
        :host {
            display: inline-flex;
            --icon-size: 40px;
            --icon-size-svg: 22px;
            --controls-opacity: 0;
        }
        
        :host(:fullscreen) {
            display: block;
            width: 100%;
            height: 100%;
        }
      
        .video-player {
            display: flex;
            align-items: center;
            position: relative;
            height: 100%;
        }       
        
        .video-container {
            font-size: 0;
        }
        
        .video-container, video {
            width: 100%;
        }
        
        .video-click-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 64px;
            background: transparent;
        }
        
        .video-controls {
            display: flex;
            justify-content: flex-end;
            position: absolute;
            box-sizing: border-box;
            width: 100%;
            top: 0;
            padding: 0.25rem 0.5rem;
            opacity: var(--controls-opacity);
            
            transition: opacity 0.15s ease-in-out;
        }     
        
        .controls-group {
            display: flex;
        }   
        
        ${controlsIconCSS}
      </style>
      <div class="video-player" tabindex="0">
        <div class="video-container">
            <video controls playsinline></video>
            <div class="video-click-overlay"></div>
        </div>
        <div class="video-controls">
            <div class="controls-group">
                <i class="icon icon-fullscreen action" tabindex="0">${fullscreenIcon}</i>
            </div>
        </div>
      </div>
      <slot name="sources"></slot>
    `;
        this.video = this.shadow.querySelector('video');
        this.videoSources = this.shadow.querySelector('slot[name="sources"]');
        this.videoControls = this.shadow.querySelector('.video-controls');
        this.fullscreenButton = this.shadow.querySelector('.icon-fullscreen');
        this.initEvents();
    }
    initEvents() {
        this.container.addEventListener('click', this.onVideoContainerClick, false);
        this.container.addEventListener('dblclick', this.onVideoContainerDblClick, false);
        this.addEventListener('fullscreenchange', this.onFullscreenChanged, false);
        this.videoControls.addEventListener('pointermove', this.onPointerMove, false);
        this.videoControls.addEventListener('pointerleave', this.onPointerLeave, false);
        this.fullscreenButton.addEventListener('click', this.onFullscreenButtonClick, false);
        this.addEventListener('keydown', this.onKeyDown, false);
    }
    async connectedCallback() {
        this.initEvents();
        if (this.isSourcesDirty) {
            const video = this.video;
            while (video.firstChild) {
                video.removeChild(video.firstChild);
            }
            const sources = this.videoSources.assignedElements();
            for (const source of sources) {
                if (source instanceof HTMLSourceElement) {
                    video.appendChild(source.cloneNode(true));
                }
            }
        }
    }
    disconnectedCallback() {
        this.clearPlaybackToggleTimeout();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        if (name === 'subtitles') {
            this.subtitlesCSV = newValue;
        }
        if (name === 'autoplay') {
            if (newValue !== null) {
                this.video.setAttribute('autoplay', '');
                this.video.play().then().catch(() => { });
            }
            else {
                this.removeAttribute('autoplay');
            }
        }
    }
    get container() {
        return this._container ||= this.shadow.querySelector('.video-player');
    }
    get subtitlesElement() {
        if (!this._subtitlesElement) {
            this._subtitlesElement = document.createElement('video-player-subtitles');
            this._subtitlesElement.videoPlayer = this;
            this._subtitlesElement.classList.add('action');
            const controlsGroup = this.videoControls.querySelector('.controls-group');
            controlsGroup.insertBefore(this._subtitlesElement, this.fullscreenButton);
        }
        return this._subtitlesElement;
    }
    get isFullScreen() {
        return document.fullscreenElement !== null;
    }
    get subtitlesCSV() {
        return this.getAttribute('subtitles');
    }
    set subtitlesCSV(csv) {
        csv ? this.setAttribute('subtitles', csv) : this.removeAttribute('subtitles');
        this.subtitlesElement.setParsedSubtitlesFromCSV(csv);
    }
    changeSubtitles(index) {
        const subtitle = this.subtitlesElement.subtitles[index];
        return this.subtitlesElement.changeSubtitle(subtitle);
    }
    // This is to allow double clicking without pausing/unpausing if you double click.
    // So if you double click within ~225 ms it doesn't pause/unpause but any slower and it will which felt fast enough for pause/play.
    // 225ms is roughly 6 frames, it does feel a bit choppy but good enough, maybe iterated on later.
    playbackToggleTimeout = null;
    onVideoContainerClick = (event) => {
        if (!this.isClickAllowed(event)) {
            return;
        }
        if (this.playbackToggleTimeout) {
            return;
        }
        this.playbackToggleTimeout = setTimeout(() => {
            this.togglePlayback();
            this.clearPlaybackToggleTimeout();
        }, 225);
    };
    onVideoContainerDblClick = (event) => {
        if (!this.isClickAllowed(event)) {
            return;
        }
        this.clearPlaybackToggleTimeout();
        void this.toggleFullscreen();
    };
    clearPlaybackToggleTimeout() {
        if (this.playbackToggleTimeout) {
            clearTimeout(this.playbackToggleTimeout);
        }
        this.playbackToggleTimeout = null;
    }
    onFullscreenButtonClick = (event) => {
        void this.toggleFullscreen();
    };
    onFullscreenChanged = (event) => {
        this.fullscreenButton.innerHTML = this.isFullScreen ? exitfullscreenIcon : fullscreenIcon;
    };
    onKeyDown = (event) => {
        let handled = false;
        switch (event.key) {
            case ' ':
                this.togglePlayback();
                handled = true;
                break;
            case 'ArrowLeft':
                this.seekBackwards();
                handled = true;
                break;
            case 'ArrowRight':
                this.seekForwards();
                handled = true;
                break;
        }
        if (handled) {
            event.stopPropagation();
        }
    };
    toolbarTimeoutId = -1;
    onPointerMove = () => {
        if (this.toolbarTimeoutId === -1) {
            this.style.setProperty('--controls-opacity', '1');
        }
        else {
            clearTimeout(this.toolbarTimeoutId);
        }
        this.toolbarTimeoutId = setTimeout(() => {
            this.style.setProperty('--controls-opacity', '0');
            this.toolbarTimeoutId = -1;
        }, 2000);
    };
    onPointerLeave = () => {
        clearTimeout(this.toolbarTimeoutId);
        this.toolbarTimeoutId = -1;
        this.style.setProperty('--controls-opacity', '0');
    };
    isClickAllowed(event) {
        const rects = this.video.getBoundingClientRect();
        const isOutside = event.clientY > rects.bottom || event.clientY < rects.bottom - 64;
        return isOutside && !event.target.closest('.action');
    }
    async toggleFullscreen() {
        const isFullscreen = this.isFullScreen;
        if (isFullscreen) {
            await document.exitFullscreen();
        }
        else {
            await this.requestFullscreen();
        }
    }
    togglePlayback() {
        if (this.video.paused) {
            void this.video.play();
        }
        else {
            this.video.pause();
        }
    }
    seekForwards() {
        const offset = Math.random() > 0.5 ? 6 : 7;
        this.seekOffset(offset);
    }
    seekBackwards() {
        const offset = Math.random() > 0.5 ? -6 : -7;
        this.seekOffset(offset);
    }
    seekOffset(offsetSeconds) {
        const time = Math.min(Math.max(this.video.currentTime + offsetSeconds, 0), this.video.duration);
        if (this.video.fastSeek) {
            this.video.fastSeek(time);
        }
        else {
            this.video.currentTime = time;
        }
    }
}
customElements.define('video-player', VideoPlayer);
