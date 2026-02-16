import type { PinDefinition, GridPosition } from './types';

/**
 * Compute rotated pin positions relative to the component origin.
 *
 * Rotation is clockwise in 90° increments.  The rotation is performed
 * around the bounding-box of the original pin positions so that the
 * resulting positions stay in the positive quadrant (row >= 0, col >= 0).
 *
 *   0°:   (row, col) → (row, col)
 *  90° CW: (row, col) → (col, maxRow − row)
 * 180°:   (row, col) → (maxRow − row, maxCol − col)
 * 270° CW: (row, col) → (maxCol − col, row)
 */
export function getRotatedPinPositions(
  pins: PinDefinition[],
  rotation: 0 | 90 | 180 | 270
): GridPosition[] {
  if (rotation === 0) return pins.map((p) => ({ ...p.position }));

  const maxRow = Math.max(...pins.map((p) => p.position.row));
  const maxCol = Math.max(...pins.map((p) => p.position.col));

  return pins.map((p) => {
    const { row, col } = p.position;
    switch (rotation) {
      case 90:
        return { row: col, col: maxRow - row };
      case 180:
        return { row: maxRow - row, col: maxCol - col };
      case 270:
        return { row: maxCol - col, col: row };
      default:
        return { row, col };
    }
  });
}

/**
 * Reverse a rotation - convert rotated positions back to unrotated definition space.
 * This is the inverse operation of getRotatedPinPositions.
 * 
 * @param positions - Positions in rotated space
 * @param rotation - The rotation that was applied (will be reversed)
 */
export function unrotatePositions(
  positions: GridPosition[],
  rotation: 0 | 90 | 180 | 270
): GridPosition[] {
  if (rotation === 0) return positions.map((p) => ({ ...p }));
  if (positions.length === 0) return [];

  const maxRow = Math.max(...positions.map((p) => p.row));
  const maxCol = Math.max(...positions.map((p) => p.col));

  return positions.map((p) => {
    const { row, col } = p;
    switch (rotation) {
      case 90:
        // Reverse of (row, col) → (col, maxRow - row)
        // So (row, col) came from (maxRow - col, row)
        return { row: maxCol - col, col: row };
      case 180:
        // Reverse of (row, col) → (maxRow - row, maxCol - col)
        return { row: maxRow - row, col: maxCol - col };
      case 270:
        // Reverse of (row, col) → (maxCol - col, row)
        // So (row, col) came from (col, maxCol - row)
        return { row: col, col: maxRow - row };
      default:
        return { row, col };
    }
  });
}
