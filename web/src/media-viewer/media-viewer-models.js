export const MediaType = {
    // Really only used initially just to have a value.
    Unknown: 'unknown',
    Image: 'image',
    Video: 'video',
    Audio: 'audio',
};
export const defaultControlsPlacement = 'page:left';
export const ControlsPlacements = {
    PageLeft: 'page:left',
    PageRight: 'page:right',
    ItemLeft: 'item:left',
    ItemRight: 'item:right',
};
export const controlsPlacementValues = new Set([ControlsPlacements.PageLeft, ControlsPlacements.PageRight, ControlsPlacements.ItemLeft, ControlsPlacements.ItemRight]);
export const viewingItemChangedEvent = 'viewer:itemChanged';
export const viewingFailedToLoadEvent = 'viewer:failedToLoad';
// export type ViewingItemChangedEvent = ViewingType;
export const dispatchViewingItemChangedEvent = (id, mediaViewer, mediaType) => {
    window.dispatchEvent(new CustomEvent(viewingItemChangedEvent, {
        detail: {
            id,
            mediaViewer,
            mediaType,
        },
    }));
};
export const dispatchViewingFailedToLoadEvent = (id, mediaViewer) => {
    window.dispatchEvent(new CustomEvent(viewingFailedToLoadEvent, {
        detail: {
            id,
            mediaViewer
        }
    }));
};
