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
function generateStrips(rows: number, cols: number, existingBreaks?: Map<number, number[]>): Strip[] {
  const strips: Strip[] = [];
  for (let row = 0; row < rows; row++) {
    strips.push({
      id: `strip-row-${row}`,
      row,
      startCol: 0,
      endCol: cols - 1,
      breaks: existingBreaks?.get(row) ?? [],
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
  addCut: (row: number, col: number) => void;
  removeCut: (row: number, col: number) => void;
  toggleCut: (row: number, col: number) => void;
  // Legacy strip operations kept for internal use
  updateStrip: (id: string, updates: Partial<Strip>) => void;
  setStripColor: (color: string) => void;
  setNetHighlightMode: (mode: NetHighlightMode) => void;

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

  // Board
  setBoardSize: (rows: number, cols: number) => void;

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

const initialState: StripboardState = {
  rows: INITIAL_ROWS,
  cols: INITIAL_COLS,
  components: [],
  strips: generateStrips(INITIAL_ROWS, INITIAL_COLS),
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
  zoom: 1,
  pan: { x: 60, y: 60 },
  performanceMode: 'auto', // Auto-detect and adapt to device performance
  realtimeRatsnest: true, // Enable real-time ratsnest updates
  importReport: null,
  netGroups: [],
  selectedNetIds: [],
  netSearchFilter: '',
  componentSearchFilter: '',
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
  addCut: (row, col) =>
    set((state) => ({
      strips: state.strips.map((s) =>
        s.row === row && col >= s.startCol && col <= s.endCol && !s.breaks.includes(col)
          ? { ...s, breaks: [...s.breaks, col].sort((a, b) => a - b) }
          : s
      ),
    })),

  removeCut: (row, col) =>
    set((state) => ({
      strips: state.strips.map((s) =>
        s.row === row
          ? { ...s, breaks: s.breaks.filter((b) => b !== col) }
          : s
      ),
    })),

  toggleCut: (row, col) => {
    const state = get();
    const strip = state.strips.find(
      (s) => s.row === row && col >= s.startCol && col <= s.endCol
    );
    if (!strip) return;
    if (strip.breaks.includes(col)) {
      state.removeCut(row, col);
    } else {
      state.addCut(row, col);
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
    set((state) => ({
      selectedItems: multi
        ? state.selectedItems.includes(id)
          ? state.selectedItems.filter((i) => i !== id)
          : [...state.selectedItems, id]
        : [id],
    })),

  setSelectedItems: (ids) => set({ selectedItems: ids }),

  addToSelection: (ids) =>
    set((state) => ({
      selectedItems: [...new Set([...state.selectedItems, ...ids])],
    })),

  removeFromSelection: (ids) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter((i) => !ids.includes(i)),
    })),

  deselectAll: () => set({ selectedItems: [], highlightedNetId: null }),

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
    const CUT_RE = /^cut-(\d+)-(\d+)$/;
    const cutsToRemove = state.selectedItems
      .map((id) => id.match(CUT_RE))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => ({ row: +m[1], col: +m[2] }));

    set((s) => ({
      components: s.components.filter((c) => !s.selectedItems.includes(c.id)),
      wires: s.wires.filter((w) => !s.selectedItems.includes(w.id)),
      // Remove selected cuts from strips
      strips:
        cutsToRemove.length > 0
          ? s.strips.map((strip) => {
              const removals = cutsToRemove.filter((c) => c.row === strip.row);
              if (removals.length === 0) return strip;
              return {
                ...strip,
                breaks: strip.breaks.filter(
                  (b) => !removals.some((r) => r.col === b)
                ),
              };
            })
          : s.strips,
      selectedItems: [],
    }));
  },

  // ─── Bulk Movement ──────────────────────────────────────────
  moveSelectedItems: (deltaRow, deltaCol) =>
    set((state) => {
      // Parse selected cuts → { oldRow, oldCol, newRow, newCol }
      const CUT_RE = /^cut-(\d+)-(\d+)$/;
      const cutMoves = state.selectedItems
        .map((id) => id.match(CUT_RE))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => ({
          oldRow: +m[1],
          oldCol: +m[2],
          newRow: +m[1] + deltaRow,
          newCol: +m[2] + deltaCol,
        }));

      // Move cuts: remove from old positions, add to new positions
      let newStrips = state.strips;
      if (cutMoves.length > 0) {
        // First remove all old cuts
        newStrips = newStrips.map((strip) => {
          const removals = cutMoves.filter((c) => c.oldRow === strip.row);
          if (removals.length === 0) return strip;
          return {
            ...strip,
            breaks: strip.breaks.filter(
              (b) => !removals.some((r) => r.oldCol === b)
            ),
          };
        });
        // Then add all new cuts
        newStrips = newStrips.map((strip) => {
          const additions = cutMoves.filter(
            (c) =>
              c.newRow === strip.row &&
              c.newCol >= strip.startCol &&
              c.newCol <= strip.endCol
          );
          if (additions.length === 0) return strip;
          const newBreaks = [
            ...strip.breaks,
            ...additions.map((a) => a.newCol),
          ];
          return {
            ...strip,
            breaks: [...new Set(newBreaks)].sort((a, b) => a - b),
          };
        });
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
    // Preserve existing breaks when resizing
    const existingBreaks = new Map<number, number[]>();
    for (const strip of state.strips) {
      const validBreaks = strip.breaks.filter((b) => b < cols);
      if (validBreaks.length > 0) existingBreaks.set(strip.row, validBreaks);
    }
    set({
      rows,
      cols,
      strips: generateStrips(rows, cols, existingBreaks),
    });
  },

  // ─── Project ──────────────────────────────────────────────
  exportProject: () => {
    const state = get();
    return {
      version: '1.0',
      board: { rows: state.rows, cols: state.cols },
      components: state.components,
      strips: state.strips,
      wires: state.wires,
      nets: state.nets,
      stripColor: state.stripColor,
    };
  },

  importProject: (data) => {
    const rows = data.board?.rows ?? 30;
    const cols = data.board?.cols ?? 50;
    const importedStrips = data.strips ?? [];

    // Check if this is already a new-format project (full-row strips)
    const isNewFormat = importedStrips.length === rows &&
      importedStrips.every((s) => s.startCol === 0 && s.endCol === cols - 1);

    let strips: Strip[];
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
      strips = generateStrips(rows, cols, breaksMap);
    }

    set({
      rows,
      cols,
      components: data.components ?? [],
      strips,
      wires: data.wires ?? [],
      nets: data.nets ?? [],
      stripColor: data.stripColor ?? '#4a4a4a', // Default to dark grey if not specified
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

      let defId = mapFootprintToDefinition(pc.footprint, pc.ref);
      let def = defId ? defs.find((d) => d.id === defId) : null;

      // ── Unknown / missing definition → create generic component ──
      if (!defId || !def) {
        const pinSet = pinsByRef.get(pc.ref);
        const pinNumbers = pinSet && pinSet.size > 0
          ? [...pinSet]
          : ['1', '2']; // fallback to 2-pin if no net references

        const genericDef = createGenericDefinition(pinNumbers);
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
    };

    state.saveToHistory();
    set({
      components: newComponents,
      componentDefinitions: defs,
      nets: newNets,
      strips: generateStrips(state.rows, state.cols),
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

  // ─── Reset ────────────────────────────────────────────────
  reset: () => set({
    ...initialState,
    strips: generateStrips(INITIAL_ROWS, INITIAL_COLS),
    past: [],
    future: [],
  }),
}));
