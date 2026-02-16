import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Trash2, RotateCcw, Palette } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';
import {
  createDefinitionFromPlacements,
  type PinPlacement,
} from '@/lib/component-utils';

interface EditComponentDialogProps {
  componentId: string;
  onClose: () => void;
}

import type { FootprintTypeName } from '@/lib/types';
type FootprintTypeOption = FootprintTypeName;

// ─── Grid Cell Size ─────────────────────────────────────────
const CELL = 28;
const PIN_R = 9;

export const EditComponentDialog = ({
  componentId,
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

  const component = components.find((c) => c.id === componentId);
  const definition = component
    ? componentDefinitions.find((d) => d.id === component.definitionId)
    : null;

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

  const [pinPlacements, setPinPlacements] = useState<PinPlacement[]>(() => {
    if (!definition || !component) return [];
    return definition.pins.map((p) => ({
      row: p.position.row,
      col: p.position.col,
      number: p.number,
      name: p.name ?? '',
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

  // ─── Preset Layouts ─────────────────────────────────────
  const applyPreset = useCallback(
    (type: FootprintTypeOption) => {
      const count = pinPlacements.length || 2;
      let newPins: PinPlacement[] = [];

      switch (type) {
        case 'SIP': {
          for (let i = 0; i < count; i++) {
            newPins.push({
              row: 0,
              col: i,
              number: String(i + 1),
              name: '',
            });
          }
          break;
        }
        case 'DIP': {
          const half = Math.ceil(count / 2);
          for (let i = 0; i < half; i++) {
            newPins.push({
              row: 0,
              col: i,
              number: String(i + 1),
              name: '',
            });
          }
          for (let i = 0; i < count - half; i++) {
            newPins.push({
              row: 3,
              col: half - 1 - i,
              number: String(half + i + 1),
              name: '',
            });
          }
          break;
        }
        case 'Axial': {
          const span = Math.max(2, count - 1);
          for (let i = 0; i < count; i++) {
            newPins.push({
              row: 0,
              col: i * Math.ceil(span / Math.max(count - 1, 1)),
              number: String(i + 1),
              name: '',
            });
          }
          break;
        }
        case 'Radial': {
          for (let i = 0; i < count; i++) {
            newPins.push({
              row: 0,
              col: i,
              number: String(i + 1),
              name: i === 0 ? '+' : i === 1 ? '-' : '',
            });
          }
          break;
        }
        default: // Custom — keep current
          return;
      }

      // Preserve existing names and net info where possible
      for (let i = 0; i < newPins.length && i < pinPlacements.length; i++) {
        if (pinPlacements[i].name) newPins[i].name = pinPlacements[i].name;
      }

      setPinPlacements(newPins);
      setSelectedPinIdx(null);

      // Expand grid if needed
      const maxR = Math.max(...newPins.map((p) => p.row), 0);
      const maxC = Math.max(...newPins.map((p) => p.col), 0);
      setGridRows((r) => Math.max(r, maxR + 3));
      setGridCols((c) => Math.max(c, maxC + 3));
    },
    [pinPlacements]
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
    if (pinPlacements.length === 0) return;

    saveToHistory();

    // Check if pin layout has changed
    const pinsChanged =
      pinPlacements.length !== definition.pins.length ||
      pinPlacements.some((pp, i) => {
        const dp = definition.pins[i];
        return (
          pp.number !== dp.number ||
          pp.name !== (dp.name ?? '') ||
          pp.row !== dp.position.row ||
          pp.col !== dp.position.col
        );
      });

    let defIdToUse = definition.id;

    // Only create new generic definition if pins actually changed
    if (pinsChanged) {
      const newDef = createDefinitionFromPlacements(footprintType, pinPlacements);
      // Register the new definition if needed
      if (!componentDefinitions.some((d) => d.id === newDef.id)) {
        addComponentDefinition(newDef);
      }
      defIdToUse = newDef.id;
    }

    // Rebuild component pins from the target definition
    const targetDef = pinsChanged
      ? componentDefinitions.find((d) => d.id === defIdToUse) ||
        createDefinitionFromPlacements(footprintType, pinPlacements)
      : definition;

    const newPins = targetDef.pins.map((pDef) => {
      const oldPin = component.pins.find((p) => p.number === pDef.number);
      return {
        number: pDef.number,
        netId: oldPin?.netId,
        position: {
          row: component.position.row + pDef.position.row,
          col: component.position.col + pDef.position.col,
        },
        extended: oldPin?.extended ?? 0,
      };
    });

    updateComponent(componentId, {
      reference,
      value: value || undefined,
      definitionId: defIdToUse,
      pins: newPins,
      color: bodyColor || undefined,
    });

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
    componentDefinitions,
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
      <div className="relative bg-[#141418] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/60 w-[620px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1c1c22]">
          <div>
            <h2 className="text-sm font-bold text-[#ededf0]">
              Edit Component
            </h2>
            <p className="text-[10px] text-[#52525b] mt-0.5">
              {definition.name} — {definition.footprint.type} package
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
                className="bg-[#0f0f12] text-[#ededf0] text-xs px-2.5 py-1.5 rounded-md flex-1 min-w-0 border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors font-mono"
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
                Type
              </label>
              <select
                value={footprintType}
                onChange={(e) => {
                  const t = e.target.value as FootprintTypeOption;
                  setFootprintType(t);
                  if (t !== 'Custom') applyPreset(t);
                }}
                className="bg-[#0f0f12] text-[#a6a6b8] text-xs px-2 py-1.5 rounded-md border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="Custom">Custom</option>
                <option value="SIP">SIP</option>
                <option value="DIP">DIP</option>
                <option value="Axial">Axial</option>
                <option value="Radial">Radial</option>
                <option value="TO92">TO-92</option>
                <option value="TO220">TO-220</option>
                <option value="TrimPot">TrimPot</option>
                <option value="TrimPotTop">TrimPot Top</option>
                <option value="TactSwitch">Tact Switch</option>
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
