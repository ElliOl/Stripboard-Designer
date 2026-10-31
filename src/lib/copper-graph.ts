import type { Component, Strip, Wire, GridPosition, PCB } from './types';
import { buildSpatialIndex, posKey, stripKey, type SpatialIndex } from './spatial-index';
import { getStripSegments } from './strip-segments';

// ─── Copper Graph ──────────────────────────────────────────
//
// Resolves board connectivity as a graph. Nodes are copper segments
// (from getStripSegments, PCB-aware) plus any wire/pin position that
// does not land on a segment. Edges are wires: every point of a wire is
// joined to the others. A union-find over the nodes gives the connected
// groups, so chains such as segment -> link -> empty segment -> link ->
// segment are followed no matter which segments carry pins.
// Cost is O(pins + wire points + segments) (times the few PCBs).

export type CopperGraph = {
  index: SpatialIndex;
  /** Number of segment nodes; segment nodes come first, then loose points */
  segmentCount: number;
  /** "stripId:segIdx" key for each segment node */
  segmentKeys: string[];
  /** Node id for a world position (segment node, or a loose point node) */
  nodeAt: (pos: GridPosition) => number;
  /** Group (union-find root) of a node */
  find: (node: number) => number;
  /** Group of a world position */
  groupAt: (pos: GridPosition) => number;
  /** Nets of the pins in each group, keyed by group root. Floating groups are absent. */
  groupNets: Map<number, Set<string>>;
};

/** Find the strip at a world position, checking all PCBs */
export function findStripAtPosition(pos: GridPosition, index: SpatialIndex): Strip | null {
  for (const pcb of index.pcbsById.values()) {
    const localRow = pos.row - pcb.position.row;
    const localCol = pos.col - pcb.position.col;
    if (localRow >= 0 && localRow < pcb.rows && localCol >= 0 && localCol < pcb.cols) {
      const strip = index.stripByPcbRow.get(stripKey(pcb.isMain ? undefined : pcb.id, localRow));
      if (strip && localCol >= strip.startCol && localCol <= strip.endCol) {
        return strip;
      }
    }
  }
  return null;
}

export function buildCopperGraph(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  pcbs: PCB[]
): CopperGraph {
  const index = buildSpatialIndex(components, strips, wires, pcbs);

  // Segment nodes
  const segmentKeys: string[] = [];
  const stripSegs = new Map<Strip, { base: number; segs: Array<{ startCol: number; endCol: number }> }>();
  for (const strip of strips) {
    const segs = getStripSegments(strip);
    stripSegs.set(strip, { base: segmentKeys.length, segs });
    for (let i = 0; i < segs.length; i++) segmentKeys.push(`${strip.id}:${i}`);
  }
  const segmentCount = segmentKeys.length;

  // Union-find (grows as loose point nodes are added)
  const parent: number[] = [];
  for (let i = 0; i < segmentCount; i++) parent.push(i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const pointNodes = new Map<string, number>();
  const nodeAt = (pos: GridPosition): number => {
    const strip = findStripAtPosition(pos, index);
    if (strip) {
      const info = stripSegs.get(strip)!;
      const pcb = strip.pcbId ? index.pcbsById.get(strip.pcbId) : index.pcbsById.get('main-pcb');
      const localCol = pos.col - (pcb ? pcb.position.col : 0);
      const idx = info.segs.findIndex((s) => localCol >= s.startCol && localCol <= s.endCol);
      if (idx >= 0) return info.base + idx;
    }
    const key = posKey(pos);
    let node = pointNodes.get(key);
    if (node === undefined) {
      node = parent.length;
      parent.push(node);
      pointNodes.set(key, node);
    }
    return node;
  };

  // Wires are the edges
  for (const wire of wires) {
    if (wire.points.length === 0) continue;
    const first = nodeAt(wire.points[0]);
    for (let i = 1; i < wire.points.length; i++) union(first, nodeAt(wire.points[i]));
  }

  // Nets per group, from pins
  const groupNets = new Map<number, Set<string>>();
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (!pin.netId) continue;
      const root = find(nodeAt(pin.position));
      let set = groupNets.get(root);
      if (!set) groupNets.set(root, (set = new Set()));
      set.add(pin.netId);
    }
  }

  return {
    index,
    segmentCount,
    segmentKeys,
    nodeAt,
    find,
    groupAt: (pos) => find(nodeAt(pos)),
    groupNets,
  };
}
