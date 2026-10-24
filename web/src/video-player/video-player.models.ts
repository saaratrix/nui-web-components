import type { SubtitlesOctopus } from './subtitles-octopus/subtitles-octopus.d.ts';

export enum SubtitleType {
  Vtt,
  Srt,
  Ssa,
  Ass
}

export function getSubtitleTypeFromName(name: string): SubtitleType | undefined {
  const extension = (name.split('.').pop() ?? '').toLowerCase();
  switch (extension) {
      case 'ass':
        return SubtitleType.Ass;
      case 'ssa':
        return SubtitleType.Ssa;
      case 'srt':
        return SubtitleType.Srt;
      case 'vtt':
        return SubtitleType.Vtt;
      default:
        return;
    }
}

export interface Subtitle {
  // A url to a subtitle.
  src?: string;
  // Content of a subtitle.
  content?: string;
  type: SubtitleType;
  label: string;
  srclang: string;
  // Eg if you upload a file it can show the original file name if many subtitles or the length has to be truncated.
  title?: string;
}

declare global {
  interface Window {
    __nuiOctopusPromise?: Promise<void>;
    __nuiOctopus?: SubtitlesOctopus;
    __nuiOctopusCanvas?: HTMLCanvasElement;
  }
}
