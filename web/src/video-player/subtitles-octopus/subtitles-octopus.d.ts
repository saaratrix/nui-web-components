declare global {
  interface Window {
    SubtitlesOctopus?: typeof SubtitlesOctopus;
    SubtitlesOctopusOnLoad?: () => void;
  }
}

type RenderMode = 'lossy' | 'wasm-blend' | (string & {});

export interface SubtitleOctopusOptions {
  canvas?: HTMLCanvasElement;
  video?: HTMLVideoElement;
  renderMode?: RenderMode;
  lossyRender?: boolean;
  libassMemoryLimit?: number;
  libassGlyphLimit?: number;
  targetFps?: number;
  prescaleFactor?: number;
  prescaleHeightLimit?: number;
  // Zero means unlimited.
  maxRenderHeight?: number;
  dropAllAnimations?: boolean;
  fonts?: string[];
  // Lowercase font family name to font URL.
  availableFonts?: Record<string, string>;
  fallbackFont?: string;
  lazyFileLoading?: boolean;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  workerUrl?: string;
  legacyWorkerUrl?: string;
  subUrl?: string;
  subContent?: string | null;
  debug?: boolean;
  timeOffset?: number;
}

interface SubtitleEvent {
  [key: string]: unknown;
}

interface SubtitleStyle {
  Alignment: number
  Angle: number;
  BackColour: number;
  Blur: number;
  Bold: number;
  BorderStyle: number;
  Encoding: number;
  FontName: string; // Eg "Arial"
  FontSize: number;
  Italic: number;
  Justify: number;
  MarginL: number; // Eg 20
  MarginR: number; // Eg 20
  MarginV: number;
  Name: 'Default' | string;
  Outline: number;
  OutlineColour: number;
  PrimaryColour: number; // Eg: -256.
  ScaleX: number;
  ScaleY: number;
  SecondaryColour: number; // Eg: 16776960
  Shadow: number;
  Spacing: number;
  StrikeOut: number;
  Underline: number;
  treat_fontname_as_pattern: number;
  _index: number;
}

interface VideoPosition {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface WorkerRequest {
  target: string;
  [key: string]: unknown;
}

interface WorkerResponse {
  target: string;
  [key: string]: unknown;
}

interface CustomMessageOptions {
  preMain?: boolean;
}

export class SubtitlesOctopus {
  constructor(options: SubtitleOctopusOptions);

  canvas: HTMLCanvasElement;
  video: HTMLVideoElement | null | undefined;
  renderMode: RenderMode;
  libassMemoryLimit: number;
  libassGlyphLimit: number;
  targetFps: number;
  prescaleFactor: number;
  prescaleHeightLimit: number;
  maxRenderHeight: number;
  dropAllAnimations: boolean;
  isOurCanvas: boolean;
  canvasParent: HTMLDivElement | null;
  fonts: string[];
  availableFonts: Record<string, string>;
  fallbackFont: string;
  lazyFileLoading: boolean;
  onReadyEvent?: (() => void) | null;
  onErrorEvent?: ((error: unknown) => void) | null;
  workerUrl: string;
  subUrl?: string;
  subContent: string | null;
  debug: boolean;
  lastRenderTime: number;
  pixelRatio: number;
  timeOffset: number;
  hasAlphaBug: boolean;
  worker: Worker | null;
  workerActive: boolean;
  frameId: number;
  ctx: CanvasRenderingContext2D;
  bufferCanvas: HTMLCanvasElement;
  bufferCanvasCtx: CanvasRenderingContext2D;
  ro?: ResizeObserver | null;
  renderFramesData?: unknown;
  renderFrameData: null;
  renderStart?: number;
  onCustomMessage?: ((event: MessageEvent<WorkerResponse>) => void) | null;

  workerError(error: unknown): void;
  init(): void;
  createCanvas(): void;
  setVideo(video?: HTMLVideoElement | null): void;
  getVideoPosition(): VideoPosition;
  setSubUrl(subUrl?: string): void;
  onWorkerMessage(event: MessageEvent<WorkerResponse>): void;
  resize(width?: number, height?: number, top?: number, left?: number): void;
  resizeWithTimeout(): void;
  runBenchmark(): void;
  customMessage(data: unknown, options?: CustomMessageOptions): void;
  setCurrentTime(currentTime: number): void;
  // Alias for setCurrentTime.
  render(currentTime: number): void;
  setTrackByUrl(url: string): void;
  setTrack(content: string): void;
  // content parameter is ignored.
  freeTrack(content?: unknown): void;
  setIsPaused(isPaused: boolean, currentTime: number): void;
  setRate(rate: number): void;
  dispose(): void;

  fetchFromWorker(
    workerOptions: WorkerRequest,
    onSuccess: (response: WorkerResponse) => void,
    onError: (error: unknown) => void
  ): void;

  createEvent(event: SubtitleEvent): void;
  getEvents(
    onSuccess: (events: SubtitleEvent[]) => void,
    onError: (error: unknown) => void
  ): void;
  setEvent(event: SubtitleEvent, index: number): void;
  removeEvent(index: number): void;

  createStyle(style: SubtitleStyle): void;
  getStyles(
    onSuccess: (styles: SubtitleStyle[]) => void,
    onError: (error: unknown) => void
  ): void;
  setStyle(style: SubtitleStyle, index: number): void;
  removeStyle(index: number): void;
}
