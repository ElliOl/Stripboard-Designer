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
  Plus,
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
    componentOpacity,
    setComponentOpacity,
    rows,
    cols,
    setBoardSize,
    pcbs,
    addPCB,
    removePCB,
    updatePCB,
    referenceImages,
    addReferenceImage,
    updateReferenceImageById,
    removeReferenceImage,
    clearAllReferenceImages,
  } = useStripboardStore();

  const [showBoardAccordion, setShowBoardAccordion] = useState(false);
  const [showRefAccordion, setShowRefAccordion] = useState(false);
  const [showComponentAccordion, setShowComponentAccordion] = useState(false);
  const [tempRows, setTempRows] = useState(rows);
  const [tempCols, setTempCols] = useState(cols);
  const [editingPcbId, setEditingPcbId] = useState<string | null>(null);
  const [addPcbDialogOpen, setAddPcbDialogOpen] = useState(false);
  const [deletePcbId, setDeletePcbId] = useState<string | null>(null);
  const [newPcbName, setNewPcbName] = useState('');
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
      addReferenceImage(refImage);
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

  const anyRefImageVisible = referenceImages.some((img) => img.visible);

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

        {/* ── Reference Images Layer Row ── */}
        <div>
          <button
            onClick={() => setShowRefAccordion(!showRefAccordion)}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
              transition-all group text-left
              ${
                anyRefImageVisible
                  ? 'bg-[#19191d] hover:bg-[#1e1e24]'
                  : 'bg-transparent hover:bg-[#141418] opacity-50'
              }
            `}
          >
            {/* Icon */}
            <div
              className="shrink-0 flex items-center justify-center w-5 h-5 rounded"
              style={{ color: anyRefImageVisible ? '#64748b' : '#38384a' }}
            >
              <ImageIcon size={14} />
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-[11px] font-medium leading-tight ${
                  anyRefImageVisible ? 'text-[#ededf0]' : 'text-[#52525b]'
                }`}
              >
                Reference Images
              </div>
              <div className="text-[9px] text-[#38384a] leading-tight truncate">
                {referenceImages.length === 0 
                  ? 'Import or paste (Ctrl+V)' 
                  : `${referenceImages.length} image${referenceImages.length > 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Accordion chevron */}
            <div
              className={`shrink-0 transition-colors ${
                anyRefImageVisible
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

          {/* ── Reference Images Accordion ── */}
          {showRefAccordion && (
            <div className="px-2.5 py-2 bg-[#141418] rounded-md mt-1 mb-1 space-y-2">
              {/* Hidden file input (images + PDF) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={handleImportImage}
              />

              {/* Add New Image Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
                  bg-[#1c1c22] hover:bg-[#222228] border border-[#2c2c36] hover:border-[#3c3c4a]
                  text-[10px] text-[#a6a6b8] transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                <Upload size={12} />
                {importing ? 'Importing...' : 'Add Image / PDF'}
              </button>

              {/* List of Reference Images */}
              {referenceImages.map((img, index) => (
                <div key={img.id} className="border border-[#1c1c22] rounded-md p-2 space-y-2">
                  {/* Image header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#a6a6b8]">
                      Image {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateReferenceImageById(img.id, { visible: !img.visible })}
                        className="p-0.5 rounded hover:bg-[#1c1c22] text-[#63637a] hover:text-[#a6a6b8] transition-colors"
                        title={img.visible ? 'Hide image' : 'Show image'}
                      >
                        {img.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button
                        onClick={() => removeReferenceImage(img.id)}
                        className="p-0.5 rounded hover:bg-[#2a1515] text-[#ef4444]/70 hover:text-[#ef4444] transition-colors"
                        title="Remove image"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Opacity slider (was scale slider) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-[#63637a] uppercase tracking-wider">
                        Opacity
                      </label>
                      <span className="text-[10px] text-[#a6a6b8] tabular-nums">
                        {Math.round(img.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={img.opacity}
                      onChange={(e) =>
                        updateReferenceImageById(img.id, { opacity: parseFloat(e.target.value) })
                      }
                      className="w-full h-1 bg-[#2c2c36] rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[#a6a6b8] [&::-webkit-slider-thumb]:hover:bg-[#c8ff2e]
                        [&::-webkit-slider-thumb]:transition-colors"
                    />
                  </div>

                  {/* Invert toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#a6a6b8]">Invert Colors</span>
                    <button
                      onClick={() =>
                        updateReferenceImageById(img.id, { inverted: !img.inverted })
                      }
                      className={`
                        shrink-0 w-4 h-4 rounded-full transition-all flex items-center justify-center
                        ${
                          img.inverted
                            ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]'
                            : 'ring-1 ring-[#38384a]'
                        }
                      `}
                      style={{
                        backgroundColor: img.inverted ? '#c8ff2e' : 'transparent',
                      }}
                      title={img.inverted ? 'Disable invert' : 'Enable invert'}
                    >
                      {img.inverted && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0e0e12]" />
                      )}
                    </button>
                  </div>

                  {/* On Top toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#a6a6b8]">Show On Top</span>
                    <button
                      onClick={() =>
                        updateReferenceImageById(img.id, { onTop: !img.onTop })
                      }
                      className={`
                        shrink-0 w-4 h-4 rounded-full transition-all flex items-center justify-center
                        ${
                          img.onTop
                            ? 'ring-1 ring-[#c8ff2e] ring-offset-1 ring-offset-[#0e0e12]'
                            : 'ring-1 ring-[#38384a]'
                        }
                      `}
                      style={{
                        backgroundColor: img.onTop ? '#c8ff2e' : 'transparent',
                      }}
                      title={
                        img.onTop
                          ? 'Move below PCB layers'
                          : 'Show above all layers'
                      }
                    >
                      {img.onTop && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0e0e12]" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Clear All button (only show if there are images) */}
              {referenceImages.length > 0 && (
                <>
                  <div className="border-t border-[#1c1c22]" />
                  <button
                    onClick={() => {
                      clearAllReferenceImages();
                      setShowRefAccordion(false);
                    }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded
                      bg-[#1c1c22] hover:bg-[#2a1515] border border-[#2c2c36] hover:border-[#ef4444]/30
                      text-[10px] text-[#ef4444]/70 hover:text-[#ef4444] transition-all"
                  >
                    <Trash2 size={10} />
                    Clear All
                  </button>
                </>
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
            const isComponentsLayer = layer.key === 'components';
            return (
              <div key={layer.key}>
                <button
                  onClick={() => {
                    if (isBoardLayer) {
                      setShowBoardAccordion(!showBoardAccordion);
                    } else if (isComponentsLayer) {
                      setShowComponentAccordion(!showComponentAccordion);
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

                  {/* Components layer: eye toggle + accordion chevron */}
                  {isComponentsLayer && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayer('components');
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
                          className={`transition-transform ${showComponentAccordion ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </>
                  )}

                  {/* Standard visibility icon for non-accordion layers */}
                  {!isBoardLayer && !isComponentsLayer && (
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

                {/* Components opacity accordion */}
                {isComponentsLayer && showComponentAccordion && (
                  <div className="px-2.5 py-2 bg-[#141418] rounded-md mt-1 mb-1">
                    <div className="text-[10px] font-semibold text-[#63637a] uppercase tracking-wider mb-2">
                      Component Opacity
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-[#a6a6b8]">Opacity</label>
                          <span className="text-[10px] text-[#a6a6b8] tabular-nums">
                            {Math.round(componentOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={componentOpacity}
                          onChange={(e) => setComponentOpacity(parseFloat(e.target.value))}
                          className="w-full h-1 bg-[#2c2c36] rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-[#a6a6b8] [&::-webkit-slider-thumb]:hover:bg-[#c8ff2e]
                            [&::-webkit-slider-thumb]:transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                    
                    {/* Additional PCBs Section */}
                    <div className="mt-4">
                      <div className="text-[10px] font-semibold text-[#63637a] uppercase tracking-wider mb-2">
                        Additional PCBs ({pcbs.length - 1})
                      </div>
                      
                      <div className="space-y-2">
                        {/* Add new PCB button */}
                        <button
                          onClick={() => {
                            setNewPcbName(`PCB ${pcbs.length}`);
                            setAddPcbDialogOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
                            bg-[#1c1c22] hover:bg-[#222228] border border-[#2c2c36] hover:border-[#3c3c4a]
                            text-[10px] text-[#a6a6b8] transition-all"
                        >
                          <Plus size={12} />
                          Add PCB
                        </button>

                        {/* List of additional PCBs */}
                        {pcbs.filter(p => !p.isMain).map((pcb) => (
                            <div key={pcb.id} className="border border-[#1c1c22] rounded-md p-2 space-y-2">
                              {/* PCB header */}
                              <div className="flex items-center justify-between">
                                {editingPcbId === pcb.id ? (
                                  <input
                                    type="text"
                                    defaultValue={pcb.name}
                                    autoFocus
                                    onBlur={(e) => {
                                      if (e.target.value.trim()) {
                                        updatePCB(pcb.id, { name: e.target.value.trim() });
                                      }
                                      setEditingPcbId(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if ((e.target as HTMLInputElement).value.trim()) {
                                          updatePCB(pcb.id, { name: (e.target as HTMLInputElement).value.trim() });
                                        }
                                        setEditingPcbId(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingPcbId(null);
                                      }
                                    }}
                                    className="flex-1 text-[10px] font-semibold text-[#a6a6b8] bg-[#0e0e12] border border-[#c8ff2e] rounded px-1 py-0.5 focus:outline-none"
                                  />
                                ) : (
                                  <button
                                    onClick={() => setEditingPcbId(pcb.id)}
                                    className="flex-1 text-left text-[10px] font-semibold text-[#a6a6b8] hover:text-[#ededf0] transition-colors"
                                  >
                                    {pcb.name}
                                  </button>
                                )}
                                <button
                                  onClick={() => setDeletePcbId(pcb.id)}
                                  className="p-0.5 rounded hover:bg-[#2a1515] text-[#ef4444]/70 hover:text-[#ef4444] transition-colors"
                                  title="Delete PCB"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* Size controls */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <label className="text-[9px] text-[#63637a] w-10">Rows:</label>
                                  <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={pcb.rows}
                                    onChange={(e) => {
                                      const newRows = Math.max(5, Math.min(100, parseInt(e.target.value) || pcb.rows));
                                      updatePCB(pcb.id, { rows: newRows });
                                    }}
                                    className="flex-1 px-1.5 py-0.5 text-[10px] bg-[#0e0e12] border border-[#2c2c36] rounded text-[#ededf0] focus:outline-none focus:border-[#c8ff2e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[9px] text-[#63637a] w-10">Cols:</label>
                                  <input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={pcb.cols}
                                    onChange={(e) => {
                                      const newCols = Math.max(5, Math.min(100, parseInt(e.target.value) || pcb.cols));
                                      updatePCB(pcb.id, { cols: newCols });
                                    }}
                                    className="flex-1 px-1.5 py-0.5 text-[10px] bg-[#0e0e12] border border-[#2c2c36] rounded text-[#ededf0] focus:outline-none focus:border-[#c8ff2e] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Add PCB Dialog */}
      {addPcbDialogOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/50 p-4 max-w-sm mx-4 min-w-[300px]">
            <div className="text-xs font-semibold text-[#a6a6b8] mb-3">Add New PCB</div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#63637a] mb-1 block">Name</label>
                <input
                  type="text"
                  value={newPcbName}
                  onChange={(e) => setNewPcbName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newPcbName.trim()) {
                      addPCB(newPcbName.trim(), 20, 30);
                      setAddPcbDialogOpen(false);
                      setNewPcbName('');
                    } else if (e.key === 'Escape') {
                      setAddPcbDialogOpen(false);
                      setNewPcbName('');
                    }
                  }}
                  autoFocus
                  className="w-full px-2 py-1.5 text-xs bg-[#0e0e12] border border-[#2c2c36] rounded text-[#ededf0] focus:outline-none focus:border-[#c8ff2e]"
                  placeholder="e.g., Power Supply, Audio Board"
                />
              </div>
              <div className="text-[9px] text-[#52525b]">
                Default size: 20 rows × 30 cols (adjustable after creation)
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setAddPcbDialogOpen(false);
                  setNewPcbName('');
                }}
                className="px-3 py-1.5 text-xs text-[#a6a6b8] bg-[#19191d] hover:bg-[#222228] rounded-md border border-[#2a2a34] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newPcbName.trim()) {
                    addPCB(newPcbName.trim(), 20, 30);
                    setAddPcbDialogOpen(false);
                    setNewPcbName('');
                  }
                }}
                disabled={!newPcbName.trim()}
                className="px-3 py-1.5 text-xs text-[#0e0e12] bg-[#c8ff2e] hover:bg-[#d4ff55] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add PCB
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete PCB Confirmation Dialog */}
      {deletePcbId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/50 p-4 max-w-sm mx-4">
            <div className="flex items-start gap-3 mb-4">
              <Trash2 size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-[#ededf0] mb-1">Delete PCB?</div>
                <p className="text-xs text-[#a6a6b8] leading-relaxed">
                  Delete <span className="font-semibold">{pcbs.find(p => p.id === deletePcbId)?.name}</span>? 
                  This will remove the PCB and all its strips. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletePcbId(null)}
                className="px-3 py-1.5 text-xs text-[#a6a6b8] bg-[#19191d] hover:bg-[#222228] rounded-md border border-[#2a2a34] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removePCB(deletePcbId);
                  setDeletePcbId(null);
                }}
                className="px-3 py-1.5 text-xs text-white bg-red-500/80 hover:bg-red-500 rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
