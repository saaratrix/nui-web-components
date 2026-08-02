// Note: currently only supporting top.
import { ProgressStatus } from './progress-status';

export type PopoverPlacement = 'above';

export class ProgressStatusPopover extends HTMLElement {
  static observedAttributes = ['placement'];
  parent!: ProgressStatus;
  shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });

    this.shadow.innerHTML = `
      <style>
        :host {
            position: absolute;
        }
        dialog {
            /* Max content is needed or the dialog takes minimum space. */
            inline-size: max-content;
            max-inline-size: 80vw;
            box-sizing: border-box;
        }
      </style>

      <dialog part="dialog">
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

  attributeChangedCallback(name: string, _: unknown | null, newValue: unknown | null) {
    if (name === 'placement') {
      this.positionPopover(newValue as string | null, this.parent!);
    }
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
    this.positionPopover(this.getAttribute('placement'), this.parent!);
  }

  public hide(): void {
    if (!this.dialog.open) {
      return;
    }
    this.dialog.close();
  }

  private positionPopover(placementValue: string | null, anchor: HTMLElement): void {
    const placement = this.getPlacement(placementValue);

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = this.dialog.getBoundingClientRect();

    const viewportHeight = window.innerHeight;

    const fitsTop =
      anchorRect.top >= popoverRect.height;

    const fitsBottom =
      viewportHeight - anchorRect.bottom >= popoverRect.height;

    if (placement === 'above') {
      if (fitsTop) {
        this.placeAbove();
      } else if (fitsBottom) {
        this.placeBottom(anchorRect);
      } else {
        this.placeAbove(16);
      }
    }
  }

  private placeAbove(offsetX = 0) {
    this.style.left = offsetX > 0 ? `${offsetX}px` : '0';
    this.style.top = `${-this.dialog.offsetHeight}px`;
  }

  private placeBottom(rect: DOMRect) {
    this.style.left = '0';
    this.style.top = `${rect.height}px`;
  }

  private getPlacement(value: string | null): PopoverPlacement {
    switch (value?.toLowerCase() ?? '') {
      case 'above':
        return 'above';
      // case 'bottom':
      //   return 'bottom';
      default:
        return 'above';
    }
  }


}

customElements.define('progress-status-popover', ProgressStatusPopover);