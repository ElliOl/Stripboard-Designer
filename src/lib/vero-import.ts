// ─── Vero Designer Project Import ───────────────────────────
//
// Converts a project saved by Vero Designer (the single-file
// schematic → stripboard autorouter, format "Vero Designer")
// into this app's ProjectData. Only the generated stripboard
// layout is imported: placements, links, track cuts and edge
// connections. Schematic nets are rebuilt from the saved wires
// so every pin gets a net and the ratsnest/validation work.
//
// Vero coordinates: x = hole column, y = copper row (strips run
// along x), which matches this app's col/row directly.

import type {
  Component,
  ComponentDefinition,
  ComponentPin,
  FootprintTypeName,
  ImportReport,
  Net,
  PinDefinition,
  ProjectData,
  Strip,
  Wire,
} from '@/lib/types';
import { getRotatedPinPositions } from '@/lib/rotation';
import { NET_COLORS } from '@/lib/net-colors';

// ─── Vero file shape (only the fields we read) ──────────────

type VeroComponent = {
  id: string;
  type: string;
  value?: string;
  transistorKind?: string;
  potType?: string;
  boardPinSources?: Record<string, string[]>;
  /** Set by Auto layout on fixed-footprint parts such as pin headers and modules */
  customFootprint?: { kind?: 'header' | 'module' };
};

type VeroFootprintPin = { logical: string; physical?: string; x: number; y: number };

type VeroPlacement = {
  componentId: string;
  component: VeroComponent;
  x: number;
  y: number;
  footprint: { key: string; orientation: string; width: number; height: number; pins: VeroFootprintPin[] };
};

type VeroLayout = {
  boardType?: string;
  columns: number;
  rows: number;
  placements: VeroPlacement[];
  routes: { netName?: string; points: { x: number; y: number }[] }[];
  cuts: { x: number; y: number }[];
  terminals: {
    componentId: string;
    pinName?: string;
    netName?: string;
    label?: string;
    side: 'left' | 'right';
    row: number;
  }[];
  autoDescriptionLines?: string[];
};

export type VeroProject = {
  format: 'Vero Designer';
  components: VeroComponent[];
  wires: { a: string; b: string }[];
  projectMeta?: { name?: string; autoDescriptionLines?: string[] };
  veroLayout?: VeroLayout | null;
};

export type VeroImportResult = {
  project: ProjectData;
  /** Off-board wiring instructions written by Vero Designer */
  notes: string[];
};

export function isVeroProject(data: unknown): data is VeroProject {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { format?: unknown }).format === 'Vero Designer'
  );
}

// ─── Nets ───────────────────────────────────────────────────

/** Matches Vero Designer's label normalisation, so "gnd" and "GND" join */
function normalizeLabel(value: string | undefined): string {
  return String(value ?? '').trim().toUpperCase();
}

/**
 * Rebuild schematic nets: union-find over wire endpoints ("R1:2"),
 * with same-labelled net terminals joined, as Vero Designer does.
 */
function buildNets(vero: VeroProject) {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    if (!parent.has(k)) parent.set(k, k);
    const p = parent.get(k)!;
    if (p === k) return k;
    const root = find(p);
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const wire of vero.wires ?? []) union(wire.a, wire.b);

  const terminals = (vero.components ?? []).filter((c) => c.type === 'terminal');
  const byLabel = new Map<string, string>();
  for (const t of terminals) {
    const key = `${t.id}:1`;
    find(key);
    const label = normalizeLabel(t.value);
    if (!label) continue;
    if (byLabel.has(label)) union(byLabel.get(label)!, key);
    else byLabel.set(label, key);
  }

  // Group endpoints by root, naming each group after its labels
  const groups = new Map<string, { nodes: string[]; labels: Set<string> }>();
  for (const key of parent.keys()) {
    const root = find(key);
    if (!groups.has(root)) groups.set(root, { nodes: [], labels: new Set() });
    groups.get(root)!.nodes.push(key);
  }
  for (const t of terminals) {
    const label = String(t.value ?? '').trim();
    if (label) groups.get(find(`${t.id}:1`))?.labels.add(label);
  }

  const nets: Net[] = [];
  const netIdByNode = new Map<string, string>();
  let unnamed = 0;
  const ordered = [...groups.values()]
    .filter((g) => g.nodes.length > 1 || g.labels.size > 0)
    .sort((a, b) => b.labels.size - a.labels.size);
  ordered.forEach((group, i) => {
    const name = group.labels.size
      ? [...group.labels].join(' / ')
      : `N${String(++unnamed).padStart(3, '0')}`;
    const id = `vero-net-${i + 1}`;
    nets.push({ id, name, color: NET_COLORS[i % NET_COLORS.length], imported: true });
    for (const node of group.nodes) netIdByNode.set(node, id);
  });

  return { nets, netIdByNode };
}

