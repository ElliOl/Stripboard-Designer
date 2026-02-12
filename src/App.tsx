import { useEffect } from 'react';
import { StripboardCanvas } from '@/components/Canvas/StripboardCanvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { ZoomIsland } from '@/components/Toolbar/ZoomIsland';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useStripboardStore } from '@/store/stripboard';
import '@/styles/globals.css';

function App() {
  const {
    setActiveTool,
    undo,
    redo,
    removeSelected,
    deselectAll,
    rotateComponent,
    selectedItems,
    toggleRatsNest,
  } = useStripboardStore();

  // ─── Keyboard Shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if an input is focused
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Redo (Ctrl+Shift+Z or Ctrl+Y) — check before undo
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
        return;
      }

      // Undo (Ctrl+Z)
      if (ctrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Redo (Ctrl+Y)
      if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelected();
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        deselectAll();
        setActiveTool('select');
        return;
      }

      // Tool shortcuts (only without modifiers)
      if (ctrl || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'w':
          setActiveTool('routeWire');
          break;
        case 'x':
          setActiveTool('cutStrip');
          break;
        case 'r':
          // Rotate selected components
          for (const id of selectedItems) {
            rotateComponent(id);
          }
          break;
        case 'n':
          toggleRatsNest();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, undo, redo, removeSelected, deselectAll, rotateComponent, selectedItems, toggleRatsNest]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#09090b]">
      <div className="flex-1 flex overflow-hidden relative">
        <StripboardCanvas />
        <Toolbar />
        <ZoomIsland />
        <Sidebar />
      </div>
      <StatusBar />
    </div>
  );
}

// ─── Status Bar ──────────────────────────────────────────────
function StatusBar() {
  const { activeTool, selectedItems, components, strips, wires, nets } =
    useStripboardStore();

  const toolHints: Record<string, string> = {
    select:
      'Click select · Drag select box · Shift add · Cmd subtract · Middle/Right drag pan · R rotate',
    pan: 'Drag to pan · Scroll to zoom · Shift+scroll pan Y · Cmd+scroll pan X',
    routeWire:
      'Click to place wire points · Click same point twice to finish · Esc to cancel',
    cutStrip:
      'Click on the board to toggle a cut in the copper strip at that position',
    placeComponent: 'Drag a component from the library panel onto the board',
    linkStrip: 'Click to link strip segments',
    extendLeg: 'Click a component pin to extend its leg',
  };

  const toolNames: Record<string, string> = {
    select: 'Select',
    pan: 'Pan',
    routeWire: 'Route Wire',
    cutStrip: 'Cut Strip',
    placeComponent: 'Place',
    linkStrip: 'Link',
    extendLeg: 'Extend',
  };

  return (
    <div className="h-6 bg-[#0f0f12] flex items-center px-3 text-[10px] text-[#38384a] gap-3 shrink-0 font-mono">
      <span className="text-[#c8ff2e] font-semibold">
        {toolNames[activeTool] || activeTool}
      </span>
      <span className="text-[#1c1c22]">|</span>
      <span className="text-[#4a4a5a]">{toolHints[activeTool] || ''}</span>
      <div className="flex-1" />
      {components.length > 0 && (
        <span>
          {components.length} comp{components.length !== 1 ? 's' : ''}
        </span>
      )}
      {(() => {
        const totalCuts = strips.reduce((sum, s) => sum + s.breaks.length, 0);
        return totalCuts > 0 ? (
          <span>
            {totalCuts} cut{totalCuts !== 1 ? 's' : ''}
          </span>
        ) : null;
      })()}
      {wires.length > 0 && (
        <span>
          {wires.length} wire{wires.length !== 1 ? 's' : ''}
        </span>
      )}
      {nets.length > 0 && (
        <span>
          {nets.length} net{nets.length !== 1 ? 's' : ''}
        </span>
      )}
      {selectedItems.length > 0 && (
        <span className="text-[#c8ff2e]">
          {selectedItems.length} selected
        </span>
      )}
    </div>
  );
}

export default App;
