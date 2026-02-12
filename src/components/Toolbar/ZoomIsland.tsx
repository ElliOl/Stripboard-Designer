import { Plus, Minus } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';

export const ZoomIsland = () => {
  const { zoom, setZoom } = useStripboardStore();

  const handleZoomIn = () => setZoom(zoom * 1.2);
  const handleZoomOut = () => setZoom(zoom / 1.2);
  const handleZoomReset = () => setZoom(1);

  return (
    <div
      className="fixed top-4 z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl select-none"
      style={{
        right: 'calc(288px + 1rem)', // sidebar width (w-72 = 18rem = 288px) + 1rem spacing
        background: 'rgba(17, 17, 20, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <ZoomBtn icon={Minus} onClick={handleZoomOut} title="Zoom Out" />
      <button
        onClick={handleZoomReset}
        className="text-[#63637a] hover:text-[#a6a6b8] text-[10px] font-mono px-2 py-1 rounded-md transition-colors min-w-[48px] text-center"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ZoomBtn icon={Plus} onClick={handleZoomIn} title="Zoom In" />
    </div>
  );
};

function ZoomBtn({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ElementType;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg transition-colors text-[#4a4a5a] hover:text-[#c8ff2e]"
      title={title}
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}
