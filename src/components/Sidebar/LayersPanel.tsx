import { useStripboardStore } from '@/store/stripboard';
import type { LayerVisibility } from '@/lib/types';
import { processFileToReferenceImage } from '@/lib/image-import';
import {
  Eye,
  EyeOff,
  Cpu,
  Cable,
  Equal,
  Waypoints,
  LayoutGrid,
  Palette,
  Scissors,
  Tag,
  Hash,
  ChevronDown,
  Image as ImageIcon,
  Upload,
  Trash2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

type LayerInfo = {
  key: keyof LayerVisibility;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const LAYERS: LayerInfo[] = [
  {
    key: 'board',
    label: 'Board',
    description: 'Board background and holes',
    icon: <LayoutGrid size={14} />,
    color: '#52525b',
  },
  {
    key: 'strips',
    label: 'Strips',
    description: 'Copper strip traces',
    icon: <Equal size={14} />,
    color: '#c87533',
  },
  {
    key: 'cuts',
    label: 'Cuts',
    description: 'Strip break indicators',
    icon: <Scissors size={14} />,
    color: '#ef4444',
  },
  {
    key: 'components',
    label: 'Components',
    description: 'IC, resistor, capacitor bodies',
    icon: <Cpu size={14} />,
    color: '#8888bb',
  },
  {
    key: 'wires',
    label: 'Wires',
    description: 'Jumper wire connections',
    icon: <Cable size={14} />,
    color: '#2dd4bf',
  },
  {
    key: 'ratsNest',
    label: 'Ratsnest',
    description: 'Unrouted net connections',
    icon: <Waypoints size={14} />,
    color: '#6366f1',
  },
  {
    key: 'nets',
    label: 'Nets',
    description: 'Highlight strips in net colors',
    icon: <Palette size={14} />,
    color: '#f59e0b',
  },
  {
    key: 'refDesignations',
    label: 'Ref Designations',
    description: 'Component refs and pin numbers',
    icon: <Tag size={14} />,
    color: '#ccc',
  },
  {
    key: 'values',
    label: 'Values',
    description: 'Component values (1k, 56pF, etc.)',
    icon: <Hash size={14} />,
    color: '#a78bfa',
  },
];

const GRID_PITCH = 25.4;

export const LayersPanel = () => {
  const { 
    layerVisibility, 
    toggleLayer, 
    stripColor, 
    setStripColor, 
    netHighlightMode, 
    setNetHighlightMode, 
    ratsnestColorMode, 
    setRatsnestColorMode,
    rows,
    cols,
    setBoardSize,
    referenceImage,
    setReferenceImage,
    updateReferenceImage,
    clearReferenceImage,
  } = useStripboardStore();

  const [showBoardAccordion, setShowBoardAccordion] = useState(false);
  const [showRefAccordion, setShowRefAccordion] = useState(false);
  const [tempRows, setTempRows] = useState(rows);
  const [tempCols, setTempCols] = useState(cols);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync temp values when actual values change
  useEffect(() => {
    setTempRows(rows);
    setTempCols(cols);
  }, [rows, cols]);

  const allOn = Object.values(layerVisibility).every(Boolean);
  const allOff = Object.values(layerVisibility).every((v) => !v);

  const handleToggleAll = () => {
    const target = !allOn;
    for (const layer of LAYERS) {
      if (layerVisibility[layer.key] !== target) {
        toggleLayer(layer.key);
      }
    }
  };

  // ─── Image / PDF Import ──────────────────────────────────
  const [importing, setImporting] = useState(false);

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const refImage = await processFileToReferenceImage(file, rows, cols);
      setReferenceImage(refImage);
    } catch (err) {
      console.error('Failed to import reference image:', err);
    } finally {
      setImporting(false);
    }
    // Reset so same file can be re-imported
    e.target.value = '';
  };

  const PRESET_STRIP_COLORS = [
    { name: 'Dark Grey', color: '#4a4a4a' },
    { name: 'Copper', color: '#c87533' },
    { name: 'Silver', color: '#9ca3af' },
  ];

  const refVisible = referenceImage?.visible ?? false;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-[#1c1c22]">
        <span className="text-xs font-semibold text-[#a6a6b8] uppercase tracking-wider">
          Layer Visibility
        </span>
        <button
          onClick={handleToggleAll}
          className="text-[10px] text-[#63637a] hover:text-[#a6a6b8] transition-colors"
        >
          {allOn ? 'Hide All' : allOff ? 'Show All' : 'Show All'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        {/* ── Reference Section Header ── */}
        <div className="px-2.5 pt-1 pb-1">
          <span className="text-[10px] font-semibold text-[#a6a6b8] uppercase tracking-wider">
            Reference
          </span>
        </div>

        {/* ── Reference Image Layer Row ── */}
        <div>
          <button
            onClick={() => setShowRefAccordion(!showRefAccordion)}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
              transition-all group text-left
              ${
                refVisible
                  ? 'bg-[#19191d] hover:bg-[#1e1e24]'
                  : 'bg-transparent hover:bg-[#141418] opacity-50'
              }
            `}
          >
            {/* Icon */}
            <div
              className="shrink-0 flex items-center justify-center w-5 h-5 rounded"
              style={{ color: refVisible ? '#64748b' : '#38384a' }}
            >
              <ImageIcon size={14} />
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-[11px] font-medium leading-tight ${
                  refVisible ? 'text-[#ededf0]' : 'text-[#52525b]'
                }`}
              >
                Reference Image
              </div>
              <div className="text-[9px] text-[#38384a] leading-tight truncate">
                {referenceImage ? 'KiCAD schematic overlay' : 'Import or paste (Ctrl+V)'}
              </div>
            </div>

            {/* Visibility toggle */}
            {referenceImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateReferenceImage({ visible: !refVisible });
                }}
                className={`shrink-0 transition-colors p-0.5 rounded hover:bg-[#1c1c22] ${
                  refVisible
                    ? 'text-[#63637a] group-hover:text-[#a6a6b8]'
                    : 'text-[#2c2c36] group-hover:text-[#52525b]'
                }`}
              >
                {refVisible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            )}

            {/* Accordion chevron */}
            <div
              className={`shrink-0 transition-colors ${
                refVisible
                  ? 'text-[#63637a] group-hover:text-[#a6a6b8]'
                  : 'text-[#2c2c36] group-hover:text-[#52525b]'
              }`}
            >
              <ChevronDown
                size={13}
                className={`transition-transform ${showRefAccordion ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* ── Reference Image Accordion ── */}
          {showRefAccordion && (
            <div className="px-2.5 py-2 bg-[#141418] rounded-md mt-1 mb-1">
              {/* Hidden file input (images + PDF) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={handleImportImage}
              />

              {!referenceImage ? (
                /* No image loaded – show import button */
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
                    bg-[#1c1c22] hover:bg-[#222228] border border-[#2c2c36] hover:border-[#3c3c4a]
                    text-[10px] text-[#a6a6b8] transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                  <Upload size={12} />
                  {importing ? 'Importing...' : 'Import Image / PDF'}
                </button>
              ) : (
                /* Image loaded – show controls */
                <div className="space-y-2.5">
                  {/* Scale slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-[#63637a] uppercase tracking-wider">
                        Scale
                      </label>
                      <span className="text-[10px] text-[#a6a6b8] tabular-nums">
                        {Math.round(referenceImage.scale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="5"
                      step="0.01"
                      value={referenceImage.scale}
                      onChange={(e) =>
                        updateReferenceImage({ scale: parseFloat(e.target.value) })
                      }
                      className="w-full h-1 bg-[#2c2c36] rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[#a6a6b8] [&::-webkit-slider-thumb]:hover:bg-[#c8ff2e]
                        [&::-webkit-slider-thumb]:transition-colors"
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#1c1c22]" />

                  {/* Invert toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#a6a6b8]">Invert Colors</span>
                    <button
                      onClick={() =>
                        updateReferenceImage({ inverted: !referenceImage.inverted })
                      }
                      className={`
                        shrink-0 w-4 h-4 rounded-full transition-all flex items-center justify-center
                        ${
                          referenceImage.inverted
                            ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]'
                            : 'ring-1 ring-[#38384a]'
                        }
                      `}
                      style={{
                        backgroundColor: referenceImage.inverted ? '#c8ff2e' : 'transparent',
                      }}
                      title={referenceImage.inverted ? 'Disable invert' : 'Enable invert'}
                    >
                      {referenceImage.inverted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0e0e12]" />
                      )}
                    </button>
                  </div>

                  {/* On Top toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#a6a6b8]">Show On Top</span>
                    <button
                      onClick={() =>
                        updateReferenceImage({ onTop: !referenceImage.onTop })
                      }
                      className={`
                        shrink-0 w-4 h-4 rounded-full transition-all flex items-center justify-center
                        ${
                          referenceImage.onTop
                            ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]'
                            : 'ring-1 ring-[#38384a]'
                        }
                      `}
                      style={{
                        backgroundColor: referenceImage.onTop ? '#c8ff2e' : 'transparent',
                      }}
                      title={
                        referenceImage.onTop
                          ? 'Move below PCB layers'
                          : 'Show above all layers'
                      }
                    >
                      {referenceImage.onTop && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0e0e12]" />
                      )}
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#1c1c22]" />

                  {/* Replace / Clear row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded
                        bg-[#1c1c22] hover:bg-[#222228] border border-[#2c2c36] hover:border-[#3c3c4a]
                        text-[10px] text-[#a6a6b8] transition-all"
                    >
                      <Upload size={10} />
                      Replace
                    </button>
                    <button
                      onClick={() => {
                        clearReferenceImage();
                        setShowRefAccordion(false);
                      }}
                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded
                        bg-[#1c1c22] hover:bg-[#2a1515] border border-[#2c2c36] hover:border-[#ef4444]/30
                        text-[10px] text-[#ef4444]/70 hover:text-[#ef4444] transition-all"
                    >
                      <Trash2 size={10} />
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PCB Section Header ── */}
        <div className="px-2.5 pt-3 pb-1">
          <span className="text-[10px] font-semibold text-[#a6a6b8] uppercase tracking-wider">
            PCB
          </span>
        </div>

        {/* ── PCB Layers ── */}
        <div className="space-y-0.5">
          {LAYERS.map((layer) => {
            const isOn = layerVisibility[layer.key];
            const isStripsLayer = layer.key === 'strips';
            const isNetsLayer = layer.key === 'nets';
            const isRatsNestLayer = layer.key === 'ratsNest';
            const isBoardLayer = layer.key === 'board';
            return (
              <div key={layer.key}>
                <button
                  onClick={() => {
                    if (isBoardLayer) {
                      setShowBoardAccordion(!showBoardAccordion);
                    } else {
                      toggleLayer(layer.key);
                    }
                  }}
                  className={`
                    w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
                    transition-all group text-left
                    ${
                      isOn
                        ? 'bg-[#19191d] hover:bg-[#1e1e24]'
                        : 'bg-transparent hover:bg-[#141418] opacity-50'
                    }
                  `}
                >
                  {/* Color indicator + icon */}
                  <div
                    className="shrink-0 flex items-center justify-center w-5 h-5 rounded"
                    style={{
                      color: isOn ? layer.color : '#38384a',
                    }}
                  >
                    {layer.icon}
                  </div>

                  {/* Label + description */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[11px] font-medium leading-tight ${
                        isOn ? 'text-[#ededf0]' : 'text-[#52525b]'
                      }`}
                    >
                      {layer.label}
                    </div>
                    <div className="text-[9px] text-[#38384a] leading-tight truncate">
                      {layer.description}
                    </div>
                  </div>

                  {/* Color picker for strips - inline */}
                  {isStripsLayer && isOn && (
                    <div className="shrink-0 flex items-center gap-1 mr-2">
                      {PRESET_STRIP_COLORS.map((preset) => (
                        <button
                          key={preset.color}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStripColor(preset.color);
                          }}
                          className={`
                            w-4 h-4 rounded-full transition-all
                            ${stripColor === preset.color ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]' : 'hover:ring-1 hover:ring-[#63637a]'}
                          `}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  )}

                  {/* Mode radio button for nets - inline */}
                  {isNetsLayer && isOn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNetHighlightMode(netHighlightMode === 'full' ? 'connections' : 'full');
                      }}
                      className={`
                        shrink-0 mr-2 w-4 h-4 rounded-full transition-all flex items-center justify-center
                        ${netHighlightMode === 'connections' ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]' : 'ring-1 ring-[#38384a]'}
                      `}
                      style={{
                        backgroundColor: netHighlightMode === 'connections' ? '#c8ff2e' : 'transparent',
                      }}
                      title={netHighlightMode === 'full' ? 'Switch to connections mode' : 'Switch to full mode'}
                    >
                      {netHighlightMode === 'connections' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0e0e12]" />
                      )}
                    </button>
                  )}

                  {/* Mode radio button for ratsnest - inline */}
                  {isRatsNestLayer && isOn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRatsnestColorMode(ratsnestColorMode === 'colored' ? 'white' : 'colored');
                      }}
                      className={`
                        shrink-0 mr-2 w-4 h-4 rounded-full transition-all flex items-center justify-center
                        ${ratsnestColorMode === 'white' ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]' : 'ring-1 ring-[#38384a]'}
                      `}
                      style={{
                        backgroundColor: ratsnestColorMode === 'white' ? '#ffffff' : 'transparent',
                      }}
                      title={ratsnestColorMode === 'colored' ? 'Switch to white mode' : 'Switch to colored mode'}
                    >
                      {ratsnestColorMode === 'white' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0e0e12]" />
                      )}
                    </button>
                  )}

                  {/* Board layer: eye toggle + accordion chevron */}
                  {isBoardLayer && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayer('board');
                        }}
                        className={`shrink-0 transition-colors p-0.5 rounded hover:bg-[#1c1c22] ${
                          isOn
                            ? 'text-[#63637a] group-hover:text-[#a6a6b8]'
                            : 'text-[#2c2c36] group-hover:text-[#52525b]'
                        }`}
                      >
                        {isOn ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <div
                        className={`shrink-0 transition-colors ${
                          isOn
                            ? 'text-[#63637a] group-hover:text-[#a6a6b8]'
                            : 'text-[#2c2c36] group-hover:text-[#52525b]'
                        }`}
                      >
                        <ChevronDown
                          size={13}
                          className={`transition-transform ${showBoardAccordion ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </>
                  )}

                  {/* Standard visibility icon for non-board layers */}
                  {!isBoardLayer && (
                    <div
                      className={`shrink-0 transition-colors ${
                        isOn
                          ? 'text-[#63637a] group-hover:text-[#a6a6b8]'
                          : 'text-[#2c2c36] group-hover:text-[#52525b]'
                      }`}
                    >
                      {isOn ? <Eye size={13} /> : <EyeOff size={13} />}
                    </div>
                  )}
                </button>

                {/* Board size accordion */}
                {isBoardLayer && showBoardAccordion && (
                  <div className="px-2.5 py-2 bg-[#141418] rounded-md mt-1 mb-1">
                    <div className="text-[10px] font-semibold text-[#63637a] uppercase tracking-wider mb-2">
                      Board Size (Holes)
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-[#a6a6b8] w-12">Rows:</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={tempRows}
                          onChange={(e) => setTempRows(parseInt(e.target.value) || rows)}
                          onBlur={() => {
                            const validRows = Math.max(10, Math.min(100, tempRows));
                            setTempRows(validRows);
                            if (validRows !== rows) {
                              setBoardSize(validRows, cols);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-[11px] bg-[#0e0e12] border border-[#2c2c36] rounded text-[#ededf0] focus:outline-none focus:border-[#c8ff2e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-[#a6a6b8] w-12">Cols:</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={tempCols}
                          onChange={(e) => setTempCols(parseInt(e.target.value) || cols)}
                          onBlur={() => {
                            const validCols = Math.max(10, Math.min(100, tempCols));
                            setTempCols(validCols);
                            if (validCols !== cols) {
                              setBoardSize(rows, validCols);
                            }
                          }}
                          className="flex-1 px-2 py-1 text-[11px] bg-[#0e0e12] border border-[#2c2c36] rounded text-[#ededf0] focus:outline-none focus:border-[#c8ff2e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="text-[9px] text-[#52525b] mt-1">
                        Current: {rows} × {cols}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
