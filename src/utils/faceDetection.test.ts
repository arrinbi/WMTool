import { describe, it, expect } from 'vitest';
import {
  calculateIoU,
  nonMaximumSuppression,
  calculateTileSlices,
  parseYoloV8Output,
  clearDetectionCache,
} from './faceDetection';
import { FaceBoundingBox } from '../types/watermark';

describe('Face Detection Engine Utilities', () => {
  describe('calculateIoU', () => {
    it('returns 1.0 for identical bounding boxes', () => {
      const box: FaceBoundingBox = { x: 10, y: 10, width: 100, height: 100, confidence: 0.9 };
      expect(calculateIoU(box, box)).toBe(1.0);
    });

    it('returns 0 for non-overlapping boxes', () => {
      const b1: FaceBoundingBox = { x: 0, y: 0, width: 50, height: 50, confidence: 0.9 };
      const b2: FaceBoundingBox = { x: 100, y: 100, width: 50, height: 50, confidence: 0.8 };
      expect(calculateIoU(b1, b2)).toBe(0);
    });

    it('calculates correct partial IoU overlap', () => {
      const b1: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 100, confidence: 0.9 };
      const b2: FaceBoundingBox = { x: 50, y: 0, width: 100, height: 100, confidence: 0.8 };
      // Intersection: 50 * 100 = 5000
      // Area1: 10000, Area2: 10000, Union: 15000 => 5000/15000 = 1/3
      expect(calculateIoU(b1, b2)).toBeCloseTo(1 / 3, 4);
    });
  });

  describe('nonMaximumSuppression', () => {
    it('suppresses duplicate boxes with lower confidence', () => {
      const boxes: FaceBoundingBox[] = [
        { x: 10, y: 10, width: 100, height: 100, confidence: 0.95 },
        { x: 12, y: 12, width: 98, height: 98, confidence: 0.8 }, // almost identical
        { x: 500, y: 500, width: 100, height: 100, confidence: 0.9 }, // distinct box
      ];

      const filtered = nonMaximumSuppression(boxes, 0.5);
      expect(filtered.length).toBe(2);
      expect(filtered[0].confidence).toBe(0.95);
      expect(filtered[1].confidence).toBe(0.9);
    });

    it('handles empty box list', () => {
      expect(nonMaximumSuppression([])).toEqual([]);
    });
  });

  describe('calculateTileSlices (Tall Image Adaptive Sliding-Window)', () => {
    it('returns single slice for normal aspect ratio images', () => {
      const slices = calculateTileSlices(800, 1000, 1000, 0.2);
      expect(slices.length).toBe(1);
      expect(slices[0]).toEqual({ sx: 0, sy: 0, sWidth: 800, sHeight: 1000 });
    });

    it('slices tall webtoon/manhwa images into overlapping regions without distorting aspect ratio', () => {
      const slices = calculateTileSlices(800, 5000, 1000, 0.2);
      // Step size is 1000 * (1 - 0.2) = 800
      expect(slices.length).toBeGreaterThan(1);
      expect(slices[0].sy).toBe(0);
      expect(slices[1].sy).toBe(800);
      // Slices must cover the entire vertical height
      const lastSlice = slices[slices.length - 1];
      expect(lastSlice.sy + lastSlice.sHeight).toBe(5000);
      for (const s of slices) {
        expect(s.sWidth).toBe(800);
        expect(s.sHeight).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('parseYoloV8Output', () => {
    it('correctly maps raw YOLO tensor coordinates back to global canvas space', () => {
      // Create mock tensor [1, 5, 8400]
      const numBoxes = 8400;
      const data = new Float32Array(5 * numBoxes);

      // Box index 10: cx=320, cy=320, w=100, h=100, conf=0.85
      data[10] = 320;
      data[numBoxes + 10] = 320;
      data[2 * numBoxes + 10] = 100;
      data[3 * numBoxes + 10] = 100;
      data[4 * numBoxes + 10] = 0.85;

      const mockTensor = {
        data,
        dims: [1, 5, 8400],
      } as any;

      const scale = 0.5; // Scaled down by half
      const padX = 70;
      const padY = 70;
      const offsetX = 0;
      const offsetY = 1200;

      const boxes = parseYoloV8Output(mockTensor, scale, padX, padY, offsetX, offsetY, 0.5);
      expect(boxes.length).toBe(1);
      expect(boxes[0].confidence).toBeCloseTo(0.85);

      // (320 - 70) / 0.5 = 500. w = 100 / 0.5 = 200.
      // x = 500 - 100 = 400.
      // y = 1200 + (500 - 100) = 1600.
      expect(boxes[0].width).toBe(200);
      expect(boxes[0].height).toBe(200);
      expect(boxes[0].x).toBe(400);
      expect(boxes[0].y).toBe(1600);
    });
  });

  describe('Detection Cache', () => {
    it('allows clearing detection cache safely', () => {
      expect(() => {
        clearDetectionCache('item-123');
        clearDetectionCache();
      }).not.toThrow();
    });
  });
});
