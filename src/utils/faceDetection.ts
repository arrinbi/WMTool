import * as ort from 'onnxruntime-web';
import { FaceBoundingBox } from '../types/watermark';

// Configure ONNX Runtime Web wasm paths
ort.env.wasm.wasmPaths = './wasm/';
ort.env.wasm.numThreads = 1;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

// Cache map: imageId -> FaceBoundingBox[]
const detectionCache = new Map<string, FaceBoundingBox[]>();

/**
 * Lazy loads the ONNX inference session for anime face detection.
 */
export async function getFaceDetectionSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create('./models/anime_face_detect_v1.4_n.onnx', {
      executionProviders: ['wasm'],
    });
  }
  return sessionPromise;
}

/**
 * Clears the face detection cache for all images or a specific image ID.
 */
export function clearDetectionCache(imageId?: string): void {
  if (imageId) {
    detectionCache.delete(imageId);
  } else {
    detectionCache.clear();
  }
}

/**
 * Calculates IoU (Intersection over Union) of two bounding boxes.
 */
export function calculateIoU(box1: FaceBoundingBox, box2: FaceBoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  const intersectionW = Math.max(0, x2 - x1);
  const intersectionH = Math.max(0, y2 - y1);
  const intersectionArea = intersectionW * intersectionH;

  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const unionArea = area1 + area2 - intersectionArea;

  if (unionArea <= 0) return 0;
  return intersectionArea / unionArea;
}

/**
 * Applies Non-Maximum Suppression (NMS) to eliminate duplicate overlapping bounding boxes.
 */
export function nonMaximumSuppression(
  boxes: FaceBoundingBox[],
  iouThreshold = 0.5
): FaceBoundingBox[] {
  // Sort descending by confidence
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const selected: FaceBoundingBox[] = [];

  for (const box of sorted) {
    let keep = true;
    for (const chosen of selected) {
      if (calculateIoU(box, chosen) > iouThreshold) {
        keep = false;
        break;
      }
    }
    if (keep) {
      selected.push(box);
    }
  }

  return selected;
}

/**
 * Prepares image or tile canvas to 640x640 RGB Float32Array tensor.
 */
export function createLetterboxTensor(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  sx: number,
  sy: number,
  sWidth: number,
  sHeight: number,
  targetSize = 640
): { tensor: ort.Tensor; scale: number; padX: number; padY: number } {
  const offscreen = document.createElement('canvas');
  offscreen.width = targetSize;
  offscreen.height = targetSize;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get 2d context for letterbox canvas');
  }

  // Fill with neutral 114/255 grey padding typical of YOLO letterboxing
  ctx.fillStyle = '#727272';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Compute uniform scaling to preserve aspect ratio
  const scale = Math.min(targetSize / sWidth, targetSize / sHeight);
  const renderW = Math.round(sWidth * scale);
  const renderH = Math.round(sHeight * scale);
  const padX = Math.round((targetSize - renderW) / 2);
  const padY = Math.round((targetSize - renderH) / 2);

  ctx.drawImage(
    sourceCanvas as any,
    sx,
    sy,
    sWidth,
    sHeight,
    padX,
    padY,
    renderW,
    renderH
  );

  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const { data } = imageData; // RGBA uint8

  // Channel first (1, 3, 640, 640) Float32 normalized [0, 1]
  const floatData = new Float32Array(3 * targetSize * targetSize);
  const channelSize = targetSize * targetSize;

  for (let i = 0; i < channelSize; i++) {
    const r = data[i * 4] / 255.0;
    const g = data[i * 4 + 1] / 255.0;
    const b = data[i * 4 + 2] / 255.0;

    floatData[i] = r; // Red
    floatData[channelSize + i] = g; // Green
    floatData[channelSize * 2 + i] = b; // Blue
  }

  const tensor = new ort.Tensor('float32', floatData, [1, 3, targetSize, targetSize]);
  return { tensor, scale, padX, padY };
}

/**
 * Parses YOLOv8 output tensor [1, 5, 8400] and maps bounding boxes back to source crop coordinates.
 */
