import type { Component, Strip, Wire, GridPosition, PCB } from './types';

/**
 * Spatial index for O(1) position lookups.
 * Pre-build this once before connectivity/ratsnest analysis.
 */
export type SpatialIndex = {
  /** Map position key -> array of pins at that position */
  pinsByPos: Map<string, Array<{ netId?: string; componentId: string; pinNumber: string }>>;
  /** Map position key -> array of wire IDs passing through that position */
  wiresByPos: Map<string, string[]>;
  /** Map "pcbId:row" -> strip (separate namespace per PCB) */
  stripByPcbRow: Map<string, Strip>;
  /** Map to get PCB info by ID */
  pcbsById: Map<string, PCB>;
};

/** Convert GridPosition to unique string key */
export function posKey(pos: GridPosition): string {
  return `${pos.row},${pos.col}`;
}

/** Convert position to world coordinates (accounting for PCB offset) */
export function worldPosKey(pos: GridPosition, pcbPosition: GridPosition): string {
  return `${pos.row + pcbPosition.row},${pos.col + pcbPosition.col}`;
}

/** Get strip key for spatial index lookup */
export function stripKey(pcbId: string | undefined, row: number): string {
  return `${pcbId || 'main'}:${row}`;
}

/**
 * Build spatial index from board state.
 * Call this once before running connectivity/ratsnest analysis.
 * Now PCB-aware: strips on different PCBs are electrically isolated.
 */
export function buildSpatialIndex(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  pcbs: PCB[]
): SpatialIndex {
  const pinsByPos = new Map<string, Array<{ netId?: string; componentId: string; pinNumber: string }>>();
  const wiresByPos = new Map<string, string[]>();
  const stripByPcbRow = new Map<string, Strip>();
  const pcbsById = new Map<string, PCB>();

  // Index PCBs
  for (const pcb of pcbs) {
    pcbsById.set(pcb.id, pcb);
  }

  // Index all component pins (in world coordinates)
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

  // Index all wire waypoints (in world coordinates)
  for (const wire of wires) {
    for (const point of wire.points) {
      const key = posKey(point);
      if (!wiresByPos.has(key)) {
        wiresByPos.set(key, []);
      }
      wiresByPos.get(key)!.push(wire.id);
    }
  }

  // Index strips by PCB and row (strips are isolated per PCB)
  for (const strip of strips) {
    const key = stripKey(strip.pcbId, strip.row);
    stripByPcbRow.set(key, strip);
  }

  return { pinsByPos, wiresByPos, stripByPcbRow, pcbsById };
}
