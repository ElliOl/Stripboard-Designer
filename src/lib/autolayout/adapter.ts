// ─── Board → Vero Designer circuit ──────────────────────────
//
// Turns the current board (components with KiCad pin numbers, plus
// nets) into the schematic Vero Designer's autorouter works on:
// typed parts and wires between "REF:pin" endpoints. Parts that
// cannot sit on a stripboard (panel pots, jacks, switches, headers,
// modules) become labelled edge pads instead, one per net.

import type { Component, ComponentDefinition, Net } from '@/lib/types';
import type { VeroEngineWire } from './vero-engine.generated';

/** Raw Vero part record; the engine normalises it before use */
export type VeroPartRecord = Record<string, unknown> & { id: string; type: string };

export type AutoLayoutCircuit = {
  components: VeroPartRecord[];
  wires: VeroEngineWire[];
};

export type OffboardPart = {
  reference: string;
  value: string;
  reason: string;
  /** Used pins, with the net each one joins */
  pins: { number: string; netName: string }[];
};

export type AdaptedCircuit = {
  circuit: AutoLayoutCircuit;
  /** Vero endpoint ("R1:2", "TERM1:1") -> app net id, for every endpoint */
  nodeNets: Record<string, string>;
  /** Vero part id -> the app definition to prefer when the footprint fits */
  definitionHints: Record<string, string>;
  /** Vero part id -> the board component it came from */
  sources: Record<string, Component>;
  offboard: OffboardPart[];
  /** Edge pad label -> the off-board pins that wire to it */
  padNotes: { label: string; connections: string[] }[];
  warnings: string[];
};

// Vero's logical pin names per part type (the Unicode minus matches Vero's own)
const POLARIZED_PINS: Record<string, string> = { '1': '+', '2': '−' };
const DIODE_PINS: Record<string, string> = { '1': 'K', '2': 'A' };

/** Generic IC package sizes Vero can place (GENERIC_IC_PIN_COUNTS) */
const GENERIC_IC_PIN_COUNTS = [4, 6, 8, 14, 16, 18, 20];

type Mapped = {
  record: Record<string, unknown> & { type: string };
  /** App pin number -> Vero logical pin name */
  pinName: (number: string) => string | undefined;
};

type Classification = { mapped: Mapped } | { offboard: string };

const identityPins = (numbers: string[]) => (n: string) => (numbers.includes(n) ? n : undefined);

function transistorMapping(def: ComponentDefinition, component: Component): Mapped {
  const id = def.id;
  const kind = /pnp/.test(id) ? 'pnp' : id === 'jfet' ? 'jfet' : id.startsWith('mosfet') ? 'mosfetn' : 'npn';
  const gate = kind !== 'npn' && kind !== 'pnp';
  // Logical C/B/E (or D/S/G) per KiCad pin number, from the definition's pin names
  const byNumber: Record<string, string> = {};
  for (const pin of def.pins) {
    const name = (pin.name ?? '').toUpperCase();
    if (/^[CBEDSG]$/.test(name)) byNumber[pin.number] = name;
  }
  const fallback = gate ? ['S', 'G', 'D'] : ['E', 'B', 'C'];
  const order = ['1', '2', '3'].map((n, i) => byNumber[n] ?? fallback[i]);
  const valid = gate ? ['D', 'S', 'G'] : ['C', 'B', 'E'];
  const usable = valid.every((l) => order.includes(l)) && new Set(order).size === 3;
  const pinout = usable ? order : fallback;
  return {
    record: {
      type: 'transistor',
      value: component.value ?? '',
      transistorKind: kind,
      transistorPinout: pinout,
      transistorPinoutCustom: true,
    },
    pinName: (n) => pinout[Number(n) - 1],
  };
}

