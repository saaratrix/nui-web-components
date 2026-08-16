export function isVideoElement(
  element: Element | null | undefined,
): element is HTMLVideoElement {
  return element?.nodeName === 'VIDEO';
}