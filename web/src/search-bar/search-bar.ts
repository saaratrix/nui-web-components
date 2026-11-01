import '../popover/popover.js';
import type { Popover } from '../popover/popover';

/**
 * Parts:
 * ::part(search-bar) - The search bar container.
 * ::part(search-input) - The search <input> element
 * ::part(icon-container) - The icon container
 * ::part(icon) - The svg icon
 * ::part(search-result) - The search result container around <slot>
 *
 * Parts exported from <nui-popover>
 * ::part(popover) - the nui-popover's root element
 * ::part(popover-content) - nui-popover's content part.
 */
export class SearchBar extends HTMLElement {
  static observedAttributes = [];

  shadow: ShadowRoot;

  public input: HTMLInputElement;
  public popoverElement: Popover;
  resultSlot: HTMLSlotElement;
  emptyResults: HTMLElement;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        :host {
            max-width: 100%;
        }
        
        * {
            box-sizing: border-box;
        }
        
        .container {
            height: inherit;
        }
      
        .search-bar {
            display: flex;
            align-items: center;
            position: relative;
            height: inherit;
            border: 0.125em solid var(--color-border, currentColor);
        }
        
        .search-bar:focus-within {
          outline-color: var(--color-border, currentColor);
          outline-color: color-mix(in srgb, var(--color-border, currentColor) 90%, rebeccapurple);
          outline-style: solid;
          outline-width: 1px;
        }
        
        .icon {
            display: flex;
            height: 100%;
            padding: 2px;
            box-sizing: border-box;
            color: var(--icon-color, var(--color-text, currentColor));
        }
        .icon svg {
            width: auto;
            height: 100%;
        }
        
        input {
            max-width: 100%;
            box-sizing: border-box;
            border: none;
            outline:none;
            color: var(--color-text, currentColor);
            background-color: inherit;
            font-size: inherit;
        }
      </style>
      <style id="popover">
        .search-result {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            
        }
      </style>
      <div class="container">
        <label class="search-bar" part="search-bar">
            <div class="icon" part="icon-container">
              <svg part="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.8"/>
                  <path d="m16 16 5 5"/>
              </svg>
            </div>
            <input id="search" type="text" part="search-input">
        </label>
        <nui-popover trigger="manual" hide-arrow size="anchor" exportparts="popover, content: popover-content">
            <div class="search-result" slot="content" part="search-result">
                <slot name="result"></slot>
                <div class="empty-result" hidden>
                    <p>No search results found...</p>
                </div>
            </div>
        </nui-popover>
      </div>
    `;

    this.input = this.shadow.getElementById('search') as HTMLInputElement;
    this.popoverElement = this.shadow.querySelector('nui-popover') as Popover;
    this.resultSlot = this.shadow.querySelector('slot[name="result"]') as HTMLSlotElement;
    this.emptyResults = this.shadow.querySelector('.empty-result') as HTMLElement;

    const container = this.shadow.querySelector('.container') as HTMLElement;
    this.popoverElement.setAnchor(container, true);

    container.querySelector('.search-bar')!.addEventListener('click', () => {
      if (!this.popoverElement.isVisible && this.resultSlot.assignedNodes().length > 0) {
        this.showSearchResult();
      }
    });
    this.resultSlot.addEventListener('slotchange', this.onResultChange);
  }

  connectedCallback() {
    this.input.addEventListener('input', this.onInput, false);
  }

  disconnectedCallback() {
    this.input.removeEventListener('input', this.onInput, false);
  }

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }
  }

  get value(): string {
    return this.input.value;
  }

  clearSearchResult(): void {
    this.resultSlot.assignedElements().forEach((element) => element.remove());
  }

  addSearchResult(...elements: HTMLElement[]) {
    elements.forEach(e => {
      e.slot = 'result';
      this.appendChild(e);
    });

    this.emptyResults.hidden = this.resultSlot.assignedElements().length > 0;
  }

  onInput = (event: Event) => {
    this.dispatchEvent(new CustomEvent('change', {
      composed: true,
      detail: {
        value: this.input.value,
        originalEvent: event,
      },
    }));
  };

  onResultChange = (event: Event) => {
    if (!this.isConnected) {
      return;
    }
  };

  showSearchResult = () => {
    this.popoverElement.addOutsideClickEvent();
    this.popoverElement.show();
  };

  hideSearchResult = () => {
    this.popoverElement.hide();
  };
}

customElements.define('search-bar', SearchBar);