// Types for the generated Vero Designer engine (vero-engine.generated.js).
// Only the parts the app uses are described; the engine's own data is loosely typed.

export type VeroEngineComponent = {
  id: string;
  type: string;
  value?: string;
  x: number;
  y: number;
  rotation?: number;
  [key: string]: unknown;
};

export type VeroEngineWire = { id: string; a: string; b: string };

export type VeroEngineBoardSettings = {
  maxColumns: number;
  maxRows: number;
  busSpacing: number;
  spareRows: number;
  avoidLinksOverComponents: boolean;
  allowDoubleLinks: boolean;
  autoDescribe: boolean;
  standingResistors: boolean;
  [key: string]: unknown;
};

export type VeroEngineState = {
  components: VeroEngineComponent[];
  wires: VeroEngineWire[];
  boardSettings: VeroEngineBoardSettings;
  projectMeta: Record<string, unknown>;
  schematicSettings: Record<string, unknown>;
  veroLayout: unknown;
  veroManualEdited: boolean;
};

export type VeroEngineEnv = {
  state: VeroEngineState;
  els: { generationProgressText: { textContent: string } | { set textContent(value: string) } };
  yieldToBrowser: (force?: boolean) => Promise<void>;
};

/** A routed layout as built by the engine, or `{ error }` when routing failed */
export type VeroEngineLayout = {
  error?: string;
  columns: number;
  rows: number;
  manualShortCount?: number;
  manualDisconnectedNets?: unknown[];
  [key: string]: unknown;
};

export type VeroEngine = {
  buildCompactXYLayout: () => Promise<VeroEngineLayout>;
  detachGeneratedLayoutFromSchematic: (layout: VeroEngineLayout) => VeroEngineLayout;
  attachStableNetIdentities: (layout: VeroEngineLayout) => VeroEngineLayout;
  refreshManualLayoutConnectivity: (layout: VeroEngineLayout) => void;
  serializeVeroLayoutForProject: (layout: VeroEngineLayout) => unknown;
  normalizeComponentRecord: (component: Record<string, unknown>) => VeroEngineComponent;
  canonicalGenericIcPinCount: (value: number) => number;
  SCHEMATIC_WIDTH: number;
  GENERIC_IC_PIN_COUNTS: readonly number[];
};

export function createVeroEngine(env: VeroEngineEnv): VeroEngine;
