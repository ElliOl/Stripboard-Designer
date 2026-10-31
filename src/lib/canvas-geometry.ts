import type { GridPosition } from './types';

/** Minimal PCB shape needed for geometry helpers. */
export interface PcbRect {
  position: GridPosition;
  rows: number;
  cols: number;
}

export interface Extents {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

/**
 * Scale a hit tolerance given in content pixels so it stays roughly constant
 * on screen. Dividing by zoom is capped so the tolerance doesn't become huge
 * when zoomed far out, or vanish when zoomed far in.
 */
export function scaleHitTolerance(base: number, zoom: number, minMul = 0.5, maxMul = 3): number {
  if (!(zoom > 0)) return base;
  const mul = Math.max(minMul, Math.min(maxMul, 1 / zoom));
  return base * mul;
}

/** The PCB whose grid area contains (row, col), or undefined. */
export function findPcbAt<T extends PcbRect>(pcbs: T[], row: number, col: number): T | undefined {
  return pcbs.find((p) => {
    const lr = row - p.position.row;
    const lc = col - p.position.col;
    return lr >= 0 && lr < p.rows && lc >= 0 && lc < p.cols;
  });
}

/** Bounding extents of a set of pin offsets (relative to the part origin). */
export function pinExtents(offsets: GridPosition[]): Extents {
  if (offsets.length === 0) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  return {
    minRow: Math.min(...offsets.map((p) => p.row)),
    maxRow: Math.max(...offsets.map((p) => p.row)),
    minCol: Math.min(...offsets.map((p) => p.col)),
    maxCol: Math.max(...offsets.map((p) => p.col)),
  };
}

/** Clamp a part origin so all of its pins lie inside the given PCB. */
export function clampPartToPcb(pos: GridPosition, ext: Extents, pcb: PcbRect): GridPosition {
  const loRow = pcb.position.row - ext.minRow;
  const hiRow = pcb.position.row + pcb.rows - 1 - ext.maxRow;
  const loCol = pcb.position.col - ext.minCol;
  const hiCol = pcb.position.col + pcb.cols - 1 - ext.maxCol;
  return {
    row: Math.max(loRow, Math.min(Math.max(loRow, hiRow), pos.row)),
    col: Math.max(loCol, Math.min(Math.max(loCol, hiCol), pos.col)),
  };
}

/**
 * Where a dropped part goes: clamped inside the PCB under the cursor, or
 * exactly where dropped when the cursor is over no PCB.
 */
export function clampDropPosition(pcbs: PcbRect[], raw: GridPosition, ext: Extents): GridPosition {
  const pcb = findPcbAt(pcbs, raw.row, raw.col);
  return pcb ? clampPartToPcb(raw, ext, pcb) : raw;
}

export interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}

export type WheelAction =
  | { kind: 'pan'; dx: number; dy: number } // amount to ADD to pan
  | { kind: 'zoom'; factor: number }
  | { kind: 'none' };

/** Convert line/page wheel units to pixels. */
export function normalizeWheelDelta(
  delta: number,
  deltaMode: number,
  pageSize = 800
): number {
  if (deltaMode === 1) return delta * 16;
  if (deltaMode === 2) return delta * pageSize;
  return delta;
}

/**
 * Decide what a wheel event does:
 *  - Shift (or Cmd) + wheel pans horizontally, using whichever delta axis the
 *    browser reports.
 *  - Ctrl (pinch) or plain vertical scroll zooms.
 *  - Plain predominantly horizontal scroll pans horizontally.
 */
export function interpretWheel(e: WheelLike, pageSize = 800): WheelAction {
  const dx = normalizeWheelDelta(e.deltaX, e.deltaMode, pageSize);
  const dy = normalizeWheelDelta(e.deltaY, e.deltaMode, pageSize);

  if ((e.shiftKey || e.metaKey) && !e.ctrlKey) {
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    return d === 0 ? { kind: 'none' } : { kind: 'pan', dx: -d, dy: 0 };
  }
  if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy)) {
    return { kind: 'pan', dx: -dx, dy: 0 };
  }
  if (dy === 0) return { kind: 'none' };
  const sensitivity = e.ctrlKey ? 0.01 : 0.003;
  return { kind: 'zoom', factor: Math.exp(-dy * sensitivity) };
}

let idCounter = 0;
/** Collision-proof id with the given prefix. */
export function uniqueId(prefix: string): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return `${prefix}-${c.randomUUID()}`;
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