function classify(component: Component, def: ComponentDefinition | undefined): Classification {
  if (!def) return { offboard: 'Unknown footprint' };
  const id = def.id;
  const value = component.value ?? '';
  const numbers = def.pins.map((p) => p.number);

  if (id.startsWith('mcu-')) return { offboard: 'Module - wire it to the edge pads' };

  if (/nettie/i.test(value) || /^NT\d/i.test(component.reference)) {
    if (numbers.length === 2) {
      return { mapped: { record: { type: 'jumper', value }, pinName: identityPins(numbers) } };
    }
    return { offboard: 'Net tie' };
  }

  if (id.startsWith('resistor')) {
    return { mapped: { record: { type: 'resistor', value }, pinName: identityPins(['1', '2']) } };
  }
  if (id.startsWith('capacitor')) {
    return { mapped: { record: { type: 'capacitor', value }, pinName: identityPins(['1', '2']) } };
  }
  if (id.startsWith('electrolytic')) {
    return {
      mapped: { record: { type: 'capacitorPolarized', value }, pinName: (n) => POLARIZED_PINS[n] },
    };
  }
  if (id.startsWith('zener-diode') || id.startsWith('diode')) {
    return {
      mapped: {
        record: { type: 'diode', value, diodeKind: id.startsWith('zener') ? 'zener' : 'standard' },
        pinName: (n) => DIODE_PINS[n],
      },
    };
  }
  if (id === 'led') {
    return {
      mapped: {
        record: { type: 'led', value, ledScope: 'onboard', ledColor: 'red' },
        pinName: (n) => DIODE_PINS[n],
      },
    };
  }
  if (id === 'transistor' || id === 'transistor-npn' || id === 'transistor-pnp' || id === 'jfet' || id === 'mosfet-to92') {
    return { mapped: transistorMapping(def, component) };
  }
  if (id === 'trimpot' || id === 'trimpot-top') {
    return {
      mapped: {
        record: { type: 'potentiometer', value, potType: 'trimmer', potResistance: value || '10k' },
        pinName: identityPins(['1', '2', '3']),
      },
    };
  }
  if (def.footprint.type === 'DIP' && def.category === 'IC' && GENERIC_IC_PIN_COUNTS.includes(def.pins.length)) {
    return {
      mapped: {
        record: {
          type: 'otherIC',
          value,
          otherIcModel: 'GENERIC',
          genericIcPinCount: def.pins.length,
          genericIcLabel: value || component.reference,
        },
        pinName: identityPins(numbers),
      },
    };
  }

  if (id === 'potentiometer' || id === 'encoder') return { offboard: 'Panel control - wire it to the edge pads' };
  if (id.startsWith('switch') || id.startsWith('button')) return { offboard: 'Switch - wire it to the edge pads' };
  if (id.startsWith('header') || id.startsWith('connector')) return { offboard: 'Connector - wire it to the edge pads' };
  if (id.startsWith('regulator') || id.startsWith('mosfet-to220')) {
    return { offboard: 'TO-220 part has no stripboard footprint - wire it to the edge pads' };
  }
  if (/^(J|P|CN|TP|JP)\d/i.test(component.reference)) return { offboard: 'Connector - wire it to the edge pads' };
  if (id === 'inductor') return { offboard: 'Inductors are not supported by the autorouter' };
  return { offboard: 'No stripboard footprint for this part' };
}

/**
 * Build the Vero circuit for a board.
 * `definitions` is the app's component library (including custom definitions).
 */
