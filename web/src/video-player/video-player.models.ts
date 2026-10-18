import type { SubtitlesOctopus } from './subtitles-octopus/subtitles-octopus.d.ts';

export enum SubtitleType {
  Vtt,
  Ass
}

export interface Subtitle {
  // A url to a subtitle.
  src?: string;
  // Content of a subtitle.
  content?: string;
  type: SubtitleType;
  label: string;
  srclang: string;
}

declare global {
  interface Window {
    __nuiOctopusPromise?: Promise<void>;
    __nuiOctopus?: SubtitlesOctopus;
    __nuiOctopusCanvas?: HTMLCanvasElement;
  }
}
