import type {
  Component,
  Strip,
  Wire,
  Net,
  GridPosition,
  PCB,
} from './types';
import { posKey } from './spatial-index';
import { buildCopperGraph } from './copper-graph';

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
 * Performs comprehensive connectivity analysis on the copper graph
 * (see copper-graph.ts): segments and wire points are nodes, wires are edges.
 * - A group with one net belongs to that net; with several nets it is a short;
 *   with no pins it is floating.
 * - Wires, segments and connected groups are all derived from those groups,
 *   so link chains through empty strips are followed.
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

  const graph = buildCopperGraph(components, strips, wires, pcbs);

  // Wires take the net of their group
  for (const wire of wires) {
    const wireGroupNets = wire.points.length ? graph.groupNets.get(graph.groupAt(wire.points[0])) : undefined;
    if (wireGroupNets && wireGroupNets.size > 1) {
      wireErrors.add(wire.id);
      wireNets.set(wire.id, null);
    } else {
      wireNets.set(wire.id, wireGroupNets && wireGroupNets.size === 1 ? wireGroupNets.values().next().value! : null);
    }
  }

  // Segments take the net of their group
  for (let node = 0; node < graph.segmentCount; node++) {
    const segGroupNets = graph.groupNets.get(graph.find(node));
    if (!segGroupNets) continue;
    if (segGroupNets.size > 1) segmentErrors.add(graph.segmentKeys[node]);
    else segmentNets.set(graph.segmentKeys[node], segGroupNets.values().next().value!);
  }

  // Connected groups per net: the pin positions (and wire points) of each group
  const wanted = new Set(nets.map((n) => n.id));
  const perNet = new Map<string, Map<number, Set<string>>>();
  for (const net of nets) perNet.set(net.id, new Map());
  const addKey = (netId: string, root: number, key: string) => {
    const byRoot = perNet.get(netId)!;
    let set = byRoot.get(root);
    if (!set) byRoot.set(root, (set = new Set()));
    set.add(key);
  };
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.netId && wanted.has(pin.netId)) addKey(pin.netId, graph.groupAt(pin.position), posKey(pin.position));
    }
  }
  for (const wire of wires) {
    for (const point of wire.points) {
      const root = graph.groupAt(point);
      const groupNets = graph.groupNets.get(root);
      if (!groupNets) continue;
      for (const netId of groupNets) {
        if (wanted.has(netId)) addKey(netId, root, posKey(point));
      }
    }
  }
  for (const net of nets) connectedGroups.set(net.id, Array.from(perNet.get(net.id)!.values()));

  return { wireNets, wireErrors, segmentNets, segmentErrors, connectedGroups };
}

/**
 * Whether two positions are electrically connected through strips and wires.
 * `netId` is kept for API compatibility; connectivity no longer depends on it.
 */
export function arePinsConnectedEnhanced(
  a: GridPosition,
  b: GridPosition,
  strips: Strip[],
  wires: Wire[],
  _netId: string,
  components: Component[],
  pcbs: PCB[]
): boolean {
  const graph = buildCopperGraph(components, strips, wires, pcbs);
  return graph.groupAt(a) === graph.groupAt(b);
}
