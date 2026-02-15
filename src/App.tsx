import { useEffect, lazy, Suspense, useState } from 'react';
import { StripboardCanvas } from '@/components/Canvas/StripboardCanvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { ZoomIsland } from '@/components/Toolbar/ZoomIsland';
import { FpsOverlay } from '@/components/Debug/FpsOverlay';
import { HotkeyLegend, GhostButton } from '@/components/HotkeyLegend';
import { useStripboardStore } from '@/store/stripboard';
import { processFileToReferenceImage } from '@/lib/image-import';
import '@/styles/globals.css';

// Lazy load the sidebar for better initial load performance
const Sidebar = lazy(() =>
  import('@/components/Sidebar/Sidebar').then((module) => ({
    default: module.Sidebar,
  }))
);

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

  const [showHotkeyLegend, setShowHotkeyLegend] = useState(false);

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
        // Close hotkey legend if open
        if (showHotkeyLegend) {
          setShowHotkeyLegend(false);
          return;
        }
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
        case '?':
          // Toggle hotkey legend
          e.preventDefault();
          setShowHotkeyLegend(prev => !prev);
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
  }, [setActiveTool, undo, redo, removeSelected, deselectAll, rotateComponent, selectedItems, toggleRatsNest, showHotkeyLegend]);

  // ─── Clipboard Paste → Reference Image ──────────────────────
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't intercept paste inside inputs/textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Look for an image blob in the clipboard
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          try {
            const { rows, cols, setReferenceImage } =
              useStripboardStore.getState();
            const refImage = await processFileToReferenceImage(
              file,
              rows,
              cols,
            );
            setReferenceImage(refImage);
          } catch (err) {
            console.error('Failed to paste reference image:', err);
          }
          return;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Check for ?perf query parameter
  const showPerf = new URLSearchParams(window.location.search).has('perf');

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#09090b]">
      <div className="flex-1 flex overflow-hidden relative">
        <StripboardCanvas />
        <Toolbar />
        <ZoomIsland />
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        {showPerf && <FpsOverlay />}
        <GhostButton onClick={() => setShowHotkeyLegend(true)} />
        <HotkeyLegend isOpen={showHotkeyLegend} onClose={() => setShowHotkeyLegend(false)} />
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
      'Click select · Drag select box · Shift add · Cmd subtract · Middle/Right drag pan · R rotate · H help',
    pan: 'Drag to pan · Scroll to zoom · Shift+scroll pan Y · Cmd+scroll pan X · H help',
    routeWire:
      'Click to place wire points · Click same point twice to finish · Esc to cancel · H help',
    cutStrip:
      'Click on the board to toggle a cut in the copper strip at that position · H help',
    placeComponent: 'Drag a component from the library panel onto the board · H help',
    linkStrip: 'Click to link strip segments · H help',
    extendLeg: 'Click a component pin to extend its leg · H help',
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
