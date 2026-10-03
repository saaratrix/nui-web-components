
type RatingFillFrom = 'left' | 'top' | 'right' | 'bottom';
/**
 * value = 0 -> 1 how filled the rating star is. \
 * fill-from = `'left' | 'right' | 'top' | 'bottom'` - Direction star is filled from, left -> right, top -> bottom, right -> left, bottom -> top.
 *
 * ------
 *
 * By default is styled with just color: yellow;  and opacity on the background to fade the color. \
 * --fill: yellow; should only be used if you need different text colour to be the color property but also recommended just to style the <slot> then. \
 * --bg-color: orange;  to directly colour the background colour as otherwise it uses the color property \
 * --bg-opacity: 1; may be needed to so --bg-color gets the exact colour.
 */
export class Rating extends HTMLElement {
  static observedAttributes = ['value', 'fill-from'];

  shadow: ShadowRoot;

  private svgRect: SVGRectElement | null = null;
  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
        }

        svg {
          display: block;
          width: 1em;
          height: 1em;
        }

        .background {
          fill: var(--bg-color, currentColor);
          opacity: var(--bg-opacity, 0.25);
        }

        .fill {
          fill: var(--fill, currentColor);
        }
      </style>

      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <path
            id="star"
            d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.31l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94L12 2.5z"
          />
      
          <clipPath id="fill">
            <rect
              class="svg-rect"
              x="0"
              y="0"
              width="0"
              height="24"
            />
          </clipPath>
        </defs>
        <use href="#star" class="background" />
        <use href="#star" class="fill" clip-path="url(#fill)" />
      </svg>
      <slot></slot>
    `;
  }

  connectedCallback() {
    this.svgRect ||= this.shadow.querySelector('.svg-rect') as SVGRectElement;

    this.resetClipRect();
    this.update();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // In some cases update happens before it's added to the DOM but no need to change anything until it's in the dom.
    if (oldValue === newValue) {
      return;
    }
    if (name === 'fill-from') {
      this.resetClipRect();
    }
    this.update();
  }


  private fillFrom(): string | RatingFillFrom {
    return this.getAttribute('fill-from')?.toLowerCase() ?? 'left';
  }

  private update() {
    if (!this.isConnected || !this.svgRect) {
      return;
    }

    let value = Number(this.getAttribute('value') ?? 0);
    if (Number.isNaN(value)) {
      value = 0;
    }
    const percentage = Math.min(1, Math.max(0, value));
    const clipValue = percentage * 24;
    const fillFrom = this.fillFrom();

    switch (fillFrom) {
      case 'left':
        this.svgRect.setAttribute('width', clipValue.toString());
        break;
      case 'right':
        this.svgRect.setAttribute('x', (24 - clipValue).toString());
        break;
      case 'bottom':
        this.svgRect.setAttribute('y', (24 - clipValue).toString());
        break;
      case 'top':
        this.svgRect.setAttribute('height', clipValue.toString());
        break;
    }


  }

  private resetClipRect() {
    if (!this.svgRect) {
      return;
    }

    // Reset the values that either side might change.
    this.svgRect.setAttribute('x', '0');
    this.svgRect.setAttribute('y', '0');
    this.svgRect.setAttribute('height', '24');
    this.svgRect.setAttribute('width', '24');
  }
}

customElements.define('nui-rating', Rating);