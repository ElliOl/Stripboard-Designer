import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wand2, Loader2 } from 'lucide-react';
import { useStripboardStore } from '@/store/stripboard';
import { adaptBoardToVero } from '@/lib/autolayout/adapter';
import { startAutoLayout, type AutoLayoutJob } from '@/lib/autolayout/client';
import { layoutToBoard } from '@/lib/autolayout/to-board';

interface AutoLayoutDialogProps {
  onClose: () => void;
}

type Phase =
  | { name: 'form' }
  | { name: 'running'; progress: string }
  | { name: 'error'; message: string }
  | { name: 'done'; wiringNotes: string[]; warnings: string[]; cols: number; rows: number };

const clampInt = (value: string, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && value !== '' ? Math.min(max, Math.max(min, n)) : fallback;
};

export const AutoLayoutDialog = ({ onClose }: AutoLayoutDialogProps) => {
  const components = useStripboardStore((s) => s.components);
  const nets = useStripboardStore((s) => s.nets);
  const definitions = useStripboardStore((s) => s.componentDefinitions);

  const [maxColumns, setMaxColumns] = useState('40');
  const [maxRows, setMaxRows] = useState('24');
  const [phase, setPhase] = useState<Phase>({ name: 'form' });
  const job = useRef<AutoLayoutJob | null>(null);

  const adapted = useMemo(() => adaptBoardToVero(components, nets, definitions), [components, nets, definitions]);
  const onBoard = adapted.circuit.components.filter((c) => c.type !== 'terminal').length;
  const running = phase.name === 'running';

  const cancel = () => {
    job.current?.cancel();
    job.current = null;
    setPhase({ name: 'form' });
  };

  // Stop the worker if the dialog goes away mid-run
  useEffect(() => () => job.current?.cancel(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (running) cancel();
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const generate = async () => {
    const settings = {
      maxColumns: clampInt(maxColumns, 8, 80, 40),
      maxRows: clampInt(maxRows, 4, 80, 24),
    };
    setPhase({ name: 'running', progress: 'Starting…' });
    const started = startAutoLayout(adapted.circuit, settings, (progress) =>
      setPhase({ name: 'running', progress })
    );
    job.current = started;
    const result = await started.result;
    if (job.current !== started) return; // Cancelled
    job.current = null;
    if (!result.ok) {
      setPhase({ name: 'error', message: result.error });
      return;
    }
    try {
      const state = useStripboardStore.getState();
      const board = layoutToBoard(result.project, adapted, state.nets, state.componentDefinitions);
      const { project } = board;
      // One undoable step
      state.saveToHistory();
      const known = new Set(state.componentDefinitions.map((d) => d.id));
      useStripboardStore.setState({
        rows: project.board.rows,
        cols: project.board.cols,
        pcbs: state.pcbs.map((p) =>
          p.isMain ? { ...p, rows: project.board.rows, cols: project.board.cols } : p
        ),
        components: project.components,
        strips: [...project.strips, ...state.strips.filter((s) => s.pcbId)],
        wires: project.wires,
        componentDefinitions: [
          ...state.componentDefinitions,
          ...(project.customDefinitions ?? []).filter((d) => !known.has(d.id)),
        ],
        selectedItems: [],
      });
      const warnings = [...board.warnings];
      if (result.shorts) warnings.push(`The router reported ${result.shorts} short(s).`);
      if (result.disconnectedNets) warnings.push(`The router reported ${result.disconnectedNets} unconnected net(s).`);
      setPhase({
        name: 'done',
        wiringNotes: board.wiringNotes,
        warnings,
        cols: project.board.cols,
        rows: project.board.rows,
      });
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const inputClass =
    'w-20 px-2 py-1.5 rounded-lg bg-[#16161a] border border-[#222228] text-sm text-[#e8e8ea] focus:outline-none focus:border-[#c8ff2e]/50 disabled:opacity-50';

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-[100]" onClick={running ? undefined : onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Auto layout"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[480px] max-h-[85vh] flex flex-col rounded-xl"
        style={{
          background: 'rgba(17, 17, 20, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222228]">
          <div className="flex items-center gap-2.5">
            <Wand2 size={18} className="text-[#c8ff2e]" />
            <h2 className="text-lg font-semibold text-[#e8e8ea]">Auto Layout</h2>
          </div>
          {!running && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg hover:bg-[#222228] text-[#4a4a5a] hover:text-[#e8e8ea] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto text-xs text-[#a6a6b8]">
          {(phase.name === 'form' || phase.name === 'running') && (
            <>
              <p>
                Places the parts, adds links and track cuts, and puts off-board connections on
                labelled edge pads. This replaces the current placement, links and cuts. You can
                undo it afterwards.
              </p>
              <div className="bg-[#16161a] rounded-lg border border-[#222228] px-3 py-2">
                {onBoard} part{onBoard !== 1 ? 's' : ''} will be placed
                {adapted.offboard.length > 0 &&
                  `, ${adapted.offboard.length} off-board (${adapted.padNotes.length} edge pad${adapted.padNotes.length !== 1 ? 's' : ''})`}
                .
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <span>Max columns</span>
                  <input
                    type="number"
                    min={8}
                    max={80}
                    value={maxColumns}
                    disabled={running}
                    onChange={(e) => setMaxColumns(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span>Max rows</span>
                  <input
                    type="number"
                    min={4}
                    max={80}
                    value={maxRows}
                    disabled={running}
                    onChange={(e) => setMaxRows(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              {phase.name === 'running' && (
                <div className="flex items-center gap-2 text-[#e8e8ea]" role="status" aria-live="polite">
                  <Loader2 size={14} className="animate-spin text-[#c8ff2e] shrink-0" />
                  <span>{phase.progress}</span>
                </div>
              )}
              {onBoard === 0 && <p className="text-[#ff6b6b]">There are no parts to place. Import a netlist first.</p>}
            </>
          )}

          {phase.name === 'error' && (
            <p className="text-[#ff6b6b] whitespace-pre-wrap" role="alert">{phase.message}</p>
          )}

          {phase.name === 'done' && (
            <>
              <p className="text-[#e8e8ea]">
                Layout applied: {phase.cols} columns by {phase.rows} rows.
              </p>
              {phase.wiringNotes.length > 0 && (
                <div>
                  <div className="font-medium text-[#c8c8d0] mb-1.5">Off-board wiring (edge pads)</div>
                  <ul className="space-y-1 bg-[#16161a] rounded-lg border border-[#222228] px-3 py-2">
                    {phase.wiringNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              {phase.warnings.length > 0 && (
                <div>
                  <div className="font-medium text-[#c8c8d0] mb-1.5">Not placed on the board</div>
                  <ul className="space-y-1 bg-[#16161a] rounded-lg border border-[#222228] px-3 py-2">
                    {phase.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#222228] flex items-center justify-between">
          {running ? (
            <button
              onClick={cancel}
              className="px-4 py-2 rounded-lg text-sm text-[#82829a] hover:text-[#e8e8ea] hover:bg-[#1c1c22] transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-[#82829a] hover:text-[#e8e8ea] hover:bg-[#1c1c22] transition-colors"
            >
              {phase.name === 'done' ? 'Close' : 'Cancel'}
            </button>
          )}
          {(phase.name === 'form' || phase.name === 'error') && (
            <button
              onClick={generate}
              disabled={onBoard === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#c8ff2e] hover:bg-[#d4ff55] text-[#0a0a0e] font-medium text-sm transition-colors disabled:opacity-40"
            >
              <Wand2 size={15} />
              Generate
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};
