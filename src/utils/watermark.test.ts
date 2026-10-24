import { describe, it, expect } from 'vitest';
import {
  calculateSinglePosition,
  calculateRepeatPositions,
  getEffectiveFontSize,
  calculateTileGrid,
  generateOutputFilename,
} from './watermark';

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

    it('validates invalid spacing (0, negative, NaN) and uses default 5000', () => {
      const posZero = calculateRepeatPositions('repeated', 'center', 0, W, H, itemW, itemH);
      expect(posZero.length).toBe(2);

      const posNeg = calculateRepeatPositions('repeated', 'center', -100, W, H, itemW, itemH);
      expect(posNeg.length).toBe(2);

      const posNaN = calculateRepeatPositions('repeated', 'center', NaN, W, H, itemW, itemH);
      expect(posNaN.length).toBe(2);
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
});
