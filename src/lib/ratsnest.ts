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
// wires), and builds a Minimum Spanning Tree (MST) across ALL
// individual pins using Kruskal's algorithm, then removes edges
// between pins that are already physically connected. This
// produces the minimal set of ratsnest lines where every pin
// has at least one connection to its nearest neighbor on the
// net — the same approach KiCad uses for ratsnest visualization.
//
// Uses single-pass flood-fill per net for connectivity discovery.

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
    // Each group is a set of pins already physically connected via strips/wires
    const groups = discoverConnectedGroups(pinPositions, net.id, index, wires);

    // If everything is already connected, no ratsnest needed
    if (groups.length < 2) continue;

    // Map each pin index to its group index for fast lookup
    const pinToGroup = new Int32Array(pinPositions.length);
    for (let g = 0; g < groups.length; g++) {
      for (const pinIdx of groups[g]) {
        pinToGroup[pinIdx] = g;
      }
    }

    // Build MST over ALL individual pins using Kruskal's algorithm.
    // We generate edges between every pair of pins that are in
    // DIFFERENT connected groups, sort by distance, and use union-find
    // to greedily pick the shortest edges that connect new components.
    // This ensures every pin participates in the MST and has at least
    // one ratsnest line to its nearest neighbor on the net.

    // Generate candidate edges (only between pins in different groups)
    const edges: Array<{ from: number; to: number; dist: number }> = [];
    for (let i = 0; i < pinPositions.length; i++) {
      for (let j = i + 1; j < pinPositions.length; j++) {
        if (pinToGroup[i] === pinToGroup[j]) continue; // same group, skip
        const dr = pinPositions[i].row - pinPositions[j].row;
        const dc = pinPositions[i].col - pinPositions[j].col;
        edges.push({ from: i, to: j, dist: dr * dr + dc * dc }); // squared euclidean
      }
    }

    // Sort edges by distance (shortest first)
    edges.sort((a, b) => a.dist - b.dist);

    // Union-Find with path compression and union by rank
    const parent = new Int32Array(pinPositions.length);
    const rank = new Int32Array(pinPositions.length);
    for (let i = 0; i < pinPositions.length; i++) parent[i] = i;

    // Pre-union pins that are already physically connected (same group)
    for (const group of groups) {
      for (let k = 1; k < group.length; k++) {
        ufUnion(parent, rank, group[0], group[k]);
      }
    }

    // Kruskal's: add shortest edges that connect new components
    let edgesAdded = 0;
    const targetEdges = groups.length - 1;

    for (const edge of edges) {
      if (edgesAdded >= targetEdges) break;
      if (ufFind(parent, edge.from) !== ufFind(parent, edge.to)) {
        ufUnion(parent, rank, edge.from, edge.to);
        connections.push({
          from: pinPositions[edge.from],
          to: pinPositions[edge.to],
          netId: net.id,
        });
        edgesAdded++;
      }
    }
  }

  return connections;
}

// ─── Union-Find helpers ──────────────────────────────────────

function ufFind(parent: Int32Array, x: number): number {
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]]; // path compression
    x = parent[x];
  }
  return x;
}

function ufUnion(parent: Int32Array, rank: Int32Array, a: number, b: number): boolean {
  const ra = ufFind(parent, a);
  const rb = ufFind(parent, b);
  if (ra === rb) return false;
  if (rank[ra] < rank[rb]) { parent[ra] = rb; }
  else if (rank[ra] > rank[rb]) { parent[rb] = ra; }
  else { parent[rb] = ra; rank[ra]++; }
  return true;
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
 *
 * Strip connectivity: walks outward from the pin position and STOPS when
 * it encounters a pin belonging to a different net.  A conflicting-net pin
 * on the strip acts as an effective break — the copper is compromised by
 * the short, so we do NOT consider pins beyond the conflict as reachable.
 * This ensures the ratsnest keeps showing connections that still need
 * proper routing when there are errors/shorts on a strip.
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
    const segment = findSegmentContaining(strip, pos.col);
    if (segment) {
      // Walk LEFT from current position — stop at any conflicting net
      for (let col = pos.col - 1; col >= segment.startCol; col--) {
        const colKey = posKey({ row: strip.row, col });
        const pinsHere = index.pinsByPos.get(colKey) || [];
        if (pinsHere.some(pin => pin.netId && pin.netId !== netId)) break;
        connected.push({ row: strip.row, col });
      }

      // Walk RIGHT from current position — stop at any conflicting net
      for (let col = pos.col + 1; col <= segment.endCol; col++) {
        const colKey = posKey({ row: strip.row, col });
        const pinsHere = index.pinsByPos.get(colKey) || [];
        if (pinsHere.some(pin => pin.netId && pin.netId !== netId)) break;
        connected.push({ row: strip.row, col });
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
