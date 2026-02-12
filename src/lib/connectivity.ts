import type {
  Component,
  Strip,
  Wire,
  Net,
  GridPosition,
} from './types';

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
};

/**
 * Performs comprehensive connectivity analysis.
 * - Detects which net each wire belongs to based on what it connects
 * - Identifies errors (wires/strips connecting conflicting nets)
 */
export function analyzeConnectivity(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  _nets: Net[]
): ConnectivityResult {
  const wireNets = new Map<string, string | null>();
  const wireErrors = new Set<string>();
  const segmentNets = new Map<string, string>();
  const segmentErrors = new Set<string>();

  // For each wire, determine what net(s) it connects
  for (const wire of wires) {
    const connectedNets = new Set<string>();

    // Check each endpoint of the wire
    for (const point of wire.points) {
      // Find pins at this position
      const pinsAtPoint = findPinsAtPosition(components, point);
      for (const pin of pinsAtPoint) {
        if (pin.netId) connectedNets.add(pin.netId);
      }

      // Find strips at this position and check what nets they connect
      const stripsAtPoint = findStripsAtPosition(strips, point);
      for (const strip of stripsAtPoint) {
        const netsOnStrip = getNetsConnectedToStrip(components, strip, point);
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

        // Pins at this position
        const pinsAtPoint = findPinsAtPosition(components, pos);
        for (const pin of pinsAtPoint) {
          if (pin.netId) {
            segNets.add(pin.netId);
          }
        }

        // Wires at this position
        const wiresAtPoint = findWiresAtPosition(wires, pos);
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
                const pinsAtWirePoint = findPinsAtPosition(components, wirePoint);
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

  return { wireNets, wireErrors, segmentNets, segmentErrors };
}

/**
 * Enhanced connectivity check that considers wire-to-strip-to-wire connections
 */
export function arePinsConnectedEnhanced(
  a: GridPosition,
  b: GridPosition,
  strips: Strip[],
  wires: Wire[],
  netId: string,
  components: Component[]
): boolean {
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
    const neighbors = getConnectedPositions(current, strips, wires, netId, components);
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
 * Get all positions connected to a given position via strips or wires
 */
function getConnectedPositions(
  pos: GridPosition,
  strips: Strip[],
  wires: Wire[],
  netId: string,
  components: Component[]
): GridPosition[] {
  const connected: GridPosition[] = [];

  // Check strips on the same row
  for (const strip of strips) {
    if (strip.row !== pos.row) continue;
    if (pos.col < strip.startCol || pos.col > strip.endCol) continue;

    // Add all positions on this strip segment (up to breaks)
    const segment = findSegmentContaining(strip, pos.col);
    if (segment) {
      for (let col = segment.startCol; col <= segment.endCol; col++) {
        if (col !== pos.col) {
          // Only include if this position belongs to the same net
          const pinsHere = findPinsAtPosition(components, { row: strip.row, col });
          const hasConflict = pinsHere.some(pin => pin.netId && pin.netId !== netId);
          if (!hasConflict) {
            connected.push({ row: strip.row, col });
          }
        }
      }
    }
  }

  // Check wires that pass through this position
  for (const wire of wires) {
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

  return connected;
}

// ─── Helper Functions ───────────────────────────────────────

function posKey(pos: GridPosition): string {
  return `${pos.row},${pos.col}`;
}

function findPinsAtPosition(components: Component[], pos: GridPosition): Array<{ netId?: string }> {
  const pins: Array<{ netId?: string }> = [];
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.position.row === pos.row && pin.position.col === pos.col) {
        pins.push(pin);
      }
    }
  }
  return pins;
}

function findStripsAtPosition(strips: Strip[], pos: GridPosition): Strip[] {
  return strips.filter(
    (s) =>
      s.row === pos.row &&
      pos.col >= s.startCol &&
      pos.col <= s.endCol &&
      !isPositionOnBreak(s, pos.col)
  );
}

function isPositionOnBreak(strip: Strip, col: number): boolean {
  return strip.breaks?.includes(col) || false;
}

function findWiresAtPosition(wires: Wire[], pos: GridPosition): string[] {
  return wires
    .filter((w) => w.points.some((p) => p.row === pos.row && p.col === pos.col))
    .map((w) => w.id);
}

function getNetsConnectedToStrip(
  components: Component[],
  strip: Strip,
  nearPoint: GridPosition
): Set<string> {
  const nets = new Set<string>();
  
  // Find the segment containing nearPoint
  const segment = findSegmentContaining(strip, nearPoint.col);
  if (!segment) return nets;

  // Check all positions in this segment
  for (let col = segment.startCol; col <= segment.endCol; col++) {
    const pins = findPinsAtPosition(components, { row: strip.row, col });
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
