import {
  WatermarkOptions,
  SinglePosition,
  RepeatPosition,
  TextWatermarkSettings,
  FaceBoundingBox,
  WatermarkPlacementResult,
} from '../types/watermark';
import { detectFaces } from './faceDetection';

/**
 * Calculates rotated bounding box size (AABB - Axis-Aligned Bounding Box)
 * for an item of width `w` and height `h` rotated by `degrees`.
 */
export function getRotatedBoundingDimensions(
  w: number,
  h: number,
  degrees: number
): { width: number; height: number } {
  const rad = (Math.abs(degrees) * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  return {
    width: Math.round(w * cos + h * sin),
    height: Math.round(w * sin + h * cos),
  };
}

/**
 * Checks whether a rectangle intersects with another rectangle.
 */
export function isOverlapping(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Checks whether a rectangle overlaps any face in the list.
 */
export function checkFaceOverlap(
  centerX: number,
  centerY: number,
  itemWidth: number,
  itemHeight: number,
  rotation: number,
  faces: FaceBoundingBox[]
): FaceBoundingBox | null {
  const aabb = getRotatedBoundingDimensions(itemWidth, itemHeight, rotation);
  const wmBox = {
    x: centerX - aabb.width / 2,
    y: centerY - aabb.height / 2,
    width: aabb.width,
    height: aabb.height,
  };

  for (const face of faces) {
    if (isOverlapping(wmBox, face)) {
      return face;
    }
  }
  return null;
}

/**
 * Finds an alternative safe position for a watermark avoiding face regions.
 * Placement Priority:
 * 1. Avoid detected faces.
 * 2. Minimize movement from original position.
 * 3. Prefer available empty areas near the original position (above or below detected face).
 * 4. Try horizontal alternatives when vertical is constrained.
 * 5. Respect canvas boundaries and avoid overlapping other faces/watermarks.
 * 6. If no suitable safe position exists, retain original placement and warn user.
 */
export function findSafeWatermarkPosition(
  origX: number,
  origY: number,
  itemWidth: number,
  itemHeight: number,
  rotation: number,
  canvasWidth: number,
  canvasHeight: number,
  faces: FaceBoundingBox[],
  otherWatermarkBoxes: Array<{ x: number; y: number; width: number; height: number }> = [],
  margin = 15
): WatermarkPlacementResult {
  const initialFace = checkFaceOverlap(origX, origY, itemWidth, itemHeight, rotation, faces);
  if (!initialFace) {
    return { x: origX, y: origY, shifted: false };
  }

  const aabb = getRotatedBoundingDimensions(itemWidth, itemHeight, rotation);
  const halfW = aabb.width / 2;
  const halfH = aabb.height / 2;

  const isValidPlacement = (x: number, y: number): boolean => {
    // Check canvas boundaries
    if (x - halfW < 0 || x + halfW > canvasWidth) return false;
    if (y - halfH < 0 || y + halfH > canvasHeight) return false;

    const candidateBox = {
      x: x - halfW,
      y: y - halfH,
      width: aabb.width,
      height: aabb.height,
    };

    // Check collision with all faces
    for (const face of faces) {
      if (isOverlapping(candidateBox, face)) return false;
    }

    // Check collision with other watermarks
    for (const wm of otherWatermarkBoxes) {
      if (isOverlapping(candidateBox, wm)) return false;
    }

    return true;
  };

  // Generate candidate displacement positions
  // Priority 1 & 2: Vertical displacements (directly above, then directly below face)
  const candidateDeltas: Array<{ x: number; y: number }> = [];

  const topY = initialFace.y - halfH - margin;
  const bottomY = initialFace.y + initialFace.height + halfH + margin;

  // Decide whether above or below is closer to original Y
  if (Math.abs(topY - origY) <= Math.abs(bottomY - origY)) {
    candidateDeltas.push({ x: origX, y: topY });
    candidateDeltas.push({ x: origX, y: bottomY });
  } else {
    candidateDeltas.push({ x: origX, y: bottomY });
    candidateDeltas.push({ x: origX, y: topY });
  }

  // Priority 3: Horizontal displacements (directly left, then directly right of face)
  const leftX = initialFace.x - halfW - margin;
  const rightX = initialFace.x + initialFace.width + halfW + margin;

  if (Math.abs(leftX - origX) <= Math.abs(rightX - origX)) {
    candidateDeltas.push({ x: leftX, y: origY });
    candidateDeltas.push({ x: rightX, y: origY });
  } else {
    candidateDeltas.push({ x: rightX, y: origY });
    candidateDeltas.push({ x: leftX, y: origY });
  }

  // Priority 4: Diagonal combinations (top-left, top-right, bottom-left, bottom-right)
  candidateDeltas.push(
    { x: leftX, y: topY },
    { x: rightX, y: topY },
    { x: leftX, y: bottomY },
    { x: rightX, y: bottomY }
  );

  // Progressive search: test immediate vertical & horizontal options first
  for (const cand of candidateDeltas) {
    if (isValidPlacement(cand.x, cand.y)) {
      return { x: cand.x, y: cand.y, shifted: true };
    }
  }

  // Finer-grained vertical search stepped outward from face
  const step = 20;
  for (let offset = margin + step; offset <= 300; offset += step) {
    const candAbove = { x: origX, y: initialFace.y - halfH - offset };
    if (isValidPlacement(candAbove.x, candAbove.y)) {
      return { x: candAbove.x, y: candAbove.y, shifted: true };
    }
    const candBelow = { x: origX, y: initialFace.y + initialFace.height + halfH + offset };
    if (isValidPlacement(candBelow.x, candBelow.y)) {
      return { x: candBelow.x, y: candBelow.y, shifted: true };
    }
  }

  // Finer-grained horizontal search stepped outward from face
  for (let offset = margin + step; offset <= 300; offset += step) {
    const candLeft = { x: initialFace.x - halfW - offset, y: origY };
    if (isValidPlacement(candLeft.x, candLeft.y)) {
      return { x: candLeft.x, y: candLeft.y, shifted: true };
    }
    const candRight = { x: initialFace.x + initialFace.width + halfW + offset, y: origY };
    if (isValidPlacement(candRight.x, candRight.y)) {
      return { x: candRight.x, y: candRight.y, shifted: true };
    }
  }

  // If no safe position can be found, retain original placement and warn user
  return {
    x: origX,
    y: origY,
    shifted: false,
    warning: 'Could not find a safe position outside detected face regions without exceeding canvas boundaries.',
  };
}

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
export function getEffectiveFontSize(
  textSettings: TextWatermarkSettings,
  canvasWidth: number,
  canvasHeight: number
): number {
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
  const validSpacing = Math.max(1, isNaN(spacing) || spacing <= 0 ? 3000 : spacing);
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
 * Resolves placement positions with Face Protection when enabled.
 */
export function resolveProtectedPositions(
  rawPositions: Array<{ x: number; y: number }>,
  itemWidth: number,
  itemHeight: number,
  rotation: number,
  canvasWidth: number,
  canvasHeight: number,
  faces: FaceBoundingBox[] = [],
  faceProtection = false
): { positions: Array<{ x: number; y: number }>; warnings: string[] } {
  if (!faceProtection || faces.length === 0) {
    return { positions: rawPositions, warnings: [] };
  }

  const finalPositions: Array<{ x: number; y: number }> = [];
  const placedBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];
  const warnings: string[] = [];
  const aabb = getRotatedBoundingDimensions(itemWidth, itemHeight, rotation);

  for (const pos of rawPositions) {
    const res = findSafeWatermarkPosition(
      pos.x,
      pos.y,
      itemWidth,
      itemHeight,
      rotation,
      canvasWidth,
      canvasHeight,
      faces,
      placedBoxes
    );

    finalPositions.push({ x: res.x, y: res.y });
    placedBoxes.push({
      x: res.x - aabb.width / 2,
      y: res.y - aabb.height / 2,
      width: aabb.width,
      height: aabb.height,
    });

    if (res.warning && !warnings.includes(res.warning)) {
      warnings.push(res.warning);
    }
  }

  return { positions: finalPositions, warnings };
}

/**
 * Renders text watermark on a given canvas 2D context.
 */
export function renderTextWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions,
  faces: FaceBoundingBox[] = []
): { warnings: string[] } {
  const { text: textSettings, mode, tiling, faceProtection } = options;
  if (!textSettings.enabled || !textSettings.text.trim()) return { warnings: [] };

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

  let initialPositions: Array<{ x: number; y: number }> = [];

  if (mode === 'tiled') {
    initialPositions = calculateTileGrid(
      canvasWidth,
      canvasHeight,
      textWidth,
      textHeight,
      tiling.spacingX,
      tiling.spacingY
    );
  } else {
    const repeatSettings = options.repeat || { position: 'center', spacing: 3000 };
    initialPositions = calculateRepeatPositions(
      mode,
      repeatSettings.position,
      repeatSettings.spacing,
      canvasWidth,
      canvasHeight,
      textWidth,
      textHeight
    );
  }

  const { positions, warnings } = resolveProtectedPositions(
    initialPositions,
    textWidth,
    textHeight,
    textSettings.rotation,
    canvasWidth,
    canvasHeight,
    faces,
    faceProtection
  );

  for (const pos of positions) {
    drawSingleTextAt(pos.x, pos.y);
  }

  ctx.restore();
  return { warnings };
}

/**
 * Renders logo watermark on a given canvas 2D context.
 */
export function renderLogoWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions,
  faces: FaceBoundingBox[] = []
): { warnings: string[] } {
  const { logo: logoSettings, mode, tiling, faceProtection } = options;
  if (!logoSettings.enabled || !logoSettings.imageElement) return { warnings: [] };

  const img = logoSettings.imageElement;
  if (!img.complete || img.naturalWidth === 0) return { warnings: [] };

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

  let initialPositions: Array<{ x: number; y: number }> = [];

  if (mode === 'tiled') {
    initialPositions = calculateTileGrid(
      canvasWidth,
      canvasHeight,
      targetWidth,
      targetHeight,
      tiling.spacingX,
      tiling.spacingY
    );
  } else {
    const repeatSettings = options.repeat || { position: 'center', spacing: 3000 };
    initialPositions = calculateRepeatPositions(
      mode,
      repeatSettings.position,
      repeatSettings.spacing,
      canvasWidth,
      canvasHeight,
      targetWidth,
      targetHeight
    );
  }

  const { positions, warnings } = resolveProtectedPositions(
    initialPositions,
    targetWidth,
    targetHeight,
    logoSettings.rotation,
    canvasWidth,
    canvasHeight,
    faces,
    faceProtection
  );

  for (const pos of positions) {
    drawSingleLogoAt(pos.x, pos.y);
  }

  ctx.restore();
  return { warnings };
}

