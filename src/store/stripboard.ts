import { create } from 'zustand';
import type {
  StripboardState,
  Component,
  Strip,
  Wire,
  Net,
  ToolType,
  Point,
  ComponentDefinition,
  ComponentPin,
  HistoryEntry,
  ProjectData,
  GridPosition,
  ImportReport,
  SkippedComponent,
  LayerVisibility,
  NetHighlightMode,
  RatsnestColorMode,
  ReferenceImageState,
  PCB,
  Cut,
  NetlistImportOptions,
} from '@/lib/types';
import { getRotatedPinPositions, unrotatePositions } from '@/lib/rotation';
import {
  type ParsedNetlist,
  mapFootprintToDefinition,
  isVirtualRef,
} from '@/lib/netlist-parser';
import { createGenericDefinition, createDefinitionFromPlacements } from '@/lib/component-utils';
import { clusterComponentsByConnectivity } from '@/lib/component-clustering';
import { NET_COLORS } from '@/lib/net-colors';

/**
 * Determine the default rotation for a component.
 * All components should be placed perpendicular to strips (90°) to avoid shorting.
 */
function getDefaultRotation(): 0 | 90 | 180 | 270 {
  // All components should be perpendicular to strips (which run horizontally)
  return 90;
}

const MAX_HISTORY = 50;

/** Initial canvas offset: clears the floating toolbar so column 0 stays visible */
const DEFAULT_PAN = { x: 100, y: 60 };

/** Generate one full-width copper strip per row (real stripboard has continuous strips) */
function generateStrips(
  rows: number,
  cols: number,
  existingBreaks?: Map<number, number[]>,
  pcbId?: string,
  existingCuts?: Map<number, Cut[]>
): Strip[] {
  const strips: Strip[] = [];
  for (let row = 0; row < rows; row++) {
    strips.push({
      id: pcbId ? `${pcbId}-strip-row-${row}` : `strip-row-${row}`,
      row,
      startCol: 0,
      endCol: cols - 1,
      breaks: existingBreaks?.get(row) ?? [],
      ...(existingCuts?.has(row) ? { cuts: existingCuts.get(row) } : {}),
      pcbId,
    });
  }
  return strips;
}

/** Collect the breaks and cuts of one PCB's strips that still fit a new width */
function collectStripCuts(strips: Strip[], pcbId: string | undefined, newCols: number) {
  const breaks = new Map<number, number[]>();
  const cuts = new Map<number, Cut[]>();
  for (const strip of strips) {
    if (strip.pcbId !== pcbId) continue;
    const validBreaks = strip.breaks.filter((b) => b < newCols);
    if (validBreaks.length > 0) breaks.set(strip.row, validBreaks);
    const validCuts = (strip.cuts ?? []).filter((c) => Math.floor(c.col) < newCols);
    if (strip.cuts) cuts.set(strip.row, validCuts);
  }
  return { breaks, cuts };
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  components: true,
  wires: true,
  strips: true,
  ratsNest: true,
  board: true,
  nets: false,
  cuts: false,
  refDesignations: true,
  values: false,
  errors: true,
};

const getSnapshot = (state: StripboardState): HistoryEntry => ({
  components: JSON.parse(JSON.stringify(state.components)),
  strips: JSON.parse(JSON.stringify(state.strips)),
  wires: JSON.parse(JSON.stringify(state.wires)),
  nets: JSON.parse(JSON.stringify(state.nets)),
  rows: state.rows,
  cols: state.cols,
  pcbs: JSON.parse(JSON.stringify(state.pcbs)),
  netGroups: JSON.parse(JSON.stringify(state.netGroups)),
  // Images are replaced, never mutated, by the store actions, so share them
  referenceImages: [...state.referenceImages],
});

interface StripboardStore extends StripboardState {
  // History
  past: HistoryEntry[];
  future: HistoryEntry[];
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Tool
  setActiveTool: (tool: ToolType) => void;

  // Components
  addComponent: (component: Component) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  rotateComponent: (id: string) => void;
  moveComponentPin: (componentId: string, pinIndex: number, newAbsPos: GridPosition) => void;
  finalizePinDrag: (componentId: string) => void;

  // Strips (strips are permanent board infrastructure – one per row)
  addCut: (row: number, col: number, type: 'drill' | 'slice') => void;
  removeCut: (row: number, col: number) => void;
  toggleCut: (row: number, col: number, type: 'drill' | 'slice') => void;
  // Legacy strip operations kept for internal use
  updateStrip: (id: string, updates: Partial<Strip>) => void;
  setStripColor: (color: string) => void;
  setNetHighlightMode: (mode: NetHighlightMode) => void;
  
  // Component appearance
  setComponentOpacity: (opacity: number) => void;

  // Wires
  addWire: (wire: Wire) => void;
  removeWire: (id: string) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;

  // Nets
  addNet: (net: Net) => void;
  createNet: (name?: string) => void;
  removeNet: (id: string) => void;
  updateNet: (id: string, updates: Partial<Net>) => void;
  updatePinNet: (
    componentId: string,
    pinNumber: string,
    netId: string | undefined
  ) => void;
  setAllNetsVisible: (visible: boolean) => void;
  setNetSearchFilter: (filter: string) => void;
  setComponentSearchFilter: (filter: string) => void;

  // Net selection (inspector multi-select)
  toggleNetSelection: (netId: string, multi?: boolean) => void;
  setSelectedNetIds: (ids: string[]) => void;
  clearNetSelection: () => void;

  // Net groups
  addNetGroup: (name: string, netIds: string[]) => void;
  removeNetGroup: (id: string) => void;
  dissolveNetGroup: (id: string) => void;
  deleteNetGroupWithNets: (id: string) => void;
  addNetsToGroup: (groupId: string, netIds: string[]) => void;
  removeNetFromGroup: (groupId: string, netId: string) => void;

  // View
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;

  // Performance
  setPerformanceMode: (mode: 'auto' | 'quality' | 'performance') => void;

  // Settings
  setRealtimeRatsnest: (enabled: boolean) => void;

  // Selection
  selectItem: (id: string, multi?: boolean) => void;
  setSelectedItems: (ids: string[]) => void;
  addToSelection: (ids: string[]) => void;
  removeFromSelection: (ids: string[]) => void;
  deselectAll: () => void;
  setHoveredItem: (id: string | null) => void;
  removeSelected: () => void;

  // Bulk movement
  moveSelectedItems: (deltaRow: number, deltaCol: number) => void;
  
  // Copy / Paste
  copySelected: () => void;
  paste: () => void;

  // Net highlighting
  setHighlightedNet: (netId: string | null) => void;

  // Ratsnest
  toggleRatsNest: () => void;
  setRatsnestColorMode: (mode: RatsnestColorMode) => void;

  // Layers
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;

  // Library
  loadComponentDefinitions: (definitions: ComponentDefinition[]) => void;
  addComponentDefinition: (definition: ComponentDefinition) => void;

  // Reference Image
  setReferenceImage: (image: ReferenceImageState | null) => void;
  updateReferenceImage: (updates: Partial<ReferenceImageState>) => void;
  clearReferenceImage: () => void;
  
  // Reference Images (multiple)
  addReferenceImage: (image: ReferenceImageState) => void;
  updateReferenceImageById: (id: string, updates: Partial<ReferenceImageState>) => void;
  removeReferenceImage: (id: string) => void;
  clearAllReferenceImages: () => void;

  // Board
  setBoardSize: (rows: number, cols: number) => void;
  
  // PCBs
  addPCB: (name: string, rows: number, cols: number) => void;
  removePCB: (id: string) => void;
  updatePCB: (id: string, updates: Partial<PCB>) => void;

  // Project
  exportProject: () => ProjectData;
  importProject: (data: ProjectData) => void;

  // Netlist
  importNetlist: (parsed: ParsedNetlist) => ImportReport;
  importNetlistWithOptions: (parsed: ParsedNetlist, options: NetlistImportOptions) => ImportReport;
  dismissImportReport: () => void;
  reorganizeByConnectivity: () => void;

  // Reset
  reset: () => void;
}

const INITIAL_ROWS = 30;
const INITIAL_COLS = 50;

// ─── Clipboard State (separate from the store) ────────────────
let clipboard: {
  components: Component[];
  wires: Wire[];
  cuts: { row: number; col: number; type: 'drill' | 'slice' }[];
  images: ReferenceImageState[];
} | null = null;

// Track consecutive paste count to prevent stacking
let pasteCount = 0;

