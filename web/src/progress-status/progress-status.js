import './progress-status-popover.js';
const defaultSpinnerSize = '2em';
const defaultSpinnerDirection = 'spin-cw';
const defaultColor = 'currentColor';
export class ProgressStatus extends HTMLElement {
    static observedAttributes = ['active', 'size', 'direction', 'placement', 'color', 'paused'];
    shadow;
    progressPopover;
    size = defaultSpinnerSize;
    isStickyPopover = false;
    canShowPopover = false;
    /** If the progress spinner is active */
    isActive = false;
    slotContent;
    slotPopover;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
      <style>
        :host {
            display: inline-block;
            position: relative;
        }
        
        .container {
            align-items: center;
            gap: 0.5rem;
            display: none;
            user-select: none;
        }
        
        .active {
            display: inline-flex;
        }
        
        .spinner {
          --spinner-direction: ${defaultSpinnerDirection};
          --spinner-size: ${defaultSpinnerSize};
          --spinner-color-bg: rgba(0, 0, 0, 0.2);
          --spinner-color: currentColor;
          box-sizing: border-box;
          display: inline-block;
          width: var(--spinner-size);
          height: var(--spinner-size);
          border: calc(0.18 * var(--spinner-size)) solid rgba(0, 0, 0, 0.2);
          border-top-color: var(--spinner-color);
          border-radius: 50%;
        }
        
        .active .spinner {
            animation: var(--spinner-direction) 1.2s linear infinite;
        }   
        
        .active .spinner.paused {
            animation: paused;
        }         
        
        @keyframes spin-cw {
            to {
                transform: rotate(360deg);
            }
        }
        
        @keyframes spin-ccw {
            to {
                transform: rotate(-360deg);
            }
        }
      </style>

      <div class="container">
        <span class="spinner"></span>
        <slot name="content"></slot>
      </div>
      <progress-status-popover exportparts="dialog">
        <slot name="popover" slot="content"></slot>
      </progress-status-popover>
    `;
        this.progressPopover = this.shadow.querySelector('progress-status-popover');
        this.progressPopover.parent = this;
        this.slotContent = this.shadow.querySelector('slot[name="content"]');
        this.slotPopover = this.shadow.querySelector('slot[name="popover"]');
        this.onPopoverContentChanged();
        this.slotPopover.addEventListener('slotchange', (_) => {
            this.onPopoverContentChanged();
        });
    }
    hasPopoverContent = false;
    onPopoverContentChanged() {
        if (this.slotPopover.assignedElements().length > 0) {
            if (!this.hasPopoverContent) {
                this.container.addEventListener('pointerenter', this.onContainerPointerEnter);
                this.container.addEventListener('pointerleave', this.onContainerPointerLeave);
                this.container.addEventListener('click', this.onContainerClick);
            }
            this.hasPopoverContent = true;
            this.canShowPopover = true;
        }
        else {
            if (this.hasPopoverContent) {
                this.container.removeEventListener('pointerleave', this.onContainerPointerLeave);
                this.container.removeEventListener('pointerenter', this.onContainerPointerEnter);
                this.progressPopover.showOrHide(false);
            }
            this.hasPopoverContent = false;
        }
    }
    #container = null;
    get container() {
        return this.#container ||= this.shadow.querySelector('.container');
    }
    #spinner = null;
    get spinner() {
        return this.#spinner ||= this.container.querySelector('.spinner');
    }
    get isPopoverVisible() {
        return this.progressPopover.dialog.open;
    }
    attributeChangedCallback(name, _, newValue) {
        if (name === 'active') {
            this.onActiveChanged(newValue);
        }
        else if (name === 'size') {
            this.onSizeChanged(newValue);
        }
        else if (name === 'direction') {
            this.onDirectionChanged(newValue);
        }
        else if (name === 'color') {
            this.onColorChanged(newValue);
        }
        else if (name === 'paused') {
            this.onPausedChanged(newValue);
        }
    }
    onContainerClick = (_) => {
        this.isStickyPopover = !this.isStickyPopover;
        if (this.isStickyPopover) {
            document.addEventListener('click', this.outsideClick);
        }
        else {
            document.removeEventListener('click', this.outsideClick);
        }
    };
    outsideClick = (event) => {
        if (event.target && this.contains(event.target)) {
            return;
        }
        if (this.isPopoverVisible) {
            this.hideProgressPopover();
        }
        else {
            document.removeEventListener('click', this.outsideClick);
        }
        this.isStickyPopover = false;
    };
    onContainerPointerEnter = (e) => {
        this.showProgressPopover();
    };
    onContainerPointerLeave = (e) => {
        if (!this.isStickyPopover) {
            this.hideProgressPopover();
        }
    };
    showProgressPopover() {
        if (!this.canShowPopover || this.isPopoverVisible) {
            return;
        }
        this.progressPopover.showOrHide(true);
    }
    hideProgressPopover() {
        if (!this.isPopoverVisible) {
            return;
        }
        this.isStickyPopover = false;
        document.removeEventListener('click', this.outsideClick);
        this.progressPopover.showOrHide(false);
    }
    onActiveChanged(value) {
        this.isActive = value !== null;
        if (this.isActive) {
            this.container.classList.add('active');
        }
        else {
            this.container.classList.remove('active');
        }
    }
    onSizeChanged(value) {
        if (!value) {
            this.size = defaultSpinnerSize;
        }
        else if (!isNaN(Number(value))) {
            this.size = `${value}px`;
        }
        else {
            this.size = value;
        }
        this.spinner.style.setProperty('--spinner-size', this.size);
    }
    onDirectionChanged(value) {
        const direction = value === 'ccw' ? 'spin-ccw' : 'spin-cw';
        this.spinner.style.setProperty('--spinner-direction', direction);
    }
    onColorChanged(value) {
        if (!value) {
            value = defaultColor;
        }
        this.spinner.style.setProperty('--spinner-color', value);
    }
    onPausedChanged(value) {
        value != null ? this.spinner.classList.add('paused') : this.spinner.classList.remove('paused');
    }
}
customElements.define("progress-status", ProgressStatus);
