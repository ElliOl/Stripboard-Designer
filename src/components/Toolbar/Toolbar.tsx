import { useState, useEffect, useRef } from 'react';
import {
  MousePointer2,
  Cable,
  Save,
  Upload,
  RotateCw,
  FileUp,
  Waypoints,
  GripHorizontal,
  AlertTriangle,
  Settings,
  Circle,
  Minus,
  FilePlus,
  Wand2,
} from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';
import { clearAutosave } from '@/lib/autosave';
import libraryData from '@/data/library.json';
import type { ComponentDefinition } from '@/lib/types';
import { parseKiCadNetlist, isVirtualRef, type ParsedNetlist } from '@/lib/netlist-parser';
import { isVeroProject, convertVeroProject } from '@/lib/vero-import';
import type { ToolType, NetlistImportOptions } from '@/lib/types';
import { SettingsDialog } from '@/components/SettingsDialog';
import { NetlistImportDialog } from '@/components/NetlistImportDialog';
import { AutoLayoutDialog } from '@/components/AutoLayoutDialog';

const tools: Array<{
  type: ToolType;
  icon: React.ElementType;
  label: string;
  shortcut: string;
}> = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'routeWire', icon: Cable, label: 'Route Wire', shortcut: 'W' },
  { type: 'drillCut', icon: Circle, label: 'Drill Cut', shortcut: 'X' },
  { type: 'sliceCut', icon: Minus, label: 'Slice Cut', shortcut: 'S' },
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
    importNetlistWithOptions,
    reset,
    loadComponentDefinitions,
    components,
    componentDefinitions,
    layerVisibility,
    toggleLayer,
  } = useStripboardStore();

  // ─── Settings Dialog State ────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [showAutoLayout, setShowAutoLayout] = useState(false);

  // ─── Netlist Import Dialog State ──────────────────────────
  const [netlistImportPending, setNetlistImportPending] = useState<{
    parsed: ParsedNetlist;
    fileName: string;
  } | null>(null);

  // ─── Drag State ───────────────────────────────────────────
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleGripDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      let x = e.clientX - dragOffset.current.x;
      let y = e.clientY - dragOffset.current.y;

      // Clamp to keep toolbar within viewport
      const el = toolbarRef.current;
      if (el) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const padding = 8;

        x = Math.max(padding, Math.min(x, vw - w - padding));
        y = Math.max(padding, Math.min(y, vh - h - padding));
      }

      setPos({ x, y });
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
        let data: unknown;
        try {
          data = JSON.parse(ev.target?.result as string);
        } catch {
          console.error('Failed to import project');
          return;
        }
        // Vero Designer projects are converted to a board on the fly
        if (isVeroProject(data)) {
          try {
            const { project, notes } = convertVeroProject(data, componentDefinitions);
            importProject(project);
            if (notes.length) {
              alert(`Imported Vero Designer layout.\n\nOff-board wiring:\n${notes.join('\n')}`);
            }
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Could not import this Vero Designer project.');
          }
          return;
        }
        importProject(data as Parameters<typeof importProject>[0]);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleNewProject = () => {
    if (!confirm('Start a new project? Unsaved changes to the current board will be lost.')) return;
    reset();
    // reset() clears the component definitions, so load the built-in library again
    loadComponentDefinitions(libraryData as ComponentDefinition[]);
    clearAutosave();
  };

  const handleImportNetlist = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (!name.endsWith('.net')) {
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
          // Show import options dialog instead of importing immediately
          setNetlistImportPending({ parsed, fileName: file.name });
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

  const handleNetlistImportConfirm = (options: NetlistImportOptions) => {
    if (!netlistImportPending) return;
    const { parsed } = netlistImportPending;
    const report = importNetlistWithOptions(parsed, options);
    console.log(
      `Imported ${report.importedComponents} components, ${report.importedNets} nets` +
      (report.skippedComponents.length > 0
        ? ` (${report.skippedComponents.length} unsupported)`
        : '')
    );
    setNetlistImportPending(null);
  };

  const hasSelection = selectedItems.length > 0;

  return (
    <div
      ref={toolbarRef}
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

      {/* ─── Settings ──────────────────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5">
        <ToolBtn
          icon={Wand2}
          onClick={() => setShowAutoLayout(true)}
          title="Auto layout: place parts, links and cuts"
          size={16}
        />
        <ToolBtn
          icon={Settings}
          onClick={() => setShowSettings(true)}
          title="Settings"
          size={16}
        />
      </div>

      <Sep />

      {/* ─── File Operations ──────────────────────────────── */}
      <div className="flex flex-col items-center px-1.5 gap-0.5 pb-2.5">
        <ToolBtn
          icon={FilePlus}
          onClick={handleNewProject}
          title="New project"
          size={15}
        />
        <ToolBtn
          icon={FileUp}
          onClick={handleImportNetlist}
          title="Import KiCad Netlist (.net)"
          size={15}
        />
        <ToolBtn
          icon={Upload}
          onClick={handleImport}
          title="Open Project (.json, Stripboard Designer or Vero Designer)"
          size={15}
        />
        <ToolBtn
          icon={Save}
          onClick={handleExport}
          title="Export Project (.json)"
          size={15}
        />
      </div>

      {/* ─── Settings Dialog ───────────────────────────────── */}
      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}

      {showAutoLayout && <AutoLayoutDialog onClose={() => setShowAutoLayout(false)} />}

      {/* ─── Netlist Import Dialog ───────────────────────────── */}
      {netlistImportPending && (
        <NetlistImportDialog
          fileName={netlistImportPending.fileName}
          hasExistingBoard={components.length > 0}
          parsedComponentCount={
            netlistImportPending.parsed.components.filter(
              (c) => !isVirtualRef(c.ref)
            ).length
          }
          parsedNetCount={
            netlistImportPending.parsed.nets.filter((n) => n.nodes.length > 0)
              .length
          }
          onConfirm={handleNetlistImportConfirm}
          onCancel={() => setNetlistImportPending(null)}
        />
      )}
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
