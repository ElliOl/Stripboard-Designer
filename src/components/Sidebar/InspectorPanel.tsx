import { useStripboardStore } from '@/store/stripboard';
import type { Component, Wire, Net, NetGroup } from '@/lib/types';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  FolderPlus,
  FolderMinus,
  FolderX,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { calculateRatsNest } from '@/lib/ratsnest';

// ─── Shared Accordion Header (matches Library tab style) ──────────

function AccordionHeader({
  label,
  count,
  isExpanded,
  onToggle,
  icon: Icon,
  iconClassName,
  color,
  actions,
}: {
  label: string;
  count?: number;
  isExpanded: boolean;
  onToggle: (e?: React.MouseEvent) => void;
  icon?: React.ElementType;
  iconClassName?: string;
  color?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center w-full">
      <button
        onClick={(e) => onToggle(e)}
        className="flex-1 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-[#141418] transition-colors"
        style={{ color: color || '#4a4a5a' }}
      >
        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {Icon && <Icon size={13} className={iconClassName} />}
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-[#38384a] font-normal ml-auto">
            {count}
          </span>
        )}
      </button>
      {actions && (
        <div className="flex items-center gap-1 pr-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── Net Context Menu ────────────────────────────────────────────

interface NetContextMenuState {
  netIds: string[];
  x: number;
  y: number;
}

function NetContextMenu({
  state,
  onClose,
  onRename,
  onDelete,
  onAddToGroup,
  netGroups,
}: {
  state: NetContextMenuState;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddToGroup: (groupId: string) => void;
  netGroups: NetGroup[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showGroupSubmenu, setShowGroupSubmenu] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState({ x: state.x, y: state.y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 8;
    let x = state.x;
    let y = state.y;
    if (x + rect.width > vw - padding) x = vw - rect.width - padding;
    if (y + rect.height > vh - padding) y = vh - rect.height - padding;
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    setAdjustedPos({ x, y });
  }, [state.x, state.y, showGroupSubmenu]);

  const isSingle = state.netIds.length === 1;

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: adjustedPos.x, top: adjustedPos.y, zIndex: 9999 }}
    >
      <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[200px] overflow-hidden">
        {isSingle && (
          <button
            onClick={() => { onRename(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#a6a6b8] hover:bg-[#c8ff2e]/10 hover:text-[#ededf0] transition-colors"
          >
            <Pencil size={13} className="shrink-0" />
            <span className="flex-1 text-left">Rename Net</span>
          </button>
        )}

        {/* Add to group */}
        <button
          onClick={() => setShowGroupSubmenu((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#a6a6b8] hover:bg-[#c8ff2e]/10 hover:text-[#ededf0] transition-colors"
        >
          <FolderPlus size={13} className="shrink-0" />
          <span className="flex-1 text-left">
            Add to Group ({state.netIds.length} net{state.netIds.length !== 1 ? 's' : ''})
          </span>
          {showGroupSubmenu ? <ChevronDown size={11} className="shrink-0" /> : <ChevronRight size={11} className="shrink-0" />}
        </button>

        {showGroupSubmenu && (
          <div className="bg-[#15151a] border-t border-b border-[#2a2a34] py-1">
            <button
              onClick={() => {
                const name = prompt('Group name:');
                if (name) {
                  const { addNetGroup } = useStripboardStore.getState();
                  addNetGroup(name, state.netIds);
                }
                onClose();
              }}
              className="w-full flex items-center gap-2 px-5 py-1.5 text-xs text-[#c8ff2e] hover:bg-[#c8ff2e]/10 transition-colors"
            >
              <Plus size={13} className="shrink-0" />
              <span className="flex-1 text-left">New Group...</span>
            </button>
            {netGroups.length > 0 && (
              <div className="h-px bg-[#2a2a34] my-1 mx-3" />
            )}
            {netGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => { onAddToGroup(g.id); onClose(); }}
                className="w-full flex items-center gap-2 px-5 py-1.5 text-xs text-[#a6a6b8] hover:bg-[#c8ff2e]/10 hover:text-[#ededf0] transition-colors"
              >
                <span className="flex-1 text-left truncate">{g.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="h-px bg-[#2a2a34] my-1 mx-2" />

        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <Trash2 size={13} className="shrink-0" />
          <span className="flex-1 text-left">
            Delete {state.netIds.length > 1 ? `${state.netIds.length} Nets` : 'Net'}
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Delete Confirmation Dialog ──────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/50 p-4 max-w-sm mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-[#a6a6b8] leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-[#a6a6b8] bg-[#19191d] hover:bg-[#222228] rounded-md border border-[#2a2a34] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs text-white bg-red-500/80 hover:bg-red-500 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Inspector Panel ────────────────────────────────────────

export const InspectorPanel = () => {
  const {
    selectedItems,
    wires,
  } = useStripboardStore();

  const selWires = wires.filter((w) => selectedItems.includes(w.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Import Report */}
        <ImportReportPanel />

        {/* Unconnected Nets Warning */}
        <UnconnectedNetsPanel />

        {/* Components category accordion */}
        <ComponentsCategory />

        {selWires.map((w) => (
          <WireProps key={w.id} wire={w} />
        ))}

        {/* Net Manager */}
        <NetManager />
      </div>
    </div>
  );
};

// ─── Components Category Accordion ──────────────────────────────

function ComponentsCategory() {
  const {
    components,
    selectedItems,
    componentDefinitions,
    componentSearchFilter,
    setComponentSearchFilter,
    selectItem,
  } = useStripboardStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedComponentIds = useMemo(() => {
    const compIds = new Set(components.map((c) => c.id));
    return selectedItems.filter((id) => compIds.has(id));
  }, [components, selectedItems]);

  // Filter components based on search
  const filteredComponents = useMemo(() => {
    if (!componentSearchFilter.trim()) return components;
    const lower = componentSearchFilter.toLowerCase();
    return components.filter((c) => {
      const def = componentDefinitions.find((d) => d.id === c.definitionId);
      return (
        c.reference.toLowerCase().includes(lower) ||
        (c.value || '').toLowerCase().includes(lower) ||
        (def?.name || '').toLowerCase().includes(lower)
      );
    });
  }, [components, componentSearchFilter, componentDefinitions]);

  // Auto-expand when components are selected
  const prevSelectedCount = useRef(0);
  useEffect(() => {
    if (selectedComponentIds.length > 0 && prevSelectedCount.current === 0) {
      setIsExpanded(true);
    }
    prevSelectedCount.current = selectedComponentIds.length;
  }, [selectedComponentIds.length]);

  if (components.length === 0) return null;

  return (
    <div className="border-b border-[#1c1c22]">
      <AccordionHeader
        label="Components"
        count={components.length}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((v) => !v)}
        color="#a6a6b8"
      />

      {isExpanded && (
        <div className="px-3 pb-1">
          {/* Search box */}
          {components.length > 0 && (
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#38384a]" />
              <input
                type="text"
                value={componentSearchFilter}
                onChange={(e) => setComponentSearchFilter(e.target.value)}
                placeholder="Filter components..."
                className="w-full bg-[#19191d] text-[#a6a6b8] text-xs pl-7 pr-2 py-1.5 rounded-md border border-[#222228] focus:border-[#c8ff2e]/50 focus:outline-none transition-colors placeholder:text-[#2c2c36]"
              />
            </div>
          )}

          <div className="space-y-0.5">
            {filteredComponents.map((c) => (
              <ComponentProps
                key={c.id}
                component={c}
                isSelected={selectedComponentIds.includes(c.id)}
                onSelect={(id, multi) => selectItem(id, multi)}
              />
            ))}
          </div>

          {componentSearchFilter.trim() && filteredComponents.length === 0 && (
            <div className="text-[10px] text-[#38384a] text-center py-2">
              No components match &quot;{componentSearchFilter}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Unconnected Nets Panel ─────────────────────────────────

function UnconnectedNetsPanel() {
  const { nets, components, wires, strips, setHighlightedNet, setPan, setZoom } = useStripboardStore();
  const [isExpanded, setIsExpanded] = useState(false); // Start closed

  const ratsNest = useMemo(() => {
    return calculateRatsNest(components, strips, wires, nets);
  }, [components, strips, wires, nets]);

  const unconnectedNets = nets.filter(net => {
    return ratsNest.some(conn => conn.netId === net.id);
  });

  const focusOnNet = (netId: string) => {
    const netPins = components.flatMap(comp =>
      comp.pins.filter(pin => pin.netId === netId).map(pin => pin.position)
    );
    if (netPins.length === 0) return;

    const avgRow = netPins.reduce((sum, pin) => sum + pin.row, 0) / netPins.length;
    const avgCol = netPins.reduce((sum, pin) => sum + pin.col, 0) / netPins.length;
    const GRID_PITCH = 25.4;

    setPan({
      x: window.innerWidth / 2 - avgCol * GRID_PITCH,
      y: window.innerHeight / 2 - avgRow * GRID_PITCH
    });
    setZoom(1.5);
    setHighlightedNet(netId);
  };

  if (unconnectedNets.length === 0) return null;

  return (
    <div className="border-b border-[#1c1c22]">
      <AccordionHeader
        label="Unconnected Nets"
        count={unconnectedNets.length}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(v => !v)}
        icon={AlertTriangle}
        iconClassName="text-amber-400"
        color="#f59e0b"
      />

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

// ─── Import Report (accordion, not dismissable) ─────────────────

function ImportReportPanel() {
  const { importReport: report } = useStripboardStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);
  const [showVirtual, setShowVirtual] = useState(false);

  if (!report) return null;

  const hasSkipped = report.skippedComponents.length > 0;
  const hasVirtual = report.virtualComponents.length > 0;

  return (
    <div className="border-b border-[#1c1c22]">
      <AccordionHeader
        label="Import Summary"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(v => !v)}
        icon={CheckCircle}
        iconClassName="text-emerald-500"
        color="#a6a6b8"
      />

      {isExpanded && (
        <div className="px-3 pb-2">
          {/* Counts */}
          <div className="py-1.5 space-y-1">
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
            <div className="pb-1">
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
            <div className="pb-1">
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
            <div className="pb-1 text-[10px] text-emerald-500/60">
              All components imported successfully.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component Properties (accordion per component) ─────────────

function ComponentProps({
  component,
  isSelected = false,
  onSelect,
}: {
  component: Component;
  isSelected?: boolean;
  onSelect?: (id: string, multi?: boolean) => void;
}) {
  const {
    nets,
    componentDefinitions,
    updateComponent,
    updatePinNet,
    rotateComponent,
    saveToHistory,
  } = useStripboardStore();

  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [unlockedPins, setUnlockedPins] = useState<Set<string>>(new Set());

  // Auto-expand when selected, collapse when deselected
  useEffect(() => {
    setIsExpanded(isSelected);
  }, [isSelected]);

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

  const togglePinLock = (pinNumber: string) => {
    setUnlockedPins((prev) => {
      const next = new Set(prev);
      if (next.has(pinNumber)) {
        next.delete(pinNumber);
      } else {
        next.add(pinNumber);
      }
      return next;
    });
  };

  return (
    <div className={`rounded-md ${isSelected ? 'bg-[#19191d]' : ''}`}>
      <AccordionHeader
        label={component.reference}
        isExpanded={isExpanded}
        onToggle={(e) => {
          setIsExpanded(v => !v);
          // Also select the component on the PCB
          if (onSelect) {
            onSelect(component.id, e?.ctrlKey || e?.metaKey);
          }
        }}
        color="#c8ff2e"
        actions={
          <span className="text-[10px] text-[#52525b]">
            {def?.name || component.definitionId}
          </span>
        }
      />

      {isExpanded && (
        <div>
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
              title="Rotate 90 CW"
            >
              {'\u21BB'} {component.rotation}{'\u00B0'}
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
              Pin {'\u2194'} Net Assignments
            </div>
            <div className="space-y-0.5">
              {component.pins.map((pin) => {
                const pinDef = def?.pins.find((p) => p.number === pin.number);
                const isUnlocked = unlockedPins.has(pin.number);
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
                      disabled={!isUnlocked}
                      onChange={(e) => {
                        saveToHistory();
                        updatePinNet(
                          component.id,
                          pin.number,
                          e.target.value || undefined
                        );
                      }}
                      className={`
                        bg-[#19191d] text-[11px] px-1.5 py-0.5
                        rounded-md flex-1 min-w-0
                        border border-[#222228] focus:border-[#c8ff2e] focus:outline-none
                        transition-colors
                        ${isUnlocked
                          ? 'text-[#a6a6b8] appearance-none cursor-pointer'
                          : 'text-[#63637a] cursor-not-allowed opacity-70'
                        }
                      `}
                      style={{
                        borderLeftColor: pin.netId
                          ? nets.find((n) => n.id === pin.netId)?.color || '#222228'
                          : '#222228',
                        borderLeftWidth: pin.netId ? '3px' : '1px',
                      }}
                    >
                      <option value="">{'\u2014'} none {'\u2014'}</option>
                      {nets.map((net) => (
                        <option key={net.id} value={net.id}>
                          {net.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => togglePinLock(pin.number)}
                      className={`shrink-0 p-0.5 rounded transition-colors ${
                        isUnlocked
                          ? 'text-[#c8ff2e] hover:text-[#c8ff2e]/80'
                          : 'text-[#38384a] hover:text-[#63637a]'
                      }`}
                      title={isUnlocked ? 'Lock pin assignment' : 'Unlock to edit pin assignment'}
                    >
                      {isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-2" />
        </div>
      )}
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
            .join(' \u2192 ')}
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
          <option value="">{'\u2014'} none {'\u2014'}</option>
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

// ─── Net Manager (full accordion with search, multi-select, groups, context menu) ─

function NetManager() {
  const {
    nets,
    createNet,
    removeNet,
    updateNet,
    saveToHistory,
    highlightedNetId,
    setHighlightedNet,
    setAllNetsVisible,
    netSearchFilter,
    setNetSearchFilter,
    selectedNetIds,
    toggleNetSelection,
    clearNetSelection,
    netGroups,
    dissolveNetGroup,
    deleteNetGroupWithNets,
    addNetsToGroup,
  } = useStripboardStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<NetContextMenuState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ netIds: string[]; hasImported: boolean } | null>(null);
  const [editingNetId, setEditingNetId] = useState<string | null>(null);
  const [groupContextMenu, setGroupContextMenu] = useState<{ groupId: string; x: number; y: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus the edit input when editing starts
  useEffect(() => {
    if (editingNetId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNetId]);

  // All nets visible?
  const allVisible = nets.every((n) => n.visible !== false);

  // Filter nets based on search
  const filteredNets = useMemo(() => {
    if (!netSearchFilter.trim()) return nets;
    const lower = netSearchFilter.toLowerCase();
    return nets.filter((n) => n.name.toLowerCase().includes(lower));
  }, [nets, netSearchFilter]);

  // Track pre-filter visibility so we can restore when filter is cleared
  const preFilterVisibility = useRef<Map<string, boolean>>(new Map());
  const wasFiltering = useRef(false);

  // Auto-hide nets not matching the search filter on the canvas
  useEffect(() => {
    const isFiltering = netSearchFilter.trim().length > 0;

    if (isFiltering && !wasFiltering.current) {
      // Entering filter mode — save current visibility state
      const saved = new Map<string, boolean>();
      for (const n of nets) {
        saved.set(n.id, n.visible !== false);
      }
      preFilterVisibility.current = saved;
    }

    if (isFiltering) {
      // Hide nets that don't match, show those that do
      const lower = netSearchFilter.toLowerCase();
      for (const n of nets) {
        const matches = n.name.toLowerCase().includes(lower);
        const currentlyVisible = n.visible !== false;
        if (matches && !currentlyVisible) {
          updateNet(n.id, { visible: true });
        } else if (!matches && currentlyVisible) {
          updateNet(n.id, { visible: false });
        }
      }
    } else if (!isFiltering && wasFiltering.current) {
      // Exiting filter mode — restore saved visibility
      for (const n of nets) {
        const savedVis = preFilterVisibility.current.get(n.id);
        if (savedVis !== undefined) {
          const currentlyVisible = n.visible !== false;
          if (savedVis !== currentlyVisible) {
            updateNet(n.id, { visible: savedVis });
          }
        }
      }
      preFilterVisibility.current.clear();
    }

    wasFiltering.current = isFiltering;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netSearchFilter]);

  // Group nets by group membership
  const groupedNetIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of netGroups) {
      for (const id of g.netIds) set.add(id);
    }
    return set;
  }, [netGroups]);

  const ungroupedNets = filteredNets.filter((n) => !groupedNetIds.has(n.id));

  // Handle right click on a net
  const handleNetContextMenu = useCallback(
    (e: React.MouseEvent, netId: string) => {
      e.preventDefault();
      e.stopPropagation();

      // If the net is in the selection, use the selection; otherwise just this net
      const targetIds = selectedNetIds.includes(netId)
        ? [...selectedNetIds]
        : [netId];

      setContextMenu({ netIds: targetIds, x: e.clientX, y: e.clientY });
    },
    [selectedNetIds]
  );

  // Handle rename from context menu
  const handleRename = useCallback(() => {
    if (contextMenu && contextMenu.netIds.length === 1) {
      setEditingNetId(contextMenu.netIds[0]);
    }
  }, [contextMenu]);

  // Handle delete (with warning for imported nets)
  const handleDeleteNets = useCallback(
    (netIds: string[]) => {
      const hasImported = netIds.some((id) =>
        nets.find((n) => n.id === id)?.imported
      );
      if (hasImported) {
        setConfirmDelete({ netIds, hasImported: true });
      } else {
        saveToHistory();
        for (const id of netIds) removeNet(id);
        clearNetSelection();
      }
    },
    [nets, saveToHistory, removeNet, clearNetSelection]
  );

  const confirmDeleteAction = useCallback(() => {
    if (!confirmDelete) return;
    saveToHistory();
    for (const id of confirmDelete.netIds) removeNet(id);
    clearNetSelection();
    setConfirmDelete(null);
  }, [confirmDelete, saveToHistory, removeNet, clearNetSelection]);

  // Render a single net row
  const renderNetRow = (net: Net) => {
    const isHighlighted = highlightedNetId === net.id;
    const isSelected = selectedNetIds.includes(net.id);
    const isEditing = editingNetId === net.id;

    return (
      <div
        key={net.id}
        className={`flex items-center gap-1.5 group rounded-md px-1 py-0.5 cursor-pointer transition-all ${
          isSelected
            ? 'bg-[#1a1a2a] ring-1 ring-[#3b82f6]/40'
            : isHighlighted
            ? 'ring-1 ring-offset-0 bg-[#1a1a22]'
            : 'hover:bg-[#141418]'
        }`}
        style={
          isHighlighted && !isSelected
            ? { boxShadow: `inset 0 0 0 1px ${net.color}40, 0 0 6px ${net.color}30` }
            : undefined
        }
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            toggleNetSelection(net.id, true);
          } else if (e.shiftKey && selectedNetIds.length > 0) {
            // Range select
            const allNetIds = filteredNets.map((n) => n.id);
            const lastIdx = allNetIds.indexOf(selectedNetIds[selectedNetIds.length - 1]);
            const thisIdx = allNetIds.indexOf(net.id);
            if (lastIdx >= 0 && thisIdx >= 0) {
              const start = Math.min(lastIdx, thisIdx);
              const end = Math.max(lastIdx, thisIdx);
              const rangeIds = allNetIds.slice(start, end + 1);
              const newSelection = [...new Set([...selectedNetIds, ...rangeIds])];
              useStripboardStore.getState().setSelectedNetIds(newSelection);
            }
          } else {
            toggleNetSelection(net.id, false);
            setHighlightedNet(net.id);
          }
        }}
        onContextMenu={(e) => handleNetContextMenu(e, net.id)}
        title="Click to select/highlight. Right-click for options."
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

        {/* Name (read-only unless editing via right-click) */}
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            defaultValue={net.name}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              updateNet(net.id, { name: e.target.value });
              setEditingNetId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateNet(net.id, { name: (e.target as HTMLInputElement).value });
                setEditingNetId(null);
              }
              if (e.key === 'Escape') {
                setEditingNetId(null);
              }
            }}
            className="bg-[#19191d] text-[#a6a6b8] text-xs flex-1 min-w-0 px-1 py-0.5 rounded-md focus:outline-none border border-[#c8ff2e] transition-colors"
          />
        ) : (
          <span
            className="text-xs flex-1 min-w-0 px-1 py-0.5 truncate"
            style={{
              color: '#a6a6b8',
              opacity: net.visible === false ? 0.5 : 1,
            }}
          >
            {net.name}
          </span>
        )}

        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // If multiple selected and this net is in the selection, toggle all selected
            if (selectedNetIds.length > 1 && selectedNetIds.includes(net.id)) {
              const allHidden = selectedNetIds.every(
                (id) => nets.find((n) => n.id === id)?.visible === false
              );
              for (const id of selectedNetIds) {
                updateNet(id, { visible: allHidden ? true : false });
              }
            } else {
              updateNet(net.id, { visible: net.visible === false ? true : false });
            }
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
      </div>
    );
  };

  return (
    <div className="border-t border-[#1c1c22]">
      {/* Accordion Header */}
      <AccordionHeader
        label="Nets"
        count={nets.length}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((v) => !v)}
        color="#a6a6b8"
        actions={
          <div className="flex items-center gap-1">
            {/* Master visibility toggle */}
            {nets.length > 0 && (
              <button
                onClick={() => setAllNetsVisible(!allVisible)}
                className="text-[#52525b] hover:text-[#a6a6b8] transition-colors p-0.5"
                title={allVisible ? 'Hide all nets' : 'Show all nets'}
              >
                {allVisible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            )}
            {/* Add Net */}
            <button
              onClick={() => createNet()}
              className="text-[#52525b] hover:text-[#c8ff2e] transition-colors p-0.5"
              title="Add Net"
            >
              <Plus size={13} />
            </button>
          </div>
        }
      />

      {isExpanded && (
        <div className="px-3 pb-3">
          {/* Search box */}
          {nets.length > 0 && (
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#38384a]" />
              <input
                type="text"
                value={netSearchFilter}
                onChange={(e) => setNetSearchFilter(e.target.value)}
                placeholder="Filter nets..."
                className="w-full bg-[#19191d] text-[#a6a6b8] text-xs pl-7 pr-2 py-1.5 rounded-md border border-[#222228] focus:border-[#c8ff2e]/50 focus:outline-none transition-colors placeholder:text-[#2c2c36]"
              />
            </div>
          )}

          {nets.length === 0 && (
            <div className="text-[10px] text-[#2c2c36] text-center py-3 leading-relaxed">
              No nets defined.
              <br />
              Import a KiCad netlist or create nets manually.
            </div>
          )}

          {/* Net Groups */}
          {netGroups.map((group) => {
            const allGroupNets = nets.filter((n) => group.netIds.includes(n.id));
            const trimmedFilter = netSearchFilter.trim().toLowerCase();
            const groupNameMatches = trimmedFilter && group.name.toLowerCase().includes(trimmedFilter);
            // Show all group nets if the group name matches, otherwise only show filtered nets
            const groupNets = groupNameMatches
              ? allGroupNets
              : filteredNets.filter((n) => group.netIds.includes(n.id));
            if (groupNets.length === 0 && trimmedFilter && !groupNameMatches) return null;

            return (
              <NetGroupSection
                key={group.id}
                group={group}
                nets={groupNets}
                allGroupNets={allGroupNets}
                renderNetRow={renderNetRow}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setGroupContextMenu({ groupId: group.id, x: e.clientX, y: e.clientY });
                }}
              />
            );
          })}

          {/* Ungrouped Nets */}
          <div className="space-y-0.5">
            {ungroupedNets.map((net) => renderNetRow(net))}
          </div>

          {netSearchFilter.trim() && filteredNets.length === 0 && (
            <div className="text-[10px] text-[#38384a] text-center py-2">
              No nets match &quot;{netSearchFilter}&quot;
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <NetContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onRename={handleRename}
          onDelete={() => handleDeleteNets(contextMenu.netIds)}
          onAddToGroup={(groupId) => addNetsToGroup(groupId, contextMenu.netIds)}
          netGroups={netGroups}
        />
      )}

      {/* Group Context Menu */}
      {groupContextMenu && (
        <GroupContextMenu
          state={groupContextMenu}
          onClose={() => setGroupContextMenu(null)}
          onDissolve={() => {
            dissolveNetGroup(groupContextMenu.groupId);
            setGroupContextMenu(null);
          }}
          onDelete={() => {
            const group = netGroups.find((g) => g.id === groupContextMenu.groupId);
            const hasImported = group?.netIds.some((id) =>
              nets.find((n) => n.id === id)?.imported
            );
            if (hasImported) {
              setConfirmDelete({
                netIds: group?.netIds || [],
                hasImported: true,
              });
            } else {
              saveToHistory();
              deleteNetGroupWithNets(groupContextMenu.groupId);
            }
            setGroupContextMenu(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          message={`You are about to delete ${
            confirmDelete.netIds.length
          } net${confirmDelete.netIds.length !== 1 ? 's' : ''}. ${
            confirmDelete.hasImported
              ? 'Some of these nets were imported from a netlist and deleting them may break your design. '
              : ''
          }This will also remove all pin and wire assignments for ${
            confirmDelete.netIds.length !== 1 ? 'these nets' : 'this net'
          }. Continue?`}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ─── Net Group Section ──────────────────────────────────────────

function NetGroupSection({
  group,
  nets,
  allGroupNets,
  renderNetRow,
  onContextMenu,
}: {
  group: NetGroup;
  nets: Net[];
  allGroupNets: Net[];
  renderNetRow: (net: Net) => React.ReactNode;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { updateNet } = useStripboardStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const allVisible = allGroupNets.every((n) => n.visible !== false);

  return (
    <div className="mb-1">
      <div className="flex items-center group rounded-md hover:bg-[#141418] transition-colors">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          onContextMenu={onContextMenu}
          className="flex-1 flex items-center gap-1.5 px-1 py-0.5 text-xs font-medium text-[#a6a6b8] hover:text-[#ededf0] transition-colors"
          title="Right-click for group options"
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <FolderPlus size={13} className="shrink-0 text-[#63637a]" />
          <span className="truncate">{group.name}</span>
          <span className="text-[#38384a] ml-auto text-xs">{allGroupNets.length}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newVisible = !allVisible;
            for (const n of allGroupNets) {
              updateNet(n.id, { visible: newVisible });
            }
          }}
          className="shrink-0 px-1 text-[#38384a] hover:text-[#a6a6b8] transition-colors opacity-0 group-hover:opacity-100"
          style={{ opacity: !allVisible ? 1 : undefined }}
          title={allVisible ? 'Hide all nets in group' : 'Show all nets in group'}
        >
          {allVisible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>
      {isExpanded && (
        <div className="ml-2 space-y-0.5 border-l border-[#222228] pl-1.5">
          {nets.map((net) => renderNetRow(net))}
          {nets.length === 0 && (
            <div className="text-[9px] text-[#2c2c36] px-1 py-1">Empty group</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Group Context Menu ─────────────────────────────────────────

function GroupContextMenu({
  state,
  onClose,
  onDissolve,
  onDelete,
}: {
  state: { groupId: string; x: number; y: number };
  onClose: () => void;
  onDissolve: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: state.x, y: state.y });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 8;
    let x = state.x;
    let y = state.y;
    if (x + rect.width > vw - padding) x = vw - rect.width - padding;
    if (y + rect.height > vh - padding) y = vh - rect.height - padding;
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    setAdjustedPos({ x, y });
  }, [state.x, state.y]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: adjustedPos.x, top: adjustedPos.y, zIndex: 9999 }}
    >
      <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[180px] overflow-hidden">
        <button
          onClick={onDissolve}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#a6a6b8] hover:bg-[#c8ff2e]/10 hover:text-[#ededf0] transition-colors"
        >
          <FolderMinus size={13} className="shrink-0" />
          <span className="flex-1 text-left">Dissolve Group</span>
        </button>
        <div className="h-px bg-[#2a2a34] my-1 mx-2" />
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <FolderX size={13} className="shrink-0" />
          <span className="flex-1 text-left">Delete Group + Nets</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
