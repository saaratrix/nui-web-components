export function positionPopover(popover, anchor, options = {}) {
    const { x: startX, y: startY } = popover.offsetParent?.getBoundingClientRect() ?? { x: 0, y: 0 };
    const pRects = popover.getBoundingClientRect();
    const aRects = anchor.getBoundingClientRect();
    // Arrow is rotated 45 degrees so if we divide width by Math.sqrt(2) we get original width.
    const arrowSize = options.arrow ? options.arrow.getBoundingClientRect().width / 1.4142135623730951 : 0;
    const margin = options.margin ?? 12;
    const gap = Math.max(options.gap ?? 12, arrowSize / 2);
    // const outerLeft = options.outerBounds?.left ?? 0;
    // const outerRight = options.outerBounds?.right ?? window.innerWidth;
    // const outerTop = options.outerBounds?.top ?? 0;
    // const outerBottom = options.outerBounds?.bottom ?? window.innerHeight;
    const fitsBelow = aRects.bottom + gap + pRects.height <= window.innerHeight - margin;
    const fitsAbove = aRects.top - gap - pRects.height >= gap;
    let top;
    let left = 0;
    let placement = 'bottom';
    if (fitsBelow || fitsAbove) {
        if (fitsBelow) {
            placement = 'bottom';
            top = aRects.bottom + gap;
        }
        else {
            top = aRects.top - gap - pRects.height;
            placement = 'top';
        }
        left = Math.max((aRects.left + aRects.width / 2) - pRects.width / 2, margin);
        // 1000 - 990 = 10
        const rightDelta = (innerWidth - margin) - (left + pRects.width);
        if (rightDelta < 0 && left > margin) {
            left += rightDelta;
        }
    }
    else {
        const fitsRight = aRects.right + gap + pRects.width <= window.innerWidth - margin;
        const fitsLeft = aRects.left - gap - pRects.width >= margin;
        // If it fits right or doesn't fit left then default to right.
        if (fitsRight || !fitsLeft) {
            left = aRects.right + gap;
            placement = 'right';
        }
        else if (fitsLeft) {
            left = aRects.left - gap - pRects.width;
            placement = 'left';
        }
        top = Math.max((aRects.top + aRects.height / 2 - pRects.height / 2), margin);
    }
    popover.dataset['placement'] = placement;
    // Just reduce startX and startY at the end to adjust for the parent's position: relative; offset.
    popover.style.left = `${left - startX + window.scrollX}px`;
    popover.style.top = `${top - startY + window.scrollY}px`;
    if (options.arrow) {
        positionArrow(options.arrow, anchor, arrowSize, left, top, placement);
    }
}
// Example of arrow placement css.
// language=CSS
export const createArrowPopoverCSS = (selector, arrowClass) => `
${selector}[data-placement="bottom"] ${arrowClass} {
  top: calc(var(--arrow-size, 12px) / -2);
}

${selector}[data-placement="top"] ${arrowClass} {
  bottom: calc(var(--arrow-size, 12px) / -2);
}

${selector}[data-placement="right"] ${arrowClass} {
  left: calc(var(--arrow-size, 12px) / -2);
}

${selector}[data-placement="left"] ${arrowClass} {
  right: calc(var(--arrow-size, 12px) / -2);
}
`;
function positionArrow(arrow, anchor, arrowSize, popoverLeft, popoverTop, placement) {
    const a = anchor.getBoundingClientRect();
    arrow.style.left = '';
    arrow.style.top = '';
    arrow.style.right = '';
    arrow.style.bottom = '';
    if (placement === 'bottom' || placement === 'top') {
        const anchorCenterX = a.left + a.width / 2;
        const arrowLeft = anchorCenterX - popoverLeft - arrowSize / 2;
        arrow.style.left = `${arrowLeft}px`;
    }
    else {
        const anchorCenterY = a.top + a.height / 2;
        const arrowTop = Math.max(anchorCenterY - popoverTop - arrowSize / 2, arrowSize);
        arrow.style.top = `${arrowTop}px`;
    }
}
