export class ProgressStatusPopover extends HTMLElement {
  shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        :host, * {
          box-sizing: border-box;
        }
      </style>

      <dialog>
        <slot name="content"></slot>
      </dialog>
    `;

    this.dialog.open = false;
  }

  _dialog: HTMLDialogElement | null = null;
  get dialog(): HTMLDialogElement {
    this._dialog ??= this.shadow.querySelector('dialog');
    return this._dialog!;
  }

  public showOrHide(state: boolean) {
    if (state) {
      this.show();
    } else {
      this.hide();
    }
  }

  public show(): void {
    if (this.dialog.open) {
      return;
    }

    this.dialog.show();
  }

  public hide(): void {
    if (!this.dialog.open) {
      return;
    }
    this.dialog.close();
  }
}

customElements.define('progress-status-popover', ProgressStatusPopover);