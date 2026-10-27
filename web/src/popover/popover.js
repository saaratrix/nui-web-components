import { createArrowPopoverCSS, positionPopover } from '../popover/popover-utility.js';
var PopoverTrigger;
(function (PopoverTrigger) {
    PopoverTrigger[PopoverTrigger["Click"] = 0] = "Click";
    PopoverTrigger[PopoverTrigger["Hover"] = 1] = "Hover";
})(PopoverTrigger || (PopoverTrigger = {}));
export class Popover extends HTMLElement {
    static observedAttributes = ['pin', 'disabled', 'hide-arrow', 'trigger'];
    shadow;
    popoverContainer;
    arrow;
    content;
    events = [];
    isVisible = false;
    storedParentElement = null;
    currentAnchor = null;
    isPinned = false;
    portalRoot = null;
    portalShadow = null;
    portalStyle = null;
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.shadow.innerHTML = `
      <style>

        :host {
            display: block;
            position: relative;
            max-height: inherit;
            box-sizing: border-box;;
        }
        
        [hidden] {
            display: none !important;
        }

        .popover {
            position: absolute;
            /* display: flex & column solves a height issue overflow issue. */
            display: flex;
            flex-direction: column;
            width: 100%;
            height: auto;
            max-height: inherit;
            padding: var(--padding, 1rem) 0;
            border-radius: 0.75rem;
            box-sizing: border-box;
            color: var(--color, currentColor);
            background-color: var(--color-bg, #eee);
        }
        
        .content-container {
            overflow-y: auto;
            height: 100%;
            padding: 0 var(--padding, 1rem);
            box-sizing: border-box;
            max-height: inherit;
        }
        
        .content {
            max-height: inherit;
            box-sizing: border-box;
        }
        
        .arrow {
            position: absolute;
            width: var(--arrow-size, 12px);
            height: var(--arrow-size, 12px);
            transform: rotate(45deg);
            background-color: var(--arrow-color, var(--color-bg, #eee));
        }
        
        ${createArrowPopoverCSS('.popover', '.arrow')}
        
      </style>
      
      <div class="popover" hidden>
        <div class="arrow"></div>
        <div class="content-container">
            <div class="content">
                <slot name="content"></slot>
            </div>
        </div>
      </div>
    `;
        this.popoverContainer = this.shadow.querySelector('.popover');
        this.arrow = this.shadow.querySelector('.arrow');
        this.content = this.shadow.querySelector('slot[name="content"]');
    }
    connectedCallback() {
        // Do this only once otherwise it would change when moving element to body.
        if (!this.storedParentElement) {
            // if parent is a shadow fragment it's parentNode
            this.storedParentElement = this.parentElement || this.parentNode;
        }
    }
    disconnectedCallback() {
        setTimeout(() => {
            if (!this.isConnected) {
                this.removeEvents();
            }
        });
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        if (name === 'pin') {
            if (!this.currentAnchor) {
                return;
            }
            if (this.canPin) {
                this.addEvent(this.currentAnchor, 'click', () => this.onAnchorClick());
            }
            else {
                this.removeEvent(this.currentAnchor, 'click');
            }
        }
        else if (name === 'hide-arrow') {
            this.arrow.hidden = newValue !== null;
        }
    }
    get isDisabled() {
        return this.hasAttribute('disabled') || this.content.assignedElements().length === 0;
    }
    get canPin() {
        return this.hasAttribute('pin') || this.trigger === PopoverTrigger.Click;
    }
    get showArrow() {
        return !this.hasAttribute('hide-arrow');
    }
    get trigger() {
        const trigger = this.getAttribute('trigger') ?? '';
        switch (trigger.toLowerCase()) {
            case 'click':
                return PopoverTrigger.Click;
            default:
                return PopoverTrigger.Hover;
        }
    }
    set trigger(value) {
        if (!value) {
            this.removeAttribute('trigger');
            return;
        }
        let trigger = 'hover';
        switch (value.toLowerCase()) {
            case 'click':
                trigger = 'click';
                break;
        }
        this.setAttribute('trigger', trigger);
    }
    tryGetAnchor() {
        return this.currentAnchor || this.parentElement;
    }
    setAnchor(anchor) {
        if (anchor === this.currentAnchor) {
            return;
        }
        this.removeEvents();
        this.currentAnchor = anchor;
        if (!anchor) {
            return;
        }
        if (this.canPin) {
            this.addEvent(anchor, 'click', () => this.onAnchorClick());
        }
        this.addEvent(anchor, 'pointerenter', () => this.onAnchorPointerEnter());
        this.addEvent(anchor, 'pointerleave', () => this.onAnchorPointerLeave());
        this.addEvent(window, 'resize', () => this.onWindowResize());
    }
    addEvent(element, type, method, options) {
        const hasEvent = this.events.find(e => e.element === element && e.type === type);
        if (hasEvent) {
            return;
        }
        element.addEventListener(type, method, options ?? false);
        this.events.push({ element, type, method });
    }
    removeEvents() {
        for (const event of this.events) {
            event.element.removeEventListener(event.type, event.method);
        }
        this.events = [];
    }
    removeEvent(element, type) {
        const index = this.events.findIndex(e => e.element === element && e.type === type);
        const event = this.events[index];
        if (event) {
            event.element.removeEventListener(event.type, event.method);
            this.events.splice(index, 1);
        }
    }
    show() {
        if (this.isVisible) {
            return;
        }
        const anchor = this.tryGetAnchor();
        if (!anchor) {
            console.log(`Can't show popover due to no anchor, call setAnchor() to set an anchor element.`);
            return;
        }
        this.isVisible = true;
        this.popoverContainer.hidden = false;
        this.addSelfToPortalRoot();
        positionPopover(this.popoverContainer, anchor, {
            arrow: this.showArrow ? this.arrow : null,
        });
        this.dispatchEvent(new CustomEvent('popoverShow', {
            bubbles: true,
            composed: true,
        }));
    }
    hide() {
        if (!this.isVisible) {
            return;
        }
        this.isVisible = false;
        this.removeEvent(document, 'click');
        this.addSelfBackToParent();
        this.popoverContainer.hidden = true;
        this.dispatchEvent(new CustomEvent('popoverHide', {
            bubbles: true,
            composed: true,
        }));
    }
    onAnchorClick() {
        if (this.isDisabled) {
            return;
        }
        this.isPinned = !this.isPinned;
        if (this.isPinned) {
            setTimeout(() => {
                this.addEvent(document, 'click', (event) => this.onOutsideClick(event));
            });
        }
        if (!this.isHoverAllowed()) {
            this.isVisible ? this.hide() : this.show();
        }
    }
    onOutsideClick = (event) => {
        const composedPath = event.composedPath();
        if (composedPath.indexOf(this.popoverContainer) !== -1) {
            return;
        }
        if (this.isVisible) {
            this.hide();
        }
        this.removeEvent(document, 'click');
        this.isPinned = false;
    };
    onAnchorPointerEnter() {
        if (this.isDisabled || !this.isHoverAllowed()) {
            return;
        }
        this.show();
    }
    onAnchorPointerLeave() {
        if (this.isDisabled || this.isPinned) {
            return;
        }
        this.hide();
    }
    onWindowResize() {
        if (!this.isVisible) {
            return;
        }
        const anchor = this.tryGetAnchor();
        positionPopover(this.popoverContainer, anchor, {
            arrow: this.showArrow ? this.arrow : null,
        });
    }
    isHoverAllowed() {
        switch (this.trigger) {
            case PopoverTrigger.Hover:
                return true;
        }
        return false;
    }
    addSelfToPortalRoot() {
        if (!this.portalRoot) {
            this.portalRoot = this.findOrCreatePortalRoot();
        }
        if (this.portalRoot.__contentReference !== this) {
            this.tryCopyStylesToPortalRoot();
            this.portalRoot.__contentReference = this;
        }
        this.setPortalRootParent();
        this.portalShadow.appendChild(this);
    }
    findOrCreatePortalRoot() {
        let portalRoot = document.getElementById('nui-portal-root');
        if (!portalRoot) {
            portalRoot = document.createElement('div');
            portalRoot.id = 'nui-portal-root';
            document.body.appendChild(portalRoot);
            portalRoot.attachShadow({ mode: 'open' });
            const portalStyle = document.createElement('style');
            // portalRoot.shadowRoot!.appendChild(portalBaseStyle);
            portalRoot.shadowRoot.appendChild(portalStyle);
            this.portalStyle = portalStyle;
        }
        else {
            this.portalStyle = portalRoot.querySelector('style');
        }
        this.portalShadow = portalRoot.shadowRoot;
        return portalRoot;
    }
    tryCopyStylesToPortalRoot() {
        const rootNode = this.getRootNode();
        this.portalStyle.textContent = '';
        if (!(rootNode instanceof ShadowRoot) && !(rootNode instanceof Document)) {
            return;
        }
        let popoverStyle;
        for (let i = 0; i < rootNode.styleSheets.length; i++) {
            const style = rootNode.styleSheets.item(i);
            if (!style?.ownerNode || !('id' in style.ownerNode) || style.ownerNode.id !== 'popover') {
                continue;
            }
            popoverStyle = style;
            break;
        }
        if (!popoverStyle) {
            return;
        }
        let css = '';
        const rules = popoverStyle.cssRules;
        for (let i = 0; i < rules.length; i++) {
            const rule = rules.item(i);
            if (rule) {
                css += rule.cssText + '\n';
            }
        }
        this.portalStyle.textContent = css;
    }
    /**
     * If in fullscreen mode we need to attach the portal root element to document.fullScreenElement instead of body.
     */
    setPortalRootParent() {
        let element = document.fullscreenElement || document.body;
        while (element.shadowRoot && element.shadowRoot.fullscreenElement) {
            element = element.shadowRoot.fullscreenElement;
        }
        if (element.shadowRoot) {
            element = element.shadowRoot;
        }
        if (this.portalRoot.parentElement !== element) {
            element.appendChild(this.portalRoot);
        }
    }
    addSelfBackToParent() {
        this.storedParentElement?.appendChild(this);
    }
}
customElements.define('nui-popover', Popover);
