import type { Component, Strip, Wire, GridPosition } from './types';

/**
 * Spatial index for O(1) position lookups.
 * Pre-build this once before connectivity/ratsnest analysis.
 */
export type SpatialIndex = {
  /** Map position key -> array of pins at that position */
  pinsByPos: Map<string, Array<{ netId?: string; componentId: string; pinNumber: string }>>;
  /** Map position key -> array of wire IDs passing through that position */
  wiresByPos: Map<string, string[]>;
  /** Map row number -> strip (one strip per row in stripboard) */
  stripByRow: Map<number, Strip>;
};

/** Convert GridPosition to unique string key */
export function posKey(pos: GridPosition): string {
  return `${pos.row},${pos.col}`;
}

/**
 * Build spatial index from board state.
 * Call this once before running connectivity/ratsnest analysis.
 */
export function buildSpatialIndex(
  components: Component[],
  strips: Strip[],
  wires: Wire[]
): SpatialIndex {
  const pinsByPos = new Map<string, Array<{ netId?: string; componentId: string; pinNumber: string }>>();
  const wiresByPos = new Map<string, string[]>();
  const stripByRow = new Map<number, Strip>();

  // Index all component pins
  for (const comp of components) {
    for (const pin of comp.pins) {
      const key = posKey(pin.position);
      if (!pinsByPos.has(key)) {
        pinsByPos.set(key, []);
      }
      pinsByPos.get(key)!.push({
        netId: pin.netId,
        componentId: comp.id,
        pinNumber: pin.number,
      });
    }
  }

  // Index all wire waypoints
  for (const wire of wires) {
    for (const point of wire.points) {
      const key = posKey(point);
      if (!wiresByPos.has(key)) {
        wiresByPos.set(key, []);
      }
      wiresByPos.get(key)!.push(wire.id);
    }
  }

  // Index strips by row (one per row)
  for (const strip of strips) {
    stripByRow.set(strip.row, strip);
  }

  return { pinsByPos, wiresByPos, stripByRow };
}
