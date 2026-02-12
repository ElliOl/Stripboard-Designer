import type { Component, Strip, Wire, GridPosition } from './types';

/**
 * Calculate the ranges on a strip segment that should be highlighted in connection mode.
 * Returns an array of column ranges between connection points (inclusive).
 */
export function getConnectionRanges(
  strip: Strip,
  segment: { startCol: number; endCol: number },
  components: Component[],
  wires: Wire[],
  netId: string,
  wireNets?: Map<string, string | null>
): Array<{ startCol: number; endCol: number }> {
  const connectionPoints = new Set<number>();

  // Find all connection points on this strip segment
  for (let col = segment.startCol; col <= segment.endCol; col++) {
    const pos: GridPosition = { row: strip.row, col };

    // Check for component pins with this net
    for (const comp of components) {
      for (const pin of comp.pins) {
        if (
          pin.position.row === pos.row &&
          pin.position.col === pos.col &&
          pin.netId === netId
        ) {
          connectionPoints.add(col);
        }
      }
    }

    // Check for wires that belong to this net and pass through this position
    for (const wire of wires) {
      // Use detected net from connectivity analysis if available, otherwise fall back to wire.netId
      const wireNetId = wireNets?.get(wire.id) || wire.netId;
      if (wireNetId === netId) {
        if (wire.points.some((p) => p.row === pos.row && p.col === pos.col)) {
          connectionPoints.add(col);
        }
      }
    }
  }

  if (connectionPoints.size === 0) {
    return [];
  }

  if (connectionPoints.size === 1) {
    // Only one connection point - just highlight that point
    const point = Array.from(connectionPoints)[0];
    return [{ startCol: point, endCol: point }];
  }

  // Multiple connection points - create ranges between them
  const sortedPoints = Array.from(connectionPoints).sort((a, b) => a - b);
  const ranges: Array<{ startCol: number; endCol: number }> = [];

  // Create ranges between each pair of connection points
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const startCol = sortedPoints[i];
    const endCol = sortedPoints[i + 1];
    ranges.push({ startCol, endCol });
  }

  return ranges;
}
