import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';

interface CropImageDialogProps {
  imageId: string;
  onClose: () => void;
}

export const CropImageDialog = ({ imageId, onClose }: CropImageDialogProps) => {
  const { referenceImages, updateReferenceImageById } = useStripboardStore();
  const image = referenceImages.find((img) => img.id === imageId);
  
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<'move' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Load image
  useEffect(() => {
    if (!image) return;
    const img = new Image();
    img.onload = () => {
      setImageObj(img);
      // Initialize crop rect to full image
      setCropRect({
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      });
    };
    img.src = image.src;
  }, [image]);

  // Draw the image and crop overlay
  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = imageObj.width;
    canvas.height = imageObj.height;

    // Draw the image
    ctx.drawImage(imageObj, 0, 0);

    // Draw darkened overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, imageObj.width, cropRect.y); // Top
    ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.height); // Left
    ctx.fillRect(cropRect.x + cropRect.width, cropRect.y, imageObj.width - (cropRect.x + cropRect.width), cropRect.height); // Right
    ctx.fillRect(0, cropRect.y + cropRect.height, imageObj.width, imageObj.height - (cropRect.y + cropRect.height)); // Bottom

    // Draw crop rect border
    ctx.strokeStyle = '#c8ff2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = '#c8ff2e';
    const corners = [
      { x: cropRect.x, y: cropRect.y }, // top-left
      { x: cropRect.x + cropRect.width, y: cropRect.y }, // top-right
      { x: cropRect.x, y: cropRect.y + cropRect.height }, // bottom-left
      { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height }, // bottom-right
    ];
    corners.forEach((corner) => {
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
    });
  }, [imageObj, cropRect]);

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageObj) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imageObj.width;
    const y = ((e.clientY - rect.top) / rect.height) * imageObj.height;

    const handleSize = 10;
    const corners = [
      { handle: 'tl' as const, px: cropRect.x, py: cropRect.y },
      { handle: 'tr' as const, px: cropRect.x + cropRect.width, py: cropRect.y },
      { handle: 'bl' as const, px: cropRect.x, py: cropRect.y + cropRect.height },
      { handle: 'br' as const, px: cropRect.x + cropRect.width, py: cropRect.y + cropRect.height },
    ];

    // Check if clicking on a corner handle
    for (const corner of corners) {
      if (Math.abs(x - corner.px) < handleSize && Math.abs(y - corner.py) < handleSize) {
        setDragHandle(corner.handle);
        setIsDragging(true);
        setDragStart({ x, y });
        return;
      }
    }

    // Check if clicking inside crop rect (for moving)
    if (
      x >= cropRect.x &&
      x <= cropRect.x + cropRect.width &&
      y >= cropRect.y &&
      y <= cropRect.y + cropRect.height
    ) {
      setDragHandle('move');
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || !imageObj) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * imageObj.width;
    const y = ((e.clientY - rect.top) / rect.height) * imageObj.height;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (dragHandle === 'move') {
      // Move the crop rect
      setCropRect((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(imageObj.width - prev.width, prev.x + dx)),
        y: Math.max(0, Math.min(imageObj.height - prev.height, prev.y + dy)),
      }));
    } else if (dragHandle === 'tl') {
      // Resize from top-left
      setCropRect((prev) => ({
        x: Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + dx)),
        y: Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + dy)),
        width: Math.max(10, prev.width - dx),
        height: Math.max(10, prev.height - dy),
      }));
    } else if (dragHandle === 'tr') {
      // Resize from top-right
      setCropRect((prev) => ({
        ...prev,
        y: Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + dy)),
        width: Math.max(10, Math.min(imageObj.width - prev.x, prev.width + dx)),
        height: Math.max(10, prev.height - dy),
      }));
    } else if (dragHandle === 'bl') {
      // Resize from bottom-left
      setCropRect((prev) => ({
        x: Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + dx)),
        y: prev.y,
        width: Math.max(10, prev.width - dx),
        height: Math.max(10, Math.min(imageObj.height - prev.y, prev.height + dy)),
      }));
    } else if (dragHandle === 'br') {
      // Resize from bottom-right
      setCropRect((prev) => ({
        ...prev,
        width: Math.max(10, Math.min(imageObj.width - prev.x, prev.width + dx)),
        height: Math.max(10, Math.min(imageObj.height - prev.y, prev.height + dy)),
      }));
    }

    setDragStart({ x, y });
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  // Apply crop
  const handleApplyCrop = () => {
    if (!imageObj || !image) return;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropRect.width;
    cropCanvas.height = cropRect.height;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    // Draw the cropped portion
    ctx.drawImage(
      imageObj,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      cropRect.width,
      cropRect.height
    );

    // Convert to data URL
    const croppedSrc = cropCanvas.toDataURL('image/png');

    // Update the image in the store
    updateReferenceImageById(imageId, {
      src: croppedSrc,
      naturalWidth: cropRect.width,
      naturalHeight: cropRect.height,
    });

    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70">
      <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/50 p-4 max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#ededf0]">Crop Image</h3>
          <button
            onClick={onClose}
            className="text-[#63637a] hover:text-[#ededf0] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-[#09090b] rounded-lg p-4 flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="max-w-full max-h-full cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Instructions */}
        <div className="mt-3 text-xs text-[#63637a]">
          Drag corners to resize crop area. Drag inside to move. Click Apply to confirm.
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#a6a6b8] bg-[#19191d] hover:bg-[#222228] rounded-md border border-[#2a2a34] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyCrop}
            className="px-3 py-1.5 text-xs text-[#0e0e12] bg-[#c8ff2e] hover:bg-[#d4ff5e] rounded-md transition-colors flex items-center gap-1.5"
          >
            <Check size={13} />
            Apply Crop
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
