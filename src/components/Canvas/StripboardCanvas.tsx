import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Circle, Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject, Node as KonvaNode } from 'konva/lib/Node';
import type { Stage as KonvaStage } from 'konva/lib/Stage';
import type { Layer as KonvaLayer } from 'konva/lib/Layer';
import type { GridPosition, RatsNestConnection, Component as ComponentType, Wire as WireType, ComponentDefinition, Strip as StripType, ComponentPin } from '@/lib/types';
import { Grid } from './Grid';
import { Strip } from './Strip';
import { CutMarker } from './CutMarker';
import { Component } from './Component';
import { Wire } from './Wire';
import { ReferenceImage, REF_IMAGE_ID } from './ReferenceImage';
import {
  ComponentContextMenu,
  type ContextMenuState,
} from './ComponentContextMenu';
import { ImageContextMenu, type ImageContextMenuState } from './ImageContextMenu';
import { CropImageDialog } from './CropImageDialog';
import { EditComponentDialog } from '@/components/EditComponentDialog';
import { useStripboardStore } from '@/store/stripboard';
import { calculateRatsNest } from '@/lib/ratsnest';
import { analyzeConnectivity } from '@/lib/connectivity';
import {
  getVisibleBounds,
  isComponentVisible,
  isStripVisible,
  isWireVisible,
} from '@/utils/viewport';
import { getRotatedPinPositions } from '@/lib/rotation';
import {
  clampDropPosition,
  clampPartToPcb,
  findPcbAt,
  interpretWheel,
  pinExtents,
  scaleHitTolerance,
  uniqueId,
} from '@/lib/canvas-geometry';

const GRID_PITCH = 25.4;
const DRAG_THRESHOLD = 5; // pixels in screen space before a drag starts

/**
 * Determine the default rotation for a component.
 * All components should be placed perpendicular to strips (90°) to avoid shorting.
 */
function getDefaultRotation(): 0 | 90 | 180 | 270 {
  // All components should be perpendicular to strips (which run horizontally)
  return 90;
}

// ─── Interaction State Types ─────────────────────────────────
type InteractionState =
  | null
  | {
      type: 'pending';
      startScreenX: number;
      startScreenY: number;
      startContentX: number;
      startContentY: number;
      clickedItemId: string | null;
      shiftKey: boolean;
      metaKey: boolean;
    }
  | {
      type: 'selectionBox';
      startContentX: number;
      startContentY: number;
      shiftKey: boolean;
      metaKey: boolean;
    }
  | {
      type: 'dragging';
      lastGridRow: number;
      lastGridCol: number;
      /** Pixel-level tracking for free-drag items (reference image) */
      lastContentX: number;
      lastContentY: number;
    }
  | {
      type: 'pinDragging';
      componentId: string;
      pinIndex: number;
      lastGridRow: number;
      lastGridCol: number;
    }
  | {
      type: 'panning';
      startScreenX: number;
      startScreenY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      type: 'cutDragging';
      mode: 'add' | 'remove';
      cutType: 'drill' | 'slice';
      lastGridRow: number;
      lastGridCol: number;
      visitedPositions: Set<string>; // track "row:col" strings to avoid double-toggling
    };

/**
 * Check if a component supports per-pin dragging.
 * Allowed for: 2-pin non-header components (resistors, diodes, caps)
 *              and TO-92 transistors.
 */
function isPinDraggable(def: ComponentDefinition): boolean {
  const fpType = def.footprint.type;
  // TO-92 transistors
  if (fpType === 'TO92') return true;
  // 2-pin axial / radial components (not headers or SIP connectors)
  if (def.pins.length === 2 && (fpType === 'Axial' || fpType === 'Radial')) {
    if (def.id.includes('header')) return false;
    return true;
  }
  // Multi-pin radial LEDs (bicolor 3-pin, RGB 4-pin)
  if (fpType === 'Radial' && def.id.includes('led')) return true;
  return false;
}

/** Per-type Euclidean distance limits for pin dragging (in grid units). */
function getPinDragLimits(def: ComponentDefinition): { minDist: number; maxDist: number } {
  if (def.footprint.type === 'TO92') return { minDist: 1, maxDist: 4 };
  const baseId = def.id.replace(/-custom-.*$/, '');
  if (baseId.includes('resistor')) return { minDist: 1, maxDist: 8 };
  if (baseId.includes('diode') || baseId.includes('zener')) return { minDist: 1, maxDist: 8 };
  if (baseId.includes('capacitor-rect')) return { minDist: 2, maxDist: 8 };
  if (baseId.includes('electrolytic') || baseId.includes('capacitor-wide') || baseId.includes('capacitor')) return { minDist: 1, maxDist: 8 };
  if (baseId.includes('led-rgb') || baseId.includes('led-bicolor')) return { minDist: 1, maxDist: 4 };
  if (baseId.includes('led')) return { minDist: 1, maxDist: 8 };
  return { minDist: 1, maxDist: 8 };
}

// ─── Helpers ─────────────────────────────────────────────────

/** Walk from a Konva target node up to the Stage looking for a named
 *  component or wire Group. Returns the item ID or null. */
function getItemIdFromTarget(target: KonvaNode | null): string | null {
  let node: KonvaNode | null = target;
  while (node && node !== node.getStage()) {
    const name: string = node.name?.() || '';
    if (name.startsWith('component:')) return name.slice('component:'.length);
    if (name.startsWith('wire:')) return name.slice('wire:'.length);
    if (name.startsWith('cut:')) return name.slice('cut:'.length);
    if (name.startsWith('refimage:')) return name.slice('refimage:'.length);
    node = node.parent;
  }
  return null;
}

/** True when the target is a Transformer or one of its anchors/border. */
function isTransformerTarget(target: KonvaNode | null): boolean {
  let node: KonvaNode | null = target;
  while (node && node !== node.getStage()) {
    if (node.className === 'Transformer') return true;
    node = node.parent;
  }
  return false;
}

/** Reuse the previous array while its elements are unchanged. */
function useStableArray<T>(next: T[]): T[] {
  const ref = useRef(next);
  const prev = ref.current;
  if (prev !== next && !(prev.length === next.length && prev.every((v, i) => v === next[i]))) {
    ref.current = next;
  }
  return ref.current;
}