const initialState: StripboardState = {
  rows: INITIAL_ROWS,
  cols: INITIAL_COLS,
  pcbs: [{
    id: 'main-pcb',
    name: 'Main PCB',
    rows: INITIAL_ROWS,
    cols: INITIAL_COLS,
    position: { row: 0, col: 0 },
    isMain: true,
  }],
  components: [],
  strips: generateStrips(INITIAL_ROWS, INITIAL_COLS, undefined, undefined), // Main PCB strips have no pcbId
  wires: [],
  nets: [],
  activeTool: 'select',
  selectedItems: [],
  hoveredItem: null,
  highlightedNetId: null,
  componentDefinitions: [],
  showRatsNest: true,
  ratsNest: [],
  layerVisibility: { ...DEFAULT_LAYER_VISIBILITY },
  stripColor: '#4a4a4a', // Default dark grey color
  netHighlightMode: 'full', // Default to full strip highlighting
  ratsnestColorMode: 'colored', // Default to colored ratsnest lines
  componentOpacity: 1.0, // Default to fully opaque components
  zoom: 1,
  pan: { ...DEFAULT_PAN },
  performanceMode: 'auto', // Auto-detect and adapt to device performance
  realtimeRatsnest: true, // Enable real-time ratsnest updates
  importReport: null,
  netGroups: [],
  selectedNetIds: [],
  netSearchFilter: '',
  componentSearchFilter: '',
  referenceImage: null,
  referenceImages: [],
};

