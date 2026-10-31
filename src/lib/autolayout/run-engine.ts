// ─── Run Vero Designer's Compact (x+y) router ───────────────
//
// Plain async function so it can run in a Web Worker or in tests.

import { createVeroEngine } from './vero-engine.generated';
import type { VeroEngineLayout } from './vero-engine.generated';
import type { AutoLayoutCircuit } from './adapter';
import type { VeroProject } from '@/lib/vero-import';

export type AutoLayoutSettings = {
  maxColumns: number;
  maxRows: number;
};

export type RunResult =
  | { ok: true; project: VeroProject; shorts: number; disconnectedNets: number }
  | { ok: false; error: string };

export async function runVeroEngine(
  circuit: AutoLayoutCircuit,
  settings: AutoLayoutSettings,
  onProgress?: (text: string) => void
): Promise<RunResult> {
  const state = {
    components: [] as ReturnType<ReturnType<typeof createVeroEngine>['normalizeComponentRecord']>[],
    wires: circuit.wires.map((w) => ({ ...w })),
    boardSettings: {
      maxColumns: settings.maxColumns,
      maxRows: settings.maxRows,
      busSpacing: 1,
      spareRows: 0,
      componentOpacity: 1,
      avoidLinksOverComponents: true,
      allowDoubleLinks: true,
      autoDescribe: true,
      standingResistors: false,
    },
    projectMeta: {},
    schematicSettings: {},
    veroLayout: null,
    veroManualEdited: false,
  };
  const engine = createVeroEngine({
    state,
    els: {
      generationProgressText: {
        set textContent(text: string) {
          onProgress?.(text);
        },
      },
    },
    yieldToBrowser: () => Promise.resolve(),
  });
  state.components = circuit.components.map((c) => engine.normalizeComponentRecord({ ...c }));

  try {
    let layout: VeroEngineLayout = await engine.buildCompactXYLayout();
    if (layout.error) return { ok: false, error: layout.error };
    layout = engine.detachGeneratedLayoutFromSchematic(layout);
    engine.attachStableNetIdentities(layout);
    engine.refreshManualLayoutConnectivity(layout);
    const serialized = engine.serializeVeroLayoutForProject(layout);
    return {
      ok: true,
      project: {
        format: 'Vero Designer',
        components: state.components,
        wires: state.wires,
        veroLayout: serialized,
      } as VeroProject,
      shorts: layout.manualShortCount ?? 0,
      disconnectedNets: layout.manualDisconnectedNets?.length ?? 0,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
