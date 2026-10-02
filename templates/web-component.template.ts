export class WebComponentTemplate extends HTMLElement {
  observedAttributes = [];

  shadow: ShadowRoot;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
      </style>
    `;


  }

  connectedCallback() {

  }

  disconnectedCallback() {

  }

  attributeChangedCallback(name: string, oldValue: unknown, newValue: unknown): void {
    if (oldValue === newValue) {
      return;
    }
  }

}

customElements.define('web-component', WebComponentTemplate);