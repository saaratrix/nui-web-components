export class ProgressStatusPopover extends HTMLElement {
    static observedAttributes = ['placement'];
    parent;
    shadow;
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
    _dialog = null;
    get dialog() {
        this._dialog ??= this.shadow.querySelector('dialog');
        return this._dialog;
    }
    attributeChangedCallback(name, _, newValue) {
        if (name === 'placement') {
            this.positionPopover(newValue, this.parent);
        }
    }
    showOrHide(state) {
        if (state) {
            this.show();
        }
        else {
            this.hide();
        }
    }
    show() {
        if (this.dialog.open) {
            return;
        }
        this.dialog.show();
        this.positionPopover(this.getAttribute('placement'), this.parent);
    }
    hide() {
        if (!this.dialog.open) {
            return;
        }
        this.dialog.close();
    }
    positionPopover(placementValue, anchor) {
        const placement = this.getPlacement(placementValue);
        const anchorRect = anchor.getBoundingClientRect();
        const popoverRect = this.dialog.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const fitsTop = anchorRect.top >= popoverRect.height;
        const fitsBottom = viewportHeight - anchorRect.bottom >= popoverRect.height;
        if (placement === 'above') {
            if (fitsTop) {
                this.placeAbove();
            }
            else if (fitsBottom) {
                this.placeBottom(anchorRect);
            }
            else {
                this.placeAbove(16);
            }
        }
    }
    placeAbove(offsetX = 0) {
        this.style.left = offsetX > 0 ? `${offsetX}px` : '0';
        this.style.top = `${-this.dialog.offsetHeight}px`;
    }
    placeBottom(rect) {
        this.style.left = '0';
        this.style.top = `${rect.height}px`;
    }
    getPlacement(value) {
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
