export type Point = {
  x: number;
  y: number;
};

export type GridPosition = {
  row: number;
  col: number;
};

export type Net = {
  id: string;
  name: string;
  color: string;
  visible?: boolean; // Whether ratsnest for this net is visible (default true)
};

export type PinDefinition = {
  number: string;
  name?: string;
  netId?: string;
  position: GridPosition; // Relative to component origin
};

export type ComponentCategory = 'IC' | 'Passive' | 'Connector' | 'Discrete' | 'Custom';

export type ComponentDefinition = {
  id: string;
  name: string;
  category: ComponentCategory;
  footprint: FootprintType;
  pins: PinDefinition[];
  metadata?: {
    description?: string;
    datasheet?: string;
    manufacturer?: string;
  };
};

export type FootprintType = {
  type: 'DIP' | 'SIP' | 'Axial' | 'Radial' | 'Custom';
  dimensions: {
    rows: number;
    cols: number;
    pitch?: number;
  };
  outline?: Point[];
};

export type Component = {
  id: string;
  reference: string; // R1, U1, C1, etc.
  value?: string; // Component value (e.g. "10k", "56pF", "NE555")
  definitionId: string; // Reference to ComponentDefinition
  position: GridPosition;
  rotation: 0 | 90 | 180 | 270;
  pins: ComponentPin[];
};

export type ComponentPin = {
  number: string;
  netId?: string;
  position: GridPosition; // Absolute board position
  extended: number; // Extra holes for leg extension
};

export type Strip = {
  id: string;
  row: number;
  startCol: number;
  endCol: number;
  netId?: string;
  breaks: number[]; // Column positions where strip is broken
};

export type Wire = {
  id: string;
  netId: string;
  points: GridPosition[]; // Waypoints
  color?: string;
};

export type Break = {
  id: string;
  stripId: string;
  col: number;
};

export type RatsNestConnection = {
  from: GridPosition;
  to: GridPosition;
  netId: string;
};

// ─── Netlist Import Report ────────────────────────────────

export type SkippedComponent = {
  ref: string;
  value: string;
  footprint: string;
  reason: string;
};

export type ImportReport = {
  importedComponents: number;
  importedNets: number;
  skippedComponents: SkippedComponent[];
  /** Power / virtual symbols recognised as nets but not placed */
  virtualComponents: { ref: string; value: string }[];
};

export type LayerVisibility = {
  components: boolean;
  wires: boolean;
  strips: boolean;
  ratsNest: boolean;
  board: boolean;
  nets: boolean; // Highlight strips in net colors
  cuts: boolean; // Highlight cut indicators
  refDesignations: boolean; // Component refs & pin numbers
  values: boolean; // Component values
  errors: boolean; // Show validation errors (shorts, conflicts)
};

export type ToolType =
  | 'select'
  | 'pan'
  | 'placeComponent'
  | 'routeWire'
  | 'cutStrip'
  | 'linkStrip'
  | 'extendLeg';

export type HistoryEntry = {
  components: Component[];
  strips: Strip[];
  wires: Wire[];
  nets: Net[];
};

export type ProjectData = {
  version: string;
  board: {
    rows: number;
    cols: number;
  };
  components: Component[];
  strips: Strip[];
  wires: Wire[];
  nets: Net[];
  stripColor?: string; // Optional for backward compatibility
};

export type NetHighlightMode = 'full' | 'connections';
export type RatsnestColorMode = 'colored' | 'white';

export type StripboardState = {
  // Board configuration
  rows: number;
  cols: number;

  // Elements
  components: Component[];
  strips: Strip[];
  wires: Wire[];
  nets: Net[];

  // UI state
  activeTool: ToolType;
  selectedItems: string[]; // IDs of selected items
  hoveredItem: string | null;
  highlightedNetId: string | null; // Net selected for highlighting

  // Component library
  componentDefinitions: ComponentDefinition[];

  // Ratsnest
  showRatsNest: boolean;
  ratsNest: RatsNestConnection[];

  // Layer visibility
  layerVisibility: LayerVisibility;

  // Strip appearance
  stripColor: string; // Color of copper strips
  netHighlightMode: NetHighlightMode; // How nets are highlighted on strips
  ratsnestColorMode: RatsnestColorMode; // Color mode for ratsnest lines

  // View state
  zoom: number;
  pan: Point;

  // Performance mode
  performanceMode: 'auto' | 'quality' | 'performance';

  // Settings
  realtimeRatsnest: boolean; // If true, ratsnest updates synchronously (slower but instant feedback)

  // Netlist import report (null when no import has been done)
  importReport: ImportReport | null;
};
