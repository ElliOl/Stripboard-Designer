// ─── Board → Vero Designer circuit ──────────────────────────
//
// Turns the current board (components with KiCad pin numbers, plus
// nets) into the schematic Vero Designer's autorouter works on:
// typed parts and wires between "REF:pin" endpoints. Parts that
// cannot sit on a stripboard (panel pots, jacks, switches, connectors)
// become labelled edge pads instead, one per net. Pin headers and the
// Arduino Nano are placed as fixed multi-pin packages.

import type { Component, ComponentDefinition, Net } from '@/lib/types';
import type { VeroEngineWire } from './vero-engine.generated';
import { footprintFor, headerBasePins, isArduinoNano, nanoBasePins, parseHeaderFootprint } from './fixed-parts';

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
  /** App definition to prefer when converting the placed part back */
  hint?: string;
  /** Shown to the user as a warning about this part */
  warning?: string;
};

type Classification = { mapped: Mapped } | { offboard: string };

/** Net id per pin number of a component */
type NetOf = (pin: string) => string | undefined;

// Board-mount trimmers (multi-turn and single-turn) versus panel-mount pots,
// judged by the KiCad footprint name
const TRIMMER_FOOTPRINT = /trim|(?:^|[_:-])T93|3(?:296|362|386|266|006|009|214|299)|Piher[_-]?PT|Vishay_(?:T7|T9|248|249)/i;
const PANEL_POT_FOOTPRINT = /RD901F|RV16|RK09|RK097|RK163|RV09|PTV09|PTA\d|PTL\d|Alpha|Alps|Panel|Slide/i;
const JACK_FOOTPRINT = /jack|PJ398|PJ301|audio|TRS|6\.35|3\.5mm/i;
const SWITCH_FOOTPRINT = /switch|toggle|tact|push_?button/i;

function trimmerPotType(footprint: string): string {
  if (/3296/i.test(footprint)) return 'trimmer-3296';
  if (/3362/i.test(footprint)) return 'trimmer-3362p';
  return 'trimmer';
}

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

function fixedPart(
  component: Component,
  footprint: string,
  kind: 'header' | 'module',
  base: { name: string; x: number; y: number }[],
  rotations: number[],
  netOf: NetOf,
  hint: string | undefined,
  failure: string
): Classification {
  const names = new Set(base.map((p) => p.name));
  const stray = component.pins.find((p) => !names.has(p.number));
  if (stray) return { offboard: `Pin ${stray.number} is not on the ${footprint} footprint - wire it to the edge pads` };
  const custom = footprintFor(kind, base, rotations, netOf);
  if (!custom) return { offboard: failure };
  return {
    mapped: {
      record: {
        type: 'otherIC',
        value: component.value ?? '',
        otherIcModel: 'GENERIC',
        genericIcPinCount: 4,
        genericIcLabel: component.value || component.reference,
        customFootprint: custom,
      },
      pinName: (n) => (names.has(n) ? n : undefined),
      hint,
    },
  };
}

/** Ids this file recognises by prefix; anything else is classified from its footprint name */
const KNOWN_ID = /^(?:mcu-|potentiometer|trimpot|encoder|resistor|capacitor|electrolytic|zener-diode|diode|led|transistor|jfet|mosfet|header|connector|switch|button|regulator|inductor)/;

/**
 * The library id a definition id was derived from. Auto layout, pin drags and the
 * edit dialog all make new ids by adding a `vero-` prefix or a `-custom-...` suffix
 * (the same convention getComponentSubtype relies on).
 */
export function baseDefinitionId(id: string): string {
  return id.replace(/^vero-/, '').replace(/-custom-.*$/, '');
}

/** Part kind from a KiCad footprint name, as a library-style id, or '' */
function idFromFootprint(footprint: string): string {
  if (/(?:^|[:_])CP_|Capacitor_THT:CP|elec/i.test(footprint)) return 'electrolytic';
  if (/(?:^|[:_])C_|Capacitor/i.test(footprint)) return 'capacitor';
  if (/(?:^|[:_])R_|Resistor/i.test(footprint)) return 'resistor';
  if (/LED/i.test(footprint)) return 'led';
  if (/(?:^|[:_])D_|Diode/i.test(footprint)) return 'diode';
  if (/TO-?92/i.test(footprint)) return 'transistor';
  return '';
}

/** Edge pads made by an earlier Auto layout */
export const isEdgePad = (component: Component) => /^vero-pad-/.test(component.definitionId);

