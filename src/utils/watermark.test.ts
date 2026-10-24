import { describe, it, expect } from 'vitest';
import {
  calculateSinglePosition,
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
