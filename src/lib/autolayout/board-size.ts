// ─── Starting board size for Auto layout ────────────────────
//
// The router only searches inside the maximum columns and rows it is given,
// and fails on a circuit that does not fit. Small boards are unaffected by a
// generous maximum (the router tries narrow widths first), so the dialog
// starts from an estimate based on the parts instead of one fixed size.

import type { AutoLayoutCircuit, VeroPartRecord } from './adapter';
import type { CustomFootprint } from './custom-footprint';

/** Limits the router accepts (buildCompactXYLayout and normalizeMaximumRows) */
export const MIN_COLUMNS = 8;
export const MAX_COLUMNS = 80;
export const MIN_ROWS = 4;
export const MAX_ROWS = 160;

/** Never start below the old fixed default */
const FLOOR_COLUMNS = 40;
const FLOOR_ROWS = 24;
/** Board area needed per hole of part footprint (tracks, links and gaps), from real circuits */
const PACKING_FACTOR = 6.5;
/** Width : height of the estimate */
const ASPECT = 5 / 3;
/** Extra holes on each side when edge pads are needed */
const PAD_MARGIN = 2;
/** Above this many on-board parts the run can take a few minutes */
export const LARGE_CIRCUIT_PARTS = 40;

export type BoardSize = { columns: number; rows: number };

type Footprint = {
  /** Smallest area of any orientation */
  area: number;
  /** Narrowest and shortest any orientation gets (the router must fit these) */
  minWidth: number;
  minHeight: number;
};

const box = (width: number, height: number): Footprint => ({ area: width * height, minWidth: width, minHeight: height });

// Smallest footprint of Vero's own part types, in holes
const SMALL = box(3, 1);
const TYPE_FOOTPRINT: Record<string, Footprint> = {
  resistor: box(4, 1),
  diode: box(4, 1),
  capacitor: box(2, 1),
  capacitorPolarized: box(2, 1),
  led: box(2, 1),
  jumper: box(2, 1),
  transistor: box(3, 1),
  potentiometer: box(3, 1),
};

/** Smallest footprint a part may take, in holes along the strip and strips */
export function smallestFootprint(part: VeroPartRecord): Footprint {
  const custom = part.customFootprint as CustomFootprint | undefined;
  if (custom && Array.isArray(custom.variants) && custom.variants.length > 0) {
    const v = custom.variants;
    return {
      area: Math.min(...v.map((x) => x.width * x.height)),
      minWidth: Math.min(...v.map((x) => x.width)),
      minHeight: Math.min(...v.map((x) => x.height)),
    };
  }
  if (part.type === 'otherIC') {
    const pins = Number(part.genericIcPinCount) || 8;
    return box(Math.ceil(pins / 2), 3);
  }
  return TYPE_FOOTPRINT[part.type] ?? SMALL;
}

/** Parts that sit on the board (pads are not parts) */
export const onBoardParts = (circuit: AutoLayoutCircuit) => circuit.components.filter((c) => c.type !== 'terminal');

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Sensible maximum columns and rows to start from for this circuit */
export function estimateBoardSize(circuit: AutoLayoutCircuit): BoardSize {
  const parts = onBoardParts(circuit);
  const hasPads = circuit.components.length > parts.length;
  const margin = hasPads ? PAD_MARGIN * 2 : 0;
  const footprints = parts.map(smallestFootprint);
  const area = footprints.reduce((sum, f) => sum + f.area, 0);
  // The widest and tallest single part must fit, however small the total is
  const widest = footprints.reduce((m, f) => Math.max(m, f.minWidth), 0);
  const tallest = footprints.reduce((m, f) => Math.max(m, f.minHeight), 0);

  const wanted = area * PACKING_FACTOR;
  const columns = clamp(
    Math.max(FLOOR_COLUMNS, Math.ceil(Math.sqrt(wanted * ASPECT)) + margin, widest + margin + 1),
    MIN_COLUMNS,
    MAX_COLUMNS
  );
  // Rows follow from the columns, so a circuit pinned at the column limit gets the rows it still needs
  const rows = clamp(
    Math.max(FLOOR_ROWS, Math.ceil(wanted / Math.max(1, columns - margin)) + margin, tallest + margin + 1),
    MIN_ROWS,
    MAX_ROWS
  );
  return { columns, rows };
}

export type BumpResult = { size: BoardSize; changed: boolean };

/** About 25% larger in each direction, kept inside the router's limits */
export function enlargeBoardSize(size: BoardSize): BumpResult {
  const columns = clamp(Math.max(size.columns + 1, Math.ceil(size.columns * 1.25)), MIN_COLUMNS, MAX_COLUMNS);
  const rows = clamp(Math.max(size.rows + 1, Math.ceil(size.rows * 1.25)), MIN_ROWS, MAX_ROWS);
  return { size: { columns, rows }, changed: columns > size.columns || rows > size.rows };
}

/** True for the router's "could not finish ... within N columns x M rows" failures */
export function isNoFitError(message: string): boolean {
  return /could not (?:finish|keep|produce)|cannot fit/i.test(message);
}