// ─── Pin numbering ──────────────────────────────────────────

/**
 * Map a Vero logical pin name to this app's pin number.
 * Numbering follows KiCad, as netlist imports do: diode/LED cathode
 * is pin 1, electrolytic + is pin 1.
 */
function pinNumberFor(
  type: string,
  pin: VeroFootprintPin,
  index: number,
  footprint: VeroPlacement['footprint']
): string {
  switch (type) {
    case 'opamp':
    case 'otherIC':
      return pin.logical.replace(/^P/, '');
    case 'capacitorPolarized':
      return pin.logical === '+' ? '1' : '2';
    case 'diode':
    case 'led':
      return pin.logical === 'K' ? '1' : '2';
    case 'transistor':
    case 'voltageRegulator': {
      // Pins are listed top-to-bottom. Physical lead order is read from
      // the flat face, so a flat face pointing right reverses it.
      const n = footprint.pins.length;
      return String(footprint.orientation.includes('flat-right') ? n - index : index + 1);
    }
    default:
      return pin.logical;
  }
}

// ─── Definitions ────────────────────────────────────────────

/** Library definitions to try (in order) for each Vero part type */
function libraryCandidates(c: VeroComponent): string[] {
  switch (c.type) {
    case 'resistor':
      return ['resistor', 'resistor-small', 'resistor-upright'];
    case 'capacitor':
      return ['capacitor-rect'];
    case 'capacitorPolarized':
      return ['electrolytic-small', 'electrolytic-large'];
    case 'diode':
      return ['diode', 'diode-upright', 'diode-large'];
    case 'led':
      return ['led'];
    case 'transistor':
      if (/jfet/i.test(c.transistorKind ?? '')) return ['jfet'];
      if (/mos/i.test(c.transistorKind ?? '')) return ['mosfet-to92'];
      return /pnp/i.test(c.transistorKind ?? '') ? ['transistor-pnp'] : ['transistor-npn'];
    case 'potentiometer':
      return ['trimpot-top', 'trimpot'];
    case 'opamp':
    case 'otherIC':
      return ['dip-8', 'dip-14', 'dip-16'];
    default:
      return [];
  }
}

/** Base id + footprint type for definitions built from a Vero footprint */
function customStyle(c: VeroComponent): { base: string; footprint: FootprintTypeName } {
  const type = c.type;
  if (type === 'otherIC' && c.customFootprint?.kind === 'header') return { base: 'header', footprint: 'SIP' };
  // 'mcu-' in the id gives a module body
  if (type === 'otherIC' && c.customFootprint?.kind === 'module') return { base: 'mcu-module', footprint: 'DIP' };
  switch (type) {
    case 'resistor':
      return { base: 'resistor', footprint: 'Axial' };
    case 'capacitor':
      return { base: 'capacitor-rect', footprint: 'Axial' };
    case 'capacitorPolarized':
      return { base: 'electrolytic', footprint: 'Radial' };
    case 'diode':
      return { base: 'diode', footprint: 'Axial' };
    case 'led':
      return { base: 'led', footprint: 'Radial' };
    case 'transistor':
    case 'voltageRegulator':
      return { base: 'transistor-to92', footprint: 'TO92' };
    case 'potentiometer':
      return { base: 'trimpot-top', footprint: 'TrimPotTop' };
    case 'opamp':
    case 'otherIC':
      return { base: 'dip', footprint: 'DIP' };
    default:
      return { base: 'part', footprint: 'Custom' };
  }
}

type TargetPin = { number: string; name: string; row: number; col: number };

/** Find a library definition + rotation whose pins land exactly on the targets */
function matchLibrary(
  candidates: ComponentDefinition[],
  targets: TargetPin[]
): { def: ComponentDefinition; rotation: Component['rotation']; row: number; col: number } | null {
  for (const def of candidates) {
    if (def.pins.length !== targets.length) continue;
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotated = getRotatedPinPositions(def.pins, rotation);
      let origin: { row: number; col: number } | null = null;
      const ok = def.pins.every((p, i) => {
        const t = targets.find((x) => x.number === p.number);
        if (!t) return false;
        const o = { row: t.row - rotated[i].row, col: t.col - rotated[i].col };
        if (!origin) origin = o;
        return origin.row === o.row && origin.col === o.col;
      });
      if (ok && origin) {
        const o = origin as { row: number; col: number };
        return { def, rotation, row: o.row, col: o.col };
      }
    }
  }
  return null;
}

