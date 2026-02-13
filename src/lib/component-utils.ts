// ─── Generic / Dynamic Component Definition Utilities ────────
//
// Helpers for creating component definitions at runtime —
// used during netlist import for unsupported footprints and
// by the Edit Component dialog when users reconfigure pins.

import type { ComponentDefinition, PinDefinition } from '@/lib/types';

/**
 * Sort pin numbers: numeric pins first (ascending), then alpha pins.
 */
function sortPinNumbers(pins: string[]): string[] {
  return [...pins].sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Build a stable definition ID from footprint type, pin count, and pin labels.
 */
export function buildGenericDefId(
  footprintType: 'DIP' | 'SIP' | 'Axial' | 'Radial' | 'Custom',
  pinNumbers: string[]
): string {
  const sorted = sortPinNumbers(pinNumbers);
  return `generic-${footprintType.toLowerCase()}-${sorted.join('-')}`;
}

/**
 * Create a ComponentDefinition for a given pin set.
 *
 * Layout rules:
 *   - 1–6 pins → SIP / inline (single row)
 *   - 7+  pins → DIP-style (two rows, 3-hole gap)
 *
 * The caller can override the footprint type.
 */
export function createGenericDefinition(
  pinNumbers: string[],
  footprintType?: 'DIP' | 'SIP' | 'Axial' | 'Radial' | 'Custom'
): ComponentDefinition {
  const sorted = sortPinNumbers(pinNumbers);
  const pinCount = sorted.length;

  const pins: PinDefinition[] = [];

  const useDIP = pinCount > 6 || footprintType === 'DIP';
  const fpType = footprintType ?? (useDIP ? 'Custom' : 'Custom');

  if (useDIP) {
    // DIP layout: pins on two rows with a 3-hole gap
    const half = Math.ceil(pinCount / 2);
    // Top row: pins 1..half (left to right)
    for (let i = 0; i < half; i++) {
      pins.push({
        number: sorted[i],
        position: { row: 0, col: i },
      });
    }
    // Bottom row: remaining pins (right to left, mirroring DIP convention)
    for (let i = 0; i < pinCount - half; i++) {
      pins.push({
        number: sorted[half + i],
        position: { row: 3, col: half - 1 - i },
      });
    }

    return {
      id: buildGenericDefId(fpType, sorted),
      name: `Generic ${pinCount}-Pin`,
      category: 'IC',
      footprint: {
        type: fpType,
        dimensions: { rows: 2, cols: half, pitch: 2.54 },
      },
      pins,
      metadata: {
        description: `Auto-generated generic ${pinCount}-pin DIP-style component`,
      },
    };
  }

  // SIP / inline layout
  for (let i = 0; i < pinCount; i++) {
    pins.push({
      number: sorted[i],
      position: { row: 0, col: i },
    });
  }

  return {
    id: buildGenericDefId(fpType, sorted),
    name: `Generic ${pinCount}-Pin`,
    category: 'Passive',
    footprint: {
      type: fpType,
      dimensions: { rows: 1, cols: pinCount, pitch: 2.54 },
    },
    pins,
    metadata: {
      description: `Auto-generated generic ${pinCount}-pin component`,
    },
  };
}

/**
 * Create a definition from explicit parameters (used by the Edit Component dialog).
 */
export function createDefinitionFromConfig(config: {
  footprintType: 'DIP' | 'SIP' | 'Axial' | 'Radial' | 'Custom';
  pinCount: number;
  pinNumbers?: string[];
}): ComponentDefinition {
  const pinNumbers =
    config.pinNumbers ??
    Array.from({ length: config.pinCount }, (_, i) => String(i + 1));
  return createGenericDefinition(pinNumbers, config.footprintType);
}

/**
 * Pin placement as specified by the visual pin editor.
 */
export interface PinPlacement {
  row: number;
  col: number;
  number: string;
  name: string;
}

/**
 * Create a ComponentDefinition from explicit pin placements.
 * Used by the visual pin editor in the Edit Component dialog.
 */
export function createDefinitionFromPlacements(
  footprintType: 'DIP' | 'SIP' | 'Axial' | 'Radial' | 'Custom',
  placements: PinPlacement[]
): ComponentDefinition {
  if (placements.length === 0) {
    // Fallback: 2-pin SIP
    return createGenericDefinition(['1', '2'], footprintType);
  }

  // Normalise positions so the top-left pin is at (0,0)
  const minRow = Math.min(...placements.map((p) => p.row));
  const minCol = Math.min(...placements.map((p) => p.col));

  const pins: PinDefinition[] = placements.map((p) => ({
    number: p.number,
    name: p.name || undefined,
    position: { row: p.row - minRow, col: p.col - minCol },
  }));

  const maxRow = Math.max(...pins.map((p) => p.position.row));
  const maxCol = Math.max(...pins.map((p) => p.position.col));

  // Build a stable ID from the layout
  const layoutKey = pins
    .map((p) => `${p.number}@${p.position.row}.${p.position.col}`)
    .sort()
    .join('_');
  const id = `custom-${footprintType.toLowerCase()}-${layoutKey}`;

  const category =
    footprintType === 'DIP' || (maxRow >= 3 && pins.length > 4)
      ? 'IC'
      : 'Passive';

  return {
    id,
    name: `Custom ${pins.length}-Pin`,
    category,
    footprint: {
      type: footprintType,
      dimensions: {
        rows: maxRow + 1,
        cols: maxCol + 1,
        pitch: 2.54,
      },
    },
    pins,
    metadata: {
      description: `User-configured ${pins.length}-pin ${footprintType} component`,
    },
  };
}
