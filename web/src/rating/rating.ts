/**
 * By default is styled with just color: yellow;  and opacity on the background to fade the color.
 * --fill: yellow; should only be used if you need different text colour to be the color property but also recommended just to style the <slot> then.
 * --bg-color: orange;  to directly colour the background colour as otherwise it uses the color property
 * --bg-opacity: 1; may be needed to so --bg-color gets the exact colour.
 */
export class Rating extends HTMLElement {
  static observedAttributes = ['value'];

  shadow: ShadowRoot;

  private svgRect: SVGRectElement;

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

    this.svgRect = this.shadow.querySelector('.svg-rect')!;
  }

  connectedCallback() {
    this.update();
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    this.update();
  }

  private update() {
    const value = Number(this.getAttribute('value') ?? 0);
    const percentage = Math.min(1, Math.max(0, value));

    this.svgRect.setAttribute('width', String((percentage) * 24));
  }
}

customElements.define('nui-rating', Rating);