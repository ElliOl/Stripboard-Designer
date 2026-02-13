import type {
  Component,
  Strip,
  Wire,
  Net,
  GridPosition,
} from './types';
import { buildSpatialIndex, posKey, type SpatialIndex } from './spatial-index';

// ─── Enhanced Connectivity Analysis ─────────────────────────

export type ConnectivityResult = {
  // Map of wire ID to detected net ID (or null if no net detected)
  wireNets: Map<string, string | null>;
  // Map of wire ID to whether it has an error (conflicting nets)
  wireErrors: Set<string>;
  /** Per-segment net resolution: key = "stripId:segIdx", value = netId */
  segmentNets: Map<string, string>;
  /** Per-segment errors: key = "stripId:segIdx" */
  segmentErrors: Set<string>;
  /** Connected groups per net: Map<netId, Array of Set of position keys> */
  connectedGroups: Map<string, Array<Set<string>>>;
};

/**
 * Performs comprehensive connectivity analysis.
 * - Detects which net each wire belongs to based on what it connects
 * - Identifies errors (wires/strips connecting conflicting nets)
 * - Computes connected groups for each net (used for highlight and ratsnest)
 */
export function analyzeConnectivity(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  nets: Net[]
): ConnectivityResult {
  const wireNets = new Map<string, string | null>();
  const wireErrors = new Set<string>();
  const segmentNets = new Map<string, string>();
  const segmentErrors = new Set<string>();
  const connectedGroups = new Map<string, Array<Set<string>>>();

  // Build spatial index for O(1) lookups
  const index = buildSpatialIndex(components, strips, wires);

  // For each wire, determine what net(s) it connects
  for (const wire of wires) {
    const connectedNets = new Set<string>();

    // Check each endpoint of the wire
    for (const point of wire.points) {
      const key = posKey(point);
      
      // Find pins at this position
      const pinsAtPoint = index.pinsByPos.get(key) || [];
      for (const pin of pinsAtPoint) {
        if (pin.netId) connectedNets.add(pin.netId);
      }

      // Find strips at this position and check what nets they connect
      const strip = index.stripByRow.get(point.row);
      if (strip && point.col >= strip.startCol && point.col <= strip.endCol) {
        const netsOnStrip = getNetsConnectedToStripIndexed(strip, point, index);
        netsOnStrip.forEach((netId) => connectedNets.add(netId));
      }
    }

    // If wire connects multiple different nets, it's an error
    if (connectedNets.size > 1) {
      wireErrors.add(wire.id);
      wireNets.set(wire.id, null);
    } else if (connectedNets.size === 1) {
      wireNets.set(wire.id, Array.from(connectedNets)[0]);
    } else {
      wireNets.set(wire.id, null);
    }
  }

  // Check each strip — analyse every segment independently.
  // Cuts (breaks) split a strip into electrically independent segments.
  for (const strip of strips) {
    const segments = getStripSegments(strip);

    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
      const segment = segments[segIdx];
      const segKey = `${strip.id}:${segIdx}`;
      const segNets = new Set<string>();
      let segHasErrorWire = false;

      for (let col = segment.startCol; col <= segment.endCol; col++) {
        const pos = { row: strip.row, col };
        const key = posKey(pos);

        // Pins at this position
        const pinsAtPoint = index.pinsByPos.get(key) || [];
        for (const pin of pinsAtPoint) {
          if (pin.netId) {
            segNets.add(pin.netId);
          }
        }

        // Wires at this position
        const wiresAtPoint = index.wiresByPos.get(key) || [];
        for (const wireId of wiresAtPoint) {
          if (wireErrors.has(wireId)) {
            segHasErrorWire = true;
          }

          const wireNet = wireNets.get(wireId);
          if (wireNet) {
            segNets.add(wireNet);
          } else {
            // Trace manually if wire net not resolved yet
            const wire = wires.find(w => w.id === wireId);
            if (wire) {
              for (const wirePoint of wire.points) {
                const wpKey = posKey(wirePoint);
                const pinsAtWirePoint = index.pinsByPos.get(wpKey) || [];
                for (const pin of pinsAtWirePoint) {
                  if (pin.netId) {
                    segNets.add(pin.netId);
                  }
                }
              }
            }
          }
        }
      }

      // Segment error: multiple nets on the same unbroken segment = short circuit
      if (segNets.size > 1 || segHasErrorWire) {
        segmentErrors.add(segKey);
      }
      // Segment resolved to exactly one net
      if (segNets.size === 1) {
        segmentNets.set(segKey, Array.from(segNets)[0]);
      }
    }
  }

  // Compute connected groups for each net (used for highlight and ratsnest)
  for (const net of nets) {
    const groups = computeConnectedGroupsForNet(net.id, components, strips, wires, index, wireNets);
    connectedGroups.set(net.id, groups);
  }

  return { wireNets, wireErrors, segmentNets, segmentErrors, connectedGroups };
}

