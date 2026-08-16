const defaultStartColor = '#16A34A';
const defaultMidColor = '#22C55E';
const defaultEndColor = '#4ADE80';
const defaultBarColor = `linear-gradient(90deg, ${defaultStartColor} 0%, ${defaultMidColor} 50%, ${defaultEndColor} 100%)`;

type RGBA = [r: number, g: number, b: number, a: number];

export class ProgressBar extends HTMLElement {
  static observedAttributes = ['min', 'max', 'value', 'colors', 'stripes', 'animate-stripes', 'height'];

  private shadow: ShadowRoot;

  #resizeObserver: ResizeObserver | undefined;
  // Cached percentage so we don't need to read from attributes etc every time.
  private currentPercentage: number = 0;
  // The label element if the <slot> isn't overriden.
  private _labelElement: HTMLElement | null |undefined;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        :host {
          display: inline-block;
          /* It needs a height or the progress bar doesn't show, so this is default height and can be overridden normally with css. */
          height: 1rem;
          width: 100%;
          --bar-bg-color: rgb(64 64 64 / 0.85);
          --show-stripes: ;
          --striped-velocity: 28px;
          /* Space-toggle technique, whichever on/off has initial is the active state */
          --animation-on: ;
          --animation-off: initial;          
          --label-color: white;          
          --bar-colors: ${defaultBarColor};
        }
      
        .progress-container {
          --progress: 0;
        
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          /* border-radius needs to be in a pixel-ish unit, % would make it round odd and a high number gives it maximum round radius. */
          border-radius: 100vh;
          background: var(--bar-bg-color);
        }
        
        .progress-label {
            position: absolute;
            right: 0.5em;
            display: inline-flex;
            align-items: center;
            height: 100%;
            color: var(--label-color);
            /* Height is programmatically set by a resizeObserver */
            font-size: calc(var(--height) * 0.8);
            text-shadow: 1px 1px 2px black;
            user-select: none;
        }
      
        .progress-bar {
          
          --bg-size: var(--animation-on, var(--striped-velocity) var(--striped-velocity), 100% 100%) var(--animation-off, auto auto);
          /* The / / /  stripes when animating. */
          --bg-stripes: var(--show-stripes, repeating-linear-gradient(
              -45deg,
              rgb(255 255 255 / 18%) 0 10px,
              transparent 10px 20px
            ),);
        
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: inherit;
          /* Without this the bar would be 100% wide. */
          clip-path: inset(0 calc(100% - var(--progress)) 0 0);
          transition: none;
          
          background: var(--bg-stripes) var(--bar-colors);
          background-size: var(--bg-size);
          animation: var(--animation-off, none) var(--animation-on, move-stripes 1000ms linear infinite) ;
        }  
        