function customDefinition(c: VeroComponent, targets: TargetPin[]): ComponentDefinition {
  const { base, footprint } = customStyle(c);
  const minRow = Math.min(...targets.map((t) => t.row));
  const minCol = Math.min(...targets.map((t) => t.col));
  const pins: PinDefinition[] = targets.map((t) => ({
    number: t.number,
    name: t.name !== t.number ? t.name : undefined,
    position: { row: t.row - minRow, col: t.col - minCol },
  }));
  const key = pins
    .map((p) => `${p.number}@${p.position.row}.${p.position.col}`)
    .sort()
    .join('_');
  return {
    id: `vero-${base}-${key}`,
    name: `${base} (Vero layout)`,
    category:
      base === 'header' ? 'Connector' : footprint === 'DIP' ? 'IC' : footprint === 'TO92' ? 'Discrete' : 'Passive',
    footprint: {
      type: footprint,
      dimensions: {
        rows: Math.max(...pins.map((p) => p.position.row)) + 1,
        cols: Math.max(...pins.map((p) => p.position.col)) + 1,
        pitch: 2.54,
      },
    },
    pins,
    metadata: { description: 'Footprint imported from a Vero Designer layout' },
  };
}

const PAD_DEFINITION: ComponentDefinition = {
  id: 'vero-pad-1',
  name: 'Edge connection',
  category: 'Connector',
  footprint: { type: 'SIP', dimensions: { rows: 1, cols: 1, pitch: 2.54 } },
  pins: [{ number: '1', position: { row: 0, col: 0 } }],
  metadata: { description: 'Off-board wire landing pad from a Vero Designer layout' },
};

// ─── Conversion ─────────────────────────────────────────────

/** Options for converting a layout generated from this app's own board */
export type VeroConvertOptions = {
  /** Use these nets instead of rebuilding them from the Vero wires */
  nets?: Net[];
  /** Vero endpoint ("R1:2") -> net id; required with `nets` */
  nodeNets?: Record<string, string>;
  /** Vero part id -> library definition id to try before the defaults */
  definitionHints?: Record<string, string>;
};

