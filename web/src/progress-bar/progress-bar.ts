export class ProgressBar extends HTMLElement {
  static observedAttributes = ['min', 'max', 'value', 'colors', 'stripes', 'animate-stripes', 'height'];

  private shadow: ShadowRoot;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        :host {
          display: inline-block;
          /* It needs a height or the progress bar doesn't show, so this is default height and can be overridden normally with css. */
          height: 12px;
          width: 100%;
          --progress-bg-color: #1a2740;
          --show-stripes: ;
          --striped-velocity: 28px;
          /* Space-toggle technique, whichever on/off has initial is the active state */
          --animation-on: ;
          --animation-off: initial;
          
          --bar-colors: linear-gradient(
            90deg,
            #b325ff 0%,
            #6d54ff 35%,
            #3e8cff 70%,
            #26d3d1; 100%
          );
        }
      
        .progress-container {
          --progress: 0;
        
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          /* border-radius needs to be in a pixel-ish unit, % would make it round odd and a high number gives it maximum round radius. */
          border-radius: 100vh;
          background: var(--progress-bg-color);
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
          inset: 0;
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
        </div>
    `;

    this.setAttribute('role', 'progressbar');
  }

  #progressBarElement: HTMLElement | null = null;
  public get progressBarElement(): HTMLElement {
    return this.#progressBarElement ||= this.shadow.querySelector('.progress-container') as HTMLElement;
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

  public setIsAnimated(value?: boolean): void {
    value = value != null ? value : !this.hasAttribute('animate-stripes');
    if (value) {
      this.setAttribute('animate-stripes', '');
    } else {
      this.removeAttribute('animate-stripes');
    }
  }

  connectedCallback(): void {
    this.updateAriaValues();
    this.updatePercentages();
  }

  disconnectedCallback(): void {

  }

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
      this.style.setProperty('--bar-colors', '#badbad');
      return;
    }

    const colors = colorsRaw.split(',');
    if (colors.length === 1) {
      this.style.setProperty('--bar-colors', `${colors[0].trim()}`);
      return;
    }

    let steps = [];
    let stepCount = 100 / (colors.length - 1);
    for (let i = 0; i < colors.length; i++) {
      const stepPercent = Math.round((i * stepCount));
      steps.push(`${colors[i].trim()} ${stepPercent}%`)
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
    const percentage = Math.min(Math.max(progress, 0), 1) * 100;

    this.progressBarElement.style.setProperty('--progress', `${percentage}%`);
  }

}

customElements.define('progress-bar', ProgressBar);