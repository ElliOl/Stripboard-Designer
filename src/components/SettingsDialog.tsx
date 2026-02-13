import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog = ({ onClose }: SettingsDialogProps) => {
  const realtimeRatsnest = useStripboardStore((s) => s.realtimeRatsnest);
  const setRealtimeRatsnest = useStripboardStore((s) => s.setRealtimeRatsnest);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[100]"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[480px] rounded-xl"
        style={{
          background: 'rgba(17, 17, 20, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222228]">
          <h2 className="text-lg font-semibold text-[#e8e8ea]">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#222228] text-[#4a4a5a] hover:text-[#e8e8ea] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Performance Section */}
          <div>
            <h3 className="text-sm font-medium text-[#c8c8d0] mb-3">Performance</h3>
            <div className="space-y-3">
              {/* Realtime Ratsnest */}
              <div
                className="flex items-start justify-between gap-4 cursor-pointer group"
                onClick={() => setRealtimeRatsnest(!realtimeRatsnest)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#e8e8ea] group-hover:text-[#c8ff2e] transition-colors">
                    Real-time Ratsnest
                  </div>
                  <div className="text-xs text-[#6b6b7a] mt-0.5">
                    Update ratsnest lines instantly when components/wires change.
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  role="switch"
                  aria-checked={realtimeRatsnest}
                  onClick={(e) => { e.stopPropagation(); setRealtimeRatsnest(!realtimeRatsnest); }}
                  className={`
                    relative mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors duration-200
                    focus:outline-none focus:ring-0 border-0
                    ${realtimeRatsnest ? 'bg-[#c8ff2e]' : 'bg-[#2a2a34]'}
                  `}
                >
                  <span
                    className={`
                      absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200
                      ${realtimeRatsnest ? 'translate-x-4 bg-[#0a0a0e]' : 'translate-x-0 bg-[#6b6b7a]'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-3 border-t border-[#222228]">
            <p className="text-xs text-[#6b6b7a]">
              <strong className="text-[#8888aa]">Note:</strong> Disabling real-time ratsnest improves performance on large boards
              by calculating ratsnest connections during idle time (~100ms delay).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#222228] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#c8ff2e] hover:bg-[#d4ff55] text-[#0a0a0e] font-medium text-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};
