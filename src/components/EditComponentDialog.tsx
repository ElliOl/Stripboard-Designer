import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Trash2, RotateCcw, Palette } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';
import {
  createDefinitionFromPlacements,
  type PinPlacement,
} from '@/lib/component-utils';
import { getRotatedPinPositions, unrotatePositions } from '@/lib/rotation';

interface EditComponentDialogProps {
  componentIds: string[]; // Changed to array to support bulk editing
  onClose: () => void;
}

import type { FootprintTypeName } from '@/lib/types';
type FootprintTypeOption = FootprintTypeName;

// ─── Grid Cell Size ─────────────────────────────────────────
const CELL = 28;
const PIN_R = 9;

export const EditComponentDialog = ({
  componentIds,
  onClose,
}: EditComponentDialogProps) => {
  const {
    components,
    componentDefinitions,
    nets,
    updateComponent,
    addComponentDefinition,
    saveToHistory,
  } = useStripboardStore();
  
  // Get the store instance for synchronous updates
  const getStore = useStripboardStore.getState;

  // For bulk editing, use the first component as the template
  const componentId = componentIds[0];
  const component = components.find((c) => c.id === componentId);
  const definition = component
    ? componentDefinitions.find((d) => d.id === component.definitionId)
    : null;

  const isBulkEdit = componentIds.length > 1;
  
  // Track selected variant for bulk editing
  const [selectedVariantId, setSelectedVariantId] = useState(definition?.id || '');

  // ─── Form State ──────────────────────────────────────────
  const [reference, setReference] = useState(component?.reference ?? '');
  const [value, setValue] = useState(component?.value ?? '');
  const [bodyColor, setBodyColor] = useState(component?.color ?? '');
  const [footprintType, setFootprintType] = useState<FootprintTypeOption>(
    (definition?.footprint.type ?? 'Custom') as FootprintTypeOption
  );

  // ─── Grid Editor State ───────────────────────────────────
  const [gridRows, setGridRows] = useState(() => {
    if (!definition) return 6;
    const maxR = Math.max(...definition.pins.map((p) => p.position.row));
    return Math.max(6, maxR + 3);
  });
  const [gridCols, setGridCols] = useState(() => {
    if (!definition) return 8;
    const maxC = Math.max(...definition.pins.map((p) => p.position.col));
    return Math.max(8, maxC + 3);
  });

  // Track the original min position to detect when the component origin shifts
  // These are in the ROTATED board space (how pins appear on the board)
  const [originalMinPos] = useState<{ row: number; col: number }>(() => {
    if (!definition || definition.pins.length === 0 || !component) return { row: 0, col: 0 };
    // Get rotated positions (how they appear on board)
    const rotatedPins = getRotatedPinPositions(definition.pins, component.rotation);
    return {
      row: Math.min(...rotatedPins.map((p) => p.row)),
      col: Math.min(...rotatedPins.map((p) => p.col)),
    };
  });

  // Pin placements in ROTATED space (board space) for intuitive editing
  const [pinPlacements, setPinPlacements] = useState<PinPlacement[]>(() => {
    if (!definition || !component) return [];
    // Show pins in their rotated positions so editing matches board appearance
    const rotatedPins = getRotatedPinPositions(definition.pins, component.rotation);
    return rotatedPins.map((p, i) => ({
      row: p.row,
      col: p.col,
      number: definition.pins[i].number,
      name: definition.pins[i].name ?? '',
    }));
  });

  const [selectedPinIdx, setSelectedPinIdx] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ─── Pin Lookup Map ──────────────────────────────────────
  const pinAtCell = useMemo(() => {
    const map = new Map<string, number>();
    pinPlacements.forEach((p, i) => map.set(`${p.row},${p.col}`, i));
    return map;
  }, [pinPlacements]);

  // ─── Grid Cell Click ────────────────────────────────────
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const key = `${row},${col}`;
      const existingIdx = pinAtCell.get(key);

      if (existingIdx !== undefined) {
        // Clicking an existing pin → select it
        setSelectedPinIdx(existingIdx);
      } else {
        // Clicking empty cell → add pin
        const nextNum =
          pinPlacements.length === 0
            ? '1'
            : String(
                Math.max(
                  ...pinPlacements.map((p) => {
                    const n = parseInt(p.number, 10);
                    return isNaN(n) ? 0 : n;
                  })
                ) + 1
              );
        setPinPlacements((prev) => [
          ...prev,
          { row, col, number: nextNum, name: '' },
        ]);
        setSelectedPinIdx(pinPlacements.length);
      }
    },
    [pinAtCell, pinPlacements]
  );

  // ─── Remove Selected Pin ────────────────────────────────
  const removePin = useCallback(
    (idx: number) => {
      setPinPlacements((prev) => prev.filter((_, i) => i !== idx));
      setSelectedPinIdx(null);
    },
    []
  );

  // ─── Update Pin Property ────────────────────────────────
  const updatePin = useCallback(
    (idx: number, updates: Partial<PinPlacement>) => {
      setPinPlacements((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, ...updates } : p))
      );
    },
    []
  );

  // ─── Clear All Pins ─────────────────────────────────────
  const clearAllPins = useCallback(() => {
    setPinPlacements([]);
    setSelectedPinIdx(null);
  }, []);

  // ─── Renumber Pins ──────────────────────────────────────
  const renumberPins = useCallback(() => {
    setPinPlacements((prev) =>
      prev.map((p, i) => ({ ...p, number: String(i + 1) }))
    );
  }, []);

  // ─── Apply ──────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (!component || !definition) return;
    
    // In bulk edit mode, we don't need pin placements
    if (!isBulkEdit && pinPlacements.length === 0) return;

    saveToHistory();

    // Update component(s) - apply changes to all selected components in bulk edit
    if (isBulkEdit) {
      // Bulk edit: update common properties including variant if changed
      const variantChanged = selectedVariantId !== definition?.id;
      
      for (const id of componentIds) {
        const comp = components.find((c) => c.id === id);
        if (!comp) continue;
        
        const updates: Partial<typeof comp> = {
          value: value || undefined,
          color: bodyColor || undefined,
        };
        
        // If variant changed, update definition for all components
        if (variantChanged) {
          const newDef = componentDefinitions.find((d) => d.id === selectedVariantId);
          if (newDef && newDef.pins.length === comp.pins.length) {
            // Update definition and recalculate pin positions
            const rotatedNewDefPins = getRotatedPinPositions(newDef.pins, comp.rotation);
            
            updates.definitionId = selectedVariantId;
            updates.pins = rotatedNewDefPins.map((rotatedPos, i) => {
              const oldPin = comp.pins[i];
              return {
                number: newDef.pins[i].number,
                netId: oldPin?.netId,
                position: {
                  row: comp.position.row + rotatedPos.row,
                  col: comp.position.col + rotatedPos.col,
                },
                extended: oldPin?.extended ?? 0,
              };
            });
          }
        }
        
        updateComponent(id, updates);
      }
      
      onClose();
      return;
    }

    // Single edit mode - continue with full pin editing logic
    // Pin placements are in rotated board space - convert back to unrotated definition space
    const unrotatedPlacements = unrotatePositions(
      pinPlacements.map(p => ({ row: p.row, col: p.col })),
      component.rotation
    ).map((pos, i) => ({
      ...pinPlacements[i],
      row: pos.row,
      col: pos.col,
    }));

    // Check what has changed
    const pinCountChanged = unrotatedPlacements.length !== definition.pins.length;
    const pinNumbersChanged = !pinCountChanged && unrotatedPlacements.some((pp, i) => pp.number !== definition.pins[i].number);
    const pinNamesChanged = !pinCountChanged && unrotatedPlacements.some((pp, i) => pp.name !== (definition.pins[i].name ?? ''));
    const pinPositionsChanged = !pinCountChanged && unrotatedPlacements.some((pp, i) => {
      const dp = definition.pins[i];
      return pp.row !== dp.position.row || pp.col !== dp.position.col;
    });
    const footprintTypeChanged = footprintType !== definition.footprint.type;
    
    // Only create a new definition if structure changed (not just positions)
    const needsNewDefinition = pinCountChanged || pinNumbersChanged || pinNamesChanged || footprintTypeChanged;

    let defIdToUse = definition.id;
    let targetDef = definition;
    
    // Calculate the current min position in rotated board space
    const currentMinRow = Math.min(...pinPlacements.map((p) => p.row));
    const currentMinCol = Math.min(...pinPlacements.map((p) => p.col));
    
    // Calculate the offset: how much the origin has shifted in board space
    const offsetRow = currentMinRow - originalMinPos.row;
    const offsetCol = currentMinCol - originalMinPos.col;
    
    // Adjust component position to compensate for the origin shift (in board space)
    const newComponentPosition = {
      row: component.position.row + offsetRow,
      col: component.position.col + offsetCol,
    };

    // Only create new definition if structure changed
    if (needsNewDefinition) {
      // Create definition from UNROTATED placements
      const newDef = createDefinitionFromPlacements(footprintType, unrotatedPlacements);
      
      // Add definition synchronously to ensure it's available before component update
      const currentDefs = getStore().componentDefinitions;
      if (!currentDefs.some((d) => d.id === newDef.id)) {
        addComponentDefinition(newDef);
      }
      
      defIdToUse = newDef.id;
      targetDef = newDef;
    } else if (pinPositionsChanged) {
      // Positions changed but structure didn't - create a variant definition
      // that preserves the original definition's base ID for subtype detection
      const newDef = createDefinitionFromPlacements(footprintType, unrotatedPlacements);
      
      // Enhance the definition to preserve the original component type for rendering
      // Extract base type from original definition ID (e.g., "resistor" from "resistor-100k")
      const baseType = definition.id.split('-')[0];
      const enhancedDef = {
        ...newDef,
        id: `${baseType}-custom-${newDef.id}`, // Preserve base type in ID for subtype detection
        name: definition.name, // Keep original name
        category: definition.category, // Keep original category
      };
      
      // Add definition synchronously
      const currentDefs = getStore().componentDefinitions;
      if (!currentDefs.some((d) => d.id === enhancedDef.id)) {
        addComponentDefinition(enhancedDef);
      }
      
      defIdToUse = enhancedDef.id;
      targetDef = enhancedDef;
    }

    // Rebuild component pins with absolute positions on the board
    // If we created or modified a definition, rotate its pins. Otherwise, use the edited placements directly.
    const rotatedPinsForPlacement = (needsNewDefinition || pinPositionsChanged)
      ? getRotatedPinPositions(targetDef.pins, component.rotation)
      : pinPlacements.map(p => ({ row: p.row, col: p.col }));
    
    // Try to preserve netId assignments by matching in board space
    const oldPinsByNumber = new Map(component.pins.map((p) => [p.number, p]));
    const oldPinsByPos = new Map(
      component.pins.map((p) => [`${p.position.row},${p.position.col}`, p])
    );

    const newPins = rotatedPinsForPlacement.map((rotatedPos, i) => {
      const pinPlacement = pinPlacements[i];
      
      // Calculate absolute position using the adjusted component position
      const absRow = newComponentPosition.row + rotatedPos.row;
      const absCol = newComponentPosition.col + rotatedPos.col;
      
      // For net assignment matching, find by number first, then by absolute position
      let oldPin = oldPinsByNumber.get(pinPlacement.number);
      
      if (!oldPin) {
        // Try to match by the absolute position this pin is moving to
        const posKey = `${absRow},${absCol}`;
        oldPin = oldPinsByPos.get(posKey);
      }
      
      return {
        number: pinPlacement.number,
        netId: oldPin?.netId,
        position: {
          row: absRow,
          col: absCol,
        },
        extended: oldPin?.extended ?? 0,
      };
    });

    // Single edit: full update including pins and definition
    const updates: Partial<typeof component> = {
      reference,
      value: value || undefined,
      position: newComponentPosition,
      pins: newPins,
      color: bodyColor || undefined,
    };
    
    if (needsNewDefinition || pinPositionsChanged) {
      updates.definitionId = defIdToUse;
    }

    updateComponent(componentId, updates);

    onClose();
  }, [
    component,
    definition,
    pinPlacements,
    footprintType,
    reference,
    value,
    bodyColor,
    componentId,
    componentIds,
    components,
    componentDefinitions,
    isBulkEdit,
    selectedVariantId,
    originalMinPos,
    getStore,
    saveToHistory,
    updateComponent,
    addComponentDefinition,
    onClose,
  ]);

  if (!component || !definition) return null;

  // ─── Compute body bounding box from pins ────────────────
  const bodyBounds = useMemo(() => {
    if (pinPlacements.length === 0) return null;
    const minR = Math.min(...pinPlacements.map((p) => p.row));
    const maxR = Math.max(...pinPlacements.map((p) => p.row));
    const minC = Math.min(...pinPlacements.map((p) => p.col));
    const maxC = Math.max(...pinPlacements.map((p) => p.col));
    return { minR, maxR, minC, maxC };
  }, [pinPlacements]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-[#141418] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/60 w-[800px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c1c22]">
          <div>
            <h2 className="text-sm font-bold text-[#ededf0]">
              Edit Component{isBulkEdit ? `s (${componentIds.length})` : ''}
            </h2>
            <p className="text-[10px] text-[#52525b] mt-0.5">
              {isBulkEdit ? (
                `Bulk editing ${componentIds.length} components`
              ) : (
                <>
                  {definition.name} — {definition.footprint.type} package
                  {component.rotation !== 0 && (
                    <span className="text-[#c8ff2e] ml-2">
                      ↻ {component.rotation}° (editing in board orientation)
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#52525b] hover:text-[#a6a6b8] transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ─── Reference & Value (compact row) ──────────── */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[11px] text-[#63637a] shrink-0">Ref</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={isBulkEdit}
                className="bg-[#0f0f12] text-[#ededf0] text-xs px-2.5 py-1.5 rounded-md flex-1 min-w-0 border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                title={isBulkEdit ? "Reference cannot be changed in bulk edit" : ""}
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-[11px] text-[#63637a] shrink-0">
                Value
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. 10k"
                className="bg-[#0f0f12] text-[#a78bfa] text-xs px-2.5 py-1.5 rounded-md flex-1 min-w-0 border border-[#222228] focus:border-[#a78bfa] focus:outline-none transition-colors font-mono placeholder:text-[#2c2c36]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#63637a] shrink-0">
                Variant
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => {
                  const newDefId = e.target.value;
                  setSelectedVariantId(newDefId);
                  const newDef = componentDefinitions.find((d) => d.id === newDefId);
                  if (newDef) {
                    setFootprintType(newDef.footprint.type as FootprintTypeOption);
                    // Update the component definition immediately for single edit
                    if (!isBulkEdit) {
                      // Update pin placements to match new definition
                      const rotatedNewDefPins = getRotatedPinPositions(newDef.pins, component.rotation);
                      setPinPlacements(rotatedNewDefPins.map((p, i) => ({
                        row: p.row,
                        col: p.col,
                        number: newDef.pins[i].number,
                        name: newDef.pins[i].name ?? '',
                      })));
                    }
                  }
                }}
                className="bg-[#0f0f12] text-[#a6a6b8] text-xs px-2 py-1.5 rounded-md border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors appearance-none cursor-pointer flex-1"
                title="Select component visual variant"
              >
                {/* Group by footprint type for easier selection */}
                {definition && (() => {
                  const currentFpType = definition.footprint.type;
                  const variants = componentDefinitions.filter(
                    (d) => d.footprint.type === currentFpType && d.pins.length === definition.pins.length
                  );
                  return variants.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>

          {/* ─── Body Color ─────────────────────────────── */}
          <div className="flex items-center gap-3">
            <Palette size={13} className="text-[#63637a] shrink-0" />
            <label className="text-[11px] text-[#63637a] shrink-0">Color</label>
            <div className="flex items-center gap-1.5">
              {['', '#1a1a2e', '#0a1a3a', '#1565C0', '#0D47A1', '#1a2a1a', '#2a4a7a', '#8a2a2a', '#2d4a2d', '#D4A020', '#5a2a6a'].map((c) => (
                <button
                  key={c || 'default'}
                  onClick={() => setBodyColor(c)}
                  className={`w-5 h-5 rounded-full border transition-colors ${
                    bodyColor === c
                      ? 'border-[#c8ff2e] ring-1 ring-[#c8ff2e]/40'
                      : 'border-[#3a3a44] hover:border-[#5a5a6a]'
                  }`}
                  style={{ backgroundColor: c || '#3a3a4a' }}
                  title={c || 'Default'}
                />
              ))}
              <input
                type="color"
                value={bodyColor || '#1a1a2e'}
                onChange={(e) => setBodyColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border border-[#3a3a44] bg-transparent"
                title="Custom color"
              />
              {bodyColor && (
                <button
                  onClick={() => setBodyColor('')}
                  className="text-[10px] text-[#52525b] hover:text-[#a6a6b8] px-1.5 py-0.5 rounded border border-[#222228] hover:border-[#3a3a44] transition-colors ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ─── Pin Editor ──────────────────────────────── */}
          {!isBulkEdit && (
            <div className="border-t border-[#1c1c22] pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Pin Editor
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={renumberPins}
                  className="text-[10px] text-[#52525b] hover:text-[#a6a6b8] px-2 py-0.5 rounded border border-[#222228] hover:border-[#3a3a44] transition-colors"
                  title="Renumber pins sequentially"
                >
                  <RotateCcw size={10} className="inline mr-1" />
                  Renumber
                </button>
                <button
                  onClick={clearAllPins}
                  className="text-[10px] text-[#52525b] hover:text-red-400 px-2 py-0.5 rounded border border-[#222228] hover:border-red-400/30 transition-colors"
                  title="Remove all pins"
                >
                  <Trash2 size={10} className="inline mr-1" />
                  Clear
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              {/* ─── Visual Grid ───────────────────────────── */}
              <div className="shrink-0">
                {/* Grid size controls */}
                <div className="flex items-center gap-3 mb-2 text-[10px] text-[#52525b]">
                  <div className="flex items-center gap-1">
                    <span>Rows</span>
                    <button
                      onClick={() => setGridRows((r) => Math.max(2, r - 1))}
                      className="px-1 py-0.5 bg-[#0f0f12] rounded border border-[#222228] hover:border-[#3a3a44] transition-colors"
                    >
                      <Minus size={9} />
                    </button>
                    <span className="font-mono text-[#82829a] w-4 text-center">
                      {gridRows}
                    </span>
                    <button
                      onClick={() => setGridRows((r) => Math.min(12, r + 1))}
                      className="px-1 py-0.5 bg-[#0f0f12] rounded border border-[#222228] hover:border-[#3a3a44] transition-colors"
                    >
                      <Plus size={9} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Cols</span>
                    <button
                      onClick={() => setGridCols((c) => Math.max(2, c - 1))}
                      className="px-1 py-0.5 bg-[#0f0f12] rounded border border-[#222228] hover:border-[#3a3a44] transition-colors"
                    >
                      <Minus size={9} />
                    </button>
                    <span className="font-mono text-[#82829a] w-4 text-center">
                      {gridCols}
                    </span>
                    <button
                      onClick={() => setGridCols((c) => Math.min(16, c + 1))}
                      className="px-1 py-0.5 bg-[#0f0f12] rounded border border-[#222228] hover:border-[#3a3a44] transition-colors"
                    >
                      <Plus size={9} />
                    </button>
                  </div>
                </div>

                {/* The Grid */}
                <div
                  className="relative bg-[#0a0a0e] rounded-lg border border-[#1c1c22] overflow-hidden"
                  style={{
                    width: gridCols * CELL + 1,
                    height: gridRows * CELL + 1,
                  }}
                >
                  {/* Body outline (when pins exist) */}
                  {bodyBounds && (
                    <div
                      className="absolute pointer-events-none rounded-sm"
                      style={{
                        left: bodyBounds.minC * CELL + 2,
                        top: bodyBounds.minR * CELL + 2,
                        width:
                          (bodyBounds.maxC - bodyBounds.minC) * CELL +
                          CELL -
                          4,
                        height:
                          (bodyBounds.maxR - bodyBounds.minR) * CELL +
                          CELL -
                          4,
                        border: '1.5px dashed #3a3a5a',
                        background: 'rgba(60, 50, 100, 0.08)',
                      }}
                    />
                  )}

                  {/* Grid cells */}
                  {Array.from({ length: gridRows }, (_, row) =>
                    Array.from({ length: gridCols }, (_, col) => {
                      const pinIdx = pinAtCell.get(`${row},${col}`);
                      const hasPin = pinIdx !== undefined;
                      const isSelected = pinIdx === selectedPinIdx;
                      const isHovered =
                        hoveredCell?.row === row && hoveredCell?.col === col;
                      const pin = hasPin ? pinPlacements[pinIdx] : null;

                      return (
                        <div
                          key={`${row}-${col}`}
                          className="absolute cursor-pointer"
                          style={{
                            left: col * CELL,
                            top: row * CELL,
                            width: CELL,
                            height: CELL,
                          }}
                          onClick={() => handleCellClick(row, col)}
                          onMouseEnter={() => setHoveredCell({ row, col })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {/* Grid dot (hole indicator) */}
                          {!hasPin && (
                            <div
                              className="absolute rounded-full transition-all"
                              style={{
                                left: CELL / 2 - 3,
                                top: CELL / 2 - 3,
                                width: 6,
                                height: 6,
                                background: isHovered
                                  ? 'rgba(200, 255, 46, 0.3)'
                                  : '#1c1c24',
                                border: isHovered
                                  ? '1px solid rgba(200, 255, 46, 0.5)'
                                  : '1px solid #222230',
                              }}
                            />
                          )}

                          {/* Pin circle */}
                          {hasPin && (
                            <div
                              className="absolute rounded-full flex items-center justify-center transition-all"
                              style={{
                                left: CELL / 2 - PIN_R,
                                top: CELL / 2 - PIN_R,
                                width: PIN_R * 2,
                                height: PIN_R * 2,
                                background: isSelected
                                  ? '#c8ff2e'
                                  : '#d4a017',
                                border: isSelected
                                  ? '2px solid #e8ff6e'
                                  : '1.5px solid #b8860b',
                                boxShadow: isSelected
                                  ? '0 0 8px rgba(200, 255, 46, 0.5)'
                                  : isHovered
                                    ? '0 0 6px rgba(212, 160, 23, 0.4)'
                                    : 'none',
                              }}
                            >
                              <span
                                className="font-mono font-bold select-none"
                                style={{
                                  fontSize: pin!.number.length > 1 ? 7 : 8,
                                  color: isSelected ? '#111' : '#111',
                                  lineHeight: 1,
                                }}
                              >
                                {pin!.number}
                              </span>
                            </div>
                          )}

                          {/* Hover add indicator */}
                          {!hasPin && isHovered && (
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left: CELL / 2 - 4,
                                top: CELL / 2 - 4,
                                width: 8,
                                height: 8,
                                fontSize: 8,
                                lineHeight: '8px',
                                textAlign: 'center',
                                color: 'rgba(200, 255, 46, 0.6)',
                              }}
                            >
                              +
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Column labels */}
                  {Array.from({ length: gridCols }, (_, col) => (
                    <div
                      key={`col-label-${col}`}
                      className="absolute pointer-events-none select-none"
                      style={{
                        left: col * CELL,
                        top: -1,
                        width: CELL,
                        height: 10,
                        fontSize: 7,
                        textAlign: 'center',
                        color: '#2a2a38',
                        lineHeight: '10px',
                      }}
                    >
                      {col}
                    </div>
                  ))}
                  {/* Row labels */}
                  {Array.from({ length: gridRows }, (_, row) => (
                    <div
                      key={`row-label-${row}`}
                      className="absolute pointer-events-none select-none"
                      style={{
                        left: -2,
                        top: row * CELL,
                        width: 10,
                        height: CELL,
                        fontSize: 7,
                        textAlign: 'right',
                        color: '#2a2a38',
                        lineHeight: `${CELL}px`,
                      }}
                    >
                      {row}
                    </div>
                  ))}
                </div>

                <div className="text-[9px] text-[#38384a] mt-1.5 leading-relaxed">
                  Click to place a pin. Click a pin to select it.
                </div>
              </div>

              {/* ─── Pin List / Details Panel ──────────────── */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-[#4a4a5a] uppercase tracking-wider mb-1.5">
                  Pins ({pinPlacements.length})
                </div>

                <div className="space-y-0.5 max-h-[260px] overflow-y-auto pr-1">
                  {pinPlacements.length === 0 && (
                    <div className="text-[10px] text-[#2c2c36] text-center py-6">
                      No pins placed yet.
                      <br />
                      Click the grid to add pins.
                    </div>
                  )}

                  {pinPlacements.map((pin, i) => {
                    const isActive = i === selectedPinIdx;
                    // Find net from component's current pin (matching by number)
                    const compPin = component.pins.find(
                      (p) => p.number === pin.number
                    );
                    const pinNet = compPin?.netId
                      ? nets.find((n) => n.id === compPin.netId)
                      : null;

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all ${
                          isActive
                            ? 'bg-[#1c1a2e] ring-1 ring-[#c8ff2e]/30'
                            : 'hover:bg-[#19191d]'
                        }`}
                        onClick={() => setSelectedPinIdx(i)}
                      >
                        {/* Pin number (editable) */}
                        <input
                          type="text"
                          value={pin.number}
                          onChange={(e) =>
                            updatePin(i, { number: e.target.value })
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent text-[#ededf0] text-[11px] font-mono font-bold w-6 text-center shrink-0 rounded px-0.5 py-0.5 focus:bg-[#0f0f12] focus:outline-none border border-transparent focus:border-[#c8ff2e] transition-colors"
                        />

                        {/* Pin name (editable) */}
                        <input
                          type="text"
                          value={pin.name}
                          onChange={(e) =>
                            updatePin(i, { name: e.target.value })
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="name"
                          className="bg-transparent text-[#a6a6b8] text-[10px] flex-1 min-w-0 px-1 py-0.5 rounded focus:bg-[#0f0f12] focus:outline-none border border-transparent focus:border-[#c8ff2e] transition-colors placeholder:text-[#2c2c36]"
                        />

                        {/* Position */}
                        <span className="text-[9px] text-[#38384a] font-mono shrink-0">
                          ({pin.row},{pin.col})
                        </span>

                        {/* Net indicator */}
                        {pinNet && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: pinNet.color }}
                            title={pinNet.name}
                          />
                        )}

                        {/* Delete pin */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePin(i);
                          }}
                          className="text-[#2c2c36] hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all p-0.5"
                          style={{ opacity: isActive ? 1 : undefined }}
                          title="Remove pin"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Selected pin detail */}
                {selectedPinIdx !== null &&
                  selectedPinIdx < pinPlacements.length && (
                    <div className="mt-3 border-t border-[#1c1c22] pt-2">
                      <div className="text-[10px] font-semibold text-[#4a4a5a] uppercase tracking-wider mb-1.5">
                        Selected Pin
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-[#52525b] w-10 shrink-0">
                            Pin #
                          </label>
                          <input
                            type="text"
                            value={pinPlacements[selectedPinIdx].number}
                            onChange={(e) =>
                              updatePin(selectedPinIdx, {
                                number: e.target.value,
                              })
                            }
                            className="bg-[#0f0f12] text-[#ededf0] text-xs px-2 py-1 rounded-md flex-1 border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-[#52525b] w-10 shrink-0">
                            Name
                          </label>
                          <input
                            type="text"
                            value={pinPlacements[selectedPinIdx].name}
                            onChange={(e) =>
                              updatePin(selectedPinIdx, {
                                name: e.target.value,
                              })
                            }
                            placeholder="e.g. VCC, GND, SDA"
                            className="bg-[#0f0f12] text-[#a6a6b8] text-xs px-2 py-1 rounded-md flex-1 border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors placeholder:text-[#2c2c36]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] text-[#52525b] w-10 shrink-0">
                            Pos
                          </label>
                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            <span className="text-[#52525b]">r:</span>
                            <input
                              type="number"
                              min={0}
                              max={gridRows - 1}
                              value={pinPlacements[selectedPinIdx].row}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 0 && v < gridRows) {
                                  updatePin(selectedPinIdx, { row: v });
                                }
                              }}
                              className="bg-[#0f0f12] text-[#ededf0] px-1.5 py-1 rounded-md w-10 text-center border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors"
                            />
                            <span className="text-[#52525b]">c:</span>
                            <input
                              type="number"
                              min={0}
                              max={gridCols - 1}
                              value={pinPlacements[selectedPinIdx].col}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 0 && v < gridCols) {
                                  updatePin(selectedPinIdx, { col: v });
                                }
                              }}
                              className="bg-[#0f0f12] text-[#ededf0] px-1.5 py-1 rounded-md w-10 text-center border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removePin(selectedPinIdx)}
                          className="flex items-center gap-1 text-[10px] text-red-400/70 hover:text-red-400 transition-colors mt-1"
                        >
                          <Trash2 size={10} />
                          Remove this pin
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
          )}

          {/* ─── Bulk Edit Info ──────────────────────────────── */}
          {isBulkEdit && (
            <div className="border-t border-[#1c1c22] pt-3">
              <div className="text-[11px] text-[#63637a] space-y-2">
                <p>Bulk editing {componentIds.length} components of the same type.</p>
                <p className="text-[10px] text-[#4a4a5a]">
                  • Variant, value, and color will be applied to all selected components<br />
                  • Switch to a different visual variant to change all at once<br />
                  • Pin positions cannot be manually edited in bulk mode<br />
                  • Edit components individually for custom pin layouts
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1c1c22]">
          <span className="text-[10px] text-[#38384a]">
            {pinPlacements.length} pin{pinPlacements.length !== 1 ? 's' : ''}{' '}
            placed
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-[#63637a] hover:text-[#a6a6b8] transition-colors rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={pinPlacements.length === 0}
              className="px-4 py-1.5 text-xs font-semibold text-[#0f0f12] bg-[#c8ff2e] hover:bg-[#d4ff55] disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
