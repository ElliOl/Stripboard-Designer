import type {
  Component,
  Strip,
  Wire,
  Net,
  RatsNestConnection,
  GridPosition,
} from './types';
import { buildSpatialIndex, posKey, type SpatialIndex } from './spatial-index';

// ─── Ratsnest Calculator ───────────────────────────────────
//
// For every net, finds all pins that belong to it, determines
// which ones are already electrically connected (via strips or
// wires), and returns the set of connections that still need
// to be routed (i.e. connections between disconnected groups).
//
// Uses single-pass flood-fill per net instead of O(n^2) BFS.

export function calculateRatsNest(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  nets: Net[]
): RatsNestConnection[] {
  const connections: RatsNestConnection[] = [];
  
  // Build spatial index once for all nets
  const index = buildSpatialIndex(components, strips, wires);

  for (const net of nets) {
    // Collect all pin positions belonging to this net
    const pinPositions: GridPosition[] = [];

    for (const comp of components) {
      for (const pin of comp.pins) {
        if (pin.netId === net.id) {
          pinPositions.push(pin.position);
        }
      }
    }

    if (pinPositions.length < 2) continue;

    // Discover connected groups using flood-fill (single pass)
    const groups = discoverConnectedGroups(pinPositions, net.id, index, wires);

    // For every pair of disconnected groups, add a rats-nest
    // line between the closest pair of pins.
    for (let gi = 0; gi < groups.length; gi++) {
      for (let gj = gi + 1; gj < groups.length; gj++) {
        const groupA = groups[gi];
        const groupB = groups[gj];

        let bestDist = Infinity;
        let bestA = groupA[0];
        let bestB = groupB[0];

        for (const a of groupA) {
          for (const b of groupB) {
            const d =
              Math.abs(pinPositions[a].row - pinPositions[b].row) +
              Math.abs(pinPositions[a].col - pinPositions[b].col);
            if (d < bestDist) {
              bestDist = d;
              bestA = a;
              bestB = b;
            }
          }
        }

        connections.push({
          from: pinPositions[bestA],
          to: pinPositions[bestB],
          netId: net.id,
        });
      }
    }
  }

  return connections;
}

/**
 * Discover connected groups using flood-fill.
 * Returns array of arrays, each inner array contains indices of connected pins.
 */
function discoverConnectedGroups(
  pinPositions: GridPosition[],
  netId: string,
  index: SpatialIndex,
  wires: Wire[]
): number[][] {
  const visited = new Set<number>();
  const groups: number[][] = [];

  for (let i = 0; i < pinPositions.length; i++) {
    if (visited.has(i)) continue;

    // Start a new group with flood-fill from this pin
    const group: number[] = [];
    const queue: number[] = [i];
    visited.add(i);

    while (queue.length > 0) {
      const currentIdx = queue.shift()!;
      group.push(currentIdx);
      const currentPos = pinPositions[currentIdx];

      // Find all other pins connected to this position
      const connectedPositions = getConnectedPositionsForRatsnest(currentPos, index, netId, wires);
      
      for (const connPos of connectedPositions) {
        // Check if any unvisited pin is at this connected position
        for (let j = 0; j < pinPositions.length; j++) {
          if (!visited.has(j)) {
            const pinPos = pinPositions[j];
            if (pinPos.row === connPos.row && pinPos.col === connPos.col) {
              visited.add(j);
              queue.push(j);
            }
          }
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Get all positions connected to a given position via strips or wires.
 * Optimized for ratsnest calculation.
 */
function getConnectedPositionsForRatsnest(
  pos: GridPosition,
  index: SpatialIndex,
  netId: string,
  wires: Wire[]
): GridPosition[] {
  const connected: GridPosition[] = [];
  const key = posKey(pos);

  // Check strips on the same row
  const strip = index.stripByRow.get(pos.row);
  if (strip && pos.col >= strip.startCol && pos.col <= strip.endCol) {
    // Add all positions on this strip segment (up to breaks)
    const segment = findSegmentContaining(strip, pos.col);
    if (segment) {
      for (let col = segment.startCol; col <= segment.endCol; col++) {
        if (col !== pos.col) {
          const colKey = posKey({ row: strip.row, col });
          // Only include if this position belongs to the same net
          const pinsHere = index.pinsByPos.get(colKey) || [];
          const hasConflict = pinsHere.some(pin => pin.netId && pin.netId !== netId);
          if (!hasConflict) {
            connected.push({ row: strip.row, col });
          }
        }
      }
    }
  }

  // Check wires that pass through this position
  const wiresAtPos = index.wiresByPos.get(key) || [];
  for (const wireId of wiresAtPos) {
    const wire = wires.find(w => w.id === wireId);
    if (wire) {
      const idx = wire.points.findIndex(p => p.row === pos.row && p.col === pos.col);
      if (idx >= 0) {
        // Add all other points on this wire
        wire.points.forEach((p, i) => {
          if (i !== idx) {
            connected.push(p);
          }
        });
      }
    }
  }

  return connected;
}

function findSegmentContaining(
  strip: Strip,
  col: number
): { startCol: number; endCol: number } | null {
  const segments = getStripSegments(strip);
  return segments.find((s) => col >= s.startCol && col <= s.endCol) || null;
}

function getStripSegments(strip: Strip): Array<{ startCol: number; endCol: number }> {
  if (!strip.breaks || strip.breaks.length === 0) {
    return [{ startCol: strip.startCol, endCol: strip.endCol }];
  }

  const segments: Array<{ startCol: number; endCol: number }> = [];
  const sortedBreaks = [...strip.breaks].sort((a, b) => a - b);
  
  let start = strip.startCol;
  for (const breakCol of sortedBreaks) {
    if (breakCol > start) {
      segments.push({ startCol: start, endCol: breakCol - 1 });
    }
    start = breakCol + 1;
  }
  
  if (start <= strip.endCol) {
    segments.push({ startCol: start, endCol: strip.endCol });
  }

  return segments;
}