export function convertVeroProject(
  vero: VeroProject,
  library: ComponentDefinition[],
  options: VeroConvertOptions = {}
): VeroImportResult {
  const layout = vero.veroLayout;
  if (!layout || !Array.isArray(layout.placements) || !layout.placements.length) {
    throw new Error(
      'This Vero Designer project has no generated layout.\n' +
        'Open it in Vero Designer, click Generate, then save the project again.'
    );
  }
  if (layout.boardType === 'perf') {
    throw new Error('Perfboard layouts from Vero Designer are not supported yet — only Vero (stripboard) layouts.');
  }

  const rows = layout.rows;
  const cols = layout.columns;
  const { nets, netIdByNode } =
    options.nets && options.nodeNets
      ? { nets: options.nets, netIdByNode: new Map(Object.entries(options.nodeNets)) }
      : buildNets(vero);
  const libById = new Map(library.map((d) => [d.id, d]));
  const customDefs = new Map<string, ComponentDefinition>();
  const components: Component[] = [];

  // ── Placed parts ──
  for (const placement of layout.placements) {
    const vc = placement.component;
    const fp = placement.footprint;
    const ordered = [...fp.pins].sort((a, b) => a.y - b.y || a.x - b.x);
    const targets: TargetPin[] = ordered.map((pin, i) => ({
      number: pinNumberFor(vc.type, pin, i, fp),
      name: pin.logical,
      row: placement.y + pin.y,
      col: placement.x + pin.x,
    }));
    const netFor = (t: TargetPin): string | undefined => {
      // Op-amp packages map each package pin back to its schematic section pins
      const sources = vc.boardPinSources?.[t.name];
      const node = sources?.[0] ?? `${placement.componentId}:${t.name}`;
      return netIdByNode.get(node);
    };

    const hint = options.definitionHints?.[placement.componentId];
    const candidates = [...(hint ? [hint] : []), ...libraryCandidates(vc)]
      .map((id) => libById.get(id))
      .filter((d): d is ComponentDefinition => Boolean(d));
    const match = matchLibrary(candidates, targets);
    let def: ComponentDefinition;
    let rotation: Component['rotation'] = 0;
    let position: { row: number; col: number };
    if (match) {
      def = match.def;
      rotation = match.rotation;
      position = { row: match.row, col: match.col };
    } else {
      def = customDefinition(vc, targets);
      customDefs.set(def.id, def);
      position = {
        row: Math.min(...targets.map((t) => t.row)),
        col: Math.min(...targets.map((t) => t.col)),
      };
    }

    const pins: ComponentPin[] = def.pins.map((pDef) => {
      const t = targets.find((x) => x.number === pDef.number)!;
      return { number: pDef.number, netId: netFor(t), position: { row: t.row, col: t.col }, extended: 0 };
    });
    components.push({
      id: `vero-${placement.componentId}`,
      reference: placement.componentId,
      value: vc.value || undefined,
      definitionId: def.id,
      position,
      rotation,
      pins,
    });
  }

  // ── Edge connections (off-board wire landings) ──
  const placedIds = new Set(layout.placements.map((p) => p.componentId));
  const offboard = new Map<string, VeroComponent>();
  layout.terminals.forEach((terminal, i) => {
    const col = terminal.side === 'right' ? cols - 1 : 0;
    const netId = netIdByNode.get(`${terminal.componentId}:${terminal.pinName ?? '1'}`);
    customDefs.set(PAD_DEFINITION.id, PAD_DEFINITION);
    components.push({
      id: `vero-pad-${i + 1}`,
      reference: terminal.label || terminal.netName || `Pad ${i + 1}`,
      definitionId: PAD_DEFINITION.id,
      position: { row: terminal.row, col },
      rotation: 0,
      pins: [{ number: '1', netId, position: { row: terminal.row, col }, extended: 0 }],
    });
    const source = vero.components.find((c) => c.id === terminal.componentId);
    if (source && source.type !== 'terminal') offboard.set(source.id, source);
  });
  // Parts with no board placement are off-board (op-amp sections are placed as their package)
  for (const c of vero.components ?? []) {
    if (c.type !== 'terminal' && c.type !== 'opamp' && !placedIds.has(c.id)) offboard.set(c.id, c);
  }

  // ── Copper: full-width strips with Vero's track cuts ──
  const cutsByRow = new Map<number, number[]>();
  for (const cut of layout.cuts ?? []) {
    const list = cutsByRow.get(cut.y) ?? [];
    list.push(cut.x);
    cutsByRow.set(cut.y, list);
  }
  const strips: Strip[] = Array.from({ length: rows }, (_, row) => {
    const cutCols = (cutsByRow.get(row) ?? []).sort((a, b) => a - b);
    return {
      id: `strip-row-${row}`,
      row,
      startCol: 0,
      endCol: cols - 1,
      // Drill cuts are mirrored into breaks, as addCut does (the ratsnest reads breaks)
      breaks: cutCols,
      cuts: cutCols.map((col) => ({ col, type: 'drill' as const })),
    };
  });

  // ── Links: take their net from the copper segment they land on ──
  const segmentKey = (row: number, col: number) => {
    const cuts = cutsByRow.get(row) ?? [];
    return `${row}:${cuts.filter((c) => c < col).length}`;
  };
  const segmentNet = new Map<string, string>();
  for (const comp of components) {
    for (const pin of comp.pins) {
      if (pin.netId) segmentNet.set(segmentKey(pin.position.row, pin.position.col), pin.netId);
    }
  }
  const netIdByName = new Map(nets.map((n) => [normalizeLabel(n.name), n.id]));
  const routes = layout.routes.filter((r) => r.points.length >= 2);
  // Links can chain (bus links), so propagate until nothing new resolves
  for (let changed = true; changed; ) {
    changed = false;
    for (const route of routes) {
      const ends = [route.points[0], route.points[route.points.length - 1]].map((p) => segmentKey(p.y, p.x));
      const known = ends.map((k) => segmentNet.get(k)).find(Boolean);
      if (!known) continue;
      for (const k of ends) {
        if (!segmentNet.has(k)) {
          segmentNet.set(k, known);
          changed = true;
        }
      }
    }
  }
  const wires: Wire[] = routes.map((route, i) => {
    const start = route.points[0];
    const netId =
      segmentNet.get(segmentKey(start.y, start.x)) ??
      netIdByName.get(normalizeLabel(route.netName)) ??
      '';
    return {
      id: `vero-link-${i + 1}`,
      netId,
      points: route.points.map((p) => ({ row: p.y, col: p.x })),
    };
  });

  const importReport: ImportReport = {
    importedComponents: layout.placements.length,
    importedNets: nets.length,
    skippedComponents: [...offboard.values()].map((c) => ({
      ref: c.id,
      value: c.value ?? '',
      footprint: c.type,
      reason: 'Off-board part — wire it to the labelled edge pads',
    })),
    virtualComponents: [],
  };

  return {
    project: {
      version: '1.0',
      board: { rows, cols },
      components,
      strips,
      wires,
      nets,
      customDefinitions: [...customDefs.values()],
      importReport,
    },
    notes: layout.autoDescriptionLines ?? vero.projectMeta?.autoDescriptionLines ?? [],
  };
}
