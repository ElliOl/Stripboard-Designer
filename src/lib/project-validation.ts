import type {
  Component,
  ComponentDefinition,
  ComponentPin,
  Cut,
  GridPosition,
  Net,
  NetGroup,
  PCB,
  ProjectData,
  Strip,
  Wire,
} from './types';

const MAX_DIM = 1000;

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

type Counter = { dropped: number; fixed: number };

/** Turns an untrusted entry into a safe one, or null to drop it. */
type Norm<T> = (e: unknown, c: Counter) => T | null;

/** Normalise entries, dropping those that return null. Returns null if `v` is present but not an array. */
function pick<T>(v: unknown, norm: Norm<T>, counter: Counter): T[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const e of v) {
    const n = norm(e, counter);
    if (n === null) counter.dropped++;
    else out.push(n);
  }
  return out;
}

/** Keep an optional string field; drop it (and count a repair) if it is the wrong type. */
function optStr(o: Rec, key: string, c: Counter): string | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (isStr(v)) return v;
  c.fixed++;
  return undefined;
}

function optBool(o: Rec, key: string, c: Counter): boolean | undefined {
  const v = o[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  c.fixed++;
  return undefined;
}

const normPos = (v: unknown): GridPosition | null =>
  isRec(v) && isNum(v.row) && isNum(v.col) ? { row: v.row, col: v.col } : null;

const normPin: Norm<ComponentPin> = (p, c) => {
  if (!isRec(p) || !(isStr(p.number) || isNum(p.number))) return null;
  const position = normPos(p.position);
  if (!position) return null;
  const extended = isNum(p.extended) ? p.extended : 0;
  if (!isStr(p.number) || !isNum(p.extended) || (p.netId !== undefined && !isStr(p.netId))) c.fixed++;
  const pin: ComponentPin = { ...(p as Rec), number: String(p.number), position, extended } as ComponentPin;
  if (!isStr(p.netId)) delete pin.netId;
  return pin;
};

const ROTATIONS = [0, 90, 180, 270];

const normComponent: Norm<Component> = (x, c) => {
  if (!isRec(x) || !isStr(x.id) || !isStr(x.definitionId) || !isStr(x.reference)) return null;
  const position = normPos(x.position);
  if (!position || !isNum(x.rotation) || !ROTATIONS.includes(((x.rotation % 360) + 360) % 360)) return null;
  if (!Array.isArray(x.pins)) return null;
  const pins = x.pins.map((p) => normPin(p, c));
  if (pins.some((p) => p === null)) return null;
  const rotation = (((x.rotation % 360) + 360) % 360) as Component['rotation'];
  if (rotation !== x.rotation) c.fixed++;
  const out = { ...x, position, rotation, pins } as unknown as Component;
  for (const k of ['value', 'footprint', 'ledColor', 'color'] as const) {
    const v = optStr(x, k, c);
    if (v === undefined) delete out[k];
  }
  return out;
};

const normStrip: Norm<Strip> = (s, c) => {
  if (!isRec(s) || !isStr(s.id) || !isNum(s.row) || !isNum(s.startCol) || !isNum(s.endCol)) return null;
  const out = { ...s } as unknown as Strip;
  const breaks = Array.isArray(s.breaks) ? s.breaks.filter(isNum) : [];
  if (s.breaks !== undefined && (!Array.isArray(s.breaks) || breaks.length !== s.breaks.length)) c.fixed++;
  out.breaks = breaks;
  if (s.cuts !== undefined) {
    const cuts = Array.isArray(s.cuts)
      ? s.cuts.filter((k) => isRec(k) && isNum(k.col) && (k.type === 'drill' || k.type === 'slice'))
      : [];
    if (!Array.isArray(s.cuts) || cuts.length !== s.cuts.length) c.fixed++;
    out.cuts = cuts.map((k) => ({ col: (k as Rec).col as number, type: (k as Rec).type as Cut['type'] }));
  }
  if (optStr(s, 'netId', c) === undefined) delete out.netId;
  if (optStr(s, 'pcbId', c) === undefined) delete out.pcbId;
  return out;
};

const normWire: Norm<Wire> = (w, c) => {
  if (!isRec(w) || !isStr(w.id) || !isStr(w.netId) || !Array.isArray(w.points)) return null;
  const points = w.points.map(normPos);
  if (points.some((p) => p === null)) return null;
  const out = { ...w, points } as unknown as Wire;
  if (optStr(w, 'color', c) === undefined) delete out.color;
  return out;
};

const normNet: Norm<Net> = (n, c) => {
  if (!isRec(n) || !isStr(n.id) || !isStr(n.name)) return null;
  const out = { ...n } as unknown as Net;
  if (!isStr(n.color)) {
    out.color = '#888888';
    c.fixed++;
  }
  if (optBool(n, 'visible', c) === undefined) delete out.visible;
  if (optBool(n, 'imported', c) === undefined) delete out.imported;
  return out;
};

const normPcb: Norm<PCB> = (p, c) => {
  if (!isRec(p) || !isStr(p.id) || !isNum(p.rows) || !isNum(p.cols)) return null;
  const position = normPos(p.position);
  if (!position) return null;
  if (!isStr(p.name) || typeof p.isMain !== 'boolean') c.fixed++;
  return { ...p, position, name: isStr(p.name) ? p.name : p.id, isMain: p.isMain === true } as unknown as PCB;
};

const normNetGroup: Norm<NetGroup> = (g, c) => {
  if (!isRec(g) || !isStr(g.id) || !isStr(g.name) || !Array.isArray(g.netIds)) return null;
  const netIds = g.netIds.filter(isStr);
  if (netIds.length !== g.netIds.length) c.fixed++;
  return { ...g, netIds } as unknown as NetGroup;
};

type RefImage = NonNullable<ProjectData['referenceImages']>[number];

const normImage: Norm<RefImage> = (i, c) => {
  if (!isRec(i) || !isStr(i.id) || !isStr(i.src) || !isNum(i.x) || !isNum(i.y)) return null;
  const num = (k: string, d: number) => {
    if (isNum(i[k])) return i[k] as number;
    c.fixed++;
    return d;
  };
  const bool = (k: string, d: boolean) => {
    if (typeof i[k] === 'boolean') return i[k] as boolean;
    c.fixed++;
    return d;
  };
  return {
    ...i,
    naturalWidth: num('naturalWidth', 100),
    naturalHeight: num('naturalHeight', 100),
    scale: num('scale', 1),
    opacity: num('opacity', 1),
    inverted: bool('inverted', false),
    onTop: bool('onTop', false),
    visible: bool('visible', true),
  } as unknown as RefImage;
};

const normDefinition: Norm<ComponentDefinition> = (d) => {
  if (!isRec(d) || !isStr(d.id) || !isStr(d.name)) return null;
  if (!isRec(d.footprint) || !isRec(d.footprint.dimensions)) return null;
  if (!isNum(d.footprint.dimensions.rows) || !isNum(d.footprint.dimensions.cols)) return null;
  if (!Array.isArray(d.pins)) return null;
  const pins = d.pins.map((p) =>
    isRec(p) && (isStr(p.number) || isNum(p.number)) && normPos(p.position)
      ? { ...p, number: String(p.number), position: normPos(p.position)! }
      : null,
  );
  if (pins.some((p) => p === null)) return null;
  return { ...d, pins } as unknown as ComponentDefinition;
};

/** `dropped` counts removed entries; `fixed` counts entries kept but corrected. */
export type SanitizeResult = { project: ProjectData; dropped: number; fixed: number };

/**
 * Check an untrusted project (autosave or opened file) and return a copy that is
 * safe to import. Malformed parts, wires, strips and so on are dropped and counted.
 * Returns null if the data is not a usable project at all.
 */
export function sanitizeProject(data: unknown): SanitizeResult | null {
  if (!isRec(data)) return null;
  const counter: Counter = { dropped: 0, fixed: 0 };

  let board: { rows: number; cols: number } | undefined;
  if (data.board !== undefined) {
    const b = data.board;
    if (!isRec(b) || !isNum(b.rows) || !isNum(b.cols)) return null;
    if (b.rows < 1 || b.cols < 1 || b.rows > MAX_DIM || b.cols > MAX_DIM) return null;
    board = { rows: Math.floor(b.rows), cols: Math.floor(b.cols) };
  }

  const components = pick<Component>(data.components, normComponent, counter);
  const strips = pick<Strip>(data.strips, normStrip, counter);
  const wires = pick<Wire>(data.wires, normWire, counter);
  const nets = pick<Net>(data.nets, normNet, counter);
  const pcbs = pick<PCB>(data.pcbs, normPcb, counter);
  const netGroups = pick<NetGroup>(data.netGroups, normNetGroup, counter);
  const referenceImages = pick<NonNullable<ProjectData['referenceImages']>[number]>(
    data.referenceImages,
    normImage,
    counter,
  );
  const customDefinitions = pick<NonNullable<ProjectData['customDefinitions']>[number]>(
    data.customDefinitions,
    normDefinition,
    counter,
  );
  if (!components || !strips || !wires || !nets || !pcbs || !netGroups || !referenceImages || !customDefinitions) {
    return null;
  }

  // Must look like a project: a board, or at least one of the main lists
  const looksLikeProject =
    board !== undefined || Array.isArray(data.components) || Array.isArray(data.strips);
  if (!looksLikeProject) return null;

  const project: ProjectData = {
    version: isStr(data.version) ? data.version : '1.0',
    board: board ?? { rows: 30, cols: 50 },
    pcbs: pcbs.length > 0 ? pcbs : undefined,
    components,
    strips,
    wires,
    nets,
    netGroups,
    referenceImages,
    stripColor: isStr(data.stripColor) ? data.stripColor : undefined,
    customDefinitions: customDefinitions.length > 0 ? customDefinitions : undefined,
    importReport:
      isRec(data.importReport) &&
      Array.isArray(data.importReport.skippedComponents) &&
      Array.isArray(data.importReport.virtualComponents)
        ? (data.importReport as ProjectData['importReport'])
        : undefined,
  };
  return { project, dropped: counter.dropped, fixed: counter.fixed };
}
