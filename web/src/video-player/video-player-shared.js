// language=CSS
export const controlsIconCSS = `
.icon {
    display: inline-block;
    border-radius: 50%;
    box-sizing: border-box;
    width: var(--icon-size);
    height: var(--icon-size);
    padding: calc((var(--icon-size) - var(--icon-size-svg)) * 0.5);
    color: var(--color-icon, white);
    cursor: pointer;
}

.icon svg {
    width: var(--icon-size-svg);
    height: var(--icon-size-svg);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}

.icon:hover {
    color: var(--color-icon-hover, #eee);
    background-color: rgba(0, 0, 0, 0.08);
}

.icon:active {
    color: var(--color-icon-active, #ddd);
}`;
