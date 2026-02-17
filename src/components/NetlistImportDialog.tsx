import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FileUp,
  RefreshCw,
  Replace,
  Check,
  Square,
  CheckSquare,
  Info,
} from 'lucide-react';
import type { NetlistImportMode, NetlistImportOptions } from '@/lib/types';

interface NetlistImportDialogProps {
  /** File name being imported */
  fileName: string;
  /** Whether there's an existing board with components */
  hasExistingBoard: boolean;
  /** Number of components in the parsed netlist */
  parsedComponentCount: number;
  /** Number of nets in the parsed netlist */
  parsedNetCount: number;
  onConfirm: (options: NetlistImportOptions) => void;
  onCancel: () => void;
}

export const NetlistImportDialog = ({
  fileName,
  hasExistingBoard,
  parsedComponentCount,
  parsedNetCount,
  onConfirm,
  onCancel,
}: NetlistImportDialogProps) => {
  const [mode, setMode] = useState<NetlistImportMode>(
    hasExistingBoard ? 'update' : 'replace'
  );
  const [updateComponents, setUpdateComponents] = useState(true);
  const [updateValues, setUpdateValues] = useState(true);
  const [updateFootprints, setUpdateFootprints] = useState(true);
  const [updateNets, setUpdateNets] = useState(true);
  const [removeUnusedNets, setRemoveUnusedNets] = useState(true);

  // "Everything" is checked when all sub-options are checked
  const allChecked =
    updateComponents && updateValues && updateFootprints && updateNets && removeUnusedNets;
  const someChecked =
    updateComponents || updateValues || updateFootprints || updateNets || removeUnusedNets;

  const toggleAll = useCallback(() => {
    const next = !allChecked;
    setUpdateComponents(next);
    setUpdateValues(next);
    setUpdateFootprints(next);
    setUpdateNets(next);
    setRemoveUnusedNets(next);
  }, [allChecked]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, updateComponents, updateValues, updateFootprints, updateNets, removeUnusedNets]);

  const handleConfirm = () => {
    onConfirm({
      mode,
      updateComponents,
      updateValues,
      updateFootprints,
      updateNets,
      removeUnusedNets,
    });
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[100]"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[480px] rounded-xl"
        style={{
          background: 'rgba(17, 17, 20, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222228]">
          <div className="flex items-center gap-2.5">
            <FileUp size={18} className="text-[#c8ff2e]" />
            <h2 className="text-lg font-semibold text-[#e8e8ea]">
              Import Netlist
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-[#222228] text-[#4a4a5a] hover:text-[#e8e8ea] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5">
          {/* File info */}
          <div className="flex items-center gap-2 text-xs text-[#6b6b7a] bg-[#16161a] rounded-lg px-3 py-2 border border-[#222228]">
            <Info size={13} className="text-[#4a4a5a] shrink-0" />
            <span>
              <span className="font-mono text-[#a6a6b8]">{fileName}</span>
              {' — '}
              {parsedComponentCount} component{parsedComponentCount !== 1 ? 's' : ''},{' '}
              {parsedNetCount} net{parsedNetCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Mode selection */}
          <div>
            <div className="text-xs font-medium text-[#c8c8d0] mb-2.5">
              Import Mode
            </div>
            <div className="space-y-2">
              {/* Replace all */}
              <ModeOption
                icon={Replace}
                label="Replace all (fresh start)"
                description="Clears current board and imports everything from scratch"
                selected={mode === 'replace'}
                onClick={() => setMode('replace')}
              />
              {/* Update existing */}
              <ModeOption
                icon={RefreshCw}
                label="Update existing board"
                description="Matches components by reference, selectively updates in place"
                selected={mode === 'update'}
                onClick={() => setMode('update')}
                disabled={!hasExistingBoard}
                disabledReason="No existing components to update"
              />
            </div>
          </div>

          {/* Update options (only visible in 'update' mode) */}
          {mode === 'update' && (
            <div>
              <div className="text-xs font-medium text-[#c8c8d0] mb-2.5">
                Update Options
              </div>
              <div className="space-y-0.5 bg-[#16161a] rounded-lg border border-[#222228] p-2">
                {/* Everything toggle */}
                <CheckboxRow
                  checked={allChecked}
                  indeterminate={someChecked && !allChecked}
                  onChange={toggleAll}
                  label="Everything"
                  description="Select / deselect all options below"
                  bold
                />
                <div className="border-t border-[#222228] my-1.5" />

                <CheckboxRow
                  checked={updateComponents}
                  onChange={() => setUpdateComponents((v) => !v)}
                  label="Components"
                  description="Add new components, remove missing ones"
                />
                <CheckboxRow
                  checked={updateFootprints}
                  onChange={() => setUpdateFootprints((v) => !v)}
                  label="Footprints"
                  description="Update component definitions when footprint changed"
                />
                <CheckboxRow
                  checked={updateValues}
                  onChange={() => setUpdateValues((v) => !v)}
                  label="Values"
                  description="Update component values (e.g. 10k, 100nF)"
                />
                <CheckboxRow
                  checked={updateNets}
                  onChange={() => setUpdateNets((v) => !v)}
                  label="Net assignments"
                  description="Update pin-to-net connections"
                />
                <CheckboxRow
                  checked={removeUnusedNets}
                  onChange={() => setRemoveUnusedNets((v) => !v)}
                  label="Remove unused nets"
                  description="Delete imported nets no longer in the netlist"
                  indent
                  disabled={!updateNets}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#222228] flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-[#82829a] hover:text-[#e8e8ea] hover:bg-[#1c1c22] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#c8ff2e] hover:bg-[#d4ff55] text-[#0a0a0e] font-medium text-sm transition-colors"
          >
            <FileUp size={15} />
            Import
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

/* ─── Sub-components ─────────────────────────────────────────── */

function ModeOption({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
  disabled,
  disabledReason,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={`
        flex items-start gap-3 w-full text-left px-3 py-2.5 rounded-lg border transition-all
        ${
          disabled
            ? 'opacity-40 cursor-not-allowed border-[#1c1c22] bg-transparent'
            : selected
            ? 'border-[#c8ff2e]/40 bg-[#c8ff2e]/5'
            : 'border-[#222228] bg-transparent hover:border-[#38384a] hover:bg-[#16161a]'
        }
      `}
    >
      {/* Radio indicator */}
      <div
        className={`
          mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
          ${
            selected
              ? 'border-[#c8ff2e] bg-[#c8ff2e]'
              : 'border-[#4a4a5a]'
          }
        `}
      >
        {selected && (
          <div className="w-1.5 h-1.5 rounded-full bg-[#0a0a0e]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon
            size={14}
            className={selected ? 'text-[#c8ff2e]' : 'text-[#6b6b7a]'}
          />
          <span
            className={`text-sm font-medium ${
              selected ? 'text-[#e8e8ea]' : 'text-[#a6a6b8]'
            }`}
          >
            {label}
          </span>
        </div>
        <div className="text-[11px] text-[#52525b] mt-0.5 ml-[22px]">
          {description}
        </div>
      </div>
    </button>
  );
}

function CheckboxRow({
  checked,
  indeterminate,
  onChange,
  label,
  description,
  bold,
  indent,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  bold?: boolean;
  indent?: boolean;
  disabled?: boolean;
}) {
  const IconComponent = indeterminate
    ? CheckSquare // Partial check state
    : checked
    ? CheckSquare
    : Square;

  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`
        flex items-start gap-2.5 w-full text-left px-2 py-1.5 rounded-md transition-colors
        ${indent ? 'ml-4' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#1c1c22] cursor-pointer'}
      `}
    >
      <IconComponent
        size={15}
        className={`mt-px shrink-0 transition-colors ${
          indeterminate
            ? 'text-[#c8ff2e]/60'
            : checked
            ? 'text-[#c8ff2e]'
            : 'text-[#4a4a5a]'
        }`}
      />
      {checked && !indeterminate && (
        <span className="sr-only">
          <Check size={9} />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={`text-[12px] ${
            bold ? 'font-semibold text-[#c8c8d0]' : 'font-medium text-[#a6a6b8]'
          }`}
        >
          {label}
        </div>
        {description && (
          <div className="text-[10px] text-[#52525b] mt-0.5">{description}</div>
        )}
      </div>
    </button>
  );
}