export const useStripboardStore = create<StripboardStore>((set, get) => ({
  ...initialState,
  past: [],
  future: [],

  // ─── History ──────────────────────────────────────────────
  saveToHistory: () =>
    set((state) => {
      const snapshot = getSnapshot(state);
      const newPast = [...state.past, snapshot];
      if (newPast.length > MAX_HISTORY) newPast.shift();
      return { past: newPast, future: [] };
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {};
      const previous = state.past[state.past.length - 1];
      const currentSnapshot = getSnapshot(state);
      return {
        ...previous,
        past: state.past.slice(0, -1),
        future: [currentSnapshot, ...state.future],
        selectedItems: [],
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      const currentSnapshot = getSnapshot(state);
      return {
        ...next,
        past: [...state.past, currentSnapshot],
        future: state.future.slice(1),
        selectedItems: [],
      };
    }),

  // ─── Tool ─────────────────────────────────────────────────
  setActiveTool: (tool) => set({ activeTool: tool }),

  // ─── Components ───────────────────────────────────────────
  addComponent: (component) =>
    set((state) => ({ components: [...state.components, component] })),

  removeComponent: (id) =>
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      selectedItems: state.selectedItems.filter((i) => i !== id),
    })),

  updateComponent: (id, updates) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  rotateComponent: (id) => {
    const state = get();
    const component = state.components.find((c) => c.id === id);
    if (!component) return;
    const def = state.componentDefinitions.find(
      (d) => d.id === component.definitionId
    );
    if (!def) return;

    // Calculate the center of the component using actual absolute pin positions
    const absMinRow = Math.min(...component.pins.map(p => p.position.row));
    const absMaxRow = Math.max(...component.pins.map(p => p.position.row));
    const absMinCol = Math.min(...component.pins.map(p => p.position.col));
    const absMaxCol = Math.max(...component.pins.map(p => p.position.col));
    const centerRow = (absMinRow + absMaxRow) / 2;
    const centerCol = (absMinCol + absMaxCol) / 2;

    const newRotation = ((component.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    const rotatedPins = getRotatedPinPositions(def.pins, newRotation);

    // Calculate new relative center after rotation
    const newRelMinRow = Math.min(...rotatedPins.map(p => p.row));
    const newRelMaxRow = Math.max(...rotatedPins.map(p => p.row));
    const newRelMinCol = Math.min(...rotatedPins.map(p => p.col));
    const newRelMaxCol = Math.max(...rotatedPins.map(p => p.col));
    const newRelCenterRow = (newRelMinRow + newRelMaxRow) / 2;
    const newRelCenterCol = (newRelMinCol + newRelMaxCol) / 2;

    // Position that keeps the absolute center at the same grid location
    let newPosRow = Math.round(centerRow - newRelCenterRow);
    let newPosCol = Math.round(centerCol - newRelCenterCol);

    // Clamp so all pins stay on the PCB the part is on (no clamp if it is on none)
    const hostPcb = state.pcbs.find(
      (p) =>
        centerRow >= p.position.row && centerRow <= p.position.row + p.rows - 1 &&
        centerCol >= p.position.col && centerCol <= p.position.col + p.cols - 1
    );
    if (hostPcb) {
      const maxPinRow = Math.max(...rotatedPins.map((p) => p.row));
      const maxPinCol = Math.max(...rotatedPins.map((p) => p.col));
      newPosRow = Math.max(hostPcb.position.row, Math.min(hostPcb.position.row + hostPcb.rows - 1 - maxPinRow, newPosRow));
      newPosCol = Math.max(hostPcb.position.col, Math.min(hostPcb.position.col + hostPcb.cols - 1 - maxPinCol, newPosCol));
    }

    const newPins: ComponentPin[] = component.pins.map((pin, i) => ({
      ...pin,
      position: {
        row: newPosRow + rotatedPins[i].row,
        col: newPosCol + rotatedPins[i].col,
      },
    }));

    state.saveToHistory();
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id
          ? {
              ...c,
              rotation: newRotation,
              position: { row: newPosRow, col: newPosCol },
              pins: newPins,
            }
          : c
      ),
    }));
  },

  moveComponentPin: (componentId, pinIndex, newAbsPos) =>
    set((state) => ({
      components: state.components.map((c) => {
        if (c.id !== componentId) return c;
        const newPins = c.pins.map((pin, i) =>
          i === pinIndex
            ? { ...pin, position: { row: newAbsPos.row, col: newAbsPos.col } }
            : pin
        );
        return { ...c, pins: newPins };
      }),
    })),

  finalizePinDrag: (componentId) => {
    const state = get();
    const component = state.components.find((c) => c.id === componentId);
    if (!component) return;
    const def = state.componentDefinitions.find(
      (d) => d.id === component.definitionId
    );
    if (!def) return;

    // Compute current relative pin positions from actual absolute positions
    const relPins = component.pins.map((p) => ({
      row: p.position.row - component.position.row,
      col: p.position.col - component.position.col,
    }));

    // Normalize so min row/col is 0
    const minRelRow = Math.min(...relPins.map((p) => p.row));
    const minRelCol = Math.min(...relPins.map((p) => p.col));
    const normalizedPins = relPins.map((p) => ({
      row: p.row - minRelRow,
      col: p.col - minRelCol,
    }));

    // Check if positions actually differ from the definition
    const oldRotated = getRotatedPinPositions(def.pins, component.rotation);
    const oldMinRow = Math.min(...oldRotated.map((p) => p.row));
    const oldMinCol = Math.min(...oldRotated.map((p) => p.col));
    const oldNormalized = oldRotated.map((p) => ({
      row: p.row - oldMinRow,
      col: p.col - oldMinCol,
    }));
    const positionsMatch = normalizedPins.every((p, i) =>
      p.row === oldNormalized[i].row && p.col === oldNormalized[i].col
    );

    if (positionsMatch) return; // Nothing changed

    // Unrotate the normalized positions to get definition-space positions
    const unrotated = unrotatePositions(normalizedPins, component.rotation);

    // Build new definition variant preserving the base type for subtype detection
    const placements = unrotated.map((pos: GridPosition, i: number) => ({
      row: pos.row,
      col: pos.col,
      number: component.pins[i].number,
      name: def.pins[i]?.name ?? '',
    }));

    const newDef = createDefinitionFromPlacements(def.footprint.type, placements);

    // Preserve base type in ID for subtype detection
    const baseType = def.id.replace(/-custom-.*$/, '');
    const enhancedDef = {
      ...newDef,
      id: `${baseType}-custom-${newDef.id}`,
      name: def.name,
      category: def.category,
    };

    // Adjust component position by the origin shift
    const newComponentPos = {
      row: component.position.row + minRelRow,
      col: component.position.col + minRelCol,
    };

    // Add definition if not already present
    const hasDef = state.componentDefinitions.some((d) => d.id === enhancedDef.id);

    // Rebuild absolute pin positions from the new definition
    const newRotated = getRotatedPinPositions(enhancedDef.pins, component.rotation);
    const newPins: ComponentPin[] = component.pins.map((pin, i) => ({
      ...pin,
      position: {
        row: newComponentPos.row + newRotated[i].row,
        col: newComponentPos.col + newRotated[i].col,
      },
    }));

    set((s) => ({
      componentDefinitions: hasDef
        ? s.componentDefinitions
        : [...s.componentDefinitions, enhancedDef],
      components: s.components.map((c) =>
        c.id === componentId
          ? {
              ...c,
              definitionId: enhancedDef.id,
              position: newComponentPos,
              pins: newPins,
            }
          : c
      ),
    }));
  },

  // ─── Strips (permanent board infrastructure) ────────────────
  addCut: (worldRow, worldCol, type) =>
    set((state) => {
      // Find which PCB and strip this position belongs to
      for (const pcb of state.pcbs) {
        const localRow = worldRow - pcb.position.row;
        // For slice cuts, worldCol is fractional (x.5), so we need to check the integer part
        const intCol = Math.floor(worldCol);
        const localCol = worldCol - pcb.position.col; // Keep fractional part for slice cuts
        
        // Check if position is within this PCB's bounds
        if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
          // Find the strip on this PCB
          const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
          
          return {
            strips: state.strips.map((s) => {
              if (s.id === stripId) {
                // Check if the localCol is within strip bounds
                const intLocalCol = Math.floor(localCol);
                if (intLocalCol < s.startCol || intLocalCol > s.endCol) {
                  return s;
                }
                
                // Initialize cuts array if it doesn't exist
                const cuts = s.cuts || [];
                
                // Check if cut already exists at this position (using local coordinates)
                if (cuts.some(c => c.col === localCol)) {
                  return s; // Cut already exists, no change
                }
                
                // Add new cut (using local coordinates)
                const newCuts = [...cuts, { col: localCol, type }].sort((a, b) => a.col - b.col);
                
                // For backward compatibility: Update breaks array
                // - For drill cuts on integer positions: add to breaks if not there
                // - Remove from breaks if it's there (to avoid duplicates after migration)
                let breaks = s.breaks;
                if (type === 'drill' && Number.isInteger(localCol)) {
                  // Ensure the position is in breaks for backward compatibility
                  if (!breaks.includes(localCol)) {
                    breaks = [...breaks, localCol].sort((a, b) => a - b);
                  }
                } else {
                  // For slice cuts, ensure NOT in breaks array
                  breaks = breaks.filter(b => b !== localCol);
                }
                
                return { ...s, cuts: newCuts, breaks };
              }
              return s;
            }),
          };
        }
      }
      return {}; // Position not on any PCB
    }),

  removeCut: (worldRow, worldCol) =>
    set((state) => {
      // Find which PCB and strip this position belongs to
      for (const pcb of state.pcbs) {
        const localRow = worldRow - pcb.position.row;
        // For slice cuts, worldCol is fractional (x.5)
        const localCol = worldCol - pcb.position.col; // Keep fractional part for slice cuts
        const intCol = Math.floor(worldCol);
        
        // Check if position is within this PCB's bounds
        if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
          // Find the strip on this PCB
          const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
          
          return {
            strips: state.strips.map((s) => {
              if (s.id === stripId) {
                // Remove from cuts array (using local coordinates)
                const cuts = s.cuts ? s.cuts.filter((c) => c.col !== localCol) : [];
                
                // For backward compatibility, also update breaks array (only for integer positions)
                const breaks = Number.isInteger(localCol) 
                  ? s.breaks.filter((b) => b !== localCol)
                  : s.breaks;
                
                return { ...s, cuts, breaks };
              }
              return s;
            }),
          };
        }
      }
      return {}; // Position not on any PCB
    }),

  toggleCut: (worldRow, worldCol, type) => {
    const state = get();
    
    // Find which PCB and strip this position belongs to
    for (const pcb of state.pcbs) {
      const localRow = worldRow - pcb.position.row;
      // For slice cuts, worldCol is fractional (x.5)
      const localCol = worldCol - pcb.position.col; // Keep fractional part for slice cuts
      const intCol = Math.floor(worldCol);
      
      // Check if position is within this PCB's bounds
      if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
        // Find the strip on this PCB
        const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
        const strip = state.strips.find((s) => s.id === stripId);
        
        if (!strip) return;
        const intLocalCol = Math.floor(localCol);
        if (intLocalCol < strip.startCol || intLocalCol > strip.endCol) return;
        
        // Check if cut exists in cuts array (using local coordinates)
        const cuts = strip.cuts || [];
        const hasCut = cuts.some(c => c.col === localCol);
        
        if (hasCut) {
          state.removeCut(worldRow, worldCol);
        } else {
          state.addCut(worldRow, worldCol, type);
        }
        return;
      }
    }
  },

  updateStrip: (id, updates) =>
    set((state) => ({
      strips: state.strips.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  setStripColor: (color) => set({ stripColor: color }),

  setNetHighlightMode: (mode) => set({ netHighlightMode: mode }),
  
  setComponentOpacity: (opacity) => set({ componentOpacity: opacity }),

  // ─── Wires ────────────────────────────────────────────────
  addWire: (wire) =>
    set((state) => ({ wires: [...state.wires, wire] })),

  removeWire: (id) =>
    set((state) => ({
      wires: state.wires.filter((w) => w.id !== id),
      selectedItems: state.selectedItems.filter((i) => i !== id),
    })),

  updateWire: (id, updates) =>
    set((state) => ({
      wires: state.wires.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),

  // ─── Nets ─────────────────────────────────────────────────
  addNet: (net) =>
    set((state) => ({ nets: [...state.nets, net] })),

  createNet: (name) => {
    const state = get();
    const num = state.nets.length + 1;
    set((s) => ({
      nets: [
        ...s.nets,
        {
          id: `net-${Date.now()}`,
          name: name || `Net${num}`,
          color: NET_COLORS[s.nets.length % NET_COLORS.length],
          visible: true,
        },
      ],
    }));
  },

  removeNet: (id) =>
    set((state) => ({
      nets: state.nets.filter((n) => n.id !== id),
      // Clear netId from all pins referencing this net
      components: state.components.map((c) => ({
        ...c,
        pins: c.pins.map((p) =>
          p.netId === id ? { ...p, netId: undefined } : p
        ),
      })),
      // Clear netId from wires referencing this net
      wires: state.wires.map((w) =>
        w.netId === id ? { ...w, netId: '' } : w
      ),
      netGroups: state.netGroups.map((g) => ({
        ...g,
        netIds: g.netIds.filter((n) => n !== id),
      })),
      selectedNetIds: state.selectedNetIds.filter((n) => n !== id),
      highlightedNetId: state.highlightedNetId === id ? null : state.highlightedNetId,
    })),

  updateNet: (id, updates) =>
    set((state) => ({
      nets: state.nets.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),

  updatePinNet: (componentId, pinNumber, netId) =>
    set((state) => ({
      components: state.components.map((c) =>
        c.id === componentId
          ? {
              ...c,
              pins: c.pins.map((p) =>
                p.number === pinNumber ? { ...p, netId } : p
              ),
            }
          : c
      ),
    })),

  setAllNetsVisible: (visible) =>
    set((state) => ({
      nets: state.nets.map((n) => ({ ...n, visible })),
    })),

  setNetSearchFilter: (filter) => set({ netSearchFilter: filter }),
  setComponentSearchFilter: (filter) => set({ componentSearchFilter: filter }),

  // ─── Net Selection (inspector multi-select) ────────────────
  toggleNetSelection: (netId, multi) =>
    set((state) => {
      if (multi) {
        const has = state.selectedNetIds.includes(netId);
        return {
          selectedNetIds: has
            ? state.selectedNetIds.filter((id) => id !== netId)
            : [...state.selectedNetIds, netId],
        };
      }
      return {
        selectedNetIds: state.selectedNetIds.length === 1 && state.selectedNetIds[0] === netId
          ? []
          : [netId],
      };
    }),

  setSelectedNetIds: (ids) => set({ selectedNetIds: ids }),
  clearNetSelection: () => set({ selectedNetIds: [] }),

  // ─── Net Groups ──────────────────────────────────────────────
  addNetGroup: (name, netIds) =>
    set((state) => ({
      netGroups: [
        ...state.netGroups,
        { id: `netgroup-${Date.now()}`, name, netIds },
      ],
    })),

  removeNetGroup: (id) =>
    set((state) => ({
      netGroups: state.netGroups.filter((g) => g.id !== id),
    })),

  dissolveNetGroup: (id) =>
    set((state) => ({
      netGroups: state.netGroups.filter((g) => g.id !== id),
    })),

  deleteNetGroupWithNets: (id) =>
    set((state) => {
      const group = state.netGroups.find((g) => g.id === id);
      if (!group) return {};
      const netIdsToRemove = new Set(group.netIds);
      return {
        netGroups: state.netGroups.filter((g) => g.id !== id),
        nets: state.nets.filter((n) => !netIdsToRemove.has(n.id)),
        components: state.components.map((c) => ({
          ...c,
          pins: c.pins.map((p) =>
            p.netId && netIdsToRemove.has(p.netId) ? { ...p, netId: undefined } : p
          ),
        })),
        wires: state.wires.map((w) =>
          netIdsToRemove.has(w.netId) ? { ...w, netId: '' } : w
        ),
      };
    }),

  addNetsToGroup: (groupId, netIds) =>
    set((state) => ({
      netGroups: state.netGroups.map((g) =>
        g.id === groupId
          ? { ...g, netIds: [...new Set([...g.netIds, ...netIds])] }
          : g
      ),
    })),

  removeNetFromGroup: (groupId, netId) =>
    set((state) => ({
      netGroups: state.netGroups.map((g) =>
        g.id === groupId
          ? { ...g, netIds: g.netIds.filter((id) => id !== netId) }
          : g
      ),
    })),

  // ─── View ─────────────────────────────────────────────────
  setZoom: (zoom) => set({ zoom: Math.max(0.15, Math.min(5, zoom)) }),

  setPan: (pan) => set({ pan }),

  setPerformanceMode: (mode) => set({ performanceMode: mode }),

  // ─── Settings ─────────────────────────────────────────────
  setRealtimeRatsnest: (enabled: boolean) => set({ realtimeRatsnest: enabled }),

  // ─── Selection ────────────────────────────────────────────
  selectItem: (id, multi = false) =>
    set((state) => {
      // Reset paste count when selection changes (user is doing something else)
      if (!multi) pasteCount = 0;
      
      return {
        selectedItems: multi
          ? state.selectedItems.includes(id)
            ? state.selectedItems.filter((i) => i !== id)
            : [...state.selectedItems, id]
          : [id],
      };
    }),

  setSelectedItems: (ids) => {
    pasteCount = 0; // Reset paste count on new selection
    set({ selectedItems: ids });
  },

  addToSelection: (ids) =>
    set((state) => ({
      selectedItems: [...new Set([...state.selectedItems, ...ids])],
    })),

  removeFromSelection: (ids) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter((i) => !ids.includes(i)),
    })),

  deselectAll: () => {
    pasteCount = 0; // Reset paste count when deselecting
    set({ selectedItems: [], highlightedNetId: null });
  },

  setHoveredItem: (id) => set({ hoveredItem: id }),

  // ─── Net Highlighting ────────────────────────────────────
  setHighlightedNet: (netId) =>
    set((state) => ({
      highlightedNetId: state.highlightedNetId === netId ? null : netId,
    })),

  removeSelected: () => {
    const state = get();
    if (state.selectedItems.length === 0) return;
    state.saveToHistory();

    // Parse selected cuts → { row, col }[]
    // Support fractional columns for slice cuts (e.g., cut-5-7.5)
    const CUT_RE = /^cut-(\d+)-(\d+(?:\.\d+)?)$/;
    const cutsToRemove = state.selectedItems
      .map((id) => id.match(CUT_RE))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => ({ row: +m[1], col: +m[2] }));

    // Check if reference image is being deleted
    const clearRefImage = state.selectedItems.includes('ref-image');

    set((s) => {
      // Remove selected cuts from strips using PCB-aware logic
      let strips = s.strips;
      if (cutsToRemove.length > 0) {
        for (const cut of cutsToRemove) {
          // Find which PCB this cut belongs to (using world coordinates)
          for (const pcb of s.pcbs) {
            const localRow = cut.row - pcb.position.row;
            const localCol = cut.col - pcb.position.col;
            const intCol = Math.floor(cut.col);
            
            // Check if position is within this PCB's bounds
            if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
              const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
              
              strips = strips.map((strip) => {
                if (strip.id === stripId) {
                  // Remove from both cuts and breaks arrays (using local coordinates)
                  const newCuts = (strip.cuts || []).filter(c => c.col !== localCol);
                  const newBreaks = (strip.breaks || []).filter(b => b !== localCol);
                  return { ...strip, cuts: newCuts, breaks: newBreaks };
                }
                return strip;
              });
              break; // Found the PCB, move to next cut
            }
          }
        }
      }
      
      return {
        components: s.components.filter((c) => !s.selectedItems.includes(c.id)),
        wires: s.wires.filter((w) => !s.selectedItems.includes(w.id)),
        strips,
        // Clear reference image if it was selected for deletion
        referenceImage: clearRefImage ? null : s.referenceImage,
        referenceImages: s.referenceImages.filter((img) => !s.selectedItems.includes(img.id)),
        selectedItems: [],
      };
    });
  },

  // ─── Bulk Movement ──────────────────────────────────────────
  moveSelectedItems: (reqRow, reqCol) =>
    set((state) => {
      // Reset paste count when items are moved
      pasteCount = 0;

      const CUT_RE = /^cut-(\d+)-(\d+(?:\.\d+)?)$/;
      const sel = new Set(state.selectedItems);
      const pcbAt = (row: number, col: number) =>
        state.pcbs.find(
          (p) =>
            row >= p.position.row && row < p.position.row + p.rows &&
            Math.floor(col) >= p.position.col && Math.floor(col) < p.position.col + p.cols
        );

      // Clamp the delta so every selected point stays on the PCB it is on now
      let loR = -Infinity, hiR = Infinity, loC = -Infinity, hiC = Infinity;
      const limit = (row: number, col: number) => {
        const pcb = pcbAt(row, col);
        if (!pcb) return;
        const frac = col % 1 !== 0 ? 0.5 : 0;
        loR = Math.max(loR, pcb.position.row - row);
        hiR = Math.min(hiR, pcb.position.row + pcb.rows - 1 - row);
        loC = Math.max(loC, pcb.position.col - col);
        hiC = Math.min(hiC, pcb.position.col + pcb.cols - 1 + frac - col);
      };
      for (const c of state.components) {
        if (sel.has(c.id)) for (const p of c.pins) limit(p.position.row, p.position.col);
      }
      for (const w of state.wires) {
        if (sel.has(w.id)) for (const p of w.points) limit(p.row, p.col);
      }
      for (const id of state.selectedItems) {
        const m = id.match(CUT_RE);
        if (m) limit(+m[1], +m[2]);
      }
      if (loR > hiR || loC > hiC) return {};
      const deltaRow = Math.min(Math.max(reqRow, loR), hiR);
      const deltaCol = Math.min(Math.max(reqCol, loC), hiC);
      if (deltaRow === 0 && deltaCol === 0) return {};

      // Selected cuts that exist on the board
      type CutMove = { oldRow: number; oldCol: number; type: 'drill' | 'slice' };
      const stripFor = (row: number, col: number) => {
        const pcb = pcbAt(row, col);
        if (!pcb) return null;
        const localRow = row - pcb.position.row;
        const id = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
        return { id, localCol: col - pcb.position.col };
      };
      const cutMoves: CutMove[] = [];
      const staleIds = new Set<string>();
      for (const id of state.selectedItems) {
        const m = id.match(CUT_RE);
        if (!m) continue;
        const oldRow = +m[1];
        const oldCol = +m[2];
        const at = stripFor(oldRow, oldCol);
        const cut = at && state.strips.find((s) => s.id === at.id)?.cuts?.find((c) => c.col === at.localCol);
        if (cut) cutMoves.push({ oldRow, oldCol, type: cut.type });
        else staleIds.add(id);
      }

      let newStrips = state.strips;
      if (cutMoves.length > 0) {
        // Remove all old cuts first, then add at the new positions
        for (const mv of cutMoves) {
          const at = stripFor(mv.oldRow, mv.oldCol)!;
          newStrips = newStrips.map((s) =>
            s.id === at.id
              ? {
                  ...s,
                  cuts: (s.cuts || []).filter((c) => c.col !== at.localCol),
                  breaks: (s.breaks || []).filter((b) => b !== at.localCol),
                }
              : s
          );
        }
        for (const mv of cutMoves) {
          const newRow = mv.oldRow + deltaRow;
          const newCol = mv.oldCol + deltaCol;
          const at = stripFor(newRow, newCol);
          if (!at) continue;
          newStrips = newStrips.map((s) => {
            if (s.id !== at.id) return s;
            const intLocal = Math.floor(at.localCol);
            const inBounds = mv.type === 'drill'
              ? intLocal >= s.startCol && intLocal <= s.endCol
              : intLocal >= s.startCol - 0.5 && intLocal <= s.endCol + 0.5;
            const cuts = s.cuts || [];
            if (!inBounds || cuts.some((c) => c.col === at.localCol)) return s;
            let breaks = s.breaks || [];
            // Drill cuts are mirrored into the legacy breaks list, like addCut
            if (mv.type === 'drill' && Number.isInteger(at.localCol) && !breaks.includes(at.localCol)) {
              breaks = [...breaks, at.localCol].sort((a, b) => a - b);
            }
            return {
              ...s,
              cuts: [...cuts, { col: at.localCol, type: mv.type }].sort((a, b) => a.col - b.col),
              breaks,
            };
          });
        }
      }

      // Selection follows the cuts to their new positions; stale ids are dropped
      const newSelectedItems = state.selectedItems
        .filter((id) => !staleIds.has(id))
        .map((id) => {
          const m = id.match(CUT_RE);
          return m ? `cut-${+m[1] + deltaRow}-${+m[2] + deltaCol}` : id;
        });

      return {
        components: state.components.map((c) =>
          sel.has(c.id)
            ? {
                ...c,
                position: { row: c.position.row + deltaRow, col: c.position.col + deltaCol },
                pins: c.pins.map((pin) => ({
                  ...pin,
                  position: { row: pin.position.row + deltaRow, col: pin.position.col + deltaCol },
                })),
              }
            : c
        ),
        wires: state.wires.map((w) =>
          sel.has(w.id)
            ? { ...w, points: w.points.map((p) => ({ row: p.row + deltaRow, col: p.col + deltaCol })) }
            : w
        ),
        strips: newStrips,
        selectedItems: newSelectedItems,
      };
    }),

  // ─── Ratsnest ────────────────────────────────────────────
  toggleRatsNest: () =>
    set((state) => ({
      showRatsNest: !state.showRatsNest,
      layerVisibility: {
        ...state.layerVisibility,
        ratsNest: !state.showRatsNest,
      },
    })),

  setRatsnestColorMode: (mode) =>
    set({
      ratsnestColorMode: mode,
    }),

  // ─── Layers ──────────────────────────────────────────────
  toggleLayer: (layer) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: !state.layerVisibility[layer],
      },
      // Sync showRatsNest when ratsNest layer toggled
      ...(layer === 'ratsNest'
        ? { showRatsNest: !state.layerVisibility.ratsNest }
        : {}),
    })),

  setLayerVisibility: (layer, visible) =>
    set((state) => ({
      layerVisibility: {
        ...state.layerVisibility,
        [layer]: visible,
      },
      ...(layer === 'ratsNest' ? { showRatsNest: visible } : {}),
    })),

  // ─── Reference Image (legacy single image support) ─────────
  setReferenceImage: (image) => set({ referenceImage: image }),

  updateReferenceImage: (updates) =>
    set((state) => ({
      referenceImage: state.referenceImage
        ? { ...state.referenceImage, ...updates }
        : null,
    })),

  clearReferenceImage: () => set({ referenceImage: null }),

  // ─── Reference Images (multiple images support) ────────────
  addReferenceImage: (image) =>
    set((state) => ({
      referenceImages: [...state.referenceImages, image],
    })),

  updateReferenceImageById: (id, updates) =>
    set((state) => ({
      referenceImages: state.referenceImages.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    })),

  removeReferenceImage: (id) =>
    set((state) => ({
      referenceImages: state.referenceImages.filter((img) => img.id !== id),
      selectedItems: state.selectedItems.filter((itemId) => itemId !== id),
    })),

  clearAllReferenceImages: () =>
    set((state) => ({
      referenceImages: [],
      selectedItems: state.selectedItems.filter(
        (itemId) => !state.referenceImages.some((img) => img.id === itemId)
      ),
    })),

  // ─── Library ──────────────────────────────────────────────
  loadComponentDefinitions: (definitions) =>
    set((state) => {
      // Merge: the library replaces its own entries; every other existing
      // definition (generic, pin-drag variants, imported footprints) is kept
      const libraryIds = new Set(definitions.map((d) => d.id));
      const kept = state.componentDefinitions.filter((d) => !libraryIds.has(d.id));

      return { componentDefinitions: [...definitions, ...kept] };
    }),

  addComponentDefinition: (definition) =>
    set((state) => {
      // Don't add if ID already exists
      if (state.componentDefinitions.some((d) => d.id === definition.id))
        return {};
      return {
        componentDefinitions: [...state.componentDefinitions, definition],
      };
    }),

  // ─── Board ────────────────────────────────────────────────
  setBoardSize: (rows, cols) => {
    const state = get();
    state.saveToHistory();
    // Preserve existing breaks and cuts when resizing (only for main PCB)
    const { breaks: existingBreaks, cuts: existingCuts } = collectStripCuts(state.strips, undefined, cols);
    
    // Update main PCB
    const mainPcb = state.pcbs.find(p => p.isMain);
    const newMainPcb = mainPcb ? { ...mainPcb, rows, cols } : undefined;
    
    set({
      rows,
      cols,
      pcbs: state.pcbs.map(p => p.isMain && newMainPcb ? newMainPcb : p),
      strips: [
        ...generateStrips(rows, cols, existingBreaks, undefined, existingCuts), // Main PCB strips
        ...state.strips.filter(s => s.pcbId) // Keep other PCB strips
      ],
    });
  },

  // ─── PCBs ─────────────────────────────────────────────────
  addPCB: (name, rows, cols) => {
    const state = get();
    state.saveToHistory();
    const pcbId = `pcb-${Date.now()}`;
    
    // Calculate position: place next to the rightmost PCB with padding
    const PADDING_COLS = 5; // 5 columns of space between PCBs
    let maxCol = state.cols; // Start after main PCB
    
    // Find the rightmost edge of existing PCBs
    for (const pcb of state.pcbs) {
      const pcbRightEdge = pcb.position.col + pcb.cols;
      if (pcbRightEdge > maxCol) {
        maxCol = pcbRightEdge;
      }
    }
    
    const newPcb: PCB = {
      id: pcbId,
      name,
      rows,
      cols,
      position: { row: 0, col: maxCol + PADDING_COLS },
      isMain: false,
    };
    
    set({
      pcbs: [...state.pcbs, newPcb],
      strips: [...state.strips, ...generateStrips(rows, cols, undefined, pcbId)],
    });
  },
  
  removePCB: (id) => {
    const state = get();
    const pcb = state.pcbs.find(p => p.id === id);
    
    // Cannot delete main PCB
    if (!pcb || pcb.isMain) return;
    
    state.saveToHistory();
    set({
      pcbs: state.pcbs.filter(p => p.id !== id),
      strips: state.strips.filter(s => s.pcbId !== id),
    });
  },
  
  updatePCB: (id, updates) => {
    const state = get();
    const pcb = state.pcbs.find(p => p.id === id);
    if (!pcb) return;
    
    // If resizing a PCB, update its strips
    if (updates.rows !== undefined || updates.cols !== undefined) {
      const newRows = updates.rows ?? pcb.rows;
      const newCols = updates.cols ?? pcb.cols;
      
      // Preserve existing breaks and cuts when resizing
      const { breaks: existingBreaks, cuts: existingCuts } = collectStripCuts(state.strips, id, newCols);
      
      state.saveToHistory();
      set({
        pcbs: state.pcbs.map(p => p.id === id ? { ...p, ...updates, rows: newRows, cols: newCols } : p),
        strips: [
          ...state.strips.filter(s => s.pcbId !== id), // Remove old strips for this PCB
          ...generateStrips(newRows, newCols, existingBreaks, id, existingCuts), // Add new strips
        ],
      });
    } else {
      // Just update metadata (name, position)
      set({
        pcbs: state.pcbs.map(p => p.id === id ? { ...p, ...updates } : p),
      });
    }
  },

  // ─── Project ──────────────────────────────────────────────
  exportProject: () => {
    const state = get();
    // Save every definition a component uses (covers Vero-imported footprints), plus
    // generic/custom definitions ('generic-', 'custom-' or '-custom-' variants from the edit dialog)
    const usedIds = new Set(state.components.map((c) => c.definitionId));
    const customDefinitions = state.componentDefinitions.filter(
      (d) =>
        usedIds.has(d.id) ||
        d.id.startsWith('generic-') || d.id.startsWith('custom-') || d.id.includes('-custom-')
    );
    return {
      version: '1.0',
      board: { rows: state.rows, cols: state.cols },
      pcbs: state.pcbs,
      components: state.components,
      strips: state.strips,
      wires: state.wires,
      nets: state.nets,
      netGroups: state.netGroups,
      referenceImages: state.referenceImages,
      stripColor: state.stripColor,
      customDefinitions: customDefinitions.length > 0 ? customDefinitions : undefined,
      importReport: state.importReport ?? undefined,
    };
  },

  importProject: (data) => {
    const rows = data.board?.rows ?? 30;
    const cols = data.board?.cols ?? 50;
    const importedStrips = data.strips ?? [];
    const importedPcbs = data.pcbs;

    // Check if this is already a new-format project (full-row strips)
    const isNewFormat = importedStrips.length === rows &&
      importedStrips.every((s) => s.startCol === 0 && s.endCol === cols - 1);

    let strips: Strip[];
    let pcbs: PCB[];
    
    if (importedPcbs && importedPcbs.length > 0) {
      // New format with PCBs
      pcbs = importedPcbs;
      strips = importedStrips;
    } else {
      // Old format or no PCBs - create default main PCB
      pcbs = [{
        id: 'main-pcb',
        name: 'Main PCB',
        rows,
        cols,
        position: { row: 0, col: 0 },
        isMain: true,
      }];
      
      if (isNewFormat) {
        strips = importedStrips;
      } else {
        // Convert old partial strips → full-row strips preserving breaks
        const breaksMap = new Map<number, number[]>();
        for (const s of importedStrips) {
          const existing = breaksMap.get(s.row) ?? [];
          existing.push(...s.breaks);
          breaksMap.set(s.row, existing);
        }
        strips = generateStrips(rows, cols, breaksMap, undefined);
      }
    }

    // Load custom component definitions from the project
    const state = get();
    const customDefinitions = data.customDefinitions ?? [];
    
    // Merge custom definitions with existing library definitions
    // Keep existing library definitions, add custom ones that don't exist
    const existingIds = new Set(state.componentDefinitions.map((d) => d.id));
    const newCustomDefs = customDefinitions.filter((d) => !existingIds.has(d.id));
    const mergedDefinitions = [...state.componentDefinitions, ...newCustomDefs];

    set({
      rows,
      cols,
      pcbs,
      components: data.components ?? [],
      strips,
      wires: data.wires ?? [],
      nets: data.nets ?? [],
      netGroups: data.netGroups ?? [],
      referenceImages: data.referenceImages ?? [],
      referenceImage: null,
      stripColor: data.stripColor ?? '#4a4a4a', // Default to dark grey if not specified
      componentDefinitions: mergedDefinitions,
      selectedItems: [],
      selectedNetIds: [],
      highlightedNetId: null,
      importReport: data.importReport ?? null, // Restore saved import report
      pan: { ...DEFAULT_PAN }, // Show the opened board from its top-left corner
      past: [],
      future: [],
    });
  },

  // ─── Netlist Import ──────────────────────────────────────
  importNetlist: (parsed) => {
    const state = get();
    // Mutable copy — we may add generic definitions during import
    const defs = [...state.componentDefinitions];

    const emptyReport: ImportReport = {
      importedComponents: 0,
      importedNets: 0,
      skippedComponents: [],
      virtualComponents: [],
    };

    if (defs.length === 0) {
      console.error('Component library not loaded yet');
      return emptyReport;
    }

    // ── Collect pin numbers per component ref (for generic fallback) ──
    const pinsByRef = new Map<string, Set<string>>();
    for (const net of parsed.nets) {
      for (const node of net.nodes) {
        if (!pinsByRef.has(node.ref)) pinsByRef.set(node.ref, new Set());
        pinsByRef.get(node.ref)!.add(node.pin);
      }
    }

    // Create nets
    const newNets: Net[] = parsed.nets
      .filter((n) => n.nodes.length > 0)
      .map((n, i) => ({
        id: `net-${n.code}`,
        name: n.name || `Net${n.code}`,
        color: NET_COLORS[i % NET_COLORS.length],
        visible: true,
        imported: true,
      }));

    // Detect incomplete nets (nets with only 1 node after component placement)
    // Exclude intentionally unconnected nets (KiCad No-Connect flags)
    const incompleteNets: Array<{ netName: string; netCode: string; nodeCount: number }> = [];
    for (const net of parsed.nets) {
      // Skip nets marked as unconnected (KiCad NC flags)
      if (net.name.startsWith('unconnected-')) continue;
      
      // Count nodes that reference non-virtual components
      const validNodes = net.nodes.filter(node => !isVirtualRef(node.ref));
      if (validNodes.length === 1) {
        incompleteNets.push({
          netName: net.name,
          netCode: net.code,
          nodeCount: validNodes.length,
        });
      }
    }

    // Track skipped and virtual components
    const skippedComponents: SkippedComponent[] = [];
    const virtualComponents: { ref: string; value: string }[] = [];

    // Auto-place components on the board — tight spacing (1-hole gap)
    const newComponents: Component[] = [];
    let curRow = 2;
    let curCol = 2;
    let maxH = 0;

    for (const pc of parsed.components) {
      // Virtual / power symbols → record but skip placement
      if (isVirtualRef(pc.ref)) {
        virtualComponents.push({ ref: pc.ref, value: pc.value });
        continue;
      }

      let defId = mapFootprintToDefinition(pc.footprint, pc.ref, pc.value);
      let def = defId ? defs.find((d) => d.id === defId) : null;

      // ── Check if matched definition has enough pins ──
      const pinSet = pinsByRef.get(pc.ref);
      const requiredPinCount = pinSet ? pinSet.size : 0;
      const hasEnoughPins = def && def.pins.length >= requiredPinCount;

      // ── Unknown / missing definition OR insufficient pins → create generic component ──
      if (!defId || !def || !hasEnoughPins) {
        const pinNumbers = pinSet && pinSet.size > 0
          ? [...pinSet].sort((a, b) => {
              // Sort numerically if both are numbers, otherwise alphabetically
              const aNum = parseInt(a, 10);
              const bNum = parseInt(b, 10);
              if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
              return a.localeCompare(b);
            })
          : ['1', '2']; // fallback to 2-pin if no net references

        // Detect if this should be a header/connector layout (SIP/2-row) vs DIP (IC)
        const fp = pc.footprint.toLowerCase();
        const isHeader = fp.includes('header') || fp.includes('connector') || 
                        fp.includes('terminal') || pc.ref.startsWith('J') || 
                        pc.ref.startsWith('P');
        
        const genericDef = createGenericDefinition(pinNumbers, isHeader ? 'SIP' : undefined);
        // Re-use existing generic or add new one
        const existing = defs.find((d) => d.id === genericDef.id);
        if (!existing) {
          defs.push(genericDef);
        }
        defId = genericDef.id;
        def = existing || genericDef;
      }

      // Determine appropriate rotation for this component
      const rotation = getDefaultRotation();
      
      // Get rotated pin positions for layout calculation
      const rotatedPinPositions = getRotatedPinPositions(def.pins, rotation);
      const rotatedWidth = Math.max(...rotatedPinPositions.map((p) => p.col)) + 1;
      const rotatedHeight = Math.max(...rotatedPinPositions.map((p) => p.row)) + 1;

      // Wrap to next row if needed (using board width for wrapping)
      if (curCol + rotatedWidth > state.cols - 2) {
        curRow += maxH + 1;
        curCol = 2;
        maxH = 0;
      }

      // NOTE: No "board full" skip — overflow components are placed
      // outside the board so users can drag them in later.

      const pos: GridPosition = { row: curRow, col: curCol };

      // Map netlist nets → pin netIds with rotated positions
      const pins: ComponentPin[] = def.pins.map((pDef, idx) => {
        const netEntry = parsed.nets.find((n) =>
          n.nodes.some(
            (node) => node.ref === pc.ref && node.pin === pDef.number
          )
        );
        const rotatedPos = rotatedPinPositions[idx];
        return {
          number: pDef.number,
          netId: netEntry ? `net-${netEntry.code}` : undefined,
          position: {
            row: pos.row + rotatedPos.row,
            col: pos.col + rotatedPos.col,
          },
          extended: 0,
        };
      });

      newComponents.push({
        id: `comp-${Date.now()}-${pc.ref}`,
        reference: pc.ref,
        value: pc.value || undefined,
        definitionId: defId,
        position: pos,
        rotation,
        pins,
      });

      curCol += rotatedWidth + 1;
      maxH = Math.max(maxH, rotatedHeight);
    }

    const report: ImportReport = {
      importedComponents: newComponents.length,
      importedNets: newNets.length,
      skippedComponents,
      virtualComponents,
      incompleteNets: incompleteNets.length > 0 ? incompleteNets : undefined,
    };

    state.saveToHistory();
    
    // Preserve existing cuts on main PCB
    const existingBreaks = new Map<number, number[]>();
    for (const strip of state.strips) {
      if (!strip.pcbId) { // Only preserve main PCB cuts
        if (strip.breaks.length > 0) existingBreaks.set(strip.row, strip.breaks);
      }
    }
    
    set({
      components: newComponents,
      componentDefinitions: defs,
      nets: newNets,
      strips: [
        ...generateStrips(state.rows, state.cols, existingBreaks, undefined), // Main PCB strips with preserved cuts
        ...state.strips.filter(s => s.pcbId) // Keep all additional PCB strips
      ],
      wires: [],
      selectedItems: [],
      importReport: report,
      netGroups: [],
      selectedNetIds: [],
      netSearchFilter: '',
    });

    return report;
  },

  importNetlistWithOptions: (parsed, options) => {
    // 'replace' mode delegates to the existing full-replace import
    if (options.mode === 'replace') {
      return get().importNetlist(parsed);
    }

    // ── 'update' mode: selectively update the existing board ──
    const state = get();
    const defs = [...state.componentDefinitions];

    const emptyReport: ImportReport = {
      importedComponents: 0,
      importedNets: 0,
      skippedComponents: [],
      virtualComponents: [],
    };

    if (defs.length === 0) {
      console.error('Component library not loaded yet');
      return emptyReport;
    }

    // Collect pin numbers per ref from netlist
    const pinsByRef = new Map<string, Set<string>>();
    for (const net of parsed.nets) {
      for (const node of net.nodes) {
        if (!pinsByRef.has(node.ref)) pinsByRef.set(node.ref, new Set());
        pinsByRef.get(node.ref)!.add(node.pin);
      }
    }

    // Index existing components by reference
    const existingByRef = new Map<string, Component>();
    for (const comp of state.components) {
      existingByRef.set(comp.reference, comp);
    }

    // Index existing nets by id
    const existingNetsById = new Map<string, Net>();
    for (const net of state.nets) {
      existingNetsById.set(net.id, net);
    }

    // Map each netlist net to an id by name, because KiCad net codes change between exports.
    // Existing nets with the same name keep their id; new names get a fresh, unused id.
    const netIdByCode = new Map<string, string>();
    const usedNetIds = new Set<string>();
    const claimedNames = new Set<string>();
    const importedNetsList = parsed.nets.filter((n) => n.nodes.length > 0);
    for (const n of importedNetsList) {
      const name = n.name || `Net${n.code}`;
      if (claimedNames.has(name)) continue;
      const match = state.nets.find((e) => e.name === name && !usedNetIds.has(e.id));
      if (match) {
        claimedNames.add(name);
        usedNetIds.add(match.id);
        netIdByCode.set(n.code, match.id);
      }
    }
    for (const n of importedNetsList) {
      if (netIdByCode.has(n.code)) continue;
      let netId = `net-${n.code}`;
      for (let k = 2; usedNetIds.has(netId) || existingNetsById.has(netId); k++) {
        netId = `net-${n.code}-${k}`;
      }
      usedNetIds.add(netId);
      netIdByCode.set(n.code, netId);
    }

    // Track stats
    const skippedComponents: SkippedComponent[] = [];
    const virtualComponents: { ref: string; value: string }[] = [];
    let addedCount = 0;

    // Build the new nets list from the parsed netlist
    const newNets: Net[] = importedNetsList
      .map((n, i) => {
        const netId = netIdByCode.get(n.code)!;
        // Preserve existing net color if available
        const existing = existingNetsById.get(netId);
        return {
          id: netId,
          name: n.name || `Net${n.code}`,
          color: existing?.color ?? NET_COLORS[i % NET_COLORS.length],
          visible: existing?.visible ?? true,
          imported: true,
        };
      });

    // Detect incomplete nets
    const incompleteNets: Array<{ netName: string; netCode: string; nodeCount: number }> = [];
    for (const net of parsed.nets) {
      if (net.name.startsWith('unconnected-')) continue;
      const validNodes = net.nodes.filter(node => !isVirtualRef(node.ref));
      if (validNodes.length === 1) {
        incompleteNets.push({ netName: net.name, netCode: net.code, nodeCount: validNodes.length });
      }
    }

    // Collect all parsed refs (excluding virtual)
    const parsedRefs = new Set<string>();
    for (const pc of parsed.components) {
      if (isVirtualRef(pc.ref)) {
        virtualComponents.push({ ref: pc.ref, value: pc.value });
      } else {
        parsedRefs.add(pc.ref);
      }
    }

    // ── Process updates to existing components ──
    let updatedComponents = [...state.components];

    for (const pc of parsed.components) {
      if (isVirtualRef(pc.ref)) continue;

      const existing = existingByRef.get(pc.ref);
      if (!existing) continue; // Will be handled in "add new" step

      let changed = false;
      const updates: Partial<Component> = {};

      // Update value
      if (options.updateValues && pc.value !== (existing.value ?? '')) {
        updates.value = pc.value || undefined;
        changed = true;
      }

      // Update footprint (definition)
      if (options.updateFootprints) {
        let defId = mapFootprintToDefinition(pc.footprint, pc.ref, pc.value);
        let def = defId ? defs.find((d) => d.id === defId) : null;
        const pinSet = pinsByRef.get(pc.ref);
        const requiredPinCount = pinSet ? pinSet.size : 0;
        const hasEnoughPins = def && def.pins.length >= requiredPinCount;

        if (!defId || !def || !hasEnoughPins) {
          const pinNumbers = pinSet && pinSet.size > 0
            ? [...pinSet].sort((a, b) => {
                const aNum = parseInt(a, 10);
                const bNum = parseInt(b, 10);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return a.localeCompare(b);
              })
            : ['1', '2'];
          const fp = pc.footprint.toLowerCase();
          const isHeader = fp.includes('header') || fp.includes('connector') ||
                          fp.includes('terminal') || pc.ref.startsWith('J') ||
                          pc.ref.startsWith('P');
          const genericDef = createGenericDefinition(pinNumbers, isHeader ? 'SIP' : undefined);
          if (!defs.find((d) => d.id === genericDef.id)) {
            defs.push(genericDef);
          }
          defId = genericDef.id;
          def = defs.find((d) => d.id === genericDef.id)!;
        }

        // A derived variant (user-adjusted or Vero-imported) of a compatible footprint keeps its definition
        const existingDef = defs.find((d) => d.id === existing.definitionId);
        const keepsExisting = !!existingDef && !!def && defId !== existing.definitionId &&
          existingDef.footprint.type === def.footprint.type &&
          existingDef.pins.length === def.pins.length &&
          def.pins.every((dp) => existingDef.pins.some((ep) => ep.number === dp.number));

        if (defId !== existing.definitionId && !keepsExisting) {
          updates.definitionId = defId;
          // Re-derive pins for the new definition, keeping the same position & rotation
          const rotatedPinPositions = getRotatedPinPositions(def!.pins, existing.rotation);
          updates.pins = def!.pins.map((pDef, idx) => {
            const netEntry = parsed.nets.find((n) =>
              n.nodes.some((node) => node.ref === pc.ref && node.pin === pDef.number)
            );
            const rotatedPos = rotatedPinPositions[idx];
            return {
              number: pDef.number,
              netId: netEntry ? netIdByCode.get(netEntry.code) : undefined,
              position: {
                row: existing.position.row + rotatedPos.row,
                col: existing.position.col + rotatedPos.col,
              },
              extended: 0,
            };
          });
          changed = true;
        }
      }

      // Update net assignments on pins (without changing footprint)
      if (options.updateNets && !updates.pins) {
        const def = defs.find((d) => d.id === existing.definitionId);
        if (def) {
          const updatedPins = existing.pins.map((pin) => {
            const netEntry = parsed.nets.find((n) =>
              n.nodes.some((node) => node.ref === pc.ref && node.pin === pin.number)
            );
            const newNetId = netEntry ? netIdByCode.get(netEntry.code) : undefined;
            if (newNetId !== pin.netId) {
              changed = true;
              return { ...pin, netId: newNetId };
            }
            return pin;
          });
          if (changed) updates.pins = updatedPins;
        }
      }

      if (changed) {
        updatedComponents = updatedComponents.map((c) =>
          c.id === existing.id ? { ...c, ...updates } : c
        );
      }
    }

    // ── Add new components (refs in netlist but not on board) ──
    if (options.updateComponents) {
      let curRow = 2;
      let curCol = 2;
      let maxH = 0;

      // Find a free area below existing components
      for (const comp of updatedComponents) {
        const def = defs.find((d) => d.id === comp.definitionId);
        if (def) {
          const rotatedPinPositions = getRotatedPinPositions(def.pins, comp.rotation);
          const compBottom = comp.position.row + Math.max(...rotatedPinPositions.map((p) => p.row)) + 1;
          curRow = Math.max(curRow, compBottom + 1);
        }
      }

      for (const pc of parsed.components) {
        if (isVirtualRef(pc.ref)) continue;
        if (existingByRef.has(pc.ref)) continue; // Already on board

        let defId = mapFootprintToDefinition(pc.footprint, pc.ref, pc.value);
        let def = defId ? defs.find((d) => d.id === defId) : null;
        const pinSet = pinsByRef.get(pc.ref);
        const requiredPinCount = pinSet ? pinSet.size : 0;
        const hasEnoughPins = def && def.pins.length >= requiredPinCount;

        if (!defId || !def || !hasEnoughPins) {
          const pinNumbers = pinSet && pinSet.size > 0
            ? [...pinSet].sort((a, b) => {
                const aNum = parseInt(a, 10);
                const bNum = parseInt(b, 10);
                if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                return a.localeCompare(b);
              })
            : ['1', '2'];
          const fp = pc.footprint.toLowerCase();
          const isHeader = fp.includes('header') || fp.includes('connector') ||
                          fp.includes('terminal') || pc.ref.startsWith('J') ||
                          pc.ref.startsWith('P');
          const genericDef = createGenericDefinition(pinNumbers, isHeader ? 'SIP' : undefined);
          if (!defs.find((d) => d.id === genericDef.id)) {
            defs.push(genericDef);
          }
          defId = genericDef.id;
          def = defs.find((d) => d.id === genericDef.id)!;
        }

        const rotation = getDefaultRotation();
        const rotatedPinPositions = getRotatedPinPositions(def.pins, rotation);
        const rotatedWidth = Math.max(...rotatedPinPositions.map((p) => p.col)) + 1;
        const rotatedHeight = Math.max(...rotatedPinPositions.map((p) => p.row)) + 1;

        if (curCol + rotatedWidth > state.cols - 2) {
          curRow += maxH + 1;
          curCol = 2;
          maxH = 0;
        }

        const pos: GridPosition = { row: curRow, col: curCol };
        const pins: ComponentPin[] = def.pins.map((pDef, idx) => {
          const netEntry = parsed.nets.find((n) =>
            n.nodes.some((node) => node.ref === pc.ref && node.pin === pDef.number)
          );
          const rotatedPos = rotatedPinPositions[idx];
          return {
            number: pDef.number,
            netId: netEntry ? netIdByCode.get(netEntry.code) : undefined,
            position: { row: pos.row + rotatedPos.row, col: pos.col + rotatedPos.col },
            extended: 0,
          };
        });

        updatedComponents.push({
          id: `comp-${Date.now()}-${pc.ref}`,
          reference: pc.ref,
          value: pc.value || undefined,
          definitionId: defId,
          position: pos,
          rotation,
          pins,
        });

        addedCount++;
        curCol += rotatedWidth + 1;
        maxH = Math.max(maxH, rotatedHeight);
      }

      // Remove components that are no longer in the netlist
      updatedComponents = updatedComponents.filter((c) => parsedRefs.has(c.reference));
    }

    // ── Determine final nets ──
    let finalNets: Net[];
    if (options.updateNets) {
      if (options.removeUnusedNets) {
        // Only keep nets from the new netlist + manually created (non-imported) nets
        const manualNets = state.nets.filter((n) => !n.imported);
        finalNets = [...newNets, ...manualNets];
      } else {
        // Keep all existing nets, update/add from netlist
        const merged = new Map<string, Net>();
        for (const n of state.nets) merged.set(n.id, n);
        for (const n of newNets) merged.set(n.id, n);
        finalNets = Array.from(merged.values());
      }
    } else {
      finalNets = state.nets;
    }

    const report: ImportReport = {
      importedComponents: options.updateComponents ? addedCount : 0,
      importedNets: options.updateNets ? newNets.length : 0,
      skippedComponents,
      virtualComponents,
      incompleteNets: incompleteNets.length > 0 ? incompleteNets : undefined,
    };

    state.saveToHistory();

    set({
      components: updatedComponents,
      componentDefinitions: defs,
      nets: finalNets,
      selectedItems: [],
      importReport: report,
      // Net ids are stable by name, so keep groups and drop only ids that no longer exist
      netGroups: state.netGroups.map((g) => ({
        ...g,
        netIds: g.netIds.filter((nid) => finalNets.some((n) => n.id === nid)),
      })),
      selectedNetIds: state.selectedNetIds.filter((nid) => finalNets.some((n) => n.id === nid)),
      highlightedNetId:
        state.highlightedNetId && finalNets.some((n) => n.id === state.highlightedNetId)
          ? state.highlightedNetId
          : null,
      netSearchFilter: '',
    });

    return report;
  },

  dismissImportReport: () => set({ importReport: null }),

  reorganizeByConnectivity: () => {
    const state = get();
    if (state.components.length === 0) return;

    state.saveToHistory();

    const clustered = clusterComponentsByConnectivity(
      state.components,
      state.nets,
      state.cols,
      state.componentDefinitions
    );

    set({ components: clustered, selectedItems: [] });
  },

  // ─── Copy / Paste ──────────────────────────────────────────
  copySelected: () => {
    const state = get();
    if (state.selectedItems.length === 0) return;

    // Parse cuts from selected items and get their types from strips
    // Support fractional columns for slice cuts (e.g., cut-5-7.5)
    const CUT_RE = /^cut-(\d+)-(\d+(?:\.\d+)?)$/;
    const cuts = state.selectedItems
      .map((id) => {
        const match = id.match(CUT_RE);
        if (!match) return null;
        
        const worldRow = +match[1];
        const worldCol = +match[2];
        
        // Find the cut type from the strip
        let cutType: 'drill' | 'slice' = 'drill'; // default
        for (const pcb of state.pcbs) {
          const localRow = worldRow - pcb.position.row;
          const localCol = worldCol - pcb.position.col;
          const intCol = Math.floor(worldCol);
          
          if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
            const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
            const strip = state.strips.find(s => s.id === stripId);
            if (strip) {
              const cut = strip.cuts?.find(c => c.col === localCol);
              if (cut) {
                cutType = cut.type;
              }
            }
            break;
          }
        }
        
        return { row: worldRow, col: worldCol, type: cutType };
      })
      .filter((c): c is { row: number; col: number; type: 'drill' | 'slice' } => c !== null);

    // Parse images from selected items
    const images = state.referenceImages.filter((img) =>
      state.selectedItems.includes(img.id)
    );

    // Clone components (deep copy)
    const components = state.components
      .filter((c) => state.selectedItems.includes(c.id))
      .map((c) => JSON.parse(JSON.stringify(c)) as Component);

    // Clone wires (deep copy)
    const wires = state.wires
      .filter((w) => state.selectedItems.includes(w.id))
      .map((w) => JSON.parse(JSON.stringify(w)) as Wire);

    clipboard = { components, wires, cuts, images };
    
    // Reset paste count when new content is copied
    pasteCount = 0;
  },

  paste: () => {
    if (!clipboard) return;
    const state = get();

    // Increment paste count for cascading offset
    pasteCount++;
    
    // Calculate offset: each paste goes further to prevent stacking
    // First paste: 2 units, second: 4 units, third: 6 units, etc.
    const PASTE_OFFSET = 2 * pasteCount;

    // Save history before paste
    state.saveToHistory();

    // ── Paste Components ──────────────────────────────────────
    const newComponents: Component[] = [];
    for (const comp of clipboard.components) {
      // Find the definition
      const def = state.componentDefinitions.find((d) => d.id === comp.definitionId);
      if (!def) continue;

      // Generate a unique reference
      const prefix = comp.reference.replace(/[0-9]/g, '');
      const nums = [...state.components, ...newComponents]
        .filter((c) => c.reference.startsWith(prefix))
        .map((c) => parseInt(c.reference.slice(prefix.length)))
        .filter((n) => !isNaN(n));
      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      const newReference = `${prefix}${nextNum}`;

      // Create new component with offset position
      const newPos = {
        row: comp.position.row + PASTE_OFFSET,
        col: comp.position.col + PASTE_OFFSET,
      };

      newComponents.push({
        ...comp,
        id: `comp-${Date.now()}-${Math.random()}`,
        reference: newReference,
        position: newPos,
        pins: comp.pins.map((pin) => ({
          ...pin,
          position: {
            row: pin.position.row + PASTE_OFFSET,
            col: pin.position.col + PASTE_OFFSET,
          },
        })),
      });
    }

    // ── Paste Wires ───────────────────────────────────────────
    const newWires: Wire[] = clipboard.wires.map((w) => ({
      ...w,
      id: `wire-${Date.now()}-${Math.random()}`,
      points: w.points.map((p) => ({
        row: p.row + PASTE_OFFSET,
        col: p.col + PASTE_OFFSET,
      })),
    }));

    // ── Paste Cuts ────────────────────────────────────────────
    const newCuts = clipboard.cuts.map((c) => ({
      row: c.row + PASTE_OFFSET,
      col: c.col + PASTE_OFFSET,
      type: c.type,
    }));

    // ── Paste Images ──────────────────────────────────────────
    const GRID_PITCH = 25.4;
    const newImages: ReferenceImageState[] = clipboard.images.map((img) => ({
      ...img,
      id: `refimg-${Date.now()}-${Math.random()}`,
      x: img.x + PASTE_OFFSET * GRID_PITCH,
      y: img.y + PASTE_OFFSET * GRID_PITCH,
    }));

    // Apply updates to state
    set((s) => {
      // Add cuts to strips using PCB-aware logic
      let strips = s.strips;
      for (const cut of newCuts) {
        // Find which PCB this cut belongs to (using world coordinates)
        for (const pcb of s.pcbs) {
          const localRow = cut.row - pcb.position.row;
          const localCol = cut.col - pcb.position.col;
          const intCol = Math.floor(cut.col);
          
          // Check if position is within this PCB's bounds
          if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
            const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
            
            strips = strips.map((strip) => {
              if (strip.id === stripId) {
                const intLocalCol = Math.floor(localCol);
                if (intLocalCol < strip.startCol || intLocalCol > strip.endCol) {
                  return strip;
                }
                
                const cuts = strip.cuts || [];
                // Only add if not already present (using local coordinates)
                if (!cuts.some(c => c.col === localCol)) {
                  const newCuts = [...cuts, { col: localCol, type: cut.type }].sort((a, b) => a.col - b.col);
                  
                  // For backward compatibility: Update breaks array for drill cuts
                  let breaks = strip.breaks;
                  if (cut.type === 'drill' && Number.isInteger(localCol)) {
                    if (!breaks.includes(localCol)) {
                      breaks = [...breaks, localCol].sort((a, b) => a - b);
                    }
                  }
                  
                  return { ...strip, cuts: newCuts, breaks };
                }
              }
              return strip;
            });
            break; // Found the PCB, move to next cut
          }
        }
      }

      return {
        components: [...s.components, ...newComponents],
        wires: [...s.wires, ...newWires],
        strips,
        referenceImages: [...s.referenceImages, ...newImages],
        selectedItems: [
          ...newComponents.map((c) => c.id),
          ...newWires.map((w) => w.id),
          ...newCuts.map((c) => `cut-${c.row}-${c.col}`),
          ...newImages.map((img) => img.id),
        ],
      };
    });
  },

  // ─── Reset ────────────────────────────────────────────────
  reset: () => set({
    ...initialState,
    pcbs: [{
      id: 'main-pcb',
      name: 'Main PCB',
      rows: INITIAL_ROWS,
      cols: INITIAL_COLS,
      position: { row: 0, col: 0 },
      isMain: true,
    }],
    strips: generateStrips(INITIAL_ROWS, INITIAL_COLS, undefined, undefined),
    past: [],
    future: [],
  }),
}));
