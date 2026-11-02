import { describe, it, expect } from 'vitest';
import {
  calculateSinglePosition,
  calculateRepeatPositions,
  getEffectiveFontSize,
  calculateTileGrid,
  generateOutputFilename,
  getRotatedBoundingDimensions,
  isOverlapping,
  checkFaceOverlap,
  findSafeWatermarkPosition,
  resolveProtectedPositions,
} from './watermark';
import { FaceBoundingBox } from '../types/watermark';

describe('Watermark Utility Calculations', () => {
  describe('calculateSinglePosition', () => {
    const W = 1000;
    const H = 800;
    const itemW = 100;
    const itemH = 50;

    it('calculates center position correctly', () => {
      const pos = calculateSinglePosition('center', 0, 0, W, H, itemW, itemH);
      expect(pos).toEqual({ x: 500, y: 400 });
    });

    it('calculates top-left position with margins', () => {
      const pos = calculateSinglePosition('top-left', 0, 0, W, H, itemW, itemH);
      // Margin is max(20, W * 0.05) = 50
      // x = 50 + 50 = 100, y = 40 + 25 = 65 (marginY = max(20, 800*0.05) = 40)
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(65);
    });

    it('calculates custom percentage position', () => {
      const pos = calculateSinglePosition('custom', 25, 75, W, H, itemW, itemH);
      expect(pos).toEqual({ x: 250, y: 600 });
    });
  });

  describe('getEffectiveFontSize', () => {
    it('returns pixel font size unchanged if unit is px', () => {
      const textSettings = { fontSize: 32, fontSizeUnit: 'px' } as any;
      expect(getEffectiveFontSize(textSettings, 1000, 800)).toBe(32);
    });

    it('calculates percentage font size relative to minimum dimension', () => {
      const textSettings = { fontSize: 5, fontSizeUnit: '%' } as any;
      // min dim = 800, 5% of 800 = 40
      expect(getEffectiveFontSize(textSettings, 1000, 800)).toBe(40);
    });
  });

  describe('calculateRepeatPositions', () => {
    const W = 1000;
    const H = 10000;
    const itemW = 200;
    const itemH = 100;
    const marginX = Math.max(20, W * 0.05); // 50

    it('calculates single mode positions correctly', () => {
      const posLeft = calculateRepeatPositions('single', 'left', 5000, W, H, itemW, itemH);
      expect(posLeft.length).toBe(1);
      expect(posLeft[0]).toEqual({ x: marginX + itemW / 2, y: H / 2 }); // 50 + 100 = 150, 5000

      const posCenter = calculateRepeatPositions('single', 'center', 5000, W, H, itemW, itemH);
      expect(posCenter[0]).toEqual({ x: W / 2, y: H / 2 });

      const posRight = calculateRepeatPositions('single', 'right', 5000, W, H, itemW, itemH);
      expect(posRight[0]).toEqual({ x: W - marginX - itemW / 2, y: H / 2 });

      // Alternating in single mode places 1 watermark on the left
      const posAlt = calculateRepeatPositions('single', 'alternating', 5000, W, H, itemW, itemH);
      expect(posAlt.length).toBe(1);
      expect(posAlt[0]).toEqual({ x: marginX + itemW / 2, y: H / 2 });
    });

    it('calculates repeated mode positions with specified vertical spacing', () => {
      // Height 10000, spacing 5000 => 2 placements (count = 10000/5000 = 2)
      // startY = (10000 - 1*5000)/2 = 2500. Placements at y=2500 and y=7500.
      const pos = calculateRepeatPositions('repeated', 'center', 5000, W, H, itemW, itemH);
      expect(pos.length).toBe(2);
      expect(pos[0]).toEqual({ x: 500, y: 2500 });
      expect(pos[1]).toEqual({ x: 500, y: 7500 });
    });

    it('handles alternating positions in repeated mode', () => {
      const pos = calculateRepeatPositions('repeated', 'alternating', 5000, W, H, itemW, itemH);
      expect(pos.length).toBe(2);
      // Index 0 -> Left (x = 150)
      expect(pos[0].x).toBe(150);
      // Index 1 -> Right (x = 1000 - 50 - 100 = 850)
      expect(pos[1].x).toBe(850);
    });

    it('calculates repeated mode positions with custom vertical spacing', () => {
      // Height 8000, spacing 2000 => 4 placements
      const pos = calculateRepeatPositions('repeated', 'center', 2000, W, 8000, itemW, itemH);
      expect(pos.length).toBe(4);
      expect(pos[1].y - pos[0].y).toBe(2000);
      expect(pos[2].y - pos[1].y).toBe(2000);
    });

    it('validates invalid spacing (0, negative, NaN) and uses default 3000', () => {
      const posZero = calculateRepeatPositions('repeated', 'center', 0, W, H, itemW, itemH);
      expect(posZero.length).toBe(3); // 10000 / 3000 = 3

      const posNeg = calculateRepeatPositions('repeated', 'center', -100, W, H, itemW, itemH);
      expect(posNeg.length).toBe(3);

      const posNaN = calculateRepeatPositions('repeated', 'center', NaN, W, H, itemW, itemH);
      expect(posNaN.length).toBe(3);
    });
  });

  describe('calculateTileGrid', () => {
    it('generates a grid of positions with requested spacing', () => {
      const tiles = calculateTileGrid(500, 500, 50, 20, 50, 50);
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles[0]).toHaveProperty('x');
      expect(tiles[0]).toHaveProperty('y');
    });
  });

  describe('generateOutputFilename', () => {
    it('appends suffix and converts extension for jpeg format', () => {
      const output = generateOutputFilename('photo.png', '_wm', 'jpeg');
      expect(output).toBe('photo_wm.jpg');
    });

    it('handles filenames without existing extensions', () => {
      const output = generateOutputFilename('sample', '_watermark', 'webp');
      expect(output).toBe('sample_watermark.webp');
    });

    it('preserves PNG format extension', () => {
      const output = generateOutputFilename('image.JPG', '-protected', 'png');
      expect(output).toBe('image-protected.png');
    });
  });

  describe('Face Protection Placement Calculations', () => {
    describe('getRotatedBoundingDimensions', () => {
      it('returns identical dimensions when rotation is 0', () => {
        const dims = getRotatedBoundingDimensions(100, 50, 0);
        expect(dims.width).toBe(100);
        expect(dims.height).toBe(50);
      });

      it('inverts dimensions when rotation is 90 degrees', () => {
        const dims = getRotatedBoundingDimensions(100, 50, 90);
        expect(dims.width).toBe(50);
        expect(dims.height).toBe(100);
      });

      it('expands bounding box correctly when rotated at 45 degrees', () => {
        const dims = getRotatedBoundingDimensions(100, 100, 45);
        // 100 * sqrt(2) ≈ 141.42 => 141
        expect(dims.width).toBe(141);
        expect(dims.height).toBe(141);
      });
    });

    describe('isOverlapping', () => {
      it('detects intersecting rectangles', () => {
        const r1 = { x: 10, y: 10, width: 50, height: 50 };
        const r2 = { x: 30, y: 30, width: 50, height: 50 };
        expect(isOverlapping(r1, r2)).toBe(true);
      });

      it('returns false for disjoint rectangles', () => {
        const r1 = { x: 0, y: 0, width: 50, height: 50 };
        const r2 = { x: 100, y: 100, width: 50, height: 50 };
        expect(isOverlapping(r1, r2)).toBe(false);
      });
    });

    describe('checkFaceOverlap', () => {
      const face: FaceBoundingBox = { x: 200, y: 200, width: 100, height: 100, confidence: 0.9 };

      it('returns detected face when watermark overlaps it', () => {
        // Watermark center at 220, 220 with size 50x50
        const hit = checkFaceOverlap(220, 220, 50, 50, 0, [face]);
        expect(hit).toEqual(face);
      });

      it('returns null when watermark does not overlap face', () => {
        const hit = checkFaceOverlap(50, 50, 50, 50, 0, [face]);
        expect(hit).toBeNull();
      });

      it('accounts for rotation expansion during overlap check', () => {
        // Watermark center at 135, 200 with width 100, height 40.
        // Unrotated: halfW = 50 => right edge is 135 + 50 = 185 (does NOT touch face at x: 200).
        const unrotated = checkFaceOverlap(135, 200, 100, 40, 0, [face]);
        expect(unrotated).toBeNull();

        // Rotated 45 degrees:
        // aabbW = 100 * cos(45) + 40 * sin(45) ≈ 70.7 + 28.3 = 99 => halfW = 49.5
        // Right edge is 160 + 50 = 210, overlapping face at x: 200
        const unrotated2 = checkFaceOverlap(160, 200, 40, 100, 0, [face]);
        expect(unrotated2).toBeNull(); // 160 + 20 = 180 < 200

        const rotatedHit = checkFaceOverlap(160, 200, 40, 100, 90, [face]);
        // When rotated 90 degrees, width is 100, so 160 + 50 = 210 >= 200 (overlaps face)
        expect(rotatedHit).not.toBeNull();
      });
    });

    describe('findSafeWatermarkPosition', () => {
      const canvasW = 1000;
      const canvasH = 2000;
      const face: FaceBoundingBox = { x: 450, y: 500, width: 100, height: 100, confidence: 0.9 };
      // Face is [450 to 550, 500 to 600]

      it('returns original position when no faces overlap', () => {
        const res = findSafeWatermarkPosition(100, 100, 100, 40, 0, canvasW, canvasH, [face]);
        expect(res.shifted).toBe(false);
        expect(res.x).toBe(100);
        expect(res.y).toBe(100);
      });

      it('prioritizes vertical displacement above face when closer', () => {
        // Original placement near top half of face (y = 520)
        const res = findSafeWatermarkPosition(500, 520, 100, 40, 0, canvasW, canvasH, [face]);
        expect(res.shifted).toBe(true);
        // Should place above: y <= face.y - halfH - margin = 500 - 20 - 15 = 465
        expect(res.y).toBeLessThanOrEqual(465);
        expect(res.x).toBe(500); // preserves horizontal alignment
      });

      it('prioritizes vertical displacement below face when closer', () => {
        // Original placement near bottom half of face (y = 590)
        const res = findSafeWatermarkPosition(500, 590, 100, 40, 0, canvasW, canvasH, [face]);
        expect(res.shifted).toBe(true);
        // Should place below: y >= face.y + face.height + halfH + margin = 500 + 100 + 20 + 15 = 635
        expect(res.y).toBeGreaterThanOrEqual(635);
        expect(res.x).toBe(500);
      });

      it('falls back to horizontal displacement if vertical hits boundary', () => {
        // Face at the very top edge of canvas (y = 0)
        const topFace: FaceBoundingBox = { x: 450, y: 0, width: 100, height: 80, confidence: 0.9 };
        const res = findSafeWatermarkPosition(500, 20, 100, 40, 0, canvasW, canvasH, [topFace]);
        expect(res.shifted).toBe(true);
        // Cannot place above y=0 because canvas boundary is respected
        // Either below or left/right
        expect(res.y - 20).toBeGreaterThanOrEqual(0);
        expect(checkFaceOverlap(res.x, res.y, 100, 40, 0, [topFace])).toBeNull();
      });

      it('avoids colliding with multiple faces', () => {
        // Two faces stacked vertically
        const face1: FaceBoundingBox = { x: 450, y: 500, width: 100, height: 100, confidence: 0.9 };
        const face2: FaceBoundingBox = { x: 450, y: 620, width: 100, height: 100, confidence: 0.9 };

        const res = findSafeWatermarkPosition(500, 550, 100, 40, 0, canvasW, canvasH, [face1, face2]);
        expect(res.shifted).toBe(true);
        expect(checkFaceOverlap(res.x, res.y, 100, 40, 0, [face1, face2])).toBeNull();
      });

      it('avoids colliding with other placed watermark instances', () => {
        const existingWatermark = { x: 450, y: 440, width: 100, height: 40 };
        const res = findSafeWatermarkPosition(
          500,
          520,
          100,
          40,
          0,
          canvasW,
          canvasH,
          [face],
          [existingWatermark]
        );
        expect(res.shifted).toBe(true);
        expect(checkFaceOverlap(res.x, res.y, 100, 40, 0, [face])).toBeNull();
        expect(isOverlapping({ x: res.x - 50, y: res.y - 20, width: 100, height: 40 }, existingWatermark)).toBe(false);
      });

      it('retains original position and warns if no safe position can be found', () => {
        // Tiny 100x100 canvas completely covered by face
        const hugeFace: FaceBoundingBox = { x: 0, y: 0, width: 100, height: 100, confidence: 0.9 };
        const res = findSafeWatermarkPosition(50, 50, 80, 80, 0, 100, 100, [hugeFace]);
        expect(res.x).toBe(50);
        expect(res.y).toBe(50);
        expect(res.warning).toBeDefined();
      });
    });

    describe('resolveProtectedPositions', () => {
      it('preserves exact original positions when faceProtection is false', () => {
        const raw = [{ x: 500, y: 500 }];
        const face: FaceBoundingBox = { x: 450, y: 450, width: 100, height: 100, confidence: 0.9 };
        const res = resolveProtectedPositions(raw, 50, 50, 0, 1000, 1000, [face], false);
        expect(res.positions).toEqual(raw);
        expect(res.warnings).toHaveLength(0);
      });

      it('adjusts positions when faceProtection is true and face overlaps', () => {
        const raw = [{ x: 500, y: 500 }];
        const face: FaceBoundingBox = { x: 450, y: 450, width: 100, height: 100, confidence: 0.9 };
        const res = resolveProtectedPositions(raw, 50, 50, 0, 1000, 1000, [face], true);
        expect(res.positions[0]).not.toEqual(raw[0]);
      });
    });
  });
});
