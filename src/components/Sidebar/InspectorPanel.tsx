import { useStripboardStore } from '@/store/stripboard';
import type { Component, Wire, ImportReport } from '@/lib/types';
import { Eye, EyeOff, X, AlertTriangle, CheckCircle, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { calculateRatsNest } from '@/lib/ratsnest';

export const InspectorPanel = () => {
  const {
    selectedItems,
    components,
    wires,
    importReport,
  } = useStripboardStore();

  const selComponents = components.filter((c) =>
    selectedItems.includes(c.id)
  );
  const selWires = wires.filter((w) => selectedItems.includes(w.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* ─── Unconnected Nets Warning ─────────────────── */}
        <UnconnectedNetsPanel />

        {/* ─── Import Report ────────────────────────────── */}
        {importReport && <ImportReportPanel report={importReport} />}

        {selectedItems.length === 0 && !importReport && (
          <div className="p-4 text-xs text-[#38384a] text-center">
            Select an item on the board to edit its properties.
          </div>
        )}

        {selComponents.map((c) => (
          <ComponentProps key={c.id} component={c} />
        ))}
        {selWires.map((w) => (
          <WireProps key={w.id} wire={w} />
        ))}

        {/* ─── Net Manager ──────────────────────────────── */}
        <NetManager />
      </div>
    </div>
  );
};

// ─── Unconnected Nets Panel ─────────────────────────────────

function UnconnectedNetsPanel() {
  const { nets, components, wires, strips, setHighlightedNet, setPan, setZoom } = useStripboardStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate rats nest to determine which nets have unrouted connections
  const ratsNest = useMemo(() => {
    return calculateRatsNest(components, strips, wires, nets);
  }, [components, strips, wires, nets]);

  // Find nets that have unrouted connections (shown in rats nest)
  const unconnectedNets = nets.filter(net => {
    // Check if this net has any rats nest connections
    return ratsNest.some(conn => conn.netId === net.id);
  });

  const focusOnNet = (netId: string) => {
    // Find all pins for this net
    const netPins = components.flatMap(comp =>
      comp.pins.filter(pin => pin.netId === netId).map(pin => pin.position)
    );

    if (netPins.length === 0) return;

    // Calculate center point of all pins
    const avgRow = netPins.reduce((sum, pin) => sum + pin.row, 0) / netPins.length;
    const avgCol = netPins.reduce((sum, pin) => sum + pin.col, 0) / netPins.length;

    const GRID_PITCH = 25.4;
    
    // Center the view on the net's pins
    setPan({
      x: window.innerWidth / 2 - avgCol * GRID_PITCH,
      y: window.innerHeight / 2 - avgRow * GRID_PITCH
    });
    
    // Zoom in a bit
    setZoom(1.5);
    
    // Highlight the net
    setHighlightedNet(netId);
  };

  if (unconnectedNets.length === 0) return null;

  return (
    <div className="border-b border-[#1c1c22]">
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full px-3 pt-3 pb-2 flex items-center justify-between hover:bg-[#141418] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            Unconnected Nets ({unconnectedNets.length})
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-2 space-y-0.5">
          {unconnectedNets.map(net => (
            <button
              key={net.id}
              onClick={() => focusOnNet(net.id)}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-[#a6a6b8] hover:bg-[#1a1a22] hover:text-[#ededf0] transition-colors"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: net.color }}
              />
              <span className="truncate">{net.name}</span>
              <Zap size={10} className="ml-auto shrink-0 text-amber-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Import Report ──────────────────────────────────────────

function ImportReportPanel({ report }: { report: ImportReport }) {
  const { dismissImportReport } = useStripboardStore();
  const [showSkipped, setShowSkipped] = useState(true);
  const [showVirtual, setShowVirtual] = useState(false);

  const hasSkipped = report.skippedComponents.length > 0;
  const hasVirtual = report.virtualComponents.length > 0;

  return (
    <div className="border-b border-[#1c1c22]">
      {/* Header */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#4a4a5a] uppercase tracking-wider">
          Import Summary
        </span>
        <button
          onClick={dismissImportReport}
          className="text-[#38384a] hover:text-[#a6a6b8] transition-colors"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

      {/* Counts */}
      <div className="px-3 py-1.5 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[#a6a6b8]">
            {report.importedComponents} component{report.importedComponents !== 1 ? 's' : ''} placed
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle size={12} className="text-emerald-500 shrink-0" />
          <span className="text-[#a6a6b8]">
            {report.importedNets} net{report.importedNets !== 1 ? 's' : ''} created
          </span>
        </div>
      </div>

      {/* Skipped components */}
      {hasSkipped && (
        <div className="px-3 pb-1">
          <button
            onClick={() => setShowSkipped((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400/90 w-full py-1 hover:text-amber-300 transition-colors"
          >
            {showSkipped ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <AlertTriangle size={11} className="shrink-0" />
            <span>
              {report.skippedComponents.length} unsupported component{report.skippedComponents.length !== 1 ? 's' : ''}
            </span>
          </button>
          {showSkipped && (
            <div className="ml-1 space-y-0.5 pb-1">
              {report.skippedComponents.map((sc, i) => (
                <div
                  key={`${sc.ref}-${i}`}
                  className="flex flex-col gap-0.5 py-1 px-2 bg-[#19191d] rounded-md border border-[#222228]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-amber-300/80">
                      {sc.ref}
                    </span>
                    <span className="text-[10px] text-[#52525b]">
                      {sc.value}
                    </span>
                  </div>
                  <div className="text-[9px] text-[#52525b] truncate" title={sc.footprint}>
                    {sc.footprint || '(no footprint)'}
                  </div>
                  <div className="text-[9px] text-amber-400/60">
                    {sc.reason}
                  </div>
                </div>
              ))}
              <div className="text-[9px] text-[#38384a] italic px-1 pt-1 leading-relaxed">
                Nets referencing these components were still imported.
                Assign their connections manually via wires and pin nets.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Virtual / power symbols */}
      {hasVirtual && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowVirtual((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-[#63637a] w-full py-1 hover:text-[#a6a6b8] transition-colors"
          >
            {showVirtual ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Zap size={11} className="shrink-0" />
            <span>
              {report.virtualComponents.length} power / virtual symbol{report.virtualComponents.length !== 1 ? 's' : ''}
            </span>
          </button>
          {showVirtual && (
            <div className="ml-1 space-y-0.5 pb-1">
              {report.virtualComponents.map((vc, i) => (
                <div
                  key={`${vc.ref}-${i}`}
                  className="flex items-center gap-2 py-0.5 px-2 text-[10px]"
                >
                  <span className="font-mono text-[#63637a]">{vc.ref}</span>
                  <span className="text-[#4a4a5a]">{vc.value}</span>
                </div>
              ))}
              <div className="text-[9px] text-[#38384a] italic px-1 pt-1 leading-relaxed">
                Power symbols are available as assignable nets
                (e.g. +12V, GND). Use the Net Manager below.
              </div>
            </div>
          )}
        </div>
      )}

      {!hasSkipped && !hasVirtual && (
        <div className="px-3 pb-2 text-[10px] text-emerald-500/60">
          All components imported successfully.
        </div>
      )}
    </div>
  );
}

// ─── Component Properties ───────────────────────────────────

function ComponentProps({ component }: { component: Component }) {
  const {
    nets,
    componentDefinitions,
    updateComponent,
    updatePinNet,
    rotateComponent,
    saveToHistory,
  } = useStripboardStore();

  const def = componentDefinitions.find(
    (d) => d.id === component.definitionId
  );

  const handleRefChange = (ref: string) => {
    saveToHistory();
    updateComponent(component.id, { reference: ref });
  };

  const handleValueChange = (value: string) => {
    saveToHistory();
    updateComponent(component.id, { value: value || undefined });
  };

  return (
    <div className="border-b border-[#1c1c22]">
      {/* Header */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-bold text-[#c8ff2e]">
          {component.reference}
        </span>
        <span className="text-[10px] text-[#52525b]">
          {def?.name || component.definitionId}
        </span>
      </div>

      {/* Reference + Rotation */}
      <div className="px-3 py-1 flex items-center gap-2">
        <label className="text-[10px] text-[#52525b] w-8">Ref</label>
        <input
          type="text"
          value={component.reference}
          onChange={(e) => handleRefChange(e.target.value)}
          className="bg-[#19191d] text-[#a6a6b8] text-xs px-2 py-1 rounded-md flex-1 min-w-0 border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors"
        />
        <button
          onClick={() => rotateComponent(component.id)}
          className="text-[10px] text-[#63637a] hover:text-[#c8ff2e] bg-[#19191d] rounded-md px-2 py-1 transition-colors"
          title="Rotate 90° CW"
        >
          ↻ {component.rotation}°
        </button>
      </div>

      {/* Value */}
      <div className="px-3 py-1 flex items-center gap-2">
        <label className="text-[10px] text-[#52525b] w-8">Val</label>
        <input
          type="text"
          value={component.value || ''}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder="e.g. 10k, 56pF"
          className="bg-[#19191d] text-[#a78bfa] text-xs px-2 py-1 rounded-md flex-1 min-w-0 border border-[#222228] focus:border-[#a78bfa] focus:outline-none transition-colors placeholder:text-[#2c2c36]"
        />
      </div>

      {/* Position */}
      <div className="px-3 py-1 text-[10px] text-[#52525b]">
        Position: row {component.position.row + 1}, col{' '}
        {component.position.col + 1}
      </div>

      {/* Pin-Net Assignments */}
      <div className="px-3 pt-2 pb-1">
        <div className="text-[10px] font-semibold text-[#4a4a5a] mb-1">
          Pin ↔ Net Assignments
        </div>
        <div className="space-y-0.5">
          {component.pins.map((pin) => {
            const pinDef = def?.pins.find((p) => p.number === pin.number);
            return (
              <div
                key={pin.number}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="text-[#82829a] w-5 text-right font-mono shrink-0">
                  {pin.number}
                </span>
                {pinDef?.name && (
                  <span className="text-[#4a4a5a] w-5 text-[10px] shrink-0">
                    {pinDef.name}
                  </span>
                )}
                <select
                  value={pin.netId || ''}
                  onChange={(e) => {
                    saveToHistory();
                    updatePinNet(
                      component.id,
                      pin.number,
                      e.target.value || undefined
                    );
                  }}
                  className="
                    bg-[#19191d] text-[#a6a6b8] text-[11px] px-1.5 py-0.5
                    rounded-md flex-1 min-w-0
                    border border-[#222228] focus:border-[#c8ff2e] focus:outline-none
                    appearance-none cursor-pointer transition-colors
                  "
                  style={{
                    borderLeftColor: pin.netId
                      ? nets.find((n) => n.id === pin.netId)?.color || '#222228'
                      : '#222228',
                    borderLeftWidth: pin.netId ? '3px' : '1px',
                  }}
                >
                  <option value="">— none —</option>
                  {nets.map((net) => (
                    <option key={net.id} value={net.id}>
                      {net.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}

// ─── Wire Properties ────────────────────────────────────────

function WireProps({ wire }: { wire: Wire }) {
  const { nets, saveToHistory, updateWire } = useStripboardStore();

  return (
    <div className="border-b border-[#1c1c22] px-3 py-3">
      <div className="text-xs font-bold text-[#2dd4bf] mb-1">Wire</div>
      <div className="text-[10px] text-[#63637a] space-y-0.5">
        <div>
          {wire.points.length} points:{' '}
          {wire.points
            .map((p) => `(${p.row + 1},${p.col + 1})`)
            .join(' → ')}
        </div>
      </div>
      {/* Wire net assignment */}
      <div className="flex items-center gap-2 mt-1.5">
        <label className="text-[10px] text-[#52525b]">Net</label>
        <select
          value={wire.netId || ''}
          onChange={(e) => {
            saveToHistory();
            updateWire(wire.id, { netId: e.target.value });
          }}
          className="bg-[#19191d] text-[#a6a6b8] text-[11px] px-1.5 py-0.5 rounded-md flex-1 min-w-0 border border-[#222228] focus:border-[#c8ff2e] focus:outline-none transition-colors"
        >
          <option value="">— none —</option>
          {nets.map((net) => (
            <option key={net.id} value={net.id}>
              {net.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Net Manager ────────────────────────────────────────────

function NetManager() {
  const { nets, createNet, removeNet, updateNet, saveToHistory, highlightedNetId, setHighlightedNet } =
    useStripboardStore();

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-[#4a4a5a] uppercase tracking-wider">
          Nets ({nets.length})
        </span>
        <button
          onClick={() => createNet()}
          className="text-[10px] text-[#ff6352] hover:text-[#ff7e70] transition-colors"
        >
          + Add Net
        </button>
      </div>

      {nets.length === 0 && (
        <div className="text-[10px] text-[#2c2c36] text-center py-3 leading-relaxed">
          No nets defined.
          <br />
          Import a KiCad netlist or create nets manually.
        </div>
      )}

      <div className="space-y-0.5">
        {nets.map((net) => {
          const isHighlighted = highlightedNetId === net.id;
          return (
            <div
              key={net.id}
              className={`flex items-center gap-1.5 group rounded-md px-1 py-0.5 cursor-pointer transition-all ${
                isHighlighted
                  ? 'ring-1 ring-offset-0 bg-[#1a1a22]'
                  : 'hover:bg-[#141418]'
              }`}
              style={isHighlighted ? { boxShadow: `inset 0 0 0 1px ${net.color}40, 0 0 6px ${net.color}30` } : undefined}
              onClick={() => setHighlightedNet(net.id)}
              title="Click to highlight this net on the board"
            >
              {/* Color swatch / picker */}
              <label
                className="shrink-0 cursor-pointer"
                title="Change color"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="w-3 h-3 rounded-full border border-[#38384a]"
                  style={{ backgroundColor: net.color }}
                />
                <input
                  type="color"
                  value={net.color}
                  onChange={(e) => updateNet(net.id, { color: e.target.value })}
                  className="sr-only"
                />
              </label>

              {/* Name */}
              <input
                type="text"
                value={net.name}
                onChange={(e) => updateNet(net.id, { name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent text-[#a6a6b8] text-xs flex-1 min-w-0 px-1 py-0.5 rounded-md hover:bg-[#19191d] focus:bg-[#19191d] focus:outline-none border border-transparent focus:border-[#c8ff2e] transition-colors"
                style={{
                  opacity: net.visible === false ? 0.5 : 1,
                }}
              />

              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateNet(net.id, { visible: net.visible === false ? true : false });
                }}
                className="shrink-0 text-[#38384a] hover:text-[#a6a6b8] transition-colors opacity-0 group-hover:opacity-100"
                title={net.visible === false ? 'Show ratsnest' : 'Hide ratsnest'}
                style={{ opacity: net.visible === false ? 1 : undefined }}
              >
                {net.visible === false ? (
                  <EyeOff size={13} />
                ) : (
                  <Eye size={13} />
                )}
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  saveToHistory();
                  removeNet(net.id);
                }}
                className="text-[#2c2c36] hover:text-[#ff4060] text-sm opacity-0 group-hover:opacity-100 transition-all shrink-0 px-1"
                title="Delete net"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
