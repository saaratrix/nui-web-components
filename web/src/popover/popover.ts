import { createArrowPopoverCSS, positionPopover } from '../utility/popover-utility.js';

interface AddedEvent {
  element: Node;
  type: string;
  method: (event: Event) => void;
}

export class Popover extends HTMLElement {
  static observedAttributes = ['pin', 'disabled', 'hide-arrow'];

  shadow: ShadowRoot;
  private popoverContainer: HTMLElement;
  private arrow: HTMLElement;
  private content: HTMLSlotElement;
  private events: AddedEvent[] = [];

  private isVisible = false;
  private currentAnchor: HTMLElement | null = null;
  private isPinned: boolean = false;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>

        :host {
            display: block;
            position: relative;
            max-height: inherit;
            box-sizing: border-box;;
        }
        
        [hidden] {
            display: none !important;;
        }

        .popover {
            position: absolute;
            /* display: flex & column solves a height issue overflow issue. */
            display: flex;
            flex-direction: column;
            width: 100%;
            height: auto;
            max-height: inherit;
            padding: var(--padding, 1rem) 0;
            border-radius: 0.75rem;
            box-sizing: border-box;
            color: var(--color, currentColor);
            background-color: var(--color-bg, #eee);
        }
        
        .content-container {
            overflow: auto;
            height: 100%;
            padding: 0 var(--padding, 1rem);
            box-sizing: border-box;
            max-height: inherit;
        }
        
        .content {
            position: relative;
            max-height: inherit;
            box-sizing: border-box;
        }
        
        .arrow {
            position: absolute;
            width: var(--arrow-width, 12px);
            height: var(--arrow-height, 12px);
            transform: rotate(45deg);
            background-color: var(--arrow-color, #eee);
        }
        
        ${createArrowPopoverCSS('.popover', '.arrow', 12)}
        
      </style>
      
      <div class="popover" hidden>
        <div class="arrow"></div>
        <div class="content-container">
            <div class="content">
                <slot name="content"></slot>
            </div>
        </div>
      </div>
    `;

    this.popoverContainer = this.shadow.querySelector('.popover') as HTMLElement;
    this.arrow = this.shadow.querySelector('.arrow') as HTMLElement;
    this.content = this.shadow.querySelector('slot[name="content"]') as HTMLSlotElement;
  }

  connectedCallback() {
  }

  disconnectedCallback() {
    this.removeEvents();
  }

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'pin' ) {
      if (!this.currentAnchor) {
        return;
      }

      if (this.canPin) {
        this.addEvent(this.currentAnchor, 'click', () => this.onAnchorClick());
      } else {
        this.removeEvent(this.currentAnchor, 'click');
      }
    } else if (name === 'hide-arrow') {
      this.arrow.hidden = newValue !== null;
    }
  }

  public get isDisabled(): boolean {
    return this.hasAttribute('disabled') || this.content.assignedElements().length === 0;
  }

  public get canPin(): boolean {
    return this.hasAttribute('pin');
  }

  public get showArrow(): boolean {
    return !this.hasAttribute('hide-arrow');
  }

  setAnchor(anchor: HTMLElement) {
    if (anchor === this.currentAnchor) {
      return;
    }

    this.removeEvents();
    this.currentAnchor = anchor;

    if (this.canPin) {
      this.addEvent(anchor, 'click', () => this.onAnchorClick());
    }

    this.addEvent(anchor, 'pointerenter', () => this.onAnchorPointerEnter());
    this.addEvent(anchor, 'pointerleave', () => this.onAnchorPointerLeave());
  }

  private addEvent(element: Node, type: string, method: (event: Event) => void, options?: boolean | AddEventListenerOptions) {
    const hasEvent = this.events.find(e => e.element === element && e.type === type);
    if (hasEvent) {
      return;
    }

    element.addEventListener(type, method, options ?? false);
    this.events.push({ element, type, method });
  }

  removeEvents(): void {
    for (const event of this.events) {
      event.element.removeEventListener(event.type, event.method);
    }
    this.events = [];
  }

  removeEvent(element: Node, type: string) {
    const index = this.events.findIndex(e => e.element === element && e.type === type);
    const event = this.events[index];
    if (event) {
      event.element.removeEventListener(event.type, event.method);
      this.events.splice(index, 1);
    }
  }

  public show(): void {
    if (this.isVisible) {
      return;
    }
    const anchor = this.currentAnchor || this.parentElement;
    if (!anchor) {
      console.log(`Can't show popover due to no anchor, call setAnchor() to set an anchor element.`);
      return;
    }

    this.isVisible = true;
    this.popoverContainer.hidden = false;

    positionPopover(this.popoverContainer, anchor, {
      arrow: this.showArrow ? this.arrow : null,
    });
  }

  public hide(): void {
    if (!this.isVisible) {
      return;
    }

    this.isVisible = false;
    this.removeEvent(document, 'click');
    this.popoverContainer.hidden = true;
  }

  private onAnchorClick() {
    if (this.isDisabled) {
      return;
    }

    this.isPinned = !this.isPinned;
    if (this.isPinned) {
      this.addEvent(document, 'click', (event) => this.onOutsideClick(event));
    }
  }

  private onOutsideClick = (event: Event) => {
    if (event.target && (this.contains(event.target as HTMLElement) || this.currentAnchor?.contains(event.target as HTMLElement))) {
      return;
    }

    if (this.isVisible) {
      this.hide();
    }
    this.removeEvent(document, 'click');

    this.isPinned = false;
  }

  private onAnchorPointerEnter() {
    if (this.isDisabled) {
      return;
    }

    this.show();
  }

  private onAnchorPointerLeave() {
    if (this.isDisabled || this.isPinned) {
      return;
    }

    this.hide();
  }
}

customElements.define('nui-popover', Popover);