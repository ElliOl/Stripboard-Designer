import { Ghost, X } from 'lucide-react';

interface HotkeyLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotkeyLegend = ({ isOpen, onClose }: HotkeyLegendProps) => {
  if (!isOpen) return null;

  const hotkeys = [
    { category: 'Tools', items: [
      { key: 'V', description: 'Select tool' },
      { key: 'W', description: 'Route wire' },
      { key: 'X', description: 'Drill cut' },
      { key: 'S', description: 'Slice cut' },
    ]},
    { category: 'Actions', items: [
      { key: 'R', description: 'Rotate selected' },
      { key: 'N', description: 'Toggle rats nest' },
      { key: 'Del/⌫', description: 'Delete selected' },
      { key: 'Esc', description: 'Deselect all' },
    ]},
    { category: 'Edit', items: [
      { key: '⌘Z', description: 'Undo' },
      { key: '⌘⇧Z', description: 'Redo' },
      { key: '⌘Y', description: 'Redo' },
    ]},
    { category: 'View', items: [
      { key: 'H or ?', description: 'Show this legend' },
      { key: 'Scroll', description: 'Zoom' },
      { key: '⇧Scroll', description: 'Pan vertical' },
      { key: '⌘Scroll', description: 'Pan horizontal' },
    ]},
    { category: 'Drag Actions', items: [
      { key: 'Click+Drag', description: 'Select box' },
      { key: '⇧+Click', description: 'Add to selection' },
      { key: '⌘+Click', description: 'Remove from selection' },
      { key: 'Middle/Right+Drag', description: 'Pan canvas' },
    ]},
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40"
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />
      
      {/* Legend Island */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] rounded-xl select-none max-w-md w-full mx-4"
        style={{
          background: 'rgba(17, 17, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1c1c22]">
          <h2 className="text-[#e4e4e7] text-sm font-semibold flex items-center gap-1.5">
            <Ghost size={14} className="text-[#c8ff2e]" />
            Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors text-[#4a4a5a] hover:text-[#c8ff2e]"
            title="Close (Esc)"
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {hotkeys.map(({ category, items }) => (
            <div key={category}>
              <h3 className="text-[#a6a6b8] text-[10px] font-semibold mb-2 uppercase tracking-wider">
                {category}
              </h3>
              <div className="space-y-1.5">
                {items.map(({ key, description }) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[#63637a] text-xs">{description}</span>
                    <kbd
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#c8ff2e] border border-[#2a2a33] min-w-[36px] text-center whitespace-nowrap"
                      style={{
                        background: 'rgba(200, 255, 46, 0.08)',
                      }}
                    >
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// Ghost button in lower right corner
interface GhostButtonProps {
  onClick: () => void;
}

export const GhostButton = ({ onClick }: GhostButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 z-50 p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
      style={{
        right: 'calc(288px + 1rem)', // sidebar width (w-72 = 18rem = 288px) + 1rem spacing
        background: 'rgba(17, 17, 20, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
      title="Show keyboard shortcuts (?)"
    >
      <Ghost size={16} className="text-[#4a4a5a] hover:text-[#c8ff2e] transition-colors" strokeWidth={1.8} />
    </button>
  );
};
