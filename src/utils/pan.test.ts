import { describe, it, expect } from 'vitest';
import { calculateBoundedPan } from './pan';

describe('calculateBoundedPan', () => {
  const containerW = 400;
  const containerH = 300;

  it('keeps pan within bounds when zoom is 1', () => {
    // maxPanX = max(400 * 1 / 2, 400 * 0.4) = 200
    // maxPanY = max(300 * 1 / 2, 300 * 0.4) = 150
    const result1 = calculateBoundedPan(50, -50, 1, containerW, containerH);
    expect(result1).toEqual({ x: 50, y: -50 });

    const result2 = calculateBoundedPan(500, -500, 1, containerW, containerH);
    expect(result2).toEqual({ x: 200, y: -150 });
  });

  it('expands pan bounds proportionally when zoomed in', () => {
    // zoom = 3
    // maxPanX = max(400 * 3 / 2, 160) = 600
    // maxPanY = max(300 * 3 / 2, 120) = 450
    const result = calculateBoundedPan(500, -400, 3, containerW, containerH);
    expect(result).toEqual({ x: 500, y: -400 });

    const resultExcessive = calculateBoundedPan(1000, -1000, 3, containerW, containerH);
    expect(resultExcessive).toEqual({ x: 600, y: -450 });
  });

  it('uses fallback container dimensions if 0 or undefined', () => {
    const result = calculateBoundedPan(100, 100, 1, 0, 0);
    // fallback w = 300, h = 300 => maxPan = 150
    expect(result).toEqual({ x: 100, y: 100 });
  });
});
