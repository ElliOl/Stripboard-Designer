import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, RotateCw, Trash2, Copy } from 'lucide-react';

export interface ContextMenuState {
  componentId: string;
  x: number;
  y: number;
}

interface ComponentContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onEditComponent: (componentId: string) => void;
  onRotateComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
}

export const ComponentContextMenu = ({
  state,
  onClose,
  onEditComponent,
  onRotateComponent,
  onDeleteComponent,
  onDuplicateComponent,
}: ComponentContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Use a small timeout so the opening right-click doesn't immediately close
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

  // Clamp menu position to keep it within the viewport
  const [adjustedPos, setAdjustedPos] = useState({ x: state.x, y: state.y });

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

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjustedPos.x,
    top: adjustedPos.y,
    zIndex: 9999,
  };

  const items = [
    {
      label: 'Edit Component...',
      icon: Settings,
      action: () => {
        onEditComponent(state.componentId);
        onClose();
      },
    },
    {
      label: 'Rotate 90°',
      icon: RotateCw,
      shortcut: 'R',
      action: () => {
        onRotateComponent(state.componentId);
        onClose();
      },
    },
    {
      label: 'Duplicate',
      icon: Copy,
      action: () => {
        onDuplicateComponent(state.componentId);
        onClose();
      },
    },
    { separator: true } as const,
    {
      label: 'Delete',
      icon: Trash2,
      shortcut: 'Del',
      danger: true,
      action: () => {
        onDeleteComponent(state.componentId);
        onClose();
      },
    },
  ];

  return createPortal(
    <div ref={menuRef} style={menuStyle}>
      <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[180px] overflow-hidden">
        {items.map((item, i) => {
          if ('separator' in item) {
            return (
              <div
                key={`sep-${i}`}
                className="h-px bg-[#2a2a34] my-1 mx-2"
              />
            );
          }

          const Icon = item.icon;
          const isDanger = 'danger' in item && item.danger;

          return (
            <button
              key={item.label}
              onClick={item.action}
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-xs
                transition-colors
                ${
                  isDanger
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-[#a6a6b8] hover:bg-[#c8ff2e]/10 hover:text-[#ededf0]'
                }
              `}
            >
              <Icon size={13} className="shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {'shortcut' in item && item.shortcut && (
                <span className="text-[10px] text-[#4a4a5a] ml-2">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};