export const StripboardCanvas = () => {
  // Individual selectors to minimize rerenders
  const strips = useStripboardStore((s) => s.strips);
  const components = useStripboardStore((s) => s.components);
  const wires = useStripboardStore((s) => s.wires);
  const nets = useStripboardStore((s) => s.nets);
  const pcbs = useStripboardStore((s) => s.pcbs);
  const zoom = useStripboardStore((s) => s.zoom);
  const pan = useStripboardStore((s) => s.pan);
  const showRatsNest = useStripboardStore((s) => s.showRatsNest);
  const layerVisibility = useStripboardStore((s) => s.layerVisibility);
  const highlightedNetId = useStripboardStore((s) => s.highlightedNetId);
  const stripColor = useStripboardStore((s) => s.stripColor);
  const netHighlightMode = useStripboardStore((s) => s.netHighlightMode);
  const ratsnestColorMode = useStripboardStore((s) => s.ratsnestColorMode);
  const activeTool = useStripboardStore((s) => s.activeTool);
  const selectedItems = useStripboardStore((s) => s.selectedItems);
  const componentDefinitions = useStripboardStore((s) => s.componentDefinitions);
  const realtimeRatsnest = useStripboardStore((s) => s.realtimeRatsnest);
  const componentSearchFilter = useStripboardStore((s) => s.componentSearchFilter);
  const componentOpacity = useStripboardStore((s) => s.componentOpacity);
  const referenceImage = useStripboardStore((s) => s.referenceImage);
  const referenceImages = useStripboardStore((s) => s.referenceImages);
  
  // Actions
  const setZoom = useStripboardStore((s) => s.setZoom);
  const setPan = useStripboardStore((s) => s.setPan);
  const deselectAll = useStripboardStore((s) => s.deselectAll);
  const setSelectedItems = useStripboardStore((s) => s.setSelectedItems);
  const addToSelection = useStripboardStore((s) => s.addToSelection);
  const removeFromSelection = useStripboardStore((s) => s.removeFromSelection);
  const moveSelectedItems = useStripboardStore((s) => s.moveSelectedItems);
  const addComponent = useStripboardStore((s) => s.addComponent);
  const addWire = useStripboardStore((s) => s.addWire);
  const addCut = useStripboardStore((s) => s.addCut);
  const removeCut = useStripboardStore((s) => s.removeCut);
  const saveToHistory = useStripboardStore((s) => s.saveToHistory);
  const rotateComponent = useStripboardStore((s) => s.rotateComponent);
  const removeComponent = useStripboardStore((s) => s.removeComponent);
  const updateReferenceImage = useStripboardStore((s) => s.updateReferenceImage);
  const clearReferenceImage = useStripboardStore((s) => s.clearReferenceImage);
  const undo = useStripboardStore((s) => s.undo);
  const updateReferenceImageById = useStripboardStore((s) => s.updateReferenceImageById);
  const copySelected = useStripboardStore((s) => s.copySelected);
  const moveComponentPin = useStripboardStore((s) => s.moveComponentPin);
  const finalizePinDrag = useStripboardStore((s) => s.finalizePinDrag);

  const stageRef = useRef<KonvaStage>(null);
  const cachedComponentLayerRef = useRef<KonvaLayer>(null); // Cached background components
  const activeComponentLayerRef = useRef<KonvaLayer>(null); // Active/selected components (uncached)
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // ─── Drawing State ─────────────────────────────────────────
  const [wirePoints, setWirePoints] = useState<GridPosition[]>([]);
  const [wirePreviewPoint, setWirePreviewPoint] = useState<GridPosition | null>(
    null
  );
  const [cursorGridPos, setCursorGridPos] = useState<GridPosition | null>(null);

  // ─── Interaction State ──────────────────────────────────────
  const interactionRef = useRef<InteractionState>(null);
  const [selectionBox, setSelectionBoxState] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const setSelectionBox = useCallback((box: typeof selectionBox) => {
    selectionBoxRef.current = box;
    setSelectionBoxState(box);
  }, []);
  const [isDragging, setIsDragging] = useState(false); // Track dragging state for cache control
  const selectionBoxRef = useRef<typeof selectionBox>(null); // Latest box, readable without a state updater
  const selectionBoxCleanupRef = useRef<(() => void) | null>(null); // Cleanup for document-level drag listeners
  const dragHistorySavedRef = useRef(false); // History entry pushed for the current drag
  const panMovedRef = useRef(false); // Pan tool: pointer moved since mousedown
  const finishInteractionRef = useRef<() => void>(() => {});
  const cancelInteractionRef = useRef<() => void>(() => {});

  // ─── Context Menu & Edit Dialog ───────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [imageContextMenu, setImageContextMenu] = useState<ImageContextMenuState | null>(null);
  const [editingComponentIds, setEditingComponentIds] = useState<string[]>([]);
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const rightClickedRef = useRef<string | null>(null);

  // ─── Connectivity Analysis (Deferred) ────────────────────────
  const [connectivity, setConnectivity] = useState(() =>
    analyzeConnectivity(components, strips, wires, nets, pcbs)
  );

  useEffect(() => {
    // Use requestIdleCallback if available, setTimeout as fallback
    const scheduleUpdate = (callback: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        return requestIdleCallback(callback);
      }
      return setTimeout(callback, 0) as unknown as number;
    };

    const cancelUpdate = (id: number) => {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };

    const id = scheduleUpdate(() => {
      const result = analyzeConnectivity(components, strips, wires, nets, pcbs);
      setConnectivity(result);
    });

    return () => cancelUpdate(id);
  }, [components, strips, wires, nets, pcbs]);

  // ─── Ratsnest (deferred or realtime based on setting) ────────
  const [ratsNest, setRatsNest] = useState<RatsNestConnection[]>([]);

  // Realtime ratsnest (synchronous useMemo)
  const realtimeRatsNestValue = useMemo(() => {
    if (!realtimeRatsnest || nets.length === 0) return [];
    const allConnections = calculateRatsNest(components, strips, wires, nets, pcbs);
    // Filter out connections for hidden nets
    return allConnections.filter((conn) => {
      const net = nets.find((n) => n.id === conn.netId);
      return net?.visible !== false;
    });
  }, [realtimeRatsnest, components, strips, wires, nets, pcbs]);

  // Deferred ratsnest (async)
  useEffect(() => {
    if (realtimeRatsnest) {
      // Use realtime value
      setRatsNest(realtimeRatsNestValue);
      return;
    }

    if (nets.length === 0) {
      setRatsNest([]);
      return;
    }

    const scheduleUpdate = (callback: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        return requestIdleCallback(callback);
      }
      return setTimeout(callback, 0) as unknown as number;
    };

    const cancelUpdate = (id: number) => {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };

    const id = scheduleUpdate(() => {
      const allConnections = calculateRatsNest(components, strips, wires, nets, pcbs);
      // Filter out connections for hidden nets
      const visible = allConnections.filter((conn) => {
        const net = nets.find((n) => n.id === conn.netId);
        return net?.visible !== false; // Show by default if visible is undefined
      });
      setRatsNest(visible);
    });

    return () => cancelUpdate(id);
  }, [realtimeRatsnest, realtimeRatsNestValue, components, strips, wires, nets, pcbs]);

  // Net color lookup
  const netColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nets) m.set(n.id, n.color);
    return m;
  }, [nets]);

  // Highlighted net color for components
  const hlNetColor = useMemo(() => {
    if (!highlightedNetId) return undefined;
    return netColorMap.get(highlightedNetId);
  }, [highlightedNetId, netColorMap]);
  
  // Memoize component filter logic
  const componentFilterActive = componentSearchFilter.trim().length > 0;

  // ─── Viewport Culling ──────────────────────────────────────
  const viewportBounds = useMemo(() => {
    return getVisibleBounds(zoom, pan, stageSize.width, stageSize.height);
  }, [zoom, pan, stageSize.width, stageSize.height]);

  // Filter visible items
  const visibleComponents = useMemo(() => {
    return components.filter((c) =>
      isComponentVisible(c.position.row, c.position.col, viewportBounds)
    );
  }, [components, viewportBounds]);

  const visibleStrips = useMemo(() => {
    return strips.filter((s) => {
      // Find the PCB this strip belongs to
      const pcb = pcbs.find(p => s.pcbId === p.id) || pcbs.find(p => p.isMain);
      const pcbPosition = pcb ? pcb.position : { row: 0, col: 0 };
      
      // Convert strip local coordinates to world coordinates
      const worldRow = s.row + pcbPosition.row;
      const worldStartCol = s.startCol + pcbPosition.col;
      const worldEndCol = s.endCol + pcbPosition.col;
      
      return isStripVisible(worldRow, worldStartCol, worldEndCol, viewportBounds);
    });
  }, [strips, viewportBounds, pcbs]);

  const visibleWires = useMemo(() => {
    return wires.filter((w) => isWireVisible(w.points, viewportBounds));
  }, [wires, viewportBounds]);

  // CRITICAL PERFORMANCE OPTIMIZATION:
  // Filter out components that would be dimmed due to net isolation
  // This completely removes them from the render tree instead of rendering with low opacity
  const renderableComponents = useMemo(() => {
    if (!highlightedNetId) return visibleComponents;
    
    return visibleComponents.filter(c => {
      // Check if any pin on this component connects to the highlighted net
      return c.pins.some(p => p.netId === highlightedNetId);
    });
  }, [visibleComponents, highlightedNetId]);

  // CRITICAL PERFORMANCE FLAG:
  // When opacity < 1.0, disable expensive rendering features (shadows, gradients)
  // This makes dimmed components render much faster
  const fastRenderMode = componentOpacity < 1.0;

  // SMART LAYER SEPARATION:
  // Split components into cached (background) and active (selected) for optimal performance
  // CRITICAL: Selected components must ALWAYS render, even when componentOpacity < 0.15
  const { backgroundComponents: backgroundComponentsRaw, activeComponents } = useMemo(() => {
    const selectedComponentIds = new Set(
      selectedItems.filter(id => {
        // Component IDs start with 'comp-'
        // Wires, strips, and other items have different prefixes
        return id.startsWith('comp-');
      })
    );
    
    // When heavily dimmed (< 0.15), only render selected components
    if (componentOpacity < 0.15) {
      return {
        backgroundComponents: [],
        activeComponents: renderableComponents.filter(c => selectedComponentIds.has(c.id))
      };
    }
    
    // Normal case: split components based on selection
    return {
      backgroundComponents: renderableComponents.filter(c => !selectedComponentIds.has(c.id)),
      activeComponents: renderableComponents.filter(c => selectedComponentIds.has(c.id))
    };
  }, [renderableComponents, selectedItems, componentOpacity]);

  // Keep the same array identity while its parts are unchanged so panning
  // doesn't re-cache, but any edit to an unselected part does.
  const backgroundComponents = useStableArray(backgroundComponentsRaw);

  // LAYER CACHING FOR BACKGROUND:
  // Cache the background layer (unselected components) when dimmed
  // CRITICAL: Clear cache immediately when selection changes, then re-cache after render
  // CRITICAL: Disable caching during drag for real-time updates
  useEffect(() => {
    if (!cachedComponentLayerRef.current) return;
    
    const layer = cachedComponentLayerRef.current;
    
    // Always clear cache immediately when dependencies change
    layer.clearCache();
    
    // During drag: keep uncached at full opacity (individual components handle dimming)
    if (isDragging) {
      layer.opacity(1);
      layer.batchDraw();
      return;
    }
    
    // Determine if we should cache
    const shouldCache = componentOpacity < 1.0 && componentOpacity >= 0.15;
    
    if (shouldCache) {
      // Force immediate render at full opacity (components handle their own opacity)
      layer.opacity(1);
      layer.batchDraw();
      
      requestAnimationFrame(() => {
        if (cachedComponentLayerRef.current && !isDragging) {
          cachedComponentLayerRef.current.cache();
          // Keep layer at full opacity - components have individual opacity
          cachedComponentLayerRef.current.opacity(1);
          cachedComponentLayerRef.current.batchDraw();
        }
      });
    } else {
      // No caching needed, just set opacity
      layer.opacity(1);
      layer.batchDraw();
    }
  }, [componentOpacity, backgroundComponents, highlightedNetId, selectedItems, isDragging, zoom]);

  // ACTIVE LAYER ALWAYS AT FULL OPACITY:
  // Selected components must be bright for interaction
  useEffect(() => {
    if (!activeComponentLayerRef.current) return;
    
    const layer = activeComponentLayerRef.current;
    layer.clearCache(); // Never cache the active layer
    layer.opacity(1); // Always full brightness for selected items
    layer.batchDraw();
  }, [componentOpacity, selectedItems, activeComponents.length]); // Update when selection changes!

  // Filter out wires that would be dimmed
  const renderableWires = useMemo(() => {
    if (!highlightedNetId) return visibleWires;
    
    return visibleWires.filter(w => {
      const detectedNetId = connectivity.wireNets.get(w.id) || w.netId || null;
      return detectedNetId === highlightedNetId;
    });
  }, [visibleWires, highlightedNetId, connectivity.wireNets]);

  // Create a fast lookup map for component definitions
  const definitionMap = useMemo(() => {
    const map = new Map<string, ComponentDefinition>();
    for (const def of componentDefinitions) {
      map.set(def.id, def);
    }
    return map;
  }, [componentDefinitions]);

  // Reset drawing state when tool changes
  useEffect(() => {
    setWirePoints([]);
    setWirePreviewPoint(null);
    interactionRef.current = null;
    setSelectionBox(null);
    setIsDragging(false);
    
    // Clean up drag listeners if tool changes
    if (selectionBoxCleanupRef.current) {
      selectionBoxCleanupRef.current();
      selectionBoxCleanupRef.current = null;
    }
  }, [activeTool, setSelectionBox]);

  // Clean up selection box listeners on unmount
  useEffect(() => {
    return () => {
      if (selectionBoxCleanupRef.current) {
        selectionBoxCleanupRef.current();
      }
    };
  }, []);

  // ─── Keyboard Shortcuts (Copy / Paste) ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      // Ignore while a modal dialog is open
      if (document.querySelector('[aria-modal="true"]')) return;

      // Copy: Cmd/Ctrl+C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelected]);

  // ─── Resize ────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Grid Math ─────────────────────────────────────────────
  const screenToGrid = useCallback(
    (sx: number, sy: number): GridPosition => ({
      col: Math.round((sx - pan.x) / zoom / GRID_PITCH),
      row: Math.round((sy - pan.y) / zoom / GRID_PITCH),
    }),
    [pan, zoom]
  );

  const clampToBoard = useCallback(
    (pos: GridPosition): GridPosition | null => {
      // Check if position is within any PCB
      for (const pcb of pcbs) {
        const localRow = pos.row - pcb.position.row;
        const localCol = pos.col - pcb.position.col;
        
        if (localRow >= 0 && localRow < pcb.rows && localCol >= 0 && localCol < pcb.cols) {
          // Position is within this PCB - return the world position
          return pos;
        }
      }
      
      // Not on any PCB - return null to indicate invalid position
      return null;
    },
    [pcbs]
  );

  const getGridFromPointer = useCallback(
    (e: KonvaEventObject<MouseEvent | WheelEvent>): GridPosition | null => {
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return null;
      const gridPos = screenToGrid(pointer.x, pointer.y);
      return clampToBoard(gridPos);
    },
    [screenToGrid, clampToBoard]
  );

  /** Convert pointer position to content (canvas) coordinates.
   *  Reads latest pan/zoom from the store to avoid stale closures. */
  const pointerToContent = useCallback(
    (pointerX: number, pointerY: number) => {
      const { pan: p, zoom: z } = useStripboardStore.getState();
      return {
        x: (pointerX - p.x) / z,
        y: (pointerY - p.y) / z,
      };
    },
    []
  );

  // ─── Selection Box Containment Check ───────────────────────
  const getItemsInSelectionBox = useCallback(
    (box: { x1: number; y1: number; x2: number; y2: number }): string[] => {
      const minX = Math.min(box.x1, box.x2);
      const maxX = Math.max(box.x1, box.x2);
      const minY = Math.min(box.y1, box.y2);
      const maxY = Math.max(box.y1, box.y2);

      const ids: string[] = [];

      // Check components — all pins must be inside the box
      for (const comp of layerVisibility.components ? components : []) {
        const allPinsInside = comp.pins.every((pin) => {
          const px = pin.position.col * GRID_PITCH;
          const py = pin.position.row * GRID_PITCH;
          return px >= minX && px <= maxX && py >= minY && py <= maxY;
        });
        if (allPinsInside) ids.push(comp.id);
      }

      // Check wires — all waypoints must be inside the box
      for (const wire of layerVisibility.wires ? wires : []) {
        const allPointsInside = wire.points.every((p) => {
          const px = p.col * GRID_PITCH;
          const py = p.row * GRID_PITCH;
          return px >= minX && px <= maxX && py >= minY && py <= maxY;
        });
        if (allPointsInside) ids.push(wire.id);
      }

      // Check cuts — each cut is a single point (row, col)
      for (const strip of layerVisibility.strips && layerVisibility.cuts ? strips : []) {
        // Find the PCB this strip belongs to for world coordinate conversion
        const pcb = pcbs.find(p => strip.pcbId === p.id) || pcbs.find(p => p.isMain);
        const pcbPosition = pcb ? pcb.position : { row: 0, col: 0 };
        const worldRow = strip.row + pcbPosition.row;
        
        // Merge cuts array with old breaks array using Map for deduplication
        const cutsArray = strip.cuts || [];
        const breaksArray = strip.breaks || [];
        
        const cutsByCol = new Map();
        cutsArray.forEach(cut => {
          cutsByCol.set(cut.col, cut);
        });
        breaksArray.forEach(col => {
          if (!cutsByCol.has(col)) {
            cutsByCol.set(col, { col, type: 'drill' as const });
          }
        });
        
        const allCuts = Array.from(cutsByCol.values());
        
        for (const cut of allCuts) {
          // Convert local column to world column for position check and ID
          const worldCol = cut.col + pcbPosition.col;
          const px = worldCol * GRID_PITCH;
          const py = worldRow * GRID_PITCH;
          if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
            // Cut IDs use world coordinates
            ids.push(`cut-${worldRow}-${worldCol}`);
          }
        }
      }

      // Check reference image — all four corners must be inside the box
      const { referenceImage: ref, referenceImages: refImgs } = useStripboardStore.getState();
      for (const img of refImgs) {
        if (!img.visible) continue;
        const iw = img.naturalWidth * img.scale;
        const ih = img.naturalHeight * img.scale;
        if (img.x >= minX && img.x + iw <= maxX && img.y >= minY && img.y + ih <= maxY) {
          ids.push(img.id);
        }
      }
      if (ref && ref.visible) {
        const rw = ref.naturalWidth * ref.scale;
        const rh = ref.naturalHeight * ref.scale;
        if (
          ref.x >= minX && ref.x + rw <= maxX &&
          ref.y >= minY && ref.y + rh <= maxY
        ) {
          ids.push(REF_IMAGE_ID);
        }
      }

      return ids;
    },
    [components, wires, strips, pcbs, layerVisibility]
  );

  // ─── Reference Prefix ─────────────────────────────────────
  const getRefPrefix = (defId: string, category: string): string => {
    if (defId.includes('resistor')) return 'R';
    if (defId.includes('capacitor') || defId.includes('electrolytic')) return 'C';
    if (defId.includes('inductor')) return 'L';
    if (defId.includes('led')) return 'D';
    if (defId.includes('diode') || defId.includes('zener')) return 'D';
    if (defId.includes('transistor') || defId.includes('jfet') || defId.includes('mosfet')) return 'Q';
    if (defId.includes('regulator') || defId.includes('shunt')) return 'U';
    if (defId.includes('trimpot') || defId.includes('potentiometer')) return 'RV';
    if (defId.includes('encoder')) return 'SW';
    if (defId.includes('switch') || defId.includes('button')) return 'SW';
    if (defId.includes('header')) return 'J';
    if (defId.includes('mcu-')) return 'U';
    if (category === 'IC') return 'U';
    if (category === 'Connector') return 'J';
    if (category === 'Discrete') return 'Q';
    return 'X';
  };

  // ─── ZOOM / PAN (Wheel) ────────────────────────────────────
  // Matches KiCad defaults:
  //   Plain scroll / two-finger vertical swipe → Zoom
  //   Shift / Cmd + scroll, or horizontal two-finger scroll → Pan left/right
  //   Pinch-to-zoom (browser sends ctrlKey) → Zoom
  //
  // Reads latest state from store (not render closure) to avoid
  // stale values during rapid scroll sequences.
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const evt = e.evt;
    const { pan: curPan, zoom: curZoom } = useStripboardStore.getState();

    const action = interpretWheel(evt, stage.height());
    if (action.kind === 'pan') {
      setPan({ x: curPan.x + action.dx, y: curPan.y + action.dy });
    } else if (action.kind === 'zoom') {
      // Zoom at cursor (pointer-anchored).
      const mousePointTo = {
        x: (pointer.x - curPan.x) / curZoom,
        y: (pointer.y - curPan.y) / curZoom,
      };
      const newZoom = Math.max(0.15, Math.min(5, curZoom * action.factor));
      setZoom(newZoom);
      setPan({
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      });
    }
  };

  // ─── MIDDLE / RIGHT BUTTON PAN (native DOM) ───────────────
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle (1) or right (2) button → start pan
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const { pan: currentPan } = useStripboardStore.getState();
        const startPanX = currentPan.x;
        const startPanY = currentPan.y;

        const onMouseMove = (moveEvt: MouseEvent) => {
          const dx = moveEvt.clientX - startX;
          const dy = moveEvt.clientY - startY;
          setPan({ x: startPanX + dx, y: startPanY + dy });
        };
        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    },
    [setPan]
  );

  // ─── MOUSE DOWN (Konva — left button + right-click detection) ──
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;

    // Close any open context menu on any click
    if (contextMenu) setContextMenu(null);
    if (imageContextMenu) setImageContextMenu(null);

    // Right-click: detect if clicking on a component or image for context menu
    if (evt.button === 2) {
      const itemId = getItemIdFromTarget(e.target);
      if (itemId) {
        const comp = components.find((c) => c.id === itemId);
        const img =
          referenceImages.find((img) => img.id === itemId) ||
          (itemId === REF_IMAGE_ID && referenceImage ? referenceImage : undefined);
        if (comp || img) {
          // Menu actions act on the clicked item: select it if it isn't selected
          if (!useStripboardStore.getState().selectedItems.includes(itemId)) {
            setSelectedItems([itemId]);
          }
          rightClickedRef.current = itemId;
          // Stop propagation so the container handler doesn't start panning
          evt.stopPropagation();
          return;
        }
      }
      rightClickedRef.current = null;
      return;
    }

    if (evt.button !== 0) return; // Only handle left button from here on

    // Dragging a Transformer handle must not start a box-select / deselect
    if (isTransformerTarget(e.target)) return;

    // ── Pan tool: left-click pans ─────────────────────────
    if (activeTool === 'pan') {
      const startX = evt.clientX;
      const startY = evt.clientY;
      const { pan: currentPan } = useStripboardStore.getState();
      const startPanX = currentPan.x;
      const startPanY = currentPan.y;

      panMovedRef.current = false;
      const onMove = (me: MouseEvent) => {
        if (Math.hypot(me.clientX - startX, me.clientY - startY) >= DRAG_THRESHOLD) {
          panMovedRef.current = true;
        }
        setPan({
          x: startPanX + me.clientX - startX,
          y: startPanY + me.clientY - startY,
        });
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      return;
    }

    // ── Select tool: start interaction tracking ──────────
    if (activeTool === 'select') {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const content = pointerToContent(pointer.x, pointer.y);
      const itemId = getItemIdFromTarget(e.target);

      interactionRef.current = {
        type: 'pending',
        startScreenX: evt.clientX,
        startScreenY: evt.clientY,
        startContentX: content.x,
        startContentY: content.y,
        clickedItemId: itemId,
        shiftKey: evt.shiftKey,
        metaKey: evt.metaKey || evt.ctrlKey,
      };
      return;
    }

    // ── Cut tool: start cut dragging ─────────────────────
    if (activeTool === 'drillCut' || activeTool === 'sliceCut') {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const grid = clampToBoard(screenToGrid(pointer.x, pointer.y));
      if (!grid) return;
      
      const cutType = activeTool === 'drillCut' ? 'drill' : 'slice';
      
      // For slice cuts, position between holes (col + 0.5)
      // For drill cuts, position on the hole (integer col)
      const cutCol = cutType === 'slice' ? grid.col + 0.5 : grid.col;
      
      // Find which PCB and strip this position belongs to
      let strip: StripType | undefined;
      for (const pcb of pcbs) {
        const localRow = grid.row - pcb.position.row;
        const localCol = grid.col - pcb.position.col;
        
        // Check if position is within this PCB's bounds
        if (localRow >= 0 && localRow < pcb.rows && localCol >= 0 && localCol < pcb.cols) {
          // Find the strip on this PCB
          const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
          strip = strips.find((s) => s.id === stripId);
          break;
        }
      }
      
      if (!strip) return;

      // Save history once at the start of the drag
      saveToHistory();
      dragHistorySavedRef.current = true;
      
      // Determine mode: if there's already a cut here, we'll be removing; otherwise adding
      const cuts = strip.cuts || [];
      const hasCut = cuts.some(c => c.col === cutCol);
      const mode = hasCut ? 'remove' : 'add';
      
      // Apply the first cut/remove
      if (mode === 'add') {
        addCut(grid.row, cutCol, cutType);
      } else {
        removeCut(grid.row, cutCol);
      }
      
      // Set up tracking for drag
      const visitedPositions = new Set<string>();
      visitedPositions.add(`${grid.row}:${cutCol}`);
      
      interactionRef.current = {
        type: 'cutDragging',
        mode,
        cutType,
        lastGridRow: grid.row,
        lastGridCol: grid.col,
        visitedPositions,
      };
      registerDragListeners();
      return;
    }
  };

  // ─── MOUSE MOVE (Konva) ───────────────────────────────────
  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;

    // Track cursor grid position only for tools that need it
    if (activeTool === 'drillCut' || activeTool === 'sliceCut' || activeTool === 'routeWire') {
      const grid = getGridFromPointer(e);
      if (grid) {
        // Only update if position actually changed
        setCursorGridPos(prev => 
          (prev?.row === grid.row && prev?.col === grid.col) ? prev : grid
        );
      }
    }

    // Wire routing preview
    if (activeTool === 'routeWire' && wirePoints.length > 0) {
      const grid = getGridFromPointer(e);
      if (grid) setWirePreviewPoint(grid);
    }

    const interaction = interactionRef.current;
    if (!interaction) return;

    // Button was released somewhere we didn't see it: end the gesture
    if ((evt.buttons & 1) === 0) {
      if (interaction.type === 'pending') interactionRef.current = null;
      else finishInteractionRef.current();
      return;
    }

    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;

    // ── Pending: check if we've dragged past the threshold ──
    if (interaction.type === 'pending') {
      const dx = evt.clientX - interaction.startScreenX;
      const dy = evt.clientY - interaction.startScreenY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

      if (interaction.clickedItemId === null) {
        // ── Clicked on empty space → start SELECTION BOX ──
        interactionRef.current = {
          type: 'selectionBox',
          startContentX: interaction.startContentX,
          startContentY: interaction.startContentY,
          shiftKey: interaction.shiftKey,
          metaKey: interaction.metaKey,
        };
        const content = pointerToContent(pointer.x, pointer.y);
        setSelectionBox({
          x1: interaction.startContentX,
          y1: interaction.startContentY,
          x2: content.x,
          y2: content.y,
        });

        // Document-level listeners so the box keeps tracking outside the canvas
        const handleDocumentMouseMove = (moveEvt: MouseEvent) => {
          const stage = stageRef.current;
          const prev = selectionBoxRef.current;
          if (!stage || !prev) return;
          const rect = stage.container().getBoundingClientRect();
          const c = pointerToContent(moveEvt.clientX - rect.left, moveEvt.clientY - rect.top);
          setSelectionBox({ ...prev, x2: c.x, y2: c.y });
        };
        registerDragListeners(handleDocumentMouseMove);
      } else {
        // ── Clicked on an item → check for PIN DRAG or MULTI-DRAG ──
        const itemId = interaction.clickedItemId;
        const currentSelected =
          useStripboardStore.getState().selectedItems;

        // Check if this is a pin drag on a draggable component
        const clickedComp = components.find((c) => c.id === itemId);
        const clickedDef = clickedComp ? definitionMap.get(clickedComp.definitionId) : null;

        if (clickedComp && clickedDef && isPinDraggable(clickedDef)) {
          // Only start pin drag if the click is close to an actual pin
          // (not just rounded to the same grid cell — prevents body clicks
          // on multi-pin components like TO-92 from hijacking drag)
          const clickPxX = interaction.startContentX;
          const clickPxY = interaction.startContentY;
          const PIN_HIT_RADIUS = scaleHitTolerance(GRID_PITCH * 0.3, useStripboardStore.getState().zoom);
          let closestPinIdx = -1;
          let closestPinDist = Infinity;
          clickedComp.pins.forEach((p, i) => {
            const px = p.position.col * GRID_PITCH;
            const py = p.position.row * GRID_PITCH;
            const d = Math.sqrt((clickPxX - px) ** 2 + (clickPxY - py) ** 2);
            if (d < closestPinDist) {
              closestPinDist = d;
              closestPinIdx = i;
            }
          });
          if (closestPinIdx !== -1 && closestPinDist <= PIN_HIT_RADIUS) {
            // Start PIN DRAG
            if (!currentSelected.includes(itemId)) {
              setSelectedItems([itemId]);
            }
            dragHistorySavedRef.current = false;
            interactionRef.current = {
              type: 'pinDragging',
              componentId: clickedComp.id,
              pinIndex: closestPinIdx,
              lastGridRow: clickedComp.pins[closestPinIdx].position.row,
              lastGridCol: clickedComp.pins[closestPinIdx].position.col,
            };
            setIsDragging(true);
            registerDragListeners();
            return;
          }
        }

        if (!currentSelected.includes(itemId)) {
          // Item was not selected — select it (shift adds, otherwise replace)
          if (interaction.shiftKey) {
            addToSelection([itemId]);
          } else {
            setSelectedItems([itemId]);
          }
        }

        // History is saved lazily on the first real move
        dragHistorySavedRef.current = false;

        const startGrid = {
          row: Math.round(interaction.startContentY / GRID_PITCH),
          col: Math.round(interaction.startContentX / GRID_PITCH),
        };

        interactionRef.current = {
          type: 'dragging',
          lastGridRow: startGrid.row,
          lastGridCol: startGrid.col,
          lastContentX: interaction.startContentX,
          lastContentY: interaction.startContentY,
        };
        
        // Set dragging state to disable caching for real-time updates
        setIsDragging(true);
        registerDragListeners();
      }
      return;
    }

    // ── Active SELECTION BOX → update dimensions ────────────
    if (interaction.type === 'selectionBox') {
      const content = pointerToContent(pointer.x, pointer.y);
      const prevBox = selectionBoxRef.current;
      if (prevBox) setSelectionBox({ ...prevBox, x2: content.x, y2: content.y });
      return;
    }

    // ── Active MULTI-DRAG → move selected items by grid delta
    if (interaction.type === 'dragging') {
      const content = pointerToContent(pointer.x, pointer.y);
      const currentSelected = useStripboardStore.getState().selectedItems;
      const currentRefImages = useStripboardStore.getState().referenceImages;
      
      // Check if all selected items are reference images
      const selectedRefImages = currentSelected.filter((id) =>
        currentRefImages.some((img) => img.id === id)
      );
      const allAreRefImages = selectedRefImages.length === currentSelected.length;

      if (allAreRefImages && selectedRefImages.length > 0) {
        // Reference image(s): pixel-level free-drag (not grid-snapped)
        const dx = content.x - interaction.lastContentX;
        const dy = content.y - interaction.lastContentY;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          ensureDragHistory();
          selectedRefImages.forEach((imgId) => {
            const img = currentRefImages.find((i) => i.id === imgId);
            if (img) {
              updateReferenceImageById(imgId, { x: img.x + dx, y: img.y + dy });
            }
          });
          interaction.lastContentX = content.x;
          interaction.lastContentY = content.y;
        }
      } else {
        // Standard grid-snapped drag for components/wires/cuts
        const newGridRow = Math.round(content.y / GRID_PITCH);
        const newGridCol = Math.round(content.x / GRID_PITCH);

        const deltaRow = newGridRow - interaction.lastGridRow;
        const deltaCol = newGridCol - interaction.lastGridCol;

        if (deltaRow !== 0 || deltaCol !== 0) {
          ensureDragHistory();
          moveSelectedItems(deltaRow, deltaCol);
          interaction.lastGridRow = newGridRow;
          interaction.lastGridCol = newGridCol;
          
          // Force immediate redraw of active layer during drag
          if (activeComponentLayerRef.current) {
            activeComponentLayerRef.current.batchDraw();
          }
        }
      }
      return;
    }

    // ── Active PIN DRAGGING → move single pin ────────────────
    if (interaction.type === 'pinDragging') {
      const content = pointerToContent(pointer.x, pointer.y);
      const newGridRow = Math.round(content.y / GRID_PITCH);
      const newGridCol = Math.round(content.x / GRID_PITCH);

      if (newGridRow !== interaction.lastGridRow || newGridCol !== interaction.lastGridCol) {
        const comp = components.find((c) => c.id === interaction.componentId);
        if (comp) {
          const def = definitionMap.get(comp.definitionId);
          if (def) {
            // Constraint: max distance from any other pin
            const limits = getPinDragLimits(def);
            const otherPins = comp.pins.filter((_, i) => i !== interaction.pinIndex);
            const tooFar = otherPins.some((p) => {
              const dr = newGridRow - p.position.row;
              const dc = newGridCol - p.position.col;
              return Math.sqrt(dr * dr + dc * dc) > limits.maxDist + 0.01;
            });
            const tooClose = otherPins.some((p) => {
              const dr = newGridRow - p.position.row;
              const dc = newGridCol - p.position.col;
              const d = Math.sqrt(dr * dr + dc * dc);
              return d < limits.minDist - 0.01 || (p.position.row === newGridRow && p.position.col === newGridCol);
            });
            if (!tooFar && !tooClose) {
              ensureDragHistory();
              moveComponentPin(interaction.componentId, interaction.pinIndex, {
                row: newGridRow,
                col: newGridCol,
              });
              interaction.lastGridRow = newGridRow;
              interaction.lastGridCol = newGridCol;

              if (activeComponentLayerRef.current) {
                activeComponentLayerRef.current.batchDraw();
              }
            }
          }
        }
      }
      return;
    }

    // ── Active CUT DRAGGING → apply cuts/removals as we drag ───
    if (interaction.type === 'cutDragging') {
      const grid = clampToBoard(screenToGrid(pointer.x, pointer.y));
      if (!grid) return;
      
      // Calculate cut position based on type
      const cutCol = interaction.cutType === 'slice' ? grid.col + 0.5 : grid.col;
      
      // Only process if we've moved to a new grid position
      if (grid.row !== interaction.lastGridRow || grid.col !== interaction.lastGridCol) {
        const posKey = `${grid.row}:${cutCol}`;
        
        // Only apply if we haven't visited this position yet
        if (!interaction.visitedPositions.has(posKey)) {
          // Find which PCB and strip this position belongs to
          let strip: StripType | undefined;
          for (const pcb of pcbs) {
            const localRow = grid.row - pcb.position.row;
            const localCol = grid.col - pcb.position.col;
            
            // Check if position is within this PCB's bounds
            if (localRow >= 0 && localRow < pcb.rows && localCol >= 0 && localCol < pcb.cols) {
              // Find the strip on this PCB
              const stripId = pcb.isMain ? `strip-row-${localRow}` : `${pcb.id}-strip-row-${localRow}`;
              strip = strips.find((s) => s.id === stripId);
              break;
            }
          }
          
          if (strip) {
            // Apply the cut/remove based on the initial mode
            if (interaction.mode === 'add') {
              addCut(grid.row, cutCol, interaction.cutType);
            } else {
              removeCut(grid.row, cutCol);
            }
            
            // Mark this position as visited
            interaction.visitedPositions.add(posKey);
          }
        }
        
        // Update last position
        interaction.lastGridRow = grid.row;
        interaction.lastGridCol = grid.col;
      }
      return;
    }
  };

  // ─── Drag helpers ──────────────────────────────────────────
  /** Push one history entry at the first real change of a drag. */
  const ensureDragHistory = () => {
    if (!dragHistorySavedRef.current) {
      saveToHistory();
      dragHistorySavedRef.current = true;
    }
  };

  /** Document-level listeners so a drag ends even if the mouse is released
   *  outside the canvas or the window loses focus, and Escape cancels it. */
  const registerDragListeners = (onMove?: (e: MouseEvent) => void) => {
    selectionBoxCleanupRef.current?.();
    const onUp = (ev: MouseEvent) => {
      if (ev.button === 0) finishInteractionRef.current();
    };
    const onBlur = () => finishInteractionRef.current();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation(); // keep App's global Escape (deselectAll) from running
        cancelInteractionRef.current();
      }
    };
    if (onMove) document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKey, { capture: true });
    selectionBoxCleanupRef.current = () => {
      if (onMove) document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  };

  /** Finish the current interaction. Safe to call more than once: only the
   *  first call sees an interaction. */
  const finishInteraction = () => {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    selectionBoxCleanupRef.current?.();
    selectionBoxCleanupRef.current = null;
    if (!interaction) return;

    // ── Pending (no drag occurred) → treat as CLICK ──────
    if (interaction.type === 'pending') {
      if (activeTool === 'select') {
        const itemId = interaction.clickedItemId;
        if (itemId === null) {
          deselectAll();
        } else if (interaction.shiftKey) {
          addToSelection([itemId]);
        } else if (interaction.metaKey) {
          removeFromSelection([itemId]);
        } else {
          setSelectedItems([itemId]);
        }
      }
      return;
    }

    // ── Selection box complete → apply selection (once) ──
    if (interaction.type === 'selectionBox') {
      const box = selectionBoxRef.current;
      setSelectionBox(null);
      if (box) {
        const enclosedIds = getItemsInSelectionBox(box);
        if (interaction.shiftKey) {
          addToSelection(enclosedIds);
        } else if (interaction.metaKey) {
          removeFromSelection(enclosedIds);
        } else {
          setSelectedItems(enclosedIds);
        }
      }
      return;
    }

    if (interaction.type === 'dragging') {
      setIsDragging(false); // Re-enable caching
      return;
    }

    if (interaction.type === 'pinDragging') {
      if (dragHistorySavedRef.current) finalizePinDrag(interaction.componentId);
      setIsDragging(false);
      return;
    }
    // cutDragging: cuts were applied during the drag.
  };

  /** Escape: abandon the drag and restore the pre-drag state. */
  const cancelInteraction = () => {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    selectionBoxCleanupRef.current?.();
    selectionBoxCleanupRef.current = null;
    if (!interaction) return;
    if (interaction.type === 'selectionBox') {
      setSelectionBox(null);
      return;
    }
    if (interaction.type === 'pending') return;
    if (dragHistorySavedRef.current) {
      const sel = useStripboardStore.getState().selectedItems;
      undo();
      setSelectedItems(sel);
    }
    dragHistorySavedRef.current = false;
    setIsDragging(false);
  };

  finishInteractionRef.current = finishInteraction;
  cancelInteractionRef.current = cancelInteraction;

  // ─── MOUSE UP (Konva — left button) ───────────────────────
  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    finishInteraction();
  };

  // ─── CLICK (non-select tools: wire routing, cut strip, etc.) ──
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    // Select tool is fully handled by mousedown/mouseup
    if (activeTool === 'select') return;

    // Only the left button places waypoints / deselects
    if (e.evt.button !== 0) return;

    // Pan tool: click empty space → deselect (not after a pan drag)
    if (activeTool === 'pan') {
      if (panMovedRef.current) {
        panMovedRef.current = false;
        return;
      }
      if (e.target === e.target.getStage()) {
        deselectAll();
      }
      return;
    }

    // Get grid position
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return;
    const grid = clampToBoard(screenToGrid(pointer.x, pointer.y));
    if (!grid) return;

    // Wire routing
    if (activeTool === 'routeWire') {
      const last = wirePoints[wirePoints.length - 1];
      if (last && last.row === grid.row && last.col === grid.col) {
        // Clicked same point → finish wire
        if (wirePoints.length >= 2) {
          saveToHistory();
          addWire({
            id: `wire-${Date.now()}`,
            netId: '',
            points: [...wirePoints],
          });
        }
        setWirePoints([]);
        setWirePreviewPoint(null);
      } else {
        setWirePoints((prev) => [...prev, grid]);
      }
      return;
    }

    // Cut strip — now fully handled by mousedown/mousemove/mouseup
    if (activeTool === 'drillCut' || activeTool === 'sliceCut') {
      // No-op: cut dragging is handled in mouse down/move/up
      return;
    }
  };

  // ─── DROP (Component Placement) ────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const defId = e.dataTransfer.getData('component');
    if (!defId) return;

    const def = componentDefinitions.find((d) => d.id === defId);
    if (!def) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const raw = screenToGrid(sx, sy);

    // Rotation and pin offsets first, so the clamp uses the real extents
    const rotation = getDefaultRotation();
    const rotatedPinPositions = getRotatedPinPositions(def.pins, rotation);

    // Clamp inside the PCB under the cursor; drop unclamped over no PCB
    const pos: GridPosition = clampDropPosition(pcbs, raw, pinExtents(rotatedPinPositions));

    // Generate reference
    const prefix = getRefPrefix(def.id, def.category);
    const currentComponents = useStripboardStore.getState().components;
    const nums = currentComponents
      .filter((c) => c.reference.startsWith(prefix))
      .map((c) => parseInt(c.reference.slice(prefix.length)))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    saveToHistory();
    addComponent({
      id: uniqueId('comp'),
      reference: `${prefix}${nextNum}`,
      definitionId: def.id,
      position: pos,
      rotation,
      pins: rotatedPinPositions.map((rotatedPos, idx) => ({
        number: def.pins[idx].number,
        position: {
          row: pos.row + rotatedPos.row,
          col: pos.col + rotatedPos.col,
        },
        extended: 0,
      })),
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // ─── Context Menu (component right-click or suppress) ──────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // If a component or image was right-clicked (detected in handleMouseDown)
      if (rightClickedRef.current) {
        const itemId = rightClickedRef.current;
        
        // Check if it's a component
        const comp = components.find((c) => c.id === itemId);
        if (comp) {
          setContextMenu({
            componentId: itemId,
            x: e.clientX,
            y: e.clientY,
          });
          rightClickedRef.current = null;
          return;
        }
        
        // Check if it's a reference image
        const img =
          referenceImages.some((img) => img.id === itemId) ||
          (itemId === REF_IMAGE_ID && !!referenceImage);
        if (img) {
          setImageContextMenu({
            imageId: itemId,
            x: e.clientX,
            y: e.clientY,
          });
          rightClickedRef.current = null;
          return;
        }
        
        rightClickedRef.current = null;
      }
    },
    [components, referenceImages, referenceImage]
  );

  // ─── Context Menu Actions ─────────────────────────────────
  const handleEditComponent = useCallback((id: string) => {
    // Check if multiple components of the same type are selected
    const comp = components.find((c) => c.id === id);
    if (!comp) {
      setEditingComponentIds([id]);
      return;
    }
    
    const currentSelected = useStripboardStore.getState().selectedItems;
    const selectedComps = components.filter((c) => currentSelected.includes(c.id));
    const sameTypeComps = selectedComps.filter((c) => c.definitionId === comp.definitionId);
    
    // If multiple components of same type are selected, edit them all
    if (sameTypeComps.length > 1) {
      setEditingComponentIds(sameTypeComps.map((c) => c.id));
    } else {
      setEditingComponentIds([id]);
    }
  }, [components]);

  const handleRotateComponent = useCallback(
    (id: string) => {
      // rotateComponent pushes its own history entry
      rotateComponent(id);
    },
    [rotateComponent]
  );

  const handleDeleteComponent = useCallback(
    (id: string) => {
      saveToHistory();
      removeComponent(id);
    },
    [saveToHistory, removeComponent]
  );

  const handleDuplicateComponent = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (!comp) return;
      const def = componentDefinitions.find(
        (d) => d.id === comp.definitionId
      );
      if (!def) return;

      // Generate next reference number
      const prefix = comp.reference.replace(/[0-9]/g, '');
      const currentComponents = useStripboardStore.getState().components;
      const nums = currentComponents
        .filter((c) => c.reference.startsWith(prefix))
        .map((c) => parseInt(c.reference.slice(prefix.length)))
        .filter((n) => !isNaN(n));
      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

      // Place duplicate offset by 2 grid positions, kept inside its PCB
      let newPos = {
        row: comp.position.row + 2,
        col: comp.position.col + 2,
      };
      const pcb = findPcbAt(pcbs, comp.position.row, comp.position.col);
      if (pcb) {
        newPos = clampPartToPcb(
          newPos,
          pinExtents(
            comp.pins.map((p) => ({
              row: p.position.row - comp.position.row,
              col: p.position.col - comp.position.col,
            }))
          ),
          pcb
        );
      }

      saveToHistory();
      addComponent({
        id: uniqueId('comp'),
        reference: `${prefix}${nextNum}`,
        value: comp.value,
        definitionId: comp.definitionId,
        position: newPos,
        rotation: comp.rotation,
        pins: comp.pins.map((pin) => ({
          number: pin.number,
          netId: undefined,
          position: {
            row: newPos.row + (pin.position.row - comp.position.row),
            col: newPos.col + (pin.position.col - comp.position.col),
          },
          extended: 0,
        })),
      });
    },
    [components, componentDefinitions, pcbs, saveToHistory, addComponent]
  );

  const handleResetToDefault = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (!comp) return;

      // Find base definition by removing custom variant suffixes
      const baseDefId = comp.definitionId
        .replace(/-custom-.*$/, '') // Remove "-custom-..." suffix
        .replace(/^(.*?)-custom$/, '$1'); // Remove "-custom" suffix if at end
      
      const baseDef = componentDefinitions.find((d) => d.id === baseDefId);
      if (!baseDef) {
        console.warn(`Base definition not found for ${comp.definitionId}`);
        return;
      }

      // Rebuild component with rotated pins from the base definition
      const rotatedPins = getRotatedPinPositions(baseDef.pins, comp.rotation);
      const newPins: ComponentPin[] = rotatedPins.map((rotatedPos, idx) => {
        const originalPin = comp.pins[idx];
        return {
          number: baseDef.pins[idx].number,
          netId: originalPin?.netId, // Preserve net connections
          position: {
            row: comp.position.row + rotatedPos.row,
            col: comp.position.col + rotatedPos.col,
          },
          extended: 0,
        };
      });

      saveToHistory();
      const { updateComponent } = useStripboardStore.getState();
      updateComponent(id, {
        definitionId: baseDefId,
        pins: newPins,
      });
    },
    [components, componentDefinitions, saveToHistory]
  );

  // ─── Image Context Menu Actions ────────────────────────────
  const handleCropImage = useCallback((id: string) => {
    setCroppingImageId(id);
  }, []);

  const handleDeleteImage = useCallback(
    (id: string) => {
      // The menu saves history before calling this
      if (id === REF_IMAGE_ID) {
        clearReferenceImage();
        const st = useStripboardStore.getState();
        st.setSelectedItems(st.selectedItems.filter((x) => x !== id));
        return;
      }
      useStripboardStore.getState().removeReferenceImage(id);
    },
    [clearReferenceImage]
  );

  // ─── Computed ──────────────────────────────────────────────
  // Stage is NEVER natively draggable — all panning is manual
  const stageDraggable = false;

  // Wire preview
  const wirePreviewAll =
    wirePoints.length > 0
      ? [...wirePoints, ...(wirePreviewPoint ? [wirePreviewPoint] : [])]
      : [];
  const wirePreviewFlat = wirePreviewAll.flatMap((p) => [
    p.col * GRID_PITCH,
    p.row * GRID_PITCH,
  ]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-hidden"
      style={{
        background: '#09090b',
        cursor: getCursorForTool(activeTool),
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onMouseDown={handleContainerMouseDown}
      onContextMenu={handleContextMenu}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        draggable={stageDraggable}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        {/* Layer 1: Static board elements (grid + strips) */}
        <Layer listening={false}>
          {/* Grid (board background + holes) */}
          {layerVisibility.board && <Grid viewportBounds={viewportBounds} />}

          {/* Copper strips */}
          {layerVisibility.strips &&
            visibleStrips.map((s) => {
              // Find the PCB this strip belongs to
              const pcb = pcbs.find(p => s.pcbId === p.id) || pcbs.find(p => p.isMain);
              const pcbPosition = pcb ? pcb.position : { row: 0, col: 0 };
              
              return (
                <Strip
                  key={s.id}
                  strip={s}
                  showCuts={layerVisibility.cuts}
                  showNetHighlight={layerVisibility.nets}
                  segmentNets={connectivity.segmentNets}
                  segmentErrors={layerVisibility.errors ? connectivity.segmentErrors : undefined}
                  netColorMap={netColorMap}
                  highlightedNetId={highlightedNetId}
                  stripColor={stripColor}
                  netHighlightMode={netHighlightMode}
                  components={components}
                  wires={wires}
                  wireNets={connectivity.wireNets}
                  pcbPosition={pcbPosition}
                />
              );
            })}
        </Layer>

        {/* Layer 1b: Interactive cut markers (must be listening for selection/dragging) */}
        <Layer>
          {layerVisibility.strips &&
            visibleStrips.map((s) => {
              // Find the PCB this strip belongs to
              const pcb = pcbs.find(p => s.pcbId === p.id) || pcbs.find(p => p.isMain);
              const pcbPosition = pcb ? pcb.position : { row: 0, col: 0 };
              
              // Convert strip's local row to world row
              const worldRow = s.row + pcbPosition.row;
              
              // Merge cuts array with old breaks array for backward compatibility
              const cutsArray = s.cuts || [];
              const breaksArray = s.breaks || [];
              
              const cutsByCol = new Map();
              cutsArray.forEach(cut => {
                cutsByCol.set(cut.col, cut);
              });
              breaksArray.forEach(col => {
                if (!cutsByCol.has(col)) {
                  cutsByCol.set(col, { col, type: 'drill' as const });
                }
              });
              
              const allCuts = Array.from(cutsByCol.values());
              
              return allCuts.map((cut) => {
                // Convert local column to world column for cut ID
                const worldCol = cut.col + pcbPosition.col;
                const cutId = `cut-${worldRow}-${worldCol}`;
                const isSelected = selectedItems.includes(cutId);
                
                return (
                  <CutMarker
                    key={cutId}
                    cut={cut}
                    stripRow={s.row}
                    cutId={cutId}
                    isSelected={isSelected}
                    showCuts={layerVisibility.cuts}
                    pcbPosition={pcbPosition}
                  />
                );
              });
            }).flat()}
        </Layer>

        {/* Layer 2a: Cached background components (dimmed, unselected) */}
        <Layer ref={cachedComponentLayerRef}>
          {/* Background (unselected) components */}
          {layerVisibility.components &&
            backgroundComponents.map((c: ComponentType) => {
              const def = definitionMap.get(c.definitionId);
              if (!def) {
                // Render error placeholder for broken components
                return (
                  <Group
                    key={c.id}
                    name={`component:${c.id}`}
                    x={c.position.col * GRID_PITCH}
                    y={c.position.row * GRID_PITCH}
                  >
                    {/* Error indicator box */}
                    <Rect
                      x={-GRID_PITCH * 0.5}
                      y={-GRID_PITCH * 0.5}
                      width={GRID_PITCH}
                      height={GRID_PITCH}
                      fill="#dc2626"
                      stroke="#ef4444"
                      strokeWidth={2}
                      cornerRadius={3}
                      opacity={0.8}
                    />
                    {/* Error icon (X) */}
                    <Line
                      points={[
                        -GRID_PITCH * 0.3, -GRID_PITCH * 0.3,
                        GRID_PITCH * 0.3, GRID_PITCH * 0.3
                      ]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <Line
                      points={[
                        GRID_PITCH * 0.3, -GRID_PITCH * 0.3,
                        -GRID_PITCH * 0.3, GRID_PITCH * 0.3
                      ]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    {/* Reference label */}
                    {layerVisibility.refDesignations && (
                      <Text
                        x={-GRID_PITCH * 0.5}
                        y={GRID_PITCH * 0.6}
                        width={GRID_PITCH}
                        text={c.reference}
                        fontSize={8}
                        fontFamily="monospace"
                        fill="#ef4444"
                        align="center"
                        fontStyle="bold"
                      />
                    )}
                    {/* "Broken" label */}
                    <Text
                      x={-GRID_PITCH * 0.5}
                      y={GRID_PITCH * 0.8}
                      width={GRID_PITCH}
                      text="BROKEN"
                      fontSize={6}
                      fontFamily="monospace"
                      fill="#ef4444"
                      align="center"
                    />
                  </Group>
                );
              }
              
              const compFilterMatch = !componentFilterActive ||
                c.reference.toLowerCase().includes(componentSearchFilter.toLowerCase()) ||
                (c.value || '').toLowerCase().includes(componentSearchFilter.toLowerCase()) ||
                (def.name || '').toLowerCase().includes(componentSearchFilter.toLowerCase());
              return (
                <Component
                  key={c.id}
                  component={c}
                  definition={def}
                  isSelected={false}
                  showRefs={layerVisibility.refDesignations}
                  showValues={layerVisibility.values}
                  highlightedNetId={componentFilterActive && !compFilterMatch ? '__dim__' : highlightedNetId}
                  hlNetColor={hlNetColor}
                  connectedGroups={highlightedNetId ? connectivity.connectedGroups : undefined}
                  zoom={zoom}
                  opacity={componentOpacity}
                  disableShadows={fastRenderMode}
                />
              );
            })}
        </Layer>

        {/* Layer 2b: Active components + wires (uncached, for smooth interaction) */}
        <Layer ref={activeComponentLayerRef}>
          {/* Reference images (below components when not on-top) */}
          {referenceImages
            .filter((img) => img.visible && !img.onTop)
            .map((img) => (
              <ReferenceImage
                key={img.id}
                id={img.id}
                src={img.src}
                x={img.x}
                y={img.y}
                width={img.naturalWidth * img.scale}
                height={img.naturalHeight * img.scale}
                inverted={img.inverted}
                opacity={img.opacity}
                isSelected={selectedItems.includes(img.id)}
                onTransformEnd={(nx, ny, scaleMul) => {
                  saveToHistory();
                  updateReferenceImageById(img.id, {
                    x: nx,
                    y: ny,
                    scale: img.scale * scaleMul,
                  });
                }}
              />
            ))}

          {/* Legacy single reference image support (below components when not on-top) */}
          {referenceImage && referenceImage.visible && !referenceImage.onTop && (
            <ReferenceImage
              id={REF_IMAGE_ID}
              src={referenceImage.src}
              x={referenceImage.x}
              y={referenceImage.y}
              width={referenceImage.naturalWidth * referenceImage.scale}
              height={referenceImage.naturalHeight * referenceImage.scale}
              inverted={referenceImage.inverted}
              opacity={referenceImage.opacity || 1.0}
              isSelected={selectedItems.includes(REF_IMAGE_ID)}
              onTransformEnd={(nx, ny, scaleMul) => {
                saveToHistory();
                updateReferenceImage({
                  x: nx,
                  y: ny,
                  scale: referenceImage.scale * scaleMul,
                });
              }}
            />
          )}

          {/* Active (selected) components */}
          {layerVisibility.components &&
            activeComponents.map((c: ComponentType) => {
              const def = definitionMap.get(c.definitionId);
              if (!def) {
                // Definition not found - render error placeholder
                console.warn(`Component ${c.reference} (${c.id}) has invalid definitionId: ${c.definitionId}`);
                const isSelected = selectedItems.includes(c.id);
                return (
                  <Group
                    key={c.id}
                    name={`component:${c.id}`}
                    x={c.position.col * GRID_PITCH}
                    y={c.position.row * GRID_PITCH}
                  >
                    {/* Error indicator box */}
                    <Rect
                      x={-GRID_PITCH * 0.5}
                      y={-GRID_PITCH * 0.5}
                      width={GRID_PITCH}
                      height={GRID_PITCH}
                      fill="#dc2626"
                      stroke={isSelected ? '#c8ff2e' : '#ef4444'}
                      strokeWidth={isSelected ? 3 : 2}
                      cornerRadius={3}
                      opacity={0.8}
                    />
                    {/* Error icon (X) */}
                    <Line
                      points={[
                        -GRID_PITCH * 0.3, -GRID_PITCH * 0.3,
                        GRID_PITCH * 0.3, GRID_PITCH * 0.3
                      ]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <Line
                      points={[
                        GRID_PITCH * 0.3, -GRID_PITCH * 0.3,
                        -GRID_PITCH * 0.3, GRID_PITCH * 0.3
                      ]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    {/* Reference label */}
                    {layerVisibility.refDesignations && (
                      <Text
                        x={-GRID_PITCH * 0.5}
                        y={GRID_PITCH * 0.6}
                        width={GRID_PITCH}
                        text={c.reference}
                        fontSize={8}
                        fontFamily="monospace"
                        fill="#ef4444"
                        align="center"
                        fontStyle="bold"
                      />
                    )}
                    {/* "Broken" label */}
                    <Text
                      x={-GRID_PITCH * 0.5}
                      y={GRID_PITCH * 0.8}
                      width={GRID_PITCH}
                      text="BROKEN"
                      fontSize={6}
                      fontFamily="monospace"
                      fill="#ef4444"
                      align="center"
                    />
                  </Group>
                );
              }
              const compFilterMatch = !componentFilterActive ||
                c.reference.toLowerCase().includes(componentSearchFilter.toLowerCase()) ||
                (c.value || '').toLowerCase().includes(componentSearchFilter.toLowerCase()) ||
                (def.name || '').toLowerCase().includes(componentSearchFilter.toLowerCase());
              return (
                <Component
                  key={c.id}
                  component={c}
                  definition={def}
                  isSelected={selectedItems.includes(c.id)}
                  showRefs={layerVisibility.refDesignations}
                  showValues={layerVisibility.values}
                  highlightedNetId={componentFilterActive && !compFilterMatch ? '__dim__' : highlightedNetId}
                  hlNetColor={hlNetColor}
                  connectedGroups={highlightedNetId ? connectivity.connectedGroups : undefined}
                  zoom={zoom}
                  opacity={1}
                  disableShadows={false} // Selected components always render with full quality
                />
              );
            })}

          {/* Wires */}
          {layerVisibility.wires &&
            renderableWires.map((w: WireType) => {
              const detectedNetId = connectivity.wireNets.get(w.id) || null;
              const hasError = connectivity.wireErrors.has(w.id);
              
              // Determine wire color
              let wireColor = '#2dd4bf'; // default
              if (hasError) {
                wireColor = '#ef4444';
              } else if (detectedNetId) {
                wireColor = netColorMap.get(detectedNetId) || '#2dd4bf';
              } else if (w.color) {
                wireColor = w.color;
              }
              
              return (
                <Wire
                  key={w.id}
                  wire={w}
                  isSelected={selectedItems.includes(w.id)}
                  wireColor={wireColor}
                  hasError={hasError}
                  effectiveNetId={detectedNetId || w.netId || null}
                  highlightedNetId={highlightedNetId}
                />
              );
            })}

          {/* Reference images (on top of components+wires when on-top mode) */}
          {referenceImages
            .filter((img) => img.visible && img.onTop)
            .map((img) => (
              <ReferenceImage
                key={img.id}
                id={img.id}
                src={img.src}
                x={img.x}
                y={img.y}
                width={img.naturalWidth * img.scale}
                height={img.naturalHeight * img.scale}
                inverted={img.inverted}
                opacity={img.opacity}
                isSelected={selectedItems.includes(img.id)}
                onTransformEnd={(nx, ny, scaleMul) => {
                  saveToHistory();
                  updateReferenceImageById(img.id, {
                    x: nx,
                    y: ny,
                    scale: img.scale * scaleMul,
                  });
                }}
              />
            ))}

          {/* Legacy single reference image support (on top of components+wires when on-top mode) */}
          {referenceImage && referenceImage.visible && referenceImage.onTop && (
            <ReferenceImage
              id={REF_IMAGE_ID}
              src={referenceImage.src}
              x={referenceImage.x}
              y={referenceImage.y}
              width={referenceImage.naturalWidth * referenceImage.scale}
              height={referenceImage.naturalHeight * referenceImage.scale}
              inverted={referenceImage.inverted}
              opacity={referenceImage.opacity || 1.0}
              isSelected={selectedItems.includes(REF_IMAGE_ID)}
              onTransformEnd={(nx, ny, scaleMul) => {
                saveToHistory();
                updateReferenceImage({
                  x: nx,
                  y: ny,
                  scale: referenceImage.scale * scaleMul,
                });
              }}
            />
          )}
        </Layer>

        {/* Layer 3: Overlays (ratsnest, selection box, tool cursors) */}
        <Layer listening={false}>
          {/* Ratsnest */}
          {layerVisibility.ratsNest &&
            showRatsNest &&
            ratsNest.map((conn, i) => {
              const isHlNet = highlightedNetId === conn.netId;
              const isDimmedRN = !!highlightedNetId && !isHlNet;
              
              // Color mode logic
              const strokeColor = ratsnestColorMode === 'white' 
                ? '#ffffff' 
                : (netColorMap.get(conn.netId) || '#6b7280');
              
              const opacity = ratsnestColorMode === 'white'
                ? 1.0  // No transparency in white mode
                : (isDimmedRN ? 0.15 : isHlNet ? 0.9 : 0.6);
              
              return (
                <Line
                  key={`rn-${i}`}
                  points={[
                    conn.from.col * GRID_PITCH,
                    conn.from.row * GRID_PITCH,
                    conn.to.col * GRID_PITCH,
                    conn.to.row * GRID_PITCH,
                  ]}
                  stroke={strokeColor}
                  strokeWidth={isHlNet ? 3 : 2}
                  dash={[4, 4]}
                  opacity={opacity}
                  listening={false}
                />
              );
            })}

          {/* Wire preview while routing */}
          {wirePreviewFlat.length >= 4 && (
            <Line
              points={wirePreviewFlat}
              stroke="#2dd4bf"
              strokeWidth={2}
              opacity={0.5}
              dash={[6, 4]}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}

          {/* Wire waypoints placed so far */}
          {wirePoints.map((p, i) => (
            <Circle
              key={`wp-${i}`}
              x={p.col * GRID_PITCH}
              y={p.row * GRID_PITCH}
              radius={5}
              fill="#2dd4bf"
              opacity={0.8}
              listening={false}
            />
          ))}

          {/* Cut tool cursor indicator */}
          {cursorGridPos && (activeTool === 'drillCut' || activeTool === 'sliceCut') && (
            <Group listening={false}>
              {activeTool === 'drillCut' && (
                // Drill cut: X marks the spot ON the hole
                <>
                  <Line
                    points={[
                      cursorGridPos.col * GRID_PITCH - 5,
                      cursorGridPos.row * GRID_PITCH - 5,
                      cursorGridPos.col * GRID_PITCH + 5,
                      cursorGridPos.row * GRID_PITCH + 5,
                    ]}
                    stroke="#ef4444"
                    strokeWidth={2}
                    opacity={0.6}
                  />
                  <Line
                    points={[
                      cursorGridPos.col * GRID_PITCH + 5,
                      cursorGridPos.row * GRID_PITCH - 5,
                      cursorGridPos.col * GRID_PITCH - 5,
                      cursorGridPos.row * GRID_PITCH + 5,
                    ]}
                    stroke="#ef4444"
                    strokeWidth={2}
                    opacity={0.6}
                  />
                </>
              )}
              {activeTool === 'sliceCut' && (
                // Slice cut: vertical line BETWEEN holes
                <Line
                  points={[
                    (cursorGridPos.col + 0.5) * GRID_PITCH,
                    cursorGridPos.row * GRID_PITCH - 10,
                    (cursorGridPos.col + 0.5) * GRID_PITCH,
                    cursorGridPos.row * GRID_PITCH + 10,
                  ]}
                  stroke="#ef4444"
                  strokeWidth={2}
                  opacity={0.8}
                />
              )}
            </Group>
          )}

          {/* Wire tool start indicator */}
          {cursorGridPos &&
            activeTool === 'routeWire' &&
            wirePoints.length === 0 && (
              <Circle
                x={cursorGridPos.col * GRID_PITCH}
                y={cursorGridPos.row * GRID_PITCH}
                radius={6}
                stroke="#2dd4bf"
                strokeWidth={2}
                opacity={0.5}
                listening={false}
              />
            )}

          {/* ── Selection Box Overlay ──────────────────────── */}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x1, selectionBox.x2)}
              y={Math.min(selectionBox.y1, selectionBox.y2)}
              width={Math.abs(selectionBox.x2 - selectionBox.x1)}
              height={Math.abs(selectionBox.y2 - selectionBox.y1)}
              fill="rgba(200, 255, 46, 0.08)"
              stroke="#c8ff2e"
              strokeWidth={1.5 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          )}
        </Layer>

      </Stage>

      {/* ── Component Context Menu (HTML overlay) ─────────── */}
      {contextMenu && (() => {
        const comp = components.find((c) => c.id === contextMenu.componentId);
        const def = comp ? componentDefinitions.find((d) => d.id === comp.definitionId) : null;
        const compIsLed = def?.id.includes('led') ?? false;
        
        // Allow reset for ALL components that have a library definition
        // IMPORTANT: Check even if def is null (broken components)
        let canReset = false;
        if (comp) {
          const baseDefId = comp.definitionId
            .replace(/-custom-.*$/, '')
            .replace(/^(.*?)-custom$/, '$1');
          
          // Exclude generic/custom components (user-created ones)
          const isLibraryComponent = !baseDefId.startsWith('generic-') && !baseDefId.startsWith('custom-');
          
          if (isLibraryComponent) {
            // Verify base definition exists in library
            // This works even if current definition is missing (broken component)
            canReset = componentDefinitions.some((d) => d.id === baseDefId);
          }
        }
        
        return (
          <ComponentContextMenu
            state={contextMenu}
            onClose={() => setContextMenu(null)}
            onEditComponent={handleEditComponent}
            onRotateComponent={handleRotateComponent}
            onDeleteComponent={handleDeleteComponent}
            onDuplicateComponent={handleDuplicateComponent}
            onResetToDefault={canReset ? handleResetToDefault : undefined}
            hasCustomVariant={canReset}
            isLed={compIsLed}
            onChangeLedColor={(id, color) => {
              saveToHistory();
              const { updateComponent } = useStripboardStore.getState();
              updateComponent(id, { ledColor: color });
            }}
          />
        );
      })()}

      {/* ── Image Context Menu (HTML overlay) ─────────────── */}
      {imageContextMenu && (
        <ImageContextMenu
          state={imageContextMenu}
          onClose={() => setImageContextMenu(null)}
          onCropImage={handleCropImage}
          onDeleteImage={handleDeleteImage}
          canCrop={imageContextMenu.imageId !== REF_IMAGE_ID}
        />
      )}

      {/* ── Edit Component Dialog ────────────────────────── */}
      {editingComponentIds.length > 0 && (
        <EditComponentDialog
          componentIds={editingComponentIds}
          onClose={() => setEditingComponentIds([])}
        />
      )}

      {/* ── Crop Image Dialog ────────────────────────────── */}
      {croppingImageId && (
        <CropImageDialog
          imageId={croppingImageId}
          onClose={() => setCroppingImageId(null)}
        />
      )}
    </div>
  );
};

function getCursorForTool(tool: string): string {
  switch (tool) {
    case 'pan':
      return 'grab';
    case 'select':
      return 'default';
    case 'routeWire':
    case 'drillCut':
    case 'sliceCut':
      return 'crosshair';
    default:
      return 'default';
  }
}
