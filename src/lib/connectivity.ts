import type {
  Component,
  Strip,
  Wire,
  Net,
  GridPosition,
  PCB,
  Cut,
} from './types';
import { buildSpatialIndex, posKey, stripKey, type SpatialIndex } from './spatial-index';

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
 * - PCB-aware: strips on different PCBs are electrically isolated
 */
export function analyzeConnectivity(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  nets: Net[],
  pcbs: PCB[]
): ConnectivityResult {
  const wireNets = new Map<string, string | null>();
  const wireErrors = new Set<string>();
  const segmentNets = new Map<string, string>();
  const segmentErrors = new Set<string>();
  const connectedGroups = new Map<string, Array<Set<string>>>();

  // Build PCB-aware spatial index for O(1) lookups
  const index = buildSpatialIndex(components, strips, wires, pcbs);

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

      // Find strips at this position - check all PCBs
      const strip = findStripAtPosition(point, index);
      if (strip) {
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
    const pcb = strip.pcbId ? index.pcbsById.get(strip.pcbId) : index.pcbsById.get('main-pcb');
    const pcbOffset = pcb ? pcb.position : { row: 0, col: 0 };

    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
      const segment = segments[segIdx];
      const segKey = `${strip.id}:${segIdx}`;
      const segNets = new Set<string>();
      let segHasErrorWire = false;

      for (let col = segment.startCol; col <= segment.endCol; col++) {
        // Convert to world coordinates
        const worldPos = { row: strip.row + pcbOffset.row, col: col + pcbOffset.col };
        const key = posKey(worldPos);

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
 * Find the strip at a given world position, checking all PCBs
 */
function findStripAtPosition(pos: GridPosition, index: SpatialIndex): Strip | null {
  // Check each PCB to find which one contains this position
  for (const [_pcbId, pcb] of index.pcbsById) {
    const localRow = pos.row - pcb.position.row;
    const localCol = pos.col - pcb.position.col;
    
    // Check if position is within this PCB's bounds
    if (localRow >= 0 && localRow < pcb.rows && localCol >= 0 && localCol < pcb.cols) {
      const key = stripKey(pcb.isMain ? undefined : pcb.id, localRow);
      const strip = index.stripByPcbRow.get(key);
      if (strip && localCol >= strip.startCol && localCol <= strip.endCol) {
        return strip;
      }
    }
  }
  
  return null;
}

/**
 * Enhanced connectivity check that considers wire-to-strip-to-wire connections
 * Now uses spatial index for O(1) lookups and is PCB-aware
 */
export function arePinsConnectedEnhanced(
  a: GridPosition,
  b: GridPosition,
  strips: Strip[],
  wires: Wire[],
  netId: string,
  components: Component[],
  pcbs: PCB[]
): boolean {
  // Build spatial index
  const index = buildSpatialIndex(components, strips, wires, pcbs);
  
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
 * PCB-aware: groups are isolated per PCB unless bridged by wires.
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
 * Uses spatial index for O(1) lookups. PCB-aware: strips are isolated per PCB.
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

  // Check strips on the same PCB at this position
  const strip = findStripAtPosition(pos, index);
  if (strip) {
    const pcb = strip.pcbId ? index.pcbsById.get(strip.pcbId) : index.pcbsById.get('main-pcb');
    const pcbOffset = pcb ? pcb.position : { row: 0, col: 0 };
    
    // Add all positions on this strip segment (up to breaks)
    const localCol = pos.col - pcbOffset.col;
    const segment = findSegmentContaining(strip, localCol);
    if (segment) {
      for (let col = segment.startCol; col <= segment.endCol; col++) {
        if (col !== localCol) {
          const worldPos = { row: strip.row + pcbOffset.row, col: col + pcbOffset.col };
          const colKey = posKey(worldPos);
          // Only include if this position belongs to the same net
          const pinsHere = index.pinsByPos.get(colKey) || [];
          const hasConflict = pinsHere.some(pin => pin.netId && pin.netId !== netId);
          if (!hasConflict) {
            connected.push(worldPos);
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
  
  // Get PCB offset
  const pcb = strip.pcbId ? index.pcbsById.get(strip.pcbId) : index.pcbsById.get('main-pcb');
  const pcbOffset = pcb ? pcb.position : { row: 0, col: 0 };
  
  // Convert world position to local PCB position
  const localCol = nearPoint.col - pcbOffset.col;
  
  // Find the segment containing nearPoint
  const segment = findSegmentContaining(strip, localCol);
  if (!segment) return nets;

  // Check all positions in this segment (in world coordinates)
  for (let col = segment.startCol; col <= segment.endCol; col++) {
    const worldPos = { row: strip.row + pcbOffset.row, col: col + pcbOffset.col };
    const key = posKey(worldPos);
    const pins = index.pinsByPos.get(key) || [];
    for (const pin of pins) {
      if (pin.netId) nets.add(pin.netId);
    }
  }

  return nets;
}

function getStripSegments(strip: Strip): Array<{ startCol: number; endCol: number }> {
  // Merge cuts array with old breaks array using Map for deduplication
  const cutsArray = strip.cuts || [];
  const breaksArray = strip.breaks || [];
  
  const cutsByCol = new Map<number, { col: number; type: 'drill' | 'slice' }>();
  cutsArray.forEach(cut => {
    cutsByCol.set(cut.col, cut);
  });
  breaksArray.forEach(col => {
    if (!cutsByCol.has(col)) {
      cutsByCol.set(col, { col, type: 'drill' as const });
    }
  });
  
  const allCuts = Array.from(cutsByCol.values());
  
  if (allCuts.length === 0) {
    return [{ startCol: strip.startCol, endCol: strip.endCol }];
  }

  const segments: Array<{ startCol: number; endCol: number }> = [];
  
  // Separate drill and slice cuts - they break strips differently
  // Drill cuts: break at integer column (hole is destroyed, breaks before and after)
  // Slice cuts: break at half-integer column (between two holes, both holes remain)
  const drillCols = allCuts.filter(c => c.type === 'drill').map(c => c.col);
  const sliceCols = allCuts.filter(c => c.type === 'slice').map(c => c.col);
  
  // For drill cuts at column N: segment ends at N-1, next starts at N+1 (skip N)
  // For slice cuts at column N.5: segment ends at N, next starts at N+1
  const allBreaks: Array<{ breakBefore: number; isDrill: boolean }> = [
    ...drillCols.map(col => ({ breakBefore: col, isDrill: true })),
    ...sliceCols.map(col => ({ breakBefore: Math.ceil(col), isDrill: false }))
  ].sort((a, b) => a.breakBefore - b.breakBefore);
  
  let start = strip.startCol;
  for (const { breakBefore, isDrill } of allBreaks) {
    if (breakBefore > start) {
      segments.push({ startCol: start, endCol: breakBefore - 1 });
    }
    // For drill cuts, skip the drilled column; for slice cuts, continue from the break
    start = isDrill ? breakBefore + 1 : breakBefore;
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
