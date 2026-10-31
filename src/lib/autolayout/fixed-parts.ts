// ─── Pin headers and modules as placed parts ────────────────
//
// Works out where the pins of a header or a module (Arduino Nano) may sit
// on the board. Positions use Vero's coordinates: x = hole along a strip,
// y = strip. Two pins side by side on one strip are always joined (there is
// no hole between them to cut), so an orientation is only offered when
// every run of adjacent same-strip pins carries a single net.

import type { CustomFootprint, CustomVariant } from './custom-footprint';

type BasePin = { name: string; x: number; y: number };

export type HeaderGeometry = { rows: 1 | 2; cols: number };

/** Rows x columns from a KiCad header/socket footprint name, or null */
export function parseHeaderFootprint(footprint: string): HeaderGeometry | null {
  if (/smd|surface/i.test(footprint)) return null;
  const match = /(?:header|socket|pins|conn)_0?([12])x0?(\d+)/i.exec(footprint);
  if (!match) return null;
  const cols = Number(match[2]);
  if (!cols || cols > 40) return null;
  return { rows: Number(match[1]) as 1 | 2, cols };
}

export function isArduinoNano(footprint: string): boolean {
  return /arduino[_-]?nano/i.test(footprint);
}

/** KiCad numbering: 1xN runs down one column; 2xN puts 1/2 side by side, 3/4 on the next row, ... */
export function headerBasePins({ rows, cols }: HeaderGeometry): BasePin[] {
  const count = rows * cols;
  return Array.from({ length: count }, (_, i) =>
    rows === 1 ? { name: String(i + 1), x: 0, y: i } : { name: String(i + 1), x: i % 2, y: Math.floor(i / 2) }
  );
}

/** Arduino Nano: pins 1-15 down one side, 16-30 back up the other, 6 holes (15.24 mm) apart */
export function nanoBasePins(): BasePin[] {
  return Array.from({ length: 30 }, (_, i) =>
    i < 15 ? { name: String(i + 1), x: 0, y: i } : { name: String(i + 1), x: 6, y: 29 - i }
  );
}

function rotate(pins: BasePin[]): BasePin[] {
  // Quarter turn clockwise: (x, y) -> (height - 1 - y, x)
  const height = Math.max(...pins.map((p) => p.y)) + 1;
  return pins.map((p) => ({ name: p.name, x: height - 1 - p.y, y: p.x }));
}

/**
 * True when no two pins on different nets are joined by sitting next to each
 * other on one strip.
 */
export function orientationIsValid(pins: BasePin[], netOf: (pin: string) => string | undefined): boolean {
  const byStrip = new Map<number, BasePin[]>();
  for (const pin of pins) {
    const list = byStrip.get(pin.y) ?? [];
    list.push(pin);
    byStrip.set(pin.y, list);
  }
  for (const strip of byStrip.values()) {
    strip.sort((a, b) => a.x - b.x);
    let run: Set<string> = new Set();
    let last = -Infinity;
    for (const pin of strip) {
      if (pin.x !== last + 1) run = new Set();
      last = pin.x;
      const net = netOf(pin.name);
      if (!net) continue;
      run.add(net);
      if (run.size > 1) return false;
    }
  }
  return true;
}

/**
 * Turn a base pin layout into the board footprints that are safe for the
 * nets the pins carry. `rotations` are quarter turns to try (0-3).
 */
export function footprintFor(
  kind: CustomFootprint['kind'],
  base: BasePin[],
  rotations: number[],
  netOf: (pin: string) => string | undefined
): CustomFootprint | null {
  const variants: CustomVariant[] = [];
  const seen = new Set<string>();
  let current = base;
  for (let turn = 0; turn < 4; turn++) {
    if (rotations.includes(turn)) {
      const signature = current.map((p) => `${p.name}@${p.x}.${p.y}`).join('_');
      if (!seen.has(signature) && orientationIsValid(current, netOf)) {
        seen.add(signature);
        variants.push({
          key: `fixed-${kind}-${turn * 90}`,
          orientation: `fixed-${kind}-${turn * 90}`,
          width: Math.max(...current.map((p) => p.x)) + 1,
          height: Math.max(...current.map((p) => p.y)) + 1,
          pins: current.map((p) => ({ logical: p.name, physical: p.name, x: p.x, y: p.y })),
        });
      }
    }
    current = rotate(current);
  }
  if (!variants.length) return null;
  // The router anchors a fixed package on its tallest variant, so list that first
  variants.sort((a, b) => b.height - a.height || b.width - a.width);
  return { kind, pins: base.map((p) => p.name), variants };
}
