import { MediaViewer } from './media-viewer';

export const MediaType = {
  // Really only used initially just to have a value.
  Unknown: 'unknown',
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
} as const;
export type MediaTypes = typeof MediaType[keyof typeof MediaType];

export const defaultControlsPlacement: ControlsPlacement = 'page:left';
export const ControlsPlacements = {
  PageLeft: 'page:left',
  PageRight: 'page:right',
  ItemLeft: 'item:up',
  ItemRight: 'item:down',
} as const;
export type ControlsPlacement = typeof ControlsPlacements[keyof typeof ControlsPlacements];
export const controlsPlacementValues = new Set<ControlsPlacement>([ControlsPlacements.PageLeft, ControlsPlacements.PageRight, ControlsPlacements.ItemLeft, ControlsPlacements.ItemRight]);

/** .vtt files */
export interface Subtitle {
  src: string;
  label: string;
  srclang: string;
}

export const viewingItemChangedEvent = 'viewer:itemChanged';
export const viewingFailedToLoadEvent = 'viewer:failedToLoad';

export interface MediaViewerItemChangedEvent {
  id: string;
  mediaViewer: MediaViewer;
  mediaType: MediaTypes;
}

// export type ViewingItemChangedEvent = ViewingType;
export const dispatchViewingItemChangedEvent = (id: string, mediaViewer: MediaViewer, mediaType: MediaTypes) => {
  window.dispatchEvent(new CustomEvent<MediaViewerItemChangedEvent>(viewingItemChangedEvent, {
    detail: {
      id,
      mediaViewer,
      mediaType,
    },
  }));
}

export interface MediaViewerFailedToLoadEvent {
  id: string;
  mediaViewer: MediaViewer;
}

export const dispatchViewingFailedToLoadEvent = (id: string, mediaViewer: MediaViewer) => {
  window.dispatchEvent(new CustomEvent<MediaViewerFailedToLoadEvent>(viewingFailedToLoadEvent, {
    detail: {
      id,
      mediaViewer
    }
  }));
}