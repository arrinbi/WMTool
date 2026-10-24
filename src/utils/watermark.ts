import {
  WatermarkOptions,
  SinglePosition,
  RepeatPosition,
  TextWatermarkSettings,
} from '../types/watermark';

/**
 * Calculates absolute (x, y) coordinates on a canvas of width W and height H
 * for an item of width `itemW` and height `itemH`.
 */
export function calculateSinglePosition(
  position: SinglePosition,
  customX: number,
  customY: number,
  canvasWidth: number,
  canvasHeight: number,
  itemWidth: number,
  itemHeight: number
): { x: number; y: number } {
  if (position === 'custom') {
    return {
      x: (canvasWidth * customX) / 100,
      y: (canvasHeight * customY) / 100,
    };
  }

  let x = canvasWidth / 2;
  let y = canvasHeight / 2;

  const marginX = Math.max(20, canvasWidth * 0.05);
  const marginY = Math.max(20, canvasHeight * 0.05);

  switch (position) {
    case 'top-left':
      x = marginX + itemWidth / 2;
      y = marginY + itemHeight / 2;
      break;
    case 'top-center':
      x = canvasWidth / 2;
      y = marginY + itemHeight / 2;
      break;
    case 'top-right':
      x = canvasWidth - marginX - itemWidth / 2;
      y = marginY + itemHeight / 2;
      break;
    case 'center-left':
      x = marginX + itemWidth / 2;
      y = canvasHeight / 2;
      break;
    case 'center':
      x = canvasWidth / 2;
      y = canvasHeight / 2;
      break;
    case 'center-right':
      x = canvasWidth - marginX - itemWidth / 2;
      y = canvasHeight / 2;
      break;
    case 'bottom-left':
      x = marginX + itemWidth / 2;
      y = canvasHeight - marginY - itemHeight / 2;
      break;
    case 'bottom-center':
      x = canvasWidth / 2;
      y = canvasHeight - marginY - itemHeight / 2;
      break;
    case 'bottom-right':
      x = canvasWidth - marginX - itemWidth / 2;
      y = canvasHeight - marginY - itemHeight / 2;
      break;
  }

  return { x, y };
}

/**
 * Calculates effective font size in pixels based on unit and canvas dimensions.
 */
export function getEffectiveFontSize(textSettings: TextWatermarkSettings, canvasWidth: number, canvasHeight: number): number {
  if (textSettings.fontSizeUnit === '%') {
    const minDim = Math.min(canvasWidth, canvasHeight);
    return Math.max(8, (minDim * textSettings.fontSize) / 100);
  }
  return textSettings.fontSize;
}

/**
 * Calculates grid tile centers for tiled watermark mode.
 * Spans beyond canvas bounds to ensure rotated tiles cover corners.
 */
export function calculateTileGrid(
  canvasWidth: number,
  canvasHeight: number,
  itemWidth: number,
  itemHeight: number,
  spacingX: number,
  spacingY: number
): Array<{ x: number; y: number }> {
  const stepX = Math.max(10, itemWidth + spacingX);
  const stepY = Math.max(10, itemHeight + spacingY);

  // Diagonal radius to guarantee coverage when rotated
  const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
  const maxSpan = diagonal * 1.5;

  const startX = canvasWidth / 2 - Math.ceil(maxSpan / stepX) * stepX;
  const endX = canvasWidth / 2 + Math.ceil(maxSpan / stepX) * stepX;
  const startY = canvasHeight / 2 - Math.ceil(maxSpan / stepY) * stepY;
  const endY = canvasHeight / 2 + Math.ceil(maxSpan / stepY) * stepY;

  const positions: Array<{ x: number; y: number }> = [];

  for (let x = startX; x <= endX; x += stepX) {
    for (let y = startY; y <= endY; y += stepY) {
      positions.push({ x, y });
    }
  }

  return positions;
}

/**
 * Calculates (x, y) coordinates for single or repeated watermark placements.
 */
export function calculateRepeatPositions(
  mode: 'single' | 'repeated',
  position: RepeatPosition,
  spacing: number,
  canvasWidth: number,
  canvasHeight: number,
  itemWidth: number,
  _itemHeight: number
): Array<{ x: number; y: number }> {
  const marginX = Math.max(20, canvasWidth * 0.05);

  const getXForPos = (pos: 'left' | 'center' | 'right') => {
    if (pos === 'left') return marginX + itemWidth / 2;
    if (pos === 'right') return canvasWidth - marginX - itemWidth / 2;
    return canvasWidth / 2;
  };

  if (mode === 'single') {
    let posKey: 'left' | 'center' | 'right' = 'center';
    if (position === 'left' || position === 'alternating') {
      posKey = 'left';
    } else if (position === 'right') {
      posKey = 'right';
    } else if (position === 'center') {
      posKey = 'center';
    }
    return [{ x: getXForPos(posKey), y: canvasHeight / 2 }];
  }

  // mode === 'repeated'
  const validSpacing = Math.max(1, isNaN(spacing) || spacing <= 0 ? 5000 : spacing);
  const count = Math.max(1, Math.floor(canvasHeight / validSpacing));
  const startY = (canvasHeight - (count - 1) * validSpacing) / 2;

  const positions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const y = startY + i * validSpacing;
    let posKey: 'left' | 'center' | 'right' = 'center';

    if (position === 'left') {
      posKey = 'left';
    } else if (position === 'right') {
      posKey = 'right';
    } else if (position === 'center') {
      posKey = 'center';
    } else if (position === 'alternating') {
      posKey = i % 2 === 0 ? 'left' : 'right';
    }

    positions.push({ x: getXForPos(posKey), y });
  }

  return positions;
}

