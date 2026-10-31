import type { Component, Net, NetGroup, PCB, ProjectData, Strip, Wire } from './types';

const MAX_DIM = 1000;

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isPos = (v: unknown): boolean => isRec(v) && isNum(v.row) && isNum(v.col);

/** Keep only entries that pass `ok`. Returns null if `v` is present but not an array. */
function pick<T>(v: unknown, ok: (e: unknown) => boolean, counter: { dropped: number }): T[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return null;
  const out = v.filter((e) => {
    const good = ok(e);
    if (!good) counter.dropped++;
    return good;
  });
  return out as T[];
}

const validPin = (p: unknown): boolean =>
  isRec(p) && isStr(p.number) && isPos(p.position) && (p.extended === undefined || isNum(p.extended));

const validComponent = (c: unknown): boolean =>
  isRec(c) &&
  isStr(c.id) &&
  isStr(c.definitionId) &&
  isStr(c.reference) &&
  isPos(c.position) &&
  isNum(c.rotation) &&
  Array.isArray(c.pins) &&
  c.pins.every(validPin);

const validStrip = (s: unknown): boolean =>
  isRec(s) &&
  isStr(s.id) &&
  isNum(s.row) &&
  isNum(s.startCol) &&
  isNum(s.endCol) &&
  (s.breaks === undefined || (Array.isArray(s.breaks) && s.breaks.every(isNum))) &&
  (s.cuts === undefined ||
    (Array.isArray(s.cuts) &&
      s.cuts.every((c) => isRec(c) && isNum(c.col) && (c.type === 'drill' || c.type === 'slice'))));

const validWire = (w: unknown): boolean =>
  isRec(w) && isStr(w.id) && isStr(w.netId) && Array.isArray(w.points) && w.points.every(isPos);

const validNet = (n: unknown): boolean => isRec(n) && isStr(n.id) && isStr(n.name);

const validPcb = (p: unknown): boolean =>
  isRec(p) && isStr(p.id) && isNum(p.rows) && isNum(p.cols) && isPos(p.position);

const validNetGroup = (g: unknown): boolean =>
  isRec(g) && isStr(g.id) && isStr(g.name) && Array.isArray(g.netIds);

const validImage = (i: unknown): boolean =>
  isRec(i) && isStr(i.id) && isStr(i.src) && isNum(i.x) && isNum(i.y);

const validDefinition = (d: unknown): boolean =>
  isRec(d) &&
  isStr(d.id) &&
  isStr(d.name) &&
  isRec(d.footprint) &&
  isRec(d.footprint.dimensions) &&
  Array.isArray(d.pins) &&
  d.pins.every((p) => isRec(p) && isStr(p.number) && isPos(p.position));

export type SanitizeResult = { project: ProjectData; dropped: number };

/**
 * Check an untrusted project (autosave or opened file) and return a copy that is
 * safe to import. Malformed parts, wires, strips and so on are dropped and counted.
 * Returns null if the data is not a usable project at all.
 */
export function sanitizeProject(data: unknown): SanitizeResult | null {
  if (!isRec(data)) return null;
  const counter = { dropped: 0 };

  let board: { rows: number; cols: number } | undefined;
  if (data.board !== undefined) {
    const b = data.board;
    if (!isRec(b) || !isNum(b.rows) || !isNum(b.cols)) return null;
    if (b.rows < 1 || b.cols < 1 || b.rows > MAX_DIM || b.cols > MAX_DIM) return null;
    board = { rows: Math.floor(b.rows), cols: Math.floor(b.cols) };
  }

  const components = pick<Component>(data.components, validComponent, counter);
  const strips = pick<Strip>(data.strips, validStrip, counter);
  const wires = pick<Wire>(data.wires, validWire, counter);
  const nets = pick<Net>(data.nets, validNet, counter);
  const pcbs = pick<PCB>(data.pcbs, validPcb, counter);
  const netGroups = pick<NetGroup>(data.netGroups, validNetGroup, counter);
  const referenceImages = pick<NonNullable<ProjectData['referenceImages']>[number]>(
    data.referenceImages,
    validImage,
    counter,
  );
  const customDefinitions = pick<NonNullable<ProjectData['customDefinitions']>[number]>(
    data.customDefinitions,
    validDefinition,
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
    strips: strips.map((s) => ({ ...s, breaks: s.breaks ?? [] })),
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
  return { project, dropped: counter.dropped };
}