export function adaptBoardToVero(
  components: Component[],
  nets: Net[],
  definitions: ComponentDefinition[]
): AdaptedCircuit {
  const defById = new Map(definitions.map((d) => [d.id, d]));
  const netById = new Map(nets.map((n) => [n.id, n]));
  const nodeNets: Record<string, string> = {};
  const definitionHints: Record<string, string> = {};
  const sources: Record<string, Component> = {};
  const warnings: string[] = [];
  const offboard: OffboardPart[] = [];
  const parts: VeroPartRecord[] = [];

  // Vero ids must be unique; board references normally are
  const usedIds = new Set<string>();
  const uniqueId = (reference: string) => {
    let id = reference || 'X';
    for (let n = 2; usedIds.has(id); n++) id = `${reference}_${n}`;
    usedIds.add(id);
    return id;
  };

  // Net id -> on-board endpoints and off-board pin labels
  const onboardByNet = new Map<string, string[]>();
  const offboardByNet = new Map<string, string[]>();
  const positions = new Map<string, { x: number; y: number }[]>();

  const ordered = [...components].sort((a, b) => a.position.row - b.position.row || a.position.col - b.position.col);
  for (const component of ordered) {
    const def = defById.get(component.definitionId);
    const result = classify(component, def);
    const usedPins = component.pins.filter((p) => p.netId && netById.has(p.netId));

    if ('offboard' in result) {
      if (!usedPins.length) continue; // Not wired to anything
      offboard.push({
        reference: component.reference,
        value: component.value ?? '',
        reason: result.offboard,
        pins: usedPins.map((p) => ({ number: p.number, netName: netById.get(p.netId!)!.name })),
      });
      for (const pin of usedPins) {
        const list = offboardByNet.get(pin.netId!) ?? [];
        list.push(`${component.reference}.${pin.number}${component.value ? ` (${component.value})` : ''}`);
        offboardByNet.set(pin.netId!, list);
      }
      continue;
    }

    const id = uniqueId(component.reference);
    const x = Math.min(4800, 200 + component.position.col * 30);
    const y = Math.min(4800, 200 + component.position.row * 30);
    parts.push({
      ...result.mapped.record,
      id,
      x,
      y,
      rotation: 0,
      mirrored: false,
      instanceUid: `CMP-${id}`,
    });
    sources[id] = component;
    definitionHints[id] = component.definitionId;

    for (const pin of component.pins) {
      const logical = result.mapped.pinName(pin.number);
      if (logical === undefined) {
        if (pin.netId) warnings.push(`${component.reference} pin ${pin.number} has no equivalent on the Vero footprint and was left unconnected.`);
        continue;
      }
      if (!pin.netId || !netById.has(pin.netId)) continue;
      const key = `${id}:${logical}`;
      nodeNets[key] = pin.netId;
      const list = onboardByNet.get(pin.netId) ?? [];
      list.push(key);
      onboardByNet.set(pin.netId, list);
      const where = positions.get(pin.netId) ?? [];
      where.push({ x, y });
      positions.set(pin.netId, where);
    }
  }

  // One edge pad per net that reaches an off-board part
  const wires: VeroEngineWire[] = [];
  const padNotes: AdaptedCircuit['padNotes'] = [];
  const usedLabels = new Set<string>();
  const label = (name: string) => {
    const base = name.trim() || 'NET';
    let candidate = base;
    // Vero joins pads whose labels match ignoring case, so labels must differ
    for (let n = 2; usedLabels.has(candidate.toUpperCase().replace(/\s+/g, ' ')); n++) candidate = `${base} ${n}`;
    usedLabels.add(candidate.toUpperCase().replace(/\s+/g, ' '));
    return candidate;
  };
  // Net labels used by on-board endpoints' nets must not collide with pad labels of other nets
  let pad = 0;
  let wireNo = 0;
  const addWire = (a: string, b: string) => wires.push({ id: `W${++wireNo}`, a, b });

  for (const net of nets) {
    const endpoints = [...(onboardByNet.get(net.id) ?? [])];
    const offPins = offboardByNet.get(net.id);
    if (offPins?.length && endpoints.length) {
      const id = uniqueId(`TERM${++pad}`);
      const near = positions.get(net.id) ?? [{ x: 2500, y: 2500 }];
      const x = near.reduce((s, p) => s + p.x, 0) / near.length;
      const y = near.reduce((s, p) => s + p.y, 0) / near.length;
      const text = label(net.name);
      parts.push({
        id,
        type: 'terminal',
        value: text,
        x,
        y,
        rotation: 0,
        mirrored: false,
        instanceUid: `CMP-${id}`,
        netScope: 'offboard',
        quickNet: false,
        quickNetRole: '',
      });
      nodeNets[`${id}:1`] = net.id;
      endpoints.unshift(`${id}:1`);
      padNotes.push({ label: text, connections: offPins });
    }
    // Chain the net's endpoints
    for (let i = 1; i < endpoints.length; i++) addWire(endpoints[i - 1], endpoints[i]);
  }

  return {
    circuit: { components: parts, wires },
    nodeNets,
    definitionHints,
    sources,
    offboard,
    padNotes,
    warnings,
  };
}