/**
 * Renders text watermark on a given canvas 2D context.
 */
export function renderTextWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions
) {
  const { text: textSettings, mode, tiling } = options;
  if (!textSettings.enabled || !textSettings.text.trim()) return;

  ctx.save();

  const fontSizePx = getEffectiveFontSize(textSettings, canvasWidth, canvasHeight);
  const fontStyle = `${textSettings.fontWeight} ${fontSizePx}px ${textSettings.fontFamily}, sans-serif`;

  ctx.font = fontStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(textSettings.text);
  const textWidth = metrics.width;
  const textHeight = fontSizePx;

  const drawSingleTextAt = (x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((textSettings.rotation * Math.PI) / 180);
    ctx.globalAlpha = textSettings.opacity;

    if (textSettings.shadowEnabled) {
      ctx.shadowColor = textSettings.shadowColor;
      ctx.shadowBlur = textSettings.shadowBlur;
      ctx.shadowOffsetX = textSettings.shadowOffsetX;
      ctx.shadowOffsetY = textSettings.shadowOffsetY;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    if (textSettings.outlineEnabled && textSettings.outlineWidth > 0) {
      ctx.strokeStyle = textSettings.outlineColor;
      ctx.lineWidth = textSettings.outlineWidth;
      ctx.strokeText(textSettings.text, 0, 0);
    }

    ctx.fillStyle = textSettings.color;
    ctx.fillText(textSettings.text, 0, 0);

    ctx.restore();
  };

  if (mode === 'tiled') {
    const tiles = calculateTileGrid(
      canvasWidth,
      canvasHeight,
      textWidth,
      textHeight,
      tiling.spacingX,
      tiling.spacingY
    );
    for (const tile of tiles) {
      drawSingleTextAt(tile.x, tile.y);
    }
  } else {
    const repeatSettings = options.repeat || { position: 'center', spacing: 5000 };
    const positions = calculateRepeatPositions(
      mode,
      repeatSettings.position,
      repeatSettings.spacing,
      canvasWidth,
      canvasHeight,
      textWidth,
      textHeight
    );
    for (const pos of positions) {
      drawSingleTextAt(pos.x, pos.y);
    }
  }

  ctx.restore();
}

/**
 * Renders logo watermark on a given canvas 2D context.
 */
export function renderLogoWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions
) {
  const { logo: logoSettings, mode, tiling } = options;
  if (!logoSettings.enabled || !logoSettings.imageElement) return;

  const img = logoSettings.imageElement;
  if (!img.complete || img.naturalWidth === 0) return;

  ctx.save();

  const minDim = Math.min(canvasWidth, canvasHeight);
  const targetWidth = Math.max(10, (minDim * logoSettings.scale) / 100);
  const targetHeight = targetWidth * (img.naturalHeight / img.naturalWidth);

  const drawSingleLogoAt = (x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((logoSettings.rotation * Math.PI) / 180);
    ctx.globalAlpha = logoSettings.opacity;
    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
    ctx.restore();
  };

  if (mode === 'tiled') {
    const tiles = calculateTileGrid(
      canvasWidth,
      canvasHeight,
      targetWidth,
      targetHeight,
      tiling.spacingX,
      tiling.spacingY
    );
    for (const tile of tiles) {
      drawSingleLogoAt(tile.x, tile.y);
    }
  } else {
    const repeatSettings = options.repeat || { position: 'center', spacing: 5000 };
    const positions = calculateRepeatPositions(
      mode,
      repeatSettings.position,
      repeatSettings.spacing,
      canvasWidth,
      canvasHeight,
      targetWidth,
      targetHeight
    );
    for (const pos of positions) {
      drawSingleLogoAt(pos.x, pos.y);
    }
  }

  ctx.restore();
}

/**
 * Applies watermark settings to a source image element onto an HTML Canvas element.
 */
export function applyWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: WatermarkOptions
) {
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Draw base image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Render text and/or logo watermarks
  renderTextWatermark(ctx, canvas.width, canvas.height, options);
  renderLogoWatermark(ctx, canvas.width, canvas.height, options);
}

/**
 * Renders an image file with watermark options applied and exports as Blob.
 */
export async function processWatermarkImage(
  file: File,
  options: WatermarkOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      renderTextWatermark(ctx, canvas.width, canvas.height, options);
      renderLogoWatermark(ctx, canvas.width, canvas.height, options);

      const mimeType =
        options.export.format === 'jpeg'
          ? 'image/jpeg'
          : options.export.format === 'webp'
          ? 'image/webp'
          : 'image/png';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to export canvas image blob'));
          }
        },
        mimeType,
        options.export.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image file: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates the exported filename based on original filename and export settings.
 */
export function generateOutputFilename(
  originalFilename: string,
  suffix: string,
  format: 'png' | 'jpeg' | 'webp'
): string {
  const dotIndex = originalFilename.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalFilename.substring(0, dotIndex) : originalFilename;
  const ext = format === 'jpeg' ? 'jpg' : format;
  const cleanSuffix = suffix ? `${suffix}` : '';
  return `${baseName}${cleanSuffix}.${ext}`;
}
