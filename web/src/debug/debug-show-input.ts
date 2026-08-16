class DebugShowInput extends HTMLElement {
  static observedAttributes = ['keyboard', 'mouse'];

  shadow: ShadowRoot;
  outputElement: HTMLElement;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    // CSS copied from: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/kbd
    this.shadow.innerHTML = `
      <style>
        kbd {
          background-color: #eeeeee;
          border-radius: 3px;
          border: 1px solid #b4b4b4;
          box-shadow:
            0 1px 1px rgb(0 0 0 / 0.2),
            0 2px 0 0 rgb(255 255 255 / 0.7) inset;
          color: #333333;
          display: inline-block;
          font-size: 0.85em;
          font-weight: bold;
          line-height: 1;
          padding: 2px 4px;
          white-space: nowrap;
        }
      </style>

      <button type="button" class="debug-clear">Clear</button>
      <p class="debug-keypress-output"></p>
    `;

    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleClear = this.handleClear.bind(this);

    this.outputElement = this.shadow.querySelector('p') as HTMLElement;
  }

  connectedCallback() {
  if (this.keyboard) {
      window.addEventListener('keyup', this.handleKeyUp);
    }

    if (this.mouse) {
      window.addEventListener('pointerdown', this.handlePointerDown);
    }

    this.shadow.querySelector('.debug-clear')?.addEventListener('click', this.handleClear);
  }

  disconnectedCallback() {
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointerdown', this.handlePointerDown);

    this.shadow.querySelector('.debug-clear')?.removeEventListener('click', this.handleClear);
  }

  get keyboard() {
    return this.hasAttribute('keyboard');
  }

  set keyboard(value) {
    this.toggleAttribute('keyboard', Boolean(value));
  }

  get mouse() {
    return this.hasAttribute('mouse');
  }

  set mouse(value) {
    this.toggleAttribute('mouse', Boolean(value));
  }

  handleKeyUp(event: KeyboardEvent) {
    if (!this.keyboard) {
      return;
    }

    const kbd = document.createElement('kbd');
    kbd.textContent = event.key;

    this.outputElement.append(kbd, ` - ${event.code}`, document.createElement('br'));
  }

  handlePointerDown(event: PointerEvent) {
    if (!this.mouse) {
      return;
    }

    const kbd = document.createElement('kbd');
    kbd.textContent = `Mouse${event.button}`;

    this.outputElement.append( kbd, ` - ${event.which}`, document.createElement('br'));
  }

  handleClear() {
    this.outputElement.replaceChildren();
  }
}

customElements.define('debug-show-input', DebugShowInput);