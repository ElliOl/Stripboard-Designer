import type {
  Component,
  Strip,
  Wire,
  Net,
  RatsNestConnection,
  GridPosition,
  PCB,
} from './types';
import { buildCopperGraph } from './copper-graph';

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
// Islands come from the shared copper graph (copper-graph.ts), so link
// chains through strips without pins are followed. A group that shorts
// several nets still counts as one island for each net's pins; the short
// itself is reported by analyzeConnectivity.

export function calculateRatsNest(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  nets: Net[],
  pcbs: PCB[]
): RatsNestConnection[] {
  const connections: RatsNestConnection[] = [];
  
  // Build the PCB-aware copper graph once for all nets
  const graph = buildCopperGraph(components, strips, wires, pcbs);

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

    // Each island is a set of pins already physically connected via strips/wires
    const groupIndex = new Map<number, number>();
    const groups: number[][] = [];
    for (let i = 0; i < pinPositions.length; i++) {
      const root = graph.groupAt(pinPositions[i]);
      let g = groupIndex.get(root);
      if (g === undefined) {
        g = groups.length;
        groupIndex.set(root, g);
        groups.push([]);
      }
      groups[g].push(i);
    }

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
