// TODO: Change that these are using fixed external css variables.
const sharedCSS = `
  .icon-action {
    padding: 5px;
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-text);
    border-radius: 4px;
    cursor: pointer;
  }
  
  .icon-action[disabled] {
    background-color: var(--color-link-disabled-bg);
    border: 1px solid var(--color-text-disabled);
    cursor: not-allowed;
    color: var(--color-text-disabled);
  }
  
  .icon-action:hover:not([disabled]) {    
    border: 1px solid var(--color-link-hover);
    color: var(--color-link-hover);
  }
  
  .icon-action:active:not([disabled]), .icon-action:focus {
    border: 1px solid var(--color-link-contrast);
    color: var(--color-link-contrast);
    outline: 0;
  }
`;

function supportsAdoptedStyleSheets(): boolean {
  return (
    "adoptedStyleSheets" in Document.prototype &&
    "adoptedStyleSheets" in ShadowRoot.prototype &&
    "replaceSync" in CSSStyleSheet.prototype
  );
}

export function applyMediaViewerSharedCSS(shadowRoot: ShadowRoot) {
  let useFallback = !supportsAdoptedStyleSheets();

  try {
    if (!useFallback) {
      const css = new CSSStyleSheet();
      css.replaceSync(sharedCSS);
      shadowRoot.adoptedStyleSheets = [css];
    }

  } catch (e) {
    useFallback = true;
  }

  if (useFallback) {
    const style = document.createElement("style");
    style.textContent = sharedCSS;
    shadowRoot.appendChild(style);
  }
}

export function isVideoElement(
  element: Element | null | undefined,
): element is HTMLVideoElement {
  return element?.nodeName === 'VIDEO';
}