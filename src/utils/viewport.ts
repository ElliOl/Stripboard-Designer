import type { Point } from '@/lib/types';

const GRID_PITCH = 25.4;

export interface ViewportBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

/**
 * Calculate the visible grid bounds from current zoom, pan, and stage dimensions.
 * Includes a 1-2 cell padding to avoid pop-in during fast pans.
 */
export function getVisibleBounds(
  zoom: number,
  pan: Point,
  stageWidth: number,
  stageHeight: number
): ViewportBounds {
  // Add padding to prevent pop-in during fast pans
  const padding = 2;
  
  return {
    minCol: Math.floor(-pan.x / zoom / GRID_PITCH) - padding,
    maxCol: Math.ceil((-pan.x + stageWidth) / zoom / GRID_PITCH) + padding,
    minRow: Math.floor(-pan.y / zoom / GRID_PITCH) - padding,
    maxRow: Math.ceil((-pan.y + stageHeight) / zoom / GRID_PITCH) + padding,
  };
}

/**
 * Check if a component is within the visible bounds.
 */
export function isComponentVisible(
  componentRow: number,
  componentCol: number,
  bounds: ViewportBounds
): boolean {
  return (
    componentCol >= bounds.minCol &&
    componentCol <= bounds.maxCol &&
    componentRow >= bounds.minRow &&
    componentRow <= bounds.maxRow
  );
}

/**
 * Check if a strip is within the visible bounds.
 */
export function isStripVisible(
  stripRow: number,
  stripStartCol: number,
  stripEndCol: number,
  bounds: ViewportBounds
): boolean {
  return (
    stripRow >= bounds.minRow &&
    stripRow <= bounds.maxRow &&
    stripEndCol >= bounds.minCol &&
    stripStartCol <= bounds.maxCol
  );
}

/**
 * Check if a wire is within the visible bounds.
 * A wire is visible if any of its points are visible.
 */
export function isWireVisible(
  wirePoints: Array<{ row: number; col: number }>,
  bounds: ViewportBounds
): boolean {
  return wirePoints.some(
    (p) =>
      p.col >= bounds.minCol &&
      p.col <= bounds.maxCol &&
      p.row >= bounds.minRow &&
      p.row <= bounds.maxRow
  );
}
