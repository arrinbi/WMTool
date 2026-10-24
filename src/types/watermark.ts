export type WatermarkMode = 'single' | 'repeated' | 'tiled';

export type RepeatPosition = 'left' | 'center' | 'right' | 'alternating';

export type SinglePosition =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export interface TextWatermarkSettings {
  enabled: boolean;
  text: string;
  fontFamily: string;
  fontSize: number; // In px or relative canvas %
  fontSizeUnit: 'px' | '%';
  fontWeight: string; // '300' | 'normal' | 'bold' | '900'
  color: string;
  opacity: number; // 0 to 1
  rotation: number; // -180 to 180 deg
  position: SinglePosition;
  customX: number; // 0 to 100 %
  customY: number; // 0 to 100 %
  outlineEnabled: boolean;
  outlineColor: string;
  outlineWidth: number; // px
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface LogoWatermarkSettings {
  enabled: boolean;
  imageSrc: string | null;
  imageElement: HTMLImageElement | null;
  imageFileName: string | null;
  scale: number; // % relative to base canvas min dimension
  opacity: number; // 0 to 1
  rotation: number; // -180 to 180 deg
  position: SinglePosition;
  customX: number; // 0 to 100 %
  customY: number; // 0 to 100 %
}

export interface TilingSettings {
  spacingX: number; // px gap between watermarks
  spacingY: number; // px gap between watermarks
}

export interface RepeatSettings {
  position: RepeatPosition;
  spacing: number; // px vertical distance between placements (default 5000)
}

export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0.1 to 1.0
  filenameSuffix: string;
}

export interface WatermarkOptions {
  mode: WatermarkMode;
  text: TextWatermarkSettings;
  logo: LogoWatermarkSettings;
  repeat?: RepeatSettings;
  tiling: TilingSettings;
  export: ExportSettings;
}

export interface ProcessedImageItem {
  id: string;
  file: File;
  originalName: string;
  width: number;
  height: number;
  previewUrl: string;
  processedUrl?: string;
  processedBlob?: Blob;
  processedName?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  errorMessage?: string;
}
