const css = new CSSStyleSheet();
css.replaceSync(`
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
`);

export const mediaViewerSharedCSS = css;