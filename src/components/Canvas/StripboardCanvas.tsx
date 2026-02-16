import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Circle, Group, Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { GridPosition, RatsNestConnection, Component as ComponentType, Wire as WireType, ComponentDefinition } from '@/lib/types';
import { Grid } from './Grid';
import { Strip } from './Strip';
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

const GRID_PITCH = 25.4;
const DRAG_THRESHOLD = 5; // pixels in screen space before a drag starts

/**
 * Determine the default rotation for a component.
 * All components should be placed perpendicular to strips (90°) to avoid shorting.
 */
function getDefaultRotation(_definition: ComponentDefinition): 0 | 90 | 180 | 270 {
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
      type: 'panning';
      startScreenX: number;
      startScreenY: number;
      startPanX: number;
      startPanY: number;
    }
  | {
      type: 'cutDragging';
      mode: 'add' | 'remove';
      lastGridRow: number;
      lastGridCol: number;
      visitedPositions: Set<string>; // track "row:col" strings to avoid double-toggling
    };

// ─── Helpers ─────────────────────────────────────────────────

/** Walk from a Konva target node up to the Stage looking for a named
 *  component or wire Group. Returns the item ID or null. */
function getItemIdFromTarget(target: any): string | null {
  let node = target;
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

export const StripboardCanvas = () => {
  // Individual selectors to minimize rerenders
  const strips = useStripboardStore((s) => s.strips);
  const components = useStripboardStore((s) => s.components);
  const wires = useStripboardStore((s) => s.wires);
  const nets = useStripboardStore((s) => s.nets);
  const zoom = useStripboardStore((s) => s.zoom);
  const pan = useStripboardStore((s) => s.pan);
  const rows = useStripboardStore((s) => s.rows);
  const cols = useStripboardStore((s) => s.cols);
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
  const updateReferenceImageById = useStripboardStore((s) => s.updateReferenceImageById);
  const copySelected = useStripboardStore((s) => s.copySelected);
  const paste = useStripboardStore((s) => s.paste);

  const stageRef = useRef<any>(null);
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
  const [selectionBox, setSelectionBox] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  // ─── Context Menu & Edit Dialog ───────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [imageContextMenu, setImageContextMenu] = useState<ImageContextMenuState | null>(null);
  const [editingComponentIds, setEditingComponentIds] = useState<string[]>([]);
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const rightClickedRef = useRef<string | null>(null);

  // ─── Connectivity Analysis (Deferred) ────────────────────────
  const [connectivity, setConnectivity] = useState(() =>
    analyzeConnectivity(components, strips, wires, nets)
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
      const result = analyzeConnectivity(components, strips, wires, nets);
      setConnectivity(result);
    });

    return () => cancelUpdate(id);
  }, [components, strips, wires, nets]);

  // ─── Ratsnest (deferred or realtime based on setting) ────────
  const [ratsNest, setRatsNest] = useState<RatsNestConnection[]>([]);

  // Realtime ratsnest (synchronous useMemo)
  const realtimeRatsNestValue = useMemo(() => {
    if (!realtimeRatsnest || nets.length === 0) return [];
    const allConnections = calculateRatsNest(components, strips, wires, nets);
    // Filter out connections for hidden nets
    return allConnections.filter((conn) => {
      const net = nets.find((n) => n.id === conn.netId);
      return net?.visible !== false;
    });
  }, [realtimeRatsnest, components, strips, wires, nets]);

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
      const allConnections = calculateRatsNest(components, strips, wires, nets);
      // Filter out connections for hidden nets
      const visible = allConnections.filter((conn) => {
        const net = nets.find((n) => n.id === conn.netId);
        return net?.visible !== false; // Show by default if visible is undefined
      });
      setRatsNest(visible);
    });

    return () => cancelUpdate(id);
  }, [realtimeRatsnest, realtimeRatsNestValue, components, strips, wires, nets]);

  // Net color lookup
  const netColorMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nets) m.set(n.id, n.color);
    return m;
  }, [nets]);

  // Highlighted net color for components
  const hlNetColor = useMemo(() => {
    if (!highlightedNetId) return undefined;
    return nets.find(n => n.id === highlightedNetId)?.color;
  }, [highlightedNetId, nets]);

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
    return strips.filter((s) =>
      isStripVisible(s.row, s.startCol, s.endCol, viewportBounds)
    );
  }, [strips, viewportBounds]);

  const visibleWires = useMemo(() => {
    return wires.filter((w) => isWireVisible(w.points, viewportBounds));
  }, [wires, viewportBounds]);

  // Reset drawing state when tool changes
  useEffect(() => {
    setWirePoints([]);
    setWirePreviewPoint(null);
    interactionRef.current = null;
    setSelectionBox(null);
  }, [activeTool]);

  // ─── Keyboard Shortcuts (Copy / Paste) ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Copy: Cmd/Ctrl+C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        copySelected();
      }

      // Paste: Cmd/Ctrl+V
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        paste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelected, paste]);

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
    (pos: GridPosition): GridPosition => ({
      row: Math.max(0, Math.min(rows - 1, pos.row)),
      col: Math.max(0, Math.min(cols - 1, pos.col)),
    }),
    [rows, cols]
  );

  const getGridFromPointer = useCallback(
    (e: KonvaEventObject<MouseEvent | WheelEvent>): GridPosition | null => {
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!pointer) return null;
      return clampToBoard(screenToGrid(pointer.x, pointer.y));
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
      for (const comp of components) {
        const allPinsInside = comp.pins.every((pin) => {
          const px = pin.position.col * GRID_PITCH;
          const py = pin.position.row * GRID_PITCH;
          return px >= minX && px <= maxX && py >= minY && py <= maxY;
        });
        if (allPinsInside) ids.push(comp.id);
      }

      // Check wires — all waypoints must be inside the box
      for (const wire of wires) {
        const allPointsInside = wire.points.every((p) => {
          const px = p.col * GRID_PITCH;
          const py = p.row * GRID_PITCH;
          return px >= minX && px <= maxX && py >= minY && py <= maxY;
        });
        if (allPointsInside) ids.push(wire.id);
      }

      // Check cuts — each cut is a single point (row, col)
      for (const strip of strips) {
        for (const breakCol of strip.breaks) {
          const px = breakCol * GRID_PITCH;
          const py = strip.row * GRID_PITCH;
          if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
            ids.push(`cut-${strip.row}-${breakCol}`);
          }
        }
      }

      // Check reference image — all four corners must be inside the box
      const ref = useStripboardStore.getState().referenceImage;
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
    [components, wires, strips]
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
  //   Shift + scroll → Pan up/down
  //   Cmd + scroll → Pan left/right
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

    if (evt.shiftKey && !evt.metaKey && !evt.ctrlKey) {
      // Shift + scroll → pan up/down
      setPan({ x: curPan.x, y: curPan.y - evt.deltaY });
    } else if (evt.metaKey && !evt.shiftKey) {
      // Cmd + scroll → pan left/right
      setPan({ x: curPan.x - evt.deltaY, y: curPan.y });
    } else {
      // Plain scroll or Ctrl (pinch gesture) → zoom at cursor.
      // Use delta-proportional factor so small trackpad gestures are
      // gentle while larger mouse-wheel steps are more noticeable.
      // Pinch gestures (ctrlKey) send small deltas, so use higher gain.
      const sensitivity = evt.ctrlKey ? 0.01 : 0.003;
      const factor = Math.exp(-evt.deltaY * sensitivity);

      const mousePointTo = {
        x: (pointer.x - curPan.x) / curZoom,
        y: (pointer.y - curPan.y) / curZoom,
      };
      const newZoom = Math.max(0.15, Math.min(5, curZoom * factor));
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
        if (comp) {
          rightClickedRef.current = itemId;
          // Stop propagation so the container handler doesn't start panning
          evt.stopPropagation();
          return;
        }
        
        // Check if it's a reference image
        const img = referenceImages.find((img) => img.id === itemId);
        if (img) {
          rightClickedRef.current = itemId;
          evt.stopPropagation();
          return;
        }
      }
      rightClickedRef.current = null;
      return;
    }

    if (evt.button !== 0) return; // Only handle left button from here on

    // ── Pan tool: left-click pans ─────────────────────────
    if (activeTool === 'pan') {
      const startX = evt.clientX;
      const startY = evt.clientY;
      const { pan: currentPan } = useStripboardStore.getState();
      const startPanX = currentPan.x;
      const startPanY = currentPan.y;

      const onMove = (me: MouseEvent) => {
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
    if (activeTool === 'cutStrip') {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) return;

      const grid = clampToBoard(screenToGrid(pointer.x, pointer.y));
      
      // Check if there's already a cut at this position
      const strip = strips.find(
        (s) => s.row === grid.row && grid.col >= s.startCol && grid.col <= s.endCol
      );
      if (!strip) return;

      // Save history once at the start of the drag
      saveToHistory();
      
      // Determine mode: if there's already a cut here, we'll be removing; otherwise adding
      const hasCut = strip.breaks.includes(grid.col);
      const mode = hasCut ? 'remove' : 'add';
      
      // Apply the first cut/remove
      if (mode === 'add') {
        addCut(grid.row, grid.col);
      } else {
        removeCut(grid.row, grid.col);
      }
      
      // Set up tracking for drag
      const visitedPositions = new Set<string>();
      visitedPositions.add(`${grid.row}:${grid.col}`);
      
      interactionRef.current = {
        type: 'cutDragging',
        mode,
        lastGridRow: grid.row,
        lastGridCol: grid.col,
        visitedPositions,
      };
      return;
    }
  };

  // ─── MOUSE MOVE (Konva) ───────────────────────────────────
  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;

    // Track cursor grid position only for tools that need it
    if (activeTool === 'cutStrip' || activeTool === 'routeWire') {
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
      } else {
        // ── Clicked on an item → start MULTI-DRAG ──
        const itemId = interaction.clickedItemId;
        const currentSelected =
          useStripboardStore.getState().selectedItems;

        if (!currentSelected.includes(itemId)) {
          // Item was not selected — select it (shift adds, otherwise replace)
          if (interaction.shiftKey) {
            addToSelection([itemId]);
          } else {
            setSelectedItems([itemId]);
          }
        }

        // Save history for undo before drag begins
        saveToHistory();

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
      }
      return;
    }

    // ── Active SELECTION BOX → update dimensions ────────────
    if (interaction.type === 'selectionBox') {
      const content = pointerToContent(pointer.x, pointer.y);
      setSelectionBox((prev) =>
        prev
          ? { ...prev, x2: content.x, y2: content.y }
          : null
      );
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
          moveSelectedItems(deltaRow, deltaCol);
          interaction.lastGridRow = newGridRow;
          interaction.lastGridCol = newGridCol;
        }
      }
      return;
    }

    // ── Active CUT DRAGGING → apply cuts/removals as we drag ───
    if (interaction.type === 'cutDragging') {
      const grid = clampToBoard(screenToGrid(pointer.x, pointer.y));
      
      // Only process if we've moved to a new grid position
      if (grid.row !== interaction.lastGridRow || grid.col !== interaction.lastGridCol) {
        const posKey = `${grid.row}:${grid.col}`;
        
        // Only apply if we haven't visited this position yet
        if (!interaction.visitedPositions.has(posKey)) {
          // Check if this position is on a strip
          const strip = strips.find(
            (s) => s.row === grid.row && grid.col >= s.startCol && grid.col <= s.endCol
          );
          
          if (strip) {
            // Apply the cut/remove based on the initial mode
            if (interaction.mode === 'add') {
              addCut(grid.row, grid.col);
            } else {
              removeCut(grid.row, grid.col);
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

  // ─── MOUSE UP (Konva — left button) ───────────────────────
  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    const evt = e.evt;
    if (evt.button !== 0) return;

    const interaction = interactionRef.current;
    interactionRef.current = null;

    if (!interaction) return;

    // ── Pending (no drag occurred) → treat as CLICK ──────
    if (interaction.type === 'pending') {
      if (activeTool === 'select') {
        const itemId = interaction.clickedItemId;
        if (itemId === null) {
          // Clicked empty space → deselect all
          deselectAll();
        } else if (interaction.shiftKey) {
          // Shift+click → add to selection
          addToSelection([itemId]);
        } else if (interaction.metaKey) {
          // Cmd/Ctrl+click → remove from selection
          removeFromSelection([itemId]);
        } else {
          // Plain click → replace selection
          setSelectedItems([itemId]);
        }
      }
      return;
    }

    // ── Selection box complete → apply selection ─────────
    if (interaction.type === 'selectionBox') {
      if (selectionBox) {
        const enclosedIds = getItemsInSelectionBox(selectionBox);
        if (interaction.shiftKey) {
          addToSelection(enclosedIds);
        } else if (interaction.metaKey) {
          removeFromSelection(enclosedIds);
        } else {
          setSelectedItems(enclosedIds);
        }
      }
      setSelectionBox(null);
      return;
    }

    // ── Drag complete → nothing more to do ──────────────
    if (interaction.type === 'dragging') {
      // History was saved at drag start; drag is done.
      return;
    }

    // ── Cut dragging complete → nothing more to do ──────
    if (interaction.type === 'cutDragging') {
      // History was saved at drag start; cuts/removals applied during drag.
      return;
    }
  };

  // ─── CLICK (non-select tools: wire routing, cut strip, etc.) ──
  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    // Select tool is fully handled by mousedown/mouseup
    if (activeTool === 'select') return;

    // Pan tool: click empty space → deselect
    if (activeTool === 'pan') {
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
    if (activeTool === 'cutStrip') {
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

    // Clamp so all pins fit on the board
    const maxPinRow = Math.max(...def.pins.map((p) => p.position.row));
    const maxPinCol = Math.max(...def.pins.map((p) => p.position.col));
    const pos: GridPosition = {
      row: Math.max(0, Math.min(rows - 1 - maxPinRow, raw.row)),
      col: Math.max(0, Math.min(cols - 1 - maxPinCol, raw.col)),
    };

    // Generate reference
    const prefix = getRefPrefix(def.id, def.category);
    const currentComponents = useStripboardStore.getState().components;
    const nums = currentComponents
      .filter((c) => c.reference.startsWith(prefix))
      .map((c) => parseInt(c.reference.slice(prefix.length)))
      .filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    // Determine appropriate rotation for this component
    const rotation = getDefaultRotation(def);
    
    // Get rotated pin positions
    const rotatedPinPositions = getRotatedPinPositions(def.pins, rotation);

    saveToHistory();
    addComponent({
      id: `comp-${Date.now()}`,
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
        const img = referenceImages.find((img) => img.id === itemId);
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
    [components, referenceImages]
  );

  // ─── Context Menu Actions ─────────────────────────────────
  const handleEditComponent = useCallback((id: string) => {
    // Check if multiple components of the same type are selected
    const comp = components.find((c) => c.id === id);
    if (!comp) {
      setEditingComponentIds([id]);
      return;
    }
    
    const selectedComps = components.filter((c) => selectedItems.includes(c.id));
    const sameTypeComps = selectedComps.filter((c) => c.definitionId === comp.definitionId);
    
    // If multiple components of same type are selected, edit them all
    if (sameTypeComps.length > 1) {
      setEditingComponentIds(sameTypeComps.map((c) => c.id));
    } else {
      setEditingComponentIds([id]);
    }
  }, [components, selectedItems]);

  const handleRotateComponent = useCallback(
    (id: string) => {
      saveToHistory();
      rotateComponent(id);
    },
    [saveToHistory, rotateComponent]
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

      // Place duplicate offset by 2 grid positions
      const newPos = {
        row: comp.position.row + 2,
        col: comp.position.col + 2,
      };

      saveToHistory();
      addComponent({
        id: `comp-${Date.now()}`,
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
    [components, componentDefinitions, saveToHistory, addComponent]
  );

  // ─── Image Context Menu Actions ────────────────────────────
  const handleCropImage = useCallback((id: string) => {
    setCroppingImageId(id);
  }, []);

  const handleDeleteImage = useCallback(
    (id: string) => {
      saveToHistory();
      const { removeReferenceImage } = useStripboardStore.getState();
      removeReferenceImage(id);
    },
    [saveToHistory]
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
            visibleStrips.map((s) => (
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
                selectedItems={selectedItems}
              />
            ))}
        </Layer>

        {/* Layer 2: Interactive content (ref image + components + wires) */}
        <Layer>
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
                updateReferenceImage({
                  x: nx,
                  y: ny,
                  scale: referenceImage.scale * scaleMul,
                });
              }}
            />
          )}

          {/* Components */}
          {layerVisibility.components &&
            visibleComponents.map((c: ComponentType) => {
              const def = componentDefinitions.find(d => d.id === c.definitionId);
              if (!def) {
                // Definition not found - this shouldn't happen but render pins anyway to show something
                console.warn(`Component ${c.reference} (${c.id}) has invalid definitionId: ${c.definitionId}`);
                // Render just the pins as circles to show the component exists
                return (
                  <Group
                    key={c.id}
                    x={c.position.col * 25.4}
                    y={c.position.row * 25.4}
                  >
                    {c.pins.map((pin, i) => (
                      <Circle
                        key={`${c.id}-pin-${i}`}
                        x={(pin.position.col - c.position.col) * 25.4}
                        y={(pin.position.row - c.position.row) * 25.4}
                        radius={4.5}
                        fill="#ff4444"
                        stroke="#ff0000"
                        strokeWidth={2}
                      />
                    ))}
                  </Group>
                );
              }
              const compFilterActive = componentSearchFilter.trim().length > 0;
              const compFilterMatch = !compFilterActive ||
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
                  highlightedNetId={compFilterActive && !compFilterMatch ? '__dim__' : highlightedNetId}
                  hlNetColor={hlNetColor}
                  connectedGroups={connectivity.connectedGroups}
                  zoom={zoom}
                  opacity={componentOpacity}
                />
              );
            })}

          {/* Wires */}
          {layerVisibility.wires &&
            visibleWires.map((w: WireType) => {
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
          {cursorGridPos && activeTool === 'cutStrip' && (
            <Group listening={false}>
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
        return (
          <ComponentContextMenu
            state={contextMenu}
            onClose={() => setContextMenu(null)}
            onEditComponent={handleEditComponent}
            onRotateComponent={handleRotateComponent}
            onDeleteComponent={handleDeleteComponent}
            onDuplicateComponent={handleDuplicateComponent}
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
    case 'cutStrip':
      return 'crosshair';
    default:
      return 'default';
  }
}
