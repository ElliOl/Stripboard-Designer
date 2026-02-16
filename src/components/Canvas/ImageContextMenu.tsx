import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crop, Trash2 } from 'lucide-react';

export interface ImageContextMenuState {
  imageId: string;
  x: number;
  y: number;
}

interface ImageContextMenuProps {
  state: ImageContextMenuState;
  onClose: () => void;
  onCropImage: (id: string) => void;
  onDeleteImage: (id: string) => void;
}

export const ImageContextMenu = ({
  state,
  onClose,
  onCropImage,
  onDeleteImage,
}: ImageContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: state.x, y: state.y });

  // Close on click outside or Escape key
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

  // Adjust position to keep menu on screen
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
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 9999,
      }}
    >
      <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-lg shadow-2xl shadow-black/50 py-1 min-w-[160px]">
        <button
          onClick={() => {
            onCropImage(state.imageId);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#a6a6b8] hover:bg-[#c8ff2e]/10 hover:text-[#ededf0] transition-colors"
        >
          <Crop size={13} className="shrink-0" />
          <span className="flex-1 text-left">Crop Image</span>
        </button>

        <div className="h-px bg-[#2a2a34] my-1 mx-2" />

        <button
          onClick={() => {
            onDeleteImage(state.imageId);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <Trash2 size={13} className="shrink-0" />
          <span className="flex-1 text-left">Delete Image</span>
        </button>
      </div>
    </div>,
    document.body
  );
};
