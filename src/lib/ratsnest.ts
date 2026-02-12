import type {
  Component,
  Strip,
  Wire,
  Net,
  RatsNestConnection,
  GridPosition,
} from './types';
import { arePinsConnectedEnhanced } from './connectivity';

// ─── Ratsnest Calculator ───────────────────────────────────
//
// For every net, finds all pins that belong to it, determines
// which ones are already electrically connected (via strips or
// wires), and returns the set of connections that still need
// to be routed (i.e. connections between disconnected groups).

export function calculateRatsNest(
  components: Component[],
  strips: Strip[],
  wires: Wire[],
  nets: Net[]
): RatsNestConnection[] {
  const connections: RatsNestConnection[] = [];

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

    // Build connectivity groups with Union-Find
    const uf = new UnionFind(pinPositions.length);

    for (let i = 0; i < pinPositions.length; i++) {
      for (let j = i + 1; j < pinPositions.length; j++) {
        if (
          arePinsConnectedEnhanced(
            pinPositions[i],
            pinPositions[j],
            strips,
            wires,
            net.id,
            components
          )
        ) {
          uf.union(i, j);
        }
      }
    }

    // Group pins by their connected component
    const groups = new Map<number, number[]>();
    for (let i = 0; i < pinPositions.length; i++) {
      const root = uf.find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(i);
    }

    // For every pair of disconnected groups, add a rats-nest
    // line between the closest pair of pins.
    const roots = Array.from(groups.keys());
    for (let gi = 0; gi < roots.length; gi++) {
      for (let gj = gi + 1; gj < roots.length; gj++) {
        const groupA = groups.get(roots[gi])!;
        const groupB = groups.get(roots[gj])!;

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

// ─── Union-Find ─────────────────────────────────────────────

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // path compression
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx]++;
    }
  }
}