export function parseYoloV8Output(
  outputTensor: ort.Tensor,
  scale: number,
  padX: number,
  padY: number,
  offsetX: number,
  offsetY: number,
  confThreshold = 0.28
): FaceBoundingBox[] {
  // output dims: [1, 5, 8400]
  // Row 0: cx
  // Row 1: cy
  // Row 2: width
  // Row 3: height
  // Row 4: conf (face class score)
  const data = outputTensor.data as Float32Array;
  const numBoxes = 8400;
  const boxes: FaceBoundingBox[] = [];

  for (let i = 0; i < numBoxes; i++) {
    const conf = data[4 * numBoxes + i];
    if (conf >= confThreshold) {
      const cx = data[i];
      const cy = data[numBoxes + i];
      const w = data[2 * numBoxes + i];
      const h = data[3 * numBoxes + i];

      // Convert cx, cy, w, h to letterboxed image space (subtract padding, unscale)
      const unpaddedX = (cx - padX) / scale;
      const unpaddedY = (cy - padY) / scale;
      const unscaledW = w / scale;
      const unscaledH = h / scale;

      const x = offsetX + (unpaddedX - unscaledW / 2);
      const y = offsetY + (unpaddedY - unscaledH / 2);

      boxes.push({
        x: Math.max(0, Math.round(x)),
        y: Math.max(0, Math.round(y)),
        width: Math.round(unscaledW),
        height: Math.round(unscaledH),
        confidence: conf,
      });
    }
  }

  return nonMaximumSuppression(boxes, 0.45);
}

/**
 * Calculates adaptive sliding-window tile intervals for tall manhwa images.
 */
export function calculateTileSlices(
  width: number,
  height: number,
  tileSize = 1000,
  overlapRatio = 0.2
): Array<{ sx: number; sy: number; sWidth: number; sHeight: number }> {
  // If image is relatively square or standard aspect ratio, single tile is sufficient
  if (height <= tileSize * 1.5 && width <= tileSize * 1.5) {
    return [{ sx: 0, sy: 0, sWidth: width, sHeight: height }];
  }

  const stepY = Math.round(tileSize * (1 - overlapRatio));
  const slices: Array<{ sx: number; sy: number; sWidth: number; sHeight: number }> = [];

  for (let y = 0; y < height; y += stepY) {
    const curHeight = Math.min(tileSize, height - y);
    slices.push({
      sx: 0,
      sy: y,
      sWidth: width,
      sHeight: curHeight,
    });
    if (y + curHeight >= height) break;
  }

  return slices;
}

/**
 * Detects faces on an image element or canvas.
 * Supports adaptive sliding-window inference for tall webtoon/manhwa images.
 */
export async function detectFaces(
  imageSource: HTMLImageElement | HTMLCanvasElement,
  cacheKey?: string
): Promise<FaceBoundingBox[]> {
  if (cacheKey && detectionCache.has(cacheKey)) {
    return detectionCache.get(cacheKey)!;
  }

  const session = await getFaceDetectionSession();

  const width =
    'naturalWidth' in imageSource ? imageSource.naturalWidth : imageSource.width;
  const height =
    'naturalHeight' in imageSource ? imageSource.naturalHeight : imageSource.height;

  if (width === 0 || height === 0) return [];

  // Draw source image to offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(imageSource, 0, 0, width, height);

  const slices = calculateTileSlices(width, height, 1000, 0.2);
  const detectedAll: FaceBoundingBox[] = [];

  for (const slice of slices) {
    const { tensor, scale, padX, padY } = createLetterboxTensor(
      canvas,
      slice.sx,
      slice.sy,
      slice.sWidth,
      slice.sHeight,
      640
    );

    const results = await session.run({ images: tensor });
    const outputTensor = results.output0 || results[session.outputNames[0]];

    if (outputTensor) {
      const tileBoxes = parseYoloV8Output(
        outputTensor,
        scale,
        padX,
        padY,
        slice.sx,
        slice.sy,
        0.28
      );
      detectedAll.push(...tileBoxes);
    }
  }

  // Merge overlapping detections across sliding-window boundaries
  const finalBoxes = nonMaximumSuppression(detectedAll, 0.45);

  if (cacheKey) {
    detectionCache.set(cacheKey, finalBoxes);
  }

  return finalBoxes;
}