function classify(component: Component, def: ComponentDefinition | undefined, netOf: NetOf): Classification {
  let footprint = component.footprint ?? '';
  const base = baseDefinitionId(def?.id ?? component.definitionId);
  // A derived id that does not start with a known kind is classified from the footprint name
  const id = KNOWN_ID.test(base) ? base : idFromFootprint(footprint) || base;
  // A header made by an earlier Auto layout has no KiCad footprint name: it is a single column of pins
  if (!footprint && id.startsWith('header') && def && def.pins.length > 1 && def.pins.every((p) => p.position.col === def.pins[0].position.col)) {
    footprint = `PinHeader_1x${def.pins.length}_P2.54mm_Vertical`;
  }
  if (!footprint && id.startsWith('mcu-module') && def?.pins.length === 30) footprint = 'Arduino_Nano';
  const value = component.value ?? '';
  const numbers = (def?.pins ?? component.pins).map((p) => p.number);

  // Net ties join two nets with a link
  if (/nettie/i.test(footprint) || /nettie/i.test(value) || /^NT\d/i.test(component.reference)) {
    if (numbers.length === 2) {
      return { mapped: { record: { type: 'jumper', value }, pinName: (n) => ({ [numbers[0]]: '1', [numbers[1]]: '2' })[n] } };
    }
    return { offboard: 'Net tie with other than two pins - wire it to the edge pads' };
  }

  // Pin headers and sockets, including the Euro power header
  const parsedHeader = parseHeaderFootprint(footprint);
  if (parsedHeader) {
    // Some KiCad footprints have fewer pins than the schematic symbol; follow the netlist
    const highest = Math.max(0, ...component.pins.map((p) => Number(p.number)).filter(Number.isInteger));
    const cols = Math.max(parsedHeader.cols, Math.ceil(highest / parsedHeader.rows));
    const header = { ...parsedHeader, cols };
    const label = `${header.rows}x${header.cols} header`;
    const hint = header.rows === 1 && header.cols === 2 ? 'header-1x2' : header.rows === 1 && header.cols === 4 ? 'header-1x4' : undefined;
    const placed = fixedPart(
      component,
      footprint,
      'header',
      headerBasePins(header),
      [0, 1, 2, 3],
      netOf,
      hint,
      header.rows === 2
        ? `${label}: pins side by side on a strip are always joined and neighbouring pins are on different nets - wire it to the edge pads`
        : `${label} has no usable orientation - wire it to the edge pads`
    );
    if (cols > parsedHeader.cols && 'mapped' in placed) {
      placed.mapped.warning = `${component.reference}: footprint ${footprint} has ${parsedHeader.rows * parsedHeader.cols} pins but the netlist uses pin ${highest}, so it is placed as a ${label}.`;
    }
    return placed;
  }

  // Arduino Nano: fixed, pins down the strips, either way round
  if (isArduinoNano(footprint) || id === 'mcu-arduino-nano') {
    return fixedPart(component, footprint, 'module', nanoBasePins(), [0, 2], netOf, 'mcu-arduino-nano', 'Arduino Nano has no usable orientation - wire it to the edge pads');
  }
  if (id.startsWith('mcu-')) return { offboard: 'Module with no stripboard footprint yet - wire it to the edge pads' };

  if (!def) return { offboard: 'No component definition for this part - wire it to the edge pads' };

  // Potentiometers: board trimmers are placed, panel pots go off-board
  if (id === 'potentiometer' || id.startsWith('trimpot') || id === 'encoder') {
    if (id === 'encoder' || /encoder|rotary/i.test(footprint)) return { offboard: 'Panel encoder - wire it to the edge pads' };
    const trimmer = id.startsWith('trimpot') || (TRIMMER_FOOTPRINT.test(footprint) && !PANEL_POT_FOOTPRINT.test(footprint));
    if (trimmer) {
      const potType = trimmerPotType(footprint);
      return {
        mapped: {
          record: { type: 'potentiometer', value, potType, potResistance: value || '10k' },
          pinName: identityPins(['1', '2', '3']),
          hint: potType === 'trimmer-3296' || id === 'trimpot' ? 'trimpot' : 'trimpot-top',
        },
      };
    }
    if (PANEL_POT_FOOTPRINT.test(footprint)) return { offboard: 'Panel pot - wire it to the edge pads' };
    return {
      offboard: footprint
        ? `Unrecognised potentiometer footprint ${footprint}, treated as a panel pot - wire it to the edge pads`
        : 'Potentiometer with no footprint name, treated as a panel pot - wire it to the edge pads',
    };
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
  if (id === 'led' || id.startsWith('led-')) {
    return {
      mapped: {
        record: { type: 'led', value, ledScope: 'onboard', ledColor: 'red' },
        pinName: (n) => DIODE_PINS[n],
      },
    };
  }
  if (id.startsWith('transistor') || id === 'jfet' || id === 'mosfet-to92') {
    return { mapped: transistorMapping(def, component) };
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

  // Parts that stay off the board, with the reason
  if (JACK_FOOTPRINT.test(footprint)) return { offboard: 'Panel jack - wire it to the edge pads' };
  if (id.startsWith('switch') || id.startsWith('button') || SWITCH_FOOTPRINT.test(footprint)) {
    return { offboard: 'Switch - wire it to the edge pads' };
  }
  if (id.startsWith('regulator') || id.startsWith('mosfet-to220')) {
    return { offboard: 'TO-220 part has no stripboard footprint - wire it to the edge pads' };
  }
  if (id.startsWith('header') || id.startsWith('connector') || /^(J|P|CN|TP|JP)\d/i.test(component.reference)) {
    return { offboard: 'Connector with no stripboard footprint - wire it to the edge pads' };
  }
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
    // Edge pads are Auto layout's own output from an earlier run: keep each as a pad for its net
    if (isEdgePad(component)) {
      for (const pin of component.pins) {
        if (!pin.netId || !netById.has(pin.netId)) continue;
        const list = offboardByNet.get(pin.netId) ?? [];
        list.push(`${component.reference} (edge pad from the previous layout)`);
        offboardByNet.set(pin.netId, list);
      }
      continue;
    }
    const def = defById.get(component.definitionId);
    const pinNet = new Map(component.pins.filter((p) => p.netId && netById.has(p.netId)).map((p) => [p.number, p.netId!]));
    const result = classify(component, def, (pin) => pinNet.get(pin));
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
    definitionHints[id] = result.mapped.hint ?? component.definitionId;
    if (result.mapped.warning) warnings.push(result.mapped.warning);

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
