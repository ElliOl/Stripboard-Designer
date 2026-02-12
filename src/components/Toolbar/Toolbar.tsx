import { useState, useEffect, useRef } from 'react';
import {
  MousePointer2,
  Cable,
  Save,
  Upload,
  Scissors,
  RotateCw,
  FileUp,
  Waypoints,
  GripHorizontal,
  AlertTriangle,
} from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';
import { parseKiCadNetlist } from '@/lib/netlist-parser';
import type { ToolType } from '@/lib/types';

const tools: Array<{
  type: ToolType;
  icon: React.ElementType;
  label: string;
  shortcut: string;
}> = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'routeWire', icon: Cable, label: 'Route Wire', shortcut: 'W' },
  { type: 'cutStrip', icon: Scissors, label: 'Cut Strip', shortcut: 'X' },
];

export const Toolbar = () => {
  const {
    activeTool,
    setActiveTool,
    rotateComponent,
    selectedItems,
    showRatsNest,
    toggleRatsNest,
    exportProject,
    importProject,
    importNetlist,
    layerVisibility,
    toggleLayer,
  } = useStripboardStore();

  // ─── Drag State ───────────────────────────────────────────
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleGripDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleRotateSelected = () => {
    for (const id of selectedItems) {
      rotateComponent(id);
    }
  };

  const handleExport = () => {
    const data = exportProject();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stripboard-project.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          importProject(data);
        } catch {
          console.error('Failed to import project');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleImportNetlist = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (!name.endsWith('.net') && !name.endsWith('.xml')) {
        if (
          !confirm(
            `"${file.name}" doesn't look like a KiCad netlist (.net) file.\nTry to import it anyway?`
          )
        )
          return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const parsed = parseKiCadNetlist(text);
          const report = importNetlist(parsed);
          console.log(
            `Imported ${report.importedComponents} components, ${report.importedNets} nets` +
            (report.skippedComponents.length > 0
              ? ` (${report.skippedComponents.length} unsupported)`
              : '')
          );
        } catch (err) {
          console.error('Failed to parse netlist:', err);
          alert(
            'Failed to parse netlist file.\nMake sure it is a KiCad S-expression (.net) file.'
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const hasSelection = selectedItems.length > 0;

  return (
    <div
      className="absolute z-50 flex flex-col items-center rounded-2xl select-none"
      style={{
        left: pos.x,
        top: pos.y,
        background: 'rgba(17, 17, 20, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* ─── Grip Handle ──────────────────────────────────── */}
      <div
        className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing"
        onMouseDown={handleGripDown}
      >
        <GripHorizontal size={14} className="text-[#38384a] hover:text-[#63637a] transition-colors" />
      </div>

      {/* ─── Drawing Tools ────────────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5">
        {tools.map((tool) => {
          const isActive = activeTool === tool.type;
          return (
            <ToolBtn
              key={tool.type}
              icon={tool.icon}
              active={isActive}
              onClick={() => setActiveTool(tool.type)}
              title={`${tool.label} (${tool.shortcut})`}
            />
          );
        })}
      </div>

      <Sep />

      {/* ─── Edit Tools ───────────────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5">
        <ToolBtn
          icon={RotateCw}
          onClick={handleRotateSelected}
          disabled={!hasSelection}
          title="Rotate 90° CW (R)"
        />
      </div>

      <Sep />

      {/* ─── Ratsnest Toggle ─────────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5">
        <ToolBtn
          icon={Waypoints}
          onClick={toggleRatsNest}
          active={showRatsNest}
          accentColor="#2dd4bf"
          title={`${showRatsNest ? 'Hide' : 'Show'} Ratsnest (N)`}
        />
      </div>

      <Sep />

      {/* ─── Error Display Toggle ─────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5">
        <ToolBtn
          icon={AlertTriangle}
          onClick={() => toggleLayer('errors')}
          active={layerVisibility.errors}
          accentColor="#ef4444"
          title={`${layerVisibility.errors ? 'Hide' : 'Show'} Errors`}
        />
      </div>

      <Sep />

      {/* ─── File Operations ──────────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5 pb-2.5">
        <ToolBtn
          icon={FileUp}
          onClick={handleImportNetlist}
          title="Import KiCad Netlist (.net)"
          size={15}
        />
        <ToolBtn
          icon={Upload}
          onClick={handleImport}
          title="Import Project (.json)"
          size={15}
        />
        <ToolBtn
          icon={Save}
          onClick={handleExport}
          title="Export Project (.json)"
          size={15}
        />
      </div>
    </div>
  );
};

// ─── Separator ─────────────────────────────────────────────
function Sep() {
  return <div className="w-6 h-px bg-[#222228] my-1" />;
}

// ─── Tool Button ───────────────────────────────────────────
function ToolBtn({
  icon: Icon,
  active,
  onClick,
  disabled,
  title,
  hoverClass,
  accentColor,
  size = 18,
}: {
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  hoverClass?: string;
  accentColor?: string;
  size?: number;
}) {
  const accent = accentColor || '#c8ff2e';
  const glowColor = accentColor
    ? accentColor.replace('#', 'rgba(') + ',0.4)'
    : 'rgba(200,255,46,0.4)';

  // Build glow for accent colors
  const glowMap: Record<string, string> = {
    '#c8ff2e': 'rgba(200,255,46,0.4)',
    '#2dd4bf': 'rgba(45,212,191,0.4)',
    '#ff6352': 'rgba(255,99,82,0.4)',
    '#ef4444': 'rgba(239,68,68,0.4)',
  };
  const resolvedGlow = glowMap[accent] || glowColor;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-colors
        ${
          active
            ? ''
            : `text-[#4a4a5a] ${hoverClass || 'hover:text-[#c8ff2e]'} disabled:text-[#222228] disabled:cursor-not-allowed`
        }
      `}
      style={
        active
          ? {
              color: accent,
              filter: `drop-shadow(0 0 6px ${resolvedGlow})`,
            }
          : undefined
      }
      title={title}
    >
      <Icon size={size} strokeWidth={active ? 2.5 : 1.8} />
    </button>
  );
}
