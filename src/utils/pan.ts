export interface PanPosition {
  x: number;
  y: number;
}

/**
 * Calculates bounded pan coordinates to ensure the image remains within reasonable viewable bounds.
 *
 * @param newX Target X pan position
 * @param newY Target Y pan position
 * @param zoom Current zoom level
 * @param containerWidth Workspace container width
 * @param containerHeight Workspace container height
 * @returns Bounded pan position { x, y }
 */
export function calculateBoundedPan(
  newX: number,
  newY: number,
  zoom: number,
  containerWidth: number,
  containerHeight: number
): PanPosition {
  const w = containerWidth || 300;
  const h = containerHeight || 300;

  // Maximum allowed pan offset in X and Y
  // Allow panning based on zoom scale and container dimensions so all image corners/edges can be brought into view,
  // but prevent dragging the image completely off screen.
  const maxPanX = Math.max((w * zoom) / 2, w * 0.4);
  const maxPanY = Math.max((h * zoom) / 2, h * 0.4);

  const boundedX = Math.max(-maxPanX, Math.min(maxPanX, newX));
  const boundedY = Math.max(-maxPanY, Math.min(maxPanY, newY));

  return { x: boundedX, y: boundedY };
}