/**
 * Applies watermark settings to a source image element onto an HTML Canvas element.
 */
export function applyWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  options: WatermarkOptions,
  faces: FaceBoundingBox[] = []
): { warnings: string[] } {
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { warnings: [] };

  // Draw base image
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Render text and/or logo watermarks
  const textRes = renderTextWatermark(ctx, canvas.width, canvas.height, options, faces);
  const logoRes = renderLogoWatermark(ctx, canvas.width, canvas.height, options, faces);

  const warnings = Array.from(new Set([...textRes.warnings, ...logoRes.warnings]));
  return { warnings };
}

/**
 * Renders an image file with watermark options applied and exports as Blob.
 */
export async function processWatermarkImage(
  file: File,
  options: WatermarkOptions,
  faces?: FaceBoundingBox[]
): Promise<{ blob: Blob; warnings: string[]; faces: FaceBoundingBox[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      let detectedFaces: FaceBoundingBox[] = faces || [];
      if (options.faceProtection && !faces) {
        try {
          detectedFaces = await detectFaces(img, `${file.name}-${file.size}-${file.lastModified}`);
        } catch (e) {
          console.warn('Face detection error during batch processing:', e);
        }
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const textRes = renderTextWatermark(ctx, canvas.width, canvas.height, options, detectedFaces);
      const logoRes = renderLogoWatermark(ctx, canvas.width, canvas.height, options, detectedFaces);
      const warnings = Array.from(new Set([...textRes.warnings, ...logoRes.warnings]));

      const mimeType =
        options.export.format === 'jpeg'
          ? 'image/jpeg'
          : options.export.format === 'webp'
          ? 'image/webp'
          : 'image/png';

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, warnings, faces: detectedFaces });
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