/**
 * Enhanced connectivity check that considers wire-to-strip-to-wire connections
 * Now uses spatial index for O(1) lookups
 */
export function arePinsConnectedEnhanced(
  a: GridPosition,
  b: GridPosition,
  strips: Strip[],
  wires: Wire[],
  netId: string,
  components: Component[]
): boolean {
  // Build spatial index
  const index = buildSpatialIndex(components, strips, wires);
  
  // BFS to find if there's a path from a to b through strips and wires
  const visited = new Set<string>();
  const queue: GridPosition[] = [a];
  visited.add(posKey(a));

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.row === b.row && current.col === b.col) {
      return true; // Found a path!
    }

    // Explore connected positions
    const neighbors = getConnectedPositionsIndexed(current, index, netId, wires);
    for (const neighbor of neighbors) {
      const key = posKey(neighbor);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Compute connected groups for a net using flood-fill.
 * Returns an array of Sets, each Set contains position keys of connected pins.
 */
function computeConnectedGroupsForNet(
  netId: string,
  components: Component[],
  _strips: Strip[],
  wires: Wire[],
  index: SpatialIndex,
  wireNets: Map<string, string | null>
): Array<Set<string>> {
  // Collect all positions for this net
  const netPositions: GridPosition[] = [];
  
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.netId === netId) {
        netPositions.push(pin.position);
      }
    }
  }

  if (netPositions.length === 0) return [];

  const visited = new Set<string>();
  const groups: Array<Set<string>> = [];

  // Flood-fill from each unvisited position to discover connected groups
  for (const pos of netPositions) {
    const key = posKey(pos);
    if (visited.has(key)) continue;

    // Start a new group
    const group = new Set<string>();
    const queue: GridPosition[] = [pos];
    visited.add(key);
    group.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Explore connected positions
      const neighbors = getConnectedPositionsIndexed(current, index, netId, wires, wireNets);
      for (const neighbor of neighbors) {
        const nKey = posKey(neighbor);
        if (!visited.has(nKey)) {
          visited.add(nKey);
          group.add(nKey);
          queue.push(neighbor);
        }
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Get all positions connected to a given position via strips or wires.
 * Uses spatial index for O(1) lookups.
 */
function getConnectedPositionsIndexed(
  pos: GridPosition,
  index: SpatialIndex,
  netId: string,
  wires: Wire[],
  wireNets?: Map<string, string | null>
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
    // If wireNets provided, check if wire belongs to this net
    if (wireNets) {
      const wireNet = wireNets.get(wireId);
      if (wireNet !== netId) continue;
    }
    
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

function getNetsConnectedToStripIndexed(
  strip: Strip,
  nearPoint: GridPosition,
  index: SpatialIndex
): Set<string> {
  const nets = new Set<string>();
  
  // Find the segment containing nearPoint
  const segment = findSegmentContaining(strip, nearPoint.col);
  if (!segment) return nets;

  // Check all positions in this segment
  for (let col = segment.startCol; col <= segment.endCol; col++) {
    const key = posKey({ row: strip.row, col });
    const pins = index.pinsByPos.get(key) || [];
    for (const pin of pins) {
      if (pin.netId) nets.add(pin.netId);
    }
  }

  return nets;
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

function findSegmentContaining(
  strip: Strip,
  col: number
): { startCol: number; endCol: number } | null {
  const segments = getStripSegments(strip);
  return segments.find((s) => col >= s.startCol && col <= s.endCol) || null;
}
