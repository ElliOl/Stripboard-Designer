// ─── Component Clustering by Net Connectivity ─────────────────
//
// Groups imported components into spatial clusters based on shared
// signal nets.  Power / high-fanout nets are excluded so the clusters
// represent logical circuit sections (op-amp stages, filter blocks,
// power supply, etc.).
//
// The result is the same Component[] with updated positions — the user
// still places everything manually, but the staging layout clearly
// shows which parts belong together.

import type { Component, Net, ComponentDefinition, GridPosition } from './types';
import { getRotatedPinPositions } from './rotation';

// ─── Power / Global Net Detection ────────────────────────────

const POWER_NET_PATTERNS = [
  /^gnd$/i,
  /^agnd$/i,
  /^dgnd$/i,
  /^earth$/i,
  /^vcc$/i,
  /^vdd$/i,
  /^vss$/i,
  /^vee$/i,
  /^avcc$/i,
  /^avdd$/i,
  /^dvcc$/i,
  /^dvdd$/i,
  /^\+\d/,         // +5V, +12V, +3V3
  /^-\d/,          // -12V, -5V
  /^v\+/i,         // V+
  /^v-/i,          // V-
  /^net-0$/,       // Net code 0 is often unconnected
  /^unconnected/i, // KiCad no-connect
];

function isPowerNet(net: Net): boolean {
  return POWER_NET_PATTERNS.some((p) => p.test(net.name));
}

// ─── Adjacency Graph ─────────────────────────────────────────

/**
 * Build a weighted adjacency graph where nodes are components and
 * edge weight = number of shared signal nets (power nets excluded).
 */
function buildAdjacencyGraph(
  components: Component[],
  nets: Net[],
  maxFanoutRatio: number = 0.6
): Map<string, Map<string, number>> {
  const graph = new Map<string, Map<string, number>>();

  for (const comp of components) {
    graph.set(comp.id, new Map());
  }

  // netId → set of component IDs that have pins on that net
  const compsByNet = new Map<string, Set<string>>();
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.netId) {
        if (!compsByNet.has(pin.netId)) compsByNet.set(pin.netId, new Set());
        compsByNet.get(pin.netId)!.add(comp.id);
      }
    }
  }

  const totalComps = components.length;

  for (const net of nets) {
    if (isPowerNet(net)) continue;

    const compsOnNet = compsByNet.get(net.id);
    if (!compsOnNet || compsOnNet.size < 2) continue;

    // High-fanout nets are likely power/ground even if not named as such
    if (compsOnNet.size > totalComps * maxFanoutRatio) continue;

    const ids = Array.from(compsOnNet);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i],
          b = ids[j];
        const ea = graph.get(a)!;
        const eb = graph.get(b)!;
        ea.set(b, (ea.get(b) || 0) + 1);
        eb.set(a, (eb.get(a) || 0) + 1);
      }
    }
  }

  return graph;
}

// ─── Cluster Detection (BFS connected components) ────────────

function findClusters(graph: Map<string, Map<string, number>>): string[][] {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const cluster: string[] = [];
    const queue = [nodeId];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      const neighbors = graph.get(current);
      if (neighbors) {
        for (const neighbor of neighbors.keys()) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

// ─── Sorting Helpers ─────────────────────────────────────────

/** Priority by reference prefix — ICs come first as cluster anchors. */
function refPriority(ref: string): number {
  const prefix = ref.replace(/[0-9]/g, '').toUpperCase();
  switch (prefix) {
    case 'U':
      return 0; // ICs
    case 'Q':
      return 1; // Transistors
    case 'D':
      return 2; // Diodes
    case 'L':
      return 3; // Inductors
    case 'R':
      return 4; // Resistors
    case 'C':
      return 5; // Capacitors
    case 'J':
    case 'P':
      return 6; // Connectors
    default:
      return 7;
  }
}

/** Natural sort for reference designators: R1, R2, ..., R10, R11 */
function naturalRefCompare(a: string, b: string): number {
  const re = /^([A-Z]+)(\d+)$/i;
  const ma = a.match(re);
  const mb = b.match(re);
  if (ma && mb) {
    if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1]);
    return parseInt(ma[2]) - parseInt(mb[2]);
  }
  return a.localeCompare(b);
}

/** Sort component IDs within a cluster: ICs first, then by ref. */
function sortCluster(
  ids: string[],
  byId: Map<string, Component>
): string[] {
  return [...ids].sort((a, b) => {
    const ca = byId.get(a)!;
    const cb = byId.get(b)!;
    const pa = refPriority(ca.reference);
    const pb = refPriority(cb.reference);
    if (pa !== pb) return pa - pb;
    return naturalRefCompare(ca.reference, cb.reference);
  });
}

// ─── Component Size Helper ───────────────────────────────────

