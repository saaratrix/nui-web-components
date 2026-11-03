interface OriginalMethods {
  log: ((...data: any[]) => void) | null;
  warn: ((...data: any[]) => void) | null;
  error: ((...data: any[]) => void) | null;
}

class DebugLogger extends HTMLElement {
  static observedAttributes = ['keyboard', 'mouse'];

  shadow: ShadowRoot;

  logsActive = {
    log: true,
    warn: true,
    error: true,
    windowError: true,
  };

  originalMethods: OriginalMethods = {
    log: null,
    warn: null,
    error: null,
  };

  isLogging = false;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        .buttons {
            display: flex;
        }
        
        button {
            margin-left: 0.5rem;
            font-size: 1.15em;
         }
         
         p {
            margin: 0;
         }
         
         .warn {
            color: orange;
         }
         .error {
            color: red;
         }
      </style>

      <div class="buttons">
        <div class="start-container">
            <button class="start">Log</button>
        </div>
        <div class="stop-container" hidden>
          <button class="stop">Stop log</button>
          <label>Log: <input id="log" type="checkbox" checked></label>
          |
          <label>Warm: <input id="warn" type="checkbox" checked></label>
          |
          <label>Error: <input id="error" type="checkbox" checked></label> 
        </div>
        <button class="clear">Clear</button>
      </div>
      <div class="output"></div>
    `;

    const startButton = this.shadow.querySelector('.start') as HTMLButtonElement;
    const stopButton = this.shadow.querySelector('.stop') as HTMLButtonElement;

    startButton.addEventListener('click', () => {
      (this.shadow.querySelector('.start-container') as HTMLElement).hidden = true;
      (this.shadow.querySelector('.stop-container') as HTMLElement).hidden = false;
      this.isLogging = true;
    }, false);

    stopButton.addEventListener('click', () => {
      (this.shadow.querySelector('.start-container') as HTMLElement).hidden = false;
      (this.shadow.querySelector('.stop-container') as HTMLElement).hidden = true;
      this.isLogging = false;
    }, false)

    const inputs = this.shadow.querySelectorAll('input');
    inputs.forEach((i) => {
      i.addEventListener('change', () => {
        const id = i.id as keyof typeof this.logsActive;
        this.logsActive[id] = i.checked;
      }, false);
    });

    this.shadow.querySelector('.clear')?.addEventListener('click', () => {
      this.outputElement && (this.outputElement.innerHTML = '');
    });
  }

  private _outputElement: HTMLElement | null = null;
  public get outputElement(): HTMLElement | null {
    return this._outputElement ||= this.shadow.querySelector('.output');
  }

  public set outputElement(value: HTMLElement | null) {
    this._outputElement = value;
  }

  connectedCallback() {
    window.addEventListener('error', this.onWindowError, false);

    this.originalMethods.log = console.log.bind(console);
    this.originalMethods.warn = console.warn.bind(console);
    this.originalMethods.error = console.error.bind(console);

    console.log = (...data: any[]) => {
      this.originalMethods.log!(...data);
      if (this.logsActive.log) {
        this.log('log', ...data);
      }
    }

    console.warn = (...data: any[]) => {
      this.originalMethods.warn!(...data);
      if (this.logsActive.warn) {
        this.log('warn', ...data);
      }
    }

    console.error = (...data: any[]) => {
      this.originalMethods.error!(...data);
      if (this.logsActive.error) {
        this.log('error', ...data);
      }
    }
  }

  disconnectedCallback() {
    window.removeEventListener('error', this.onWindowError, false);

    if (this.originalMethods.log) {
      console.log = this.originalMethods.log;
    }
    if (this.originalMethods.warn) {
      console.warn = this.originalMethods.warn;
    }
    if (this.originalMethods.error) {
      console.error = this.originalMethods.error;
    }
  }

  public log(type: 'log' | 'warn' | 'error', ...messages: any[]): void {
    if (!this.isLogging || !this.outputElement) {
      return;
    }

    const element = document.createElement('p');

    const message = messages.join(' ');
    element.textContent = message;
    element.classList.add(type);
    this.outputElement?.appendChild(element);
  }

  onWindowError = (event: ErrorEvent) => {
    if (!this.logsActive.windowError) {
      return;
    }

    this.log('error', event.message);
  };
}

customElements.define('debug-logger', DebugLogger);