// ─── Applying a layout to a board with several PCBs ─────────
//
// Auto layout works on the main PCB only. Parts, links and strips on other
// PCBs are left exactly as they are.

import type { Component, ComponentDefinition, PCB, ProjectData, Strip, Wire } from '@/lib/types';
import { findPcbAt } from '@/lib/canvas-geometry';

type BoardState = {
  pcbs: PCB[];
  components: Component[];
  strips: Strip[];
  wires: Wire[];
  componentDefinitions: ComponentDefinition[];
};

const mainOf = (pcbs: PCB[]) => pcbs.find((p) => p.isMain) ?? pcbs[0];

/** True when a part belongs to the main PCB: any pin on it, or the part is on no PCB at all */
function onMainPcb(component: Component, pcbs: PCB[], main: PCB): boolean {
  const spots = component.pins.length ? component.pins.map((p) => p.position) : [component.position];
  let onAny = false;
  for (const spot of spots) {
    const pcb = findPcbAt(pcbs, spot.row, spot.col);
    if (pcb?.id === main.id) return true;
    if (pcb) onAny = true;
  }
  return !onAny;
}

/** The parts Auto layout works on */
export function mainPcbComponents(components: Component[], pcbs: PCB[]): Component[] {
  const main = mainOf(pcbs);
  return main ? components.filter((c) => onMainPcb(c, pcbs, main)) : components;
}

export type ApplyResult = { ok: true; patch: Partial<BoardState> & { rows: number; cols: number } } | { ok: false; error: string };

/** Merge a finished layout into the board: replace the main PCB's content, keep the rest */
export function applyLayout(state: BoardState, project: ProjectData): ApplyResult {
  const main = mainOf(state.pcbs);
  const { rows, cols } = project.board;
  const mainId = main?.id;
  const origin = main?.position ?? { row: 0, col: 0 };

  // The enlarged main board must not run into another PCB
  for (const other of state.pcbs) {
    if (other.id === mainId) continue;
    const apart =
      origin.row + rows <= other.position.row ||
      other.position.row + other.rows <= origin.row ||
      origin.col + cols <= other.position.col ||
      other.position.col + other.cols <= origin.col;
    if (!apart) {
      return {
        ok: false,
        error: `The ${cols} by ${rows} layout would overlap the PCB "${other.name}". Move that PCB away from the main board, or use a smaller maximum size, and try again.`,
      };
    }
  }

  const shift = (p: { row: number; col: number }) => ({ row: p.row + origin.row, col: p.col + origin.col });
  const laidOut: Component[] = project.components.map((c) => ({
    ...c,
    position: shift(c.position),
    pins: c.pins.map((p) => ({ ...p, position: shift(p.position) })),
  }));
  const laidOutWires: Wire[] = project.wires.map((w) => ({ ...w, points: w.points.map(shift) }));

  const kept = main ? state.components.filter((c) => !onMainPcb(c, state.pcbs, main)) : [];
  const keptWires = main
    ? state.wires.filter((w) => !w.points.some((p) => findPcbAt(state.pcbs, p.row, p.col)?.id === main.id))
    : [];
  const known = new Set(state.componentDefinitions.map((d) => d.id));

  return {
    ok: true,
    patch: {
      rows,
      cols,
      pcbs: state.pcbs.map((p) => (p.id === mainId ? { ...p, rows, cols } : p)),
      components: [...kept, ...laidOut],
      strips: [...project.strips, ...state.strips.filter((s) => s.pcbId && s.pcbId !== mainId)],
      wires: [...keptWires, ...laidOutWires],
      componentDefinitions: [
        ...state.componentDefinitions,
        ...(project.customDefinitions ?? []).filter((d) => !known.has(d.id)),
      ],
    },
  };
}