        @keyframes move-stripes {
          to {
            background-position: var(--striped-velocity) 0, 0 0;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .progress-fill {
            transition: none !important;
          }
        
          .loading .progress-fill {
            animation: none !important;
          }
        }
      </style>
      
      <div
          class="progress-container"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="0"
          part="container"
        >
          <div part="bar" class="progress-bar"></div>
          <div part="label" class="progress-label">
            <slot>
                <span class="label-value" part="label-value">0 %</span>
            </slot>
          </div>
        </div>
    `;

    this.setAttribute('role', 'progressbar');
  }

  _progressBarElement: HTMLElement | null = null;
  public get progressBarElement(): HTMLElement {
    return this._progressBarElement ||= this.shadow.querySelector('.progress-container') as HTMLElement;
  }

  get min(): number {
    const min = parseFloat(this.getAttribute('min') || '');
    return Number.isNaN(min) ? 0 : min;
  }

  set min(min: number | string | null) {
    if (min != null) {
      this.setAttribute('min', min.toString());
    } else {
      this.removeAttribute('min');
    }

    this.value = this.value;
  }

  public get max(): number {
    const max = parseFloat(this.getAttribute('min') || '');
    return Number.isNaN(max) ? 100 : max;
  }

  public set max(max: number | string | null) {
    if (max != null) {
      this.setAttribute('max', max.toString());
    } else {
      this.removeAttribute('max');
    }

    this.value = this.value;
  }

  public get value(): number {
    const attribute = this.getAttribute('value') || '';
    const value = Number.parseFloat(attribute);
    if (Number.isNaN(value))
    {
      return 0;
    }
    return value;
  }

  public set value(value: number | string | null) {
    value = typeof value === 'string' ? Number.parseFloat(value) : value;
    if (value == null || Number.isNaN(value)) {
      this.removeAttribute('value');
      return;
    }
    const min = this.min;
    const max = this.max;

    const low = Math.min(min, max);
    const high = Math.max(max, low);

    const clamped = Math.min(Math.max(value, low), high);

    this.setAttribute('value', clamped.toString());
  }

  /**
   * Return progress between 0 -> 1
   */
  public get progress() {
    return this.currentPercentage;
  }

  public setIsAnimated(value?: boolean): void {
    value = value != null ? value : !this.hasAttribute('animate-stripes');
    if (value) {
      this.setAttribute('animate-stripes', '');
    } else {
      this.removeAttribute('animate-stripes');
    }
  }

  private colorStepSize: number = 0;
  private colorSteps: RGBA[] | undefined = undefined;

  /**
   * Get the current interpolated bar colour, can be useful for example if colouring text same as the bar.
   * Returns colour in rgb() format.
   */
  public getCurrentColor(): string {
    const [colorSteps, colorStepSize] = this.getColorSteps();

    if (!colorSteps) {
      const colorAttr = this.getAttribute('colors');
      if (!colorAttr) {
        return defaultStartColor;
      }
      return colorAttr.split(',')[0]!.trim();
    }

    if (colorSteps.length === 1) {
      const [r, g, b, a] = colorSteps[0]!;
      return `rgb(${r}, ${g}, ${b}, ${a})`;
    }
    const firstStepIndex = Math.floor(this.progress / colorStepSize);
    const [r1, g1, b1, a1] = colorSteps[firstStepIndex]!;
    const secondStep = colorSteps[firstStepIndex + 1];
    if (!secondStep) {
      return `rgb(${r1}, ${g1}, ${b1}, ${a1})`;
    }

    const progress = (this.progress - (firstStepIndex * colorStepSize)) / colorStepSize;

    const r = r1 + (secondStep[0] - r1) * progress;
    const g = g1 + (secondStep[1] - g1) * progress;
    const b = b1 + (secondStep[2] - b1) * progress;
    const a = a1 + (secondStep[3] - a1) * progress;
    return `rgb(${r}, ${g}, ${b}, ${a})`;
  }

  private getColorSteps(): [steps: RGBA[] | undefined, stepSize: number] {
    if (this.colorSteps) {
      return [this.colorSteps, this.colorStepSize];
    }

    const colorAttr = this.getAttribute('colors');
    const colors = colorAttr?.split(',').map((v) => v.trim()) ?? [defaultStartColor, defaultMidColor, defaultEndColor];
    const stepSize = 1 / (colors.length - 1);

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      return [undefined, 0];
    }

    // canvas.
    // 2 = 1 which means 0 -> 1
    // 3 = 2 which means 0 -> 0.5 -> 1.0
    // 4 = 3 which means 0 -> 0.33 -> 0.67 -> 1.0
    // And so on...
    let steps: RGBA[] = [];
    for (const color of colors) {
      // const hex = context.fillStyle;
      // const r = parseInt(hex.slice(1, 3), 16);
      // const g = parseInt(hex.slice(3, 5), 16);
      // const b = parseInt(hex.slice(5, 7), 16);
      // const a = parseInt(hex.slice(7, 9) || 'ff', 16) / 255;

      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);

      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data as unknown as RGBA;
      steps.push([r, g, b, a / 255]);
    }
    return [steps, stepSize];
  }

  connectedCallback(): void {
    this._labelElement = this.shadow.querySelector('slot')?.querySelector('.label-value');
    if ((this._labelElement?.part?.value ?? '') !== 'label-value') {
      this._labelElement = null;
    }
    this.updateAriaValues();
    this.updatePercentages();

    this.#resizeObserver = new ResizeObserver(this.onResize);
    this.#resizeObserver.observe(this);
    const height = this.getBoundingClientRect().height;
    this.style.setProperty("--height", `${height}px`);
  }

  disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    this._labelElement = null;
  }

  onResize = (entries: ResizeObserverEntry[], observer: ResizeObserver) => {
    const height = entries[0]!.contentRect.height;
    this.style.setProperty("--height", `${height}px`);
  };

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }

    let updateState = true;

    switch(name) {
      case 'min':
        this.min = newValue as string | null;
        break;
      case 'max':
        this.max = newValue as string | null;
        break;
      case 'value':
        this.value = newValue as string | null;
        break;
      case 'colors':
        updateState = false;
        this.colorSteps = undefined;
        this.colorStepSize = 0;
        this.onUpdateColors(newValue as string | null);
        break;
      case 'animate-stripes':
        const doAnimation = newValue != null;
        this.style.setProperty('--animation-on', doAnimation ? 'initial' : ' ');
        this.style.setProperty('--animation-off', doAnimation ? ' ' : 'initial');
        updateState = false;
        break;
      case 'stripes':
        const hasStripes = newValue != null;
        this.style.setProperty('--show-stripes', hasStripes ? 'initial': ' ');
        updateState = false;
        break;
    }

    if (updateState) {
      this.updateAriaValues();
      this.updatePercentages();
    }
  }

  private onUpdateColors(colorsRaw: string | null): void {
    if (colorsRaw == null) {
      this.style.setProperty('--bar-colors', defaultBarColor);
      return;
    }

    const colors = colorsRaw.split(',');
    if (colors.length === 1) {
      this.style.setProperty('--bar-colors', `${colors[0]!.trim()}`);
      return;
    }

    let steps: string[] = [];
    let stepCount = 100 / (colors.length - 1);
    for (let i = 0; i < colors.length; i++) {
      const stepPercent = Math.round((i * stepCount));
      steps.push(`${colors[i]!.trim()} ${stepPercent}%`)
    }

    let barColors = `linear-gradient(90deg, ${steps.join(', ')})`

    this.style.setProperty('--bar-colors', barColors);
  }

  private updateAriaValues(): void {
    this.setAttribute('aria-valuemin', this.min.toString());
    this.setAttribute('aria-valuemax', this.max.toString());
    this.setAttribute('aria-valuenow', this.value.toString());
  }


  private updatePercentages(): void {
    const min = this.min;
    const max = this.max;

    const progress = min !== max ? (this.value - min) / (max - min) : 0;
    this.currentPercentage = Math.min(Math.max(progress, 0), 1);
    const percentage = this.progress * 100;

    this.progressBarElement.style.setProperty('--progress', `${percentage}%`);
    if (this._labelElement) {
      this._labelElement.innerText = `${percentage.toFixed(0)}%`;
    }
  }

}

customElements.define('progress-bar', ProgressBar);