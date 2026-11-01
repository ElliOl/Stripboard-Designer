// ─── Parts with an explicit footprint ───────────────────────
//
// Vero Designer only knows its own part types. A part record that carries a
// `customFootprint` is placed as a fixed multi-pin package (it is a Vero
// `otherIC`): the engine asks these hooks for its pins and the board
// footprints it may take, and falls back to its own logic for everything else.

import type { VeroEngineEnv } from './vero-engine.generated';

export type CustomVariant = {
  key: string;
  orientation: string;
  width: number;
  height: number;
  /** x = hole along the strip, y = strip; physical pins one hole apart in a row share a strip */
  pins: { logical: string; physical: string; x: number; y: number }[];
};

export type CustomFootprint = {
  /** What the part is, so the result gets a matching body type */
  kind: 'header' | 'module';
  /** Pin names, in order */
  pins: string[];
  variants: CustomVariant[];
};

const GRID = 20;

function customOf(component: unknown): CustomFootprint | undefined {
  if (!component || typeof component !== 'object') return undefined;
  const custom = (component as { customFootprint?: CustomFootprint }).customFootprint;
  return custom && Array.isArray(custom.pins) && Array.isArray(custom.variants) ? custom : undefined;
}

/** Schematic definition: pins in two columns, as Vero draws a fixed package */
function definitionFor(custom: CustomFootprint, component: { value?: string }) {
  const half = Math.ceil(custom.pins.length / 2);
  const pins = custom.pins.map((name, index) => {
    const left = index < half;
    const rowIndex = left ? index : custom.pins.length - 1 - index;
    return { name, signal: '', x: left ? -100 : 100, y: GRID / 2 + (rowIndex - (half - 1) / 2) * GRID };
  });
  const bodyHalfHeight = ((half - 1) * GRID) / 2 + 18;
  return {
    name: component.value || 'Fixed package',
    prefix: 'J',
    defaultValue: component.value || 'Fixed package',
    hidePinLabels: true,
    pinCount: pins.length,
    body: { x: -65, y: GRID / 2 - bodyHalfHeight, width: 130, height: bodyHalfHeight * 2 },
    bounds: { x: -112, y: GRID / 2 - bodyHalfHeight - 16, width: 224, height: bodyHalfHeight * 2 + 32 },
    pins,
  };
}

export const customPartOverrides: NonNullable<VeroEngineEnv['partOverrides']> = {
  definition(component) {
    const custom = customOf(component);
    return custom ? definitionFor(custom, component as { value?: string }) : undefined;
  },
  footprints(component) {
    return customOf(component)?.variants.map((v) => ({ ...v, pins: v.pins.map((p) => ({ ...p })) }));
  },
};
