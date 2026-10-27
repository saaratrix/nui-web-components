export class PaginationIndicator extends HTMLElement {
  static observedAttributes = ['indicators', 'progress'];

  shadow: ShadowRoot;

  private pagination: HTMLElement;
  private readonly activeIndicator: HTMLElement;

  public indicators: number = 0;
  // 0 index based!
  public progress: number = 0;

  // metaballs source: https://css-tricks.com/gooey-effect/
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
      
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
      }
      
      .metaballs {
        filter: url(#metaballs);
      }
      
      .indicator-circle {
        width:  var(--size, 0.75rem);
        height: var(--size, 0.75rem);
        background-color: var(--color, black);
        border-radius: 50%;
      }
      
      .active {
        position: absolute;
        background-color: var(--color-active, var(--color, #badbad));
        transition: transform 350ms ease-in-out;
        transform: translateX(var(--progress, 0px));
      }
      </style>
      <div class="pagination metaballs" part="pagination"></div>
      <div class="indicator indicator-circle active" part="indicator active"></div>
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="metaballs"
                  x="-50%" y="-100%"
                  width="200%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 18 -7
              "
              result="goo"
            />
            <feMerge>
              <feMergeNode in="goo"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
    `;

    this.pagination = this.shadow.querySelector('.pagination') as HTMLElement;
    this.activeIndicator = this.shadow.querySelector('.active') as HTMLElement;

    this.shadow.removeChild(this.activeIndicator);
  }

  connectedCallback() {
    this.renderIndicators();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'indicators') {
      this.setIndicators(newValue);
      this.renderIndicators();
    } else if (name === 'progress') {
      this.setProgress(newValue);
    }
  }

  private setIndicators(value: string | null): void {
    this.indicators = Math.max(this.parseAttributeValue(value, parseInt), 0);
    this.style.setProperty('--indicators', this.indicators.toString());
  }


  private setProgress(value: string | null): void {
    let progress = this.parseAttributeValue(value, parseFloat);
    progress = Math.max(Math.min(progress, this.indicators), 0);

    this.progress = progress;
    if (this.indicators <= 1) {
      this.style.setProperty('--progress', '0');
    }

    // If we for example have 4 indicators, then 2nd one is at ~33%, 3rd at 67% and last one at 100%
    // However for example if it's 200 px wide and the circle is 8px big the position is at 192px since pivot is left side.
    const paginationWidth = this.pagination.offsetWidth;
    const circleWidth = this.activeIndicator.offsetWidth;
    const end = paginationWidth - circleWidth;

    const normalizedProgress = progress / (this.indicators - 1);
    this.style.setProperty('--progress', `${normalizedProgress * end}px`);
  }

  renderIndicators(): void {
    this.pagination.innerHTML = '';
    if (this.indicators <= 0) {
      return;
    }
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.indicators; i++) {
      const indicator = this.renderIndicator();
      fragment.appendChild(indicator);
    }

    fragment.appendChild(this.activeIndicator);

    this.pagination.appendChild(fragment);

  }

  renderIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.part = 'indicator';
    indicator.classList.add('indicator', 'indicator-circle');

    return indicator;
  }

  private parseAttributeValue(input: string | null, method: typeof parseInt | typeof parseFloat): number {
    if (input === null) {
      return 0;
    }

    let value = method(input);
    if (Number.isNaN(value)) {
      value = 0;
    }

    return value;
  }

}

customElements.define('pagination-indicator', PaginationIndicator);