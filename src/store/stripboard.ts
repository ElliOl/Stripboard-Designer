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
} from '@/lib/types';
import { getRotatedPinPositions } from '@/lib/rotation';
import {
  type ParsedNetlist,
  mapFootprintToDefinition,
  isVirtualRef,
} from '@/lib/netlist-parser';
import { createGenericDefinition } from '@/lib/component-utils';

/**
 * Determine the default rotation for a component.
 * All components should be placed perpendicular to strips (90°) to avoid shorting.
 */
function getDefaultRotation(_definition: ComponentDefinition): 0 | 90 | 180 | 270 {
  // All components should be perpendicular to strips (which run horizontally)
  return 90;
}

const NET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

const MAX_HISTORY = 50;

/** Generate one full-width copper strip per row (real stripboard has continuous strips) */
function generateStrips(rows: number, cols: number, existingBreaks?: Map<number, number[]>, pcbId?: string): Strip[] {
  const strips: Strip[] = [];
  for (let row = 0; row < rows; row++) {
    strips.push({
      id: pcbId ? `${pcbId}-strip-row-${row}` : `strip-row-${row}`,
      row,
      startCol: 0,
      endCol: cols - 1,
      breaks: existingBreaks?.get(row) ?? [],
      pcbId,
    });
  }
  return strips;
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
  dismissImportReport: () => void;

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
  pan: { x: 60, y: 60 },
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

    const newRotation = ((component.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    const rotatedPins = getRotatedPinPositions(def.pins, newRotation);

    // Clamp so all pins stay on the board
    const maxPinRow = Math.max(...rotatedPins.map((p) => p.row));
    const maxPinCol = Math.max(...rotatedPins.map((p) => p.col));
    const clampedRow = Math.max(
      0,
      Math.min(state.rows - 1 - maxPinRow, component.position.row)
    );
    const clampedCol = Math.max(
      0,
      Math.min(state.cols - 1 - maxPinCol, component.position.col)
    );

    const newPins: ComponentPin[] = component.pins.map((pin, i) => ({
      ...pin,
      position: {
        row: clampedRow + rotatedPins[i].row,
        col: clampedCol + rotatedPins[i].col,
      },
    }));

    state.saveToHistory();
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id
          ? {
              ...c,
              rotation: newRotation,
              position: { row: clampedRow, col: clampedCol },
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
        selectedItems: [],
      };
    });
  },

  // ─── Bulk Movement ──────────────────────────────────────────
  moveSelectedItems: (deltaRow, deltaCol) =>
    set((state) => {
      // Reset paste count when items are moved
      pasteCount = 0;
      
      // Parse selected cuts → { oldRow, oldCol, newRow, newCol, type }
      // Support fractional columns for slice cuts (e.g., cut-5-7.5)
      const CUT_RE = /^cut-(\d+)-(\d+(?:\.\d+)?)$/;
      const cutMoves = state.selectedItems
        .map((id) => {
          const match = id.match(CUT_RE);
          if (!match) return null;
          
          const oldRow = +match[1];
          const oldCol = +match[2];
          
          // Find the cut type from the strip
          let cutType: 'drill' | 'slice' = 'drill';
          for (const pcb of state.pcbs) {
            const localRow = oldRow - pcb.position.row;
            const localCol = oldCol - pcb.position.col;
            const intCol = Math.floor(oldCol);
            
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
          
          return {
            oldRow,
            oldCol,
            newRow: oldRow + deltaRow,
            newCol: oldCol + deltaCol,
            type: cutType,
          };
        })
        .filter((m): m is { oldRow: number; oldCol: number; newRow: number; newCol: number; type: 'drill' | 'slice' } => m !== null);

      // Move cuts: remove from old positions, add to new positions using PCB-aware logic
      let newStrips = state.strips;
      if (cutMoves.length > 0) {
        // First remove all old cuts using world coordinates
        for (const move of cutMoves) {
          for (const pcb of state.pcbs) {
            const localRow = move.oldRow - pcb.position.row;
            const localCol = move.oldCol - pcb.position.col;
            const intCol = Math.floor(move.oldCol);
            
            if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
              const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
              newStrips = newStrips.map((strip) => {
                if (strip.id === stripId) {
                  // Remove from both cuts and breaks arrays (using local coordinates)
                  const newCuts = (strip.cuts || []).filter(c => c.col !== localCol);
                  const newBreaks = (strip.breaks || []).filter(b => b !== localCol);
                  return { ...strip, cuts: newCuts, breaks: newBreaks };
                }
                return strip;
              });
              break;
            }
          }
        }
        
        // Then add all new cuts using world coordinates
        for (const move of cutMoves) {
          for (const pcb of state.pcbs) {
            const localRow = move.newRow - pcb.position.row;
            const localCol = move.newCol - pcb.position.col;
            const intCol = Math.floor(move.newCol);
            
            if (localRow >= 0 && localRow < pcb.rows && intCol >= pcb.position.col && intCol < pcb.position.col + pcb.cols) {
              const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
              newStrips = newStrips.map((strip) => {
                if (strip.id === stripId) {
                  // Check if position is within strip bounds
                  const intLocalCol = Math.floor(localCol);
                  const isInBounds = move.type === 'drill' 
                    ? intLocalCol >= strip.startCol && intLocalCol <= strip.endCol
                    : intLocalCol >= strip.startCol - 0.5 && intLocalCol <= strip.endCol + 0.5;
                  
                  if (isInBounds) {
                    const cuts = strip.cuts || [];
                    // Only add if not already present (using local coordinates)
                    if (!cuts.some(c => c.col === localCol)) {
                      return { 
                        ...strip, 
                        cuts: [...cuts, { col: localCol, type: move.type }].sort((a, b) => a.col - b.col) 
                      };
                    }
                  }
                }
                return strip;
              });
              break;
            }
          }
        }
      }

      // Update selectedItems so cut IDs reflect their new positions
      const newSelectedItems =
        cutMoves.length > 0
          ? state.selectedItems.map((id) => {
              const m = id.match(CUT_RE);
              if (m) return `cut-${+m[1] + deltaRow}-${+m[2] + deltaCol}`;
              return id;
            })
          : state.selectedItems;

      return {
        components: state.components.map((c) =>
          state.selectedItems.includes(c.id)
            ? {
                ...c,
                position: {
                  row: c.position.row + deltaRow,
                  col: c.position.col + deltaCol,
                },
                pins: c.pins.map((pin) => ({
                  ...pin,
                  position: {
                    row: pin.position.row + deltaRow,
                    col: pin.position.col + deltaCol,
                  },
                })),
              }
            : c
        ),
        wires: state.wires.map((w) =>
          state.selectedItems.includes(w.id)
            ? {
                ...w,
                points: w.points.map((p) => ({
                  row: p.row + deltaRow,
                  col: p.col + deltaCol,
                })),
              }
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
      // Merge: keep existing generic/custom definitions not in the library
      const existingGenerics = state.componentDefinitions.filter(
        (d) => d.id.startsWith('generic-') || d.id.startsWith('custom-')
      );
      
      // Build a map of library definition IDs for quick lookup
      const libraryIds = new Set(definitions.map((d) => d.id));
      
      // Keep only generics that don't conflict with library definitions
      const keptGenerics = existingGenerics.filter((g) => !libraryIds.has(g.id));
      
      return { componentDefinitions: [...definitions, ...keptGenerics] };
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
    // Preserve existing breaks when resizing (only for main PCB)
    const existingBreaks = new Map<number, number[]>();
    for (const strip of state.strips) {
      if (!strip.pcbId) { // Only resize main PCB strips
        const validBreaks = strip.breaks.filter((b) => b < cols);
        if (validBreaks.length > 0) existingBreaks.set(strip.row, validBreaks);
      }
    }
    
    // Update main PCB
    const mainPcb = state.pcbs.find(p => p.isMain);
    const newMainPcb = mainPcb ? { ...mainPcb, rows, cols } : undefined;
    
    set({
      rows,
      cols,
      pcbs: state.pcbs.map(p => p.isMain && newMainPcb ? newMainPcb : p),
      strips: [
        ...generateStrips(rows, cols, existingBreaks, undefined), // Main PCB strips
        ...state.strips.filter(s => s.pcbId) // Keep other PCB strips
      ],
    });
  },

  // ─── PCBs ─────────────────────────────────────────────────
  addPCB: (name, rows, cols) => {
    const state = get();
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
      
      // Preserve existing breaks when resizing
      const existingBreaks = new Map<number, number[]>();
      for (const strip of state.strips) {
        if (strip.pcbId === id) {
          const validBreaks = strip.breaks.filter((b) => b < newCols);
          if (validBreaks.length > 0) existingBreaks.set(strip.row, validBreaks);
        }
      }
      
      set({
        pcbs: state.pcbs.map(p => p.id === id ? { ...p, ...updates, rows: newRows, cols: newCols } : p),
        strips: [
          ...state.strips.filter(s => s.pcbId !== id), // Remove old strips for this PCB
          ...generateStrips(newRows, newCols, existingBreaks, id), // Add new strips
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
    // Extract custom component definitions (generic/custom) that should be saved with the project
    const customDefinitions = state.componentDefinitions.filter(
      (d) => d.id.startsWith('generic-') || d.id.startsWith('custom-')
    );
    return {
      version: '1.0',
      board: { rows: state.rows, cols: state.cols },
      pcbs: state.pcbs,
      components: state.components,
      strips: state.strips,
      wires: state.wires,
      nets: state.nets,
      stripColor: state.stripColor,
      customDefinitions: customDefinitions.length > 0 ? customDefinitions : undefined,
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
      stripColor: data.stripColor ?? '#4a4a4a', // Default to dark grey if not specified
      componentDefinitions: mergedDefinitions,
      selectedItems: [],
      importReport: null,
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
      const rotation = getDefaultRotation(def);
      
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

  dismissImportReport: () => set({ importReport: null }),

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
      const nums = state.components
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
