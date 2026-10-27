/**
 * indicator color comes from css color: currentColor;
 * indicator active color comes from --color-active: black;
 *
 * Attributes:
 * indicators - How many page indicators!
 * progress - 0 --> (indicators - 1)   For example for 3 indicators, could be 0, 1, 1.5 or 2. 1.5 would be in between 1 & 2.
 * clickable - If the indicators are clickable, will raise indicatorClick event if clicked.
 *
 * Parts:
 * ::part(pagination) - the container
 * ::part(indicator) - the indicators
 * ::part(active) - the active indicator.
 */
export class PaginationIndicator extends HTMLElement {
    static observedAttributes = ['indicators', 'progress', 'clickable'];
    shadow;
    pagination;
    activeIndicator;
    indicators = 0;
    // 0 index based!
    progress = 0;
    // metaballs source: https://css-tricks.com/gooey-effect/
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
      <style>
      
      .container {
        position: relative;
        isolation: isolate;
      }
      
      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .metaballs {
        filter: url(#metaballs-filter);
      }
      
      .clickable {
        cursor: pointer;
      }
      
      .indicator-circle {
        width:  var(--size, 0.75rem);
        height: var(--size, 0.75rem);
        background-color: currentColor;
        border-radius: 50%;
      }
      
      .active-layer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;   
      }
      
      .active {
        position: absolute;
        background-color: var(--color-active, currentColor);
        transition: transform var(--transition-length, 350ms) ease-in-out;
        transform: translateX(var(--progress, 0px));
      }
      
      </style>
      <div class="container metaballs">
        <div class="pagination" part="pagination"></div>
        <div class="active-layer">
          <div class="indicator indicator-circle active" part="indicator active"></div>
        </div>
      </div>
      
      <svg id="metaballs" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="metaballs-filter"
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
        this.pagination = this.shadow.querySelector('.pagination');
        this.activeIndicator = this.shadow.querySelector('.active');
    }
    connectedCallback() {
        this.updateSize();
        this.renderIndicators();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        if (name === 'indicators') {
            this.setIndicators(newValue);
            this.renderIndicators();
        }
        else if (name === 'progress') {
            this.setProgress(newValue);
        }
        else if (name === 'clickable') {
            const indicators = this.pagination.querySelectorAll('.indicator');
            for (const indicator of indicators) {
                newValue !== null
                    ? indicator.addEventListener('click', this.onClick, false)
                    : indicator.removeEventListener('click', this.onClick, false);
            }
        }
    }
    get isClickable() {
        return this.hasAttribute('clickable');
    }
    setIndicators(value) {
        this.indicators = Math.max(this.parseAttributeValue(value, parseInt), 0);
        this.style.setProperty('--indicators', this.indicators.toString());
    }
    // Note: Could use resizeObservable but seems overkill for pagination...
    /**
     * Runs on connectedCallback() otherwise if you dynamically change --size please call this method to update svg calculations.
     */
    updateSize() {
        const size = parseInt(getComputedStyle(this.activeIndicator).width);
        const metaballsSize = size * 0.33;
        const blurElement = this.shadow.querySelector('#metaballs feGaussianBlur');
        blurElement?.setAttribute('stdDeviation', metaballsSize.toString());
    }
    setProgress(value) {
        if (this.indicators <= 1) {
            this.progress = 0;
            this.style.setProperty('--progress', '0');
            return;
        }
        let progress = this.parseAttributeValue(value, parseFloat);
        progress = Math.max(Math.min(progress, this.indicators), 0);
        this.progress = progress;
        // If we for example have 4 indicators, then 2nd one is at ~33%, 3rd at 67% and last one at 100%
        // However for example if it's 200 px wide and the circle is 8px big the position is at 192px since pivot is left side.
        const paginationWidth = this.pagination.offsetWidth;
        const circleWidth = this.activeIndicator.offsetWidth;
        const end = paginationWidth - circleWidth;
        const normalizedProgress = progress / (this.indicators - 1);
        this.style.setProperty('--progress', `${normalizedProgress * end}px`);
    }
    onClick = (event) => {
        let index = parseInt(event.currentTarget?.dataset['index']);
        index = !Number.isNaN(index) ? index : -1;
        this.dispatchEvent(new CustomEvent('indicatorClick', { detail: { index, originalEvent: event }, composed: true, bubbles: true }));
    };
    renderIndicators() {
        this.pagination.innerHTML = '';
        if (this.indicators <= 0) {
            this.activeIndicator.hidden = true;
            return;
        }
        this.activeIndicator.hidden = false;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this.indicators; i++) {
            const indicator = this.renderIndicator(i);
            fragment.appendChild(indicator);
        }
        this.pagination.appendChild(fragment);
        this.setProgress(this.progress.toString());
    }
    renderIndicator(index) {
        const indicator = document.createElement('div');
        indicator.part = 'indicator';
        indicator.classList.add('indicator', 'indicator-circle');
        indicator.dataset['index'] = index.toString();
        if (this.isClickable) {
            indicator.addEventListener('click', this.onClick, false);
        }
        return indicator;
    }
    parseAttributeValue(input, method) {
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
