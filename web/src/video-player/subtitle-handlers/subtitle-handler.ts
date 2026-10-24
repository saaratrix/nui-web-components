import type { Subtitle } from '../video-player.models';

export interface SubtitleHandler {
  remove(): void;

  changeSubtitle(subtitle: Subtitle): Promise<void>;
  clearSelectedSubtitle(): void;
  canAdjustMargin(): boolean;
  adjustMargin(offsetMultiplier: number): Promise<void>;
}