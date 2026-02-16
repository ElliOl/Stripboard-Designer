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
  imported?: boolean; // Whether this net came from a netlist import
};

export type NetGroup = {
  id: string;
  name: string;
  netIds: string[];
};

export type PinDefinition = {
  number: string;
  name?: string;
  netId?: string;
  position: GridPosition; // Relative to component origin
};

export type ComponentCategory = 'IC' | 'Passive' | 'Connector' | 'Discrete' | 'Custom';

export type FootprintTypeName =
  | 'DIP'
  | 'SIP'
  | 'Axial'
  | 'Radial'
  | 'Custom'
  | 'TO92'
  | 'TO220'
  | 'TrimPot'
  | 'TrimPotTop'
  | 'TactSwitch';

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
  type: FootprintTypeName;
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
  ledColor?: string; // User-customizable LED color (hex)
  color?: string; // User-customizable primary body color (hex)
};

export type ComponentPin = {
  number: string;
  netId?: string;
  position: GridPosition; // Absolute board position
  extended: number; // Extra holes for leg extension
};

export type CutType = 'drill' | 'slice';

export type Cut = {
  col: number; // Integer for drill cuts, half-integer (x.5) for slice cuts
  type: CutType;
};

export type Strip = {
  id: string;
  row: number;
  startCol: number;
  endCol: number;
  netId?: string;
  breaks: number[]; // Column positions where strip is broken (legacy - for backward compatibility)
  cuts?: Cut[]; // New cuts with type information
  pcbId?: string; // Which PCB this strip belongs to (undefined = main PCB for backward compatibility)
};

export type PCB = {
  id: string;
  name: string;
  rows: number;
  cols: number;
  position: GridPosition; // Position on the main board grid
  isMain: boolean; // Main PCB cannot be deleted
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
  /** Nets that have only one connection (potential issue) */
  incompleteNets?: Array<{ netName: string; netCode: string; nodeCount: number }>;
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
  | 'drillCut'
  | 'sliceCut'
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
  pcbs?: PCB[]; // Multiple PCBs (optional for backward compatibility)
  components: Component[];
  strips: Strip[];
  wires: Wire[];
  nets: Net[];
  stripColor?: string; // Optional for backward compatibility
  customDefinitions?: ComponentDefinition[]; // Custom component definitions (generic/custom)
};

export type NetHighlightMode = 'full' | 'connections';
export type RatsnestColorMode = 'colored' | 'white';

export type ReferenceImageState = {
  id: string; // unique identifier for each image
  src: string; // data URL of the imported image
  x: number; // canvas x position (Konva pixels)
  y: number; // canvas y position (Konva pixels)
  naturalWidth: number; // original image width
  naturalHeight: number; // original image height
  scale: number; // proportional scale factor (1 = original size)
  opacity: number; // transparency (0 = fully transparent, 1 = fully opaque)
  inverted: boolean; // invert colours (for dark-background use)
  onTop: boolean; // if true, render above all PCB layers
  visible: boolean;
};

export type StripboardState = {
  // Board configuration
  rows: number;
  cols: number;
  pcbs: PCB[]; // Multiple PCBs (main + additional)

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

  // Net management
  netGroups: NetGroup[];
  selectedNetIds: string[]; // Multi-selected net IDs in the inspector
  netSearchFilter: string; // Filter text for the net search box

  // Component filter
  componentSearchFilter: string; // Filter text for the component search box

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
  
  // Component appearance
  componentOpacity: number; // Opacity for all components (0 = transparent, 1 = opaque)

  // View state
  zoom: number;
  pan: Point;

  // Performance mode
  performanceMode: 'auto' | 'quality' | 'performance';

  // Settings
  realtimeRatsnest: boolean; // If true, ratsnest updates synchronously (slower but instant feedback)

  // Netlist import report (null when no import has been done)
  importReport: ImportReport | null;

  // Reference image (null when none imported)
  referenceImage: ReferenceImageState | null;
  referenceImages: ReferenceImageState[];
};