function getComponentSize(
  comp: Component,
  defs: Map<string, ComponentDefinition>
): { width: number; height: number } {
  const def = defs.get(comp.definitionId);
  if (!def) {
    // Fallback: derive from pin positions relative to component origin
    if (comp.pins.length === 0) return { width: 1, height: 1 };
    const maxCol = Math.max(
      ...comp.pins.map((p) => p.position.col - comp.position.col)
    );
    const maxRow = Math.max(
      ...comp.pins.map((p) => p.position.row - comp.position.row)
    );
    return { width: maxCol + 1, height: maxRow + 1 };
  }
  const rotated = getRotatedPinPositions(def.pins, comp.rotation);
  return {
    width: Math.max(0, ...rotated.map((p) => p.col)) + 1,
    height: Math.max(0, ...rotated.map((p) => p.row)) + 1,
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Reorganize components into connectivity-based clusters.
 *
 * Returns a **new** Component[] with updated positions.  Net assignments,
 * rotations, extended pins, and all other properties are preserved.
 *
 * Layout rules:
 *  - Multi-component clusters are placed first (largest → smallest)
 *  - Single-component orphans are grouped at the end
 *  - Within each cluster: ICs first, then passives, sorted by ref
 *  - Clusters are separated by a visible gap
 */
export function clusterComponentsByConnectivity(
  components: Component[],
  nets: Net[],
  boardCols: number,
  componentDefinitions: ComponentDefinition[]
): Component[] {
  if (components.length === 0) return [];

  const byId = new Map(components.map((c) => [c.id, c]));
  const defs = new Map(componentDefinitions.map((d) => [d.id, d]));

  // 1. Build adjacency and detect clusters
  const graph = buildAdjacencyGraph(components, nets);
  const rawClusters = findClusters(graph);

  // 2. Separate multi-component clusters from orphans
  const multiClusters: string[][] = [];
  const orphans: string[] = [];
  for (const cluster of rawClusters) {
    if (cluster.length > 1) {
      multiClusters.push(cluster);
    } else {
      orphans.push(cluster[0]);
    }
  }

  // Sort clusters: largest first
  multiClusters.sort((a, b) => b.length - a.length);

  // Sort within each cluster, and sort orphans by ref
  const sorted = multiClusters.map((c) => sortCluster(c, byId));
  const sortedOrphans = sortCluster(orphans, byId);

  // 3. Layout constants
  const CLUSTER_GAP_H = 4; // horizontal gap between clusters
  const CLUSTER_GAP_V = 3; // vertical gap when wrapping to new row
  const COMP_GAP = 1; // gap between components inside a cluster
  const START_ROW = 2;
  const START_COL = 2;
  const MAX_COL = Math.max(boardCols - 2, START_COL + 10);

  // 4. Place clusters
  const result: Component[] = [];
  let curRow = START_ROW;
  let curCol = START_COL;
  let rowMaxH = 0;

  function placeComponent(compId: string) {
    const comp = byId.get(compId)!;
    const size = getComponentSize(comp, defs);

    // Wrap to next row if this component doesn't fit
    if (curCol > START_COL && curCol + size.width > MAX_COL) {
      curRow += rowMaxH + COMP_GAP;
      curCol = START_COL;
      rowMaxH = 0;
    }

    const newPos: GridPosition = { row: curRow, col: curCol };
    const dr = newPos.row - comp.position.row;
    const dc = newPos.col - comp.position.col;

    result.push({
      ...comp,
      position: newPos,
      pins: comp.pins.map((pin) => ({
        ...pin,
        position: {
          row: pin.position.row + dr,
          col: pin.position.col + dc,
        },
      })),
    });

    curCol += size.width + COMP_GAP;
    rowMaxH = Math.max(rowMaxH, size.height);
  }

  for (const cluster of sorted) {
    // Estimate total cluster width to decide if we need a new row
    let clusterW = 0;
    for (const id of cluster) {
      clusterW += getComponentSize(byId.get(id)!, defs).width + COMP_GAP;
    }
    clusterW -= COMP_GAP;

    // If cluster won't fit on current row, start a new row
    if (curCol > START_COL && curCol + clusterW > MAX_COL) {
      curRow += rowMaxH + CLUSTER_GAP_V;
      curCol = START_COL;
      rowMaxH = 0;
    }

    // Place each component in the cluster
    for (const id of cluster) {
      placeComponent(id);
    }

    // Add horizontal gap after cluster
    curCol += CLUSTER_GAP_H - COMP_GAP;
  }

  // 5. Place orphans as a final group (with a gap from previous clusters)
  if (sortedOrphans.length > 0 && sorted.length > 0) {
    curRow += rowMaxH + CLUSTER_GAP_V;
    curCol = START_COL;
    rowMaxH = 0;
  }

  for (const id of sortedOrphans) {
    placeComponent(id);
  }

  return result;
}
