import type { ProgressStatusPopover } from './progress-status-popover.js';
import './progress-status-popover.js';

export class ProgressStatus extends HTMLElement {
  static observedAttributes = ['active'];

  shadow: ShadowRoot;
  detailedPopover: ProgressStatusPopover;
  isActive: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        :host, * {
          box-sizing: border-box;
        }
        
        .container {
            opacity: 0;
            /*transition: opacity 0.075s;*/
        }
        
        .active {
            opacity: 1;
        }
        
        
        .spinner {
          display: inline-block;
          width: 1em;
          height: 1em;
          /*border: 0.18em solid currentColor;*/
          /*border-top-color: transparent;*/
          border: 0.18em solid rgba(0, 0, 0, 0.2);
          border-top-color: currentColor;
          border-radius: 50%;
        }
        
        .active .spinner {
            animation: spin 1.2s linear infinite;
        }
        
        
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
      </style>

      <div class="container">
        <span class="spinner"></span>
        <slot></slot>
      </div>
      <progress-status-popover>
        <slot name="popover-content" slot="popover-content"></slot>
      </progress-status-popover>
    `;

    this.detailedPopover = this.shadow.querySelector('progress-status-popover') as ProgressStatusPopover;
  }

  private _container: HTMLElement | null = null;
  get container(): HTMLElement {
    this._container ??= this.shadow.querySelector('.container') as HTMLElement;
    return this._container;
  }

  attributeChangedCallback(name: string, oldValue: unknown | null, newValue: unknown | null) {
    this.isActive = newValue !== null;
    this.detailedPopover.showOrHide(this.isActive);

    if (this.isActive) {
      this.container.classList.add('active');
    } else {
      this.container.classList.remove('active');
    }
  }
}

customElements.define("progress-status", ProgressStatus);