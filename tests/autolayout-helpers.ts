import { useStripboardStore } from '@/store/stripboard';
import library from '@/data/library.json';
import { parseKiCadNetlist } from '@/lib/netlist-parser';
import { analyzeConnectivity } from '@/lib/connectivity';
import { calculateRatsNest } from '@/lib/ratsnest';
import { adaptBoardToVero } from '@/lib/autolayout/adapter';
import { runVeroEngine } from '@/lib/autolayout/run-engine';
import { layoutToBoard } from '@/lib/autolayout/to-board';
import type { ComponentDefinition, PCB } from '@/lib/types';

export const lib = library as ComponentDefinition[];

/** Import a netlist through the store, as the app does, and return the resulting board */
export function boardFromNetlist(text: string) {
  const S = () => useStripboardStore.getState();
  S().reset();
  S().loadComponentDefinitions(lib);
  S().importNetlist(parseKiCadNetlist(text));
  return { components: S().components, nets: S().nets, definitions: S().componentDefinitions };
}

/** Run the whole auto layout pipeline and check the result with the app's own analysis */
export async function autoLayout(
  text: string,
  maxColumns = 40,
  maxRows = 24,
  onProgress?: (text: string) => void
) {
  const board = boardFromNetlist(text);
  const adapted = adaptBoardToVero(board.components, board.nets, board.definitions);
  const run = await runVeroEngine(adapted.circuit, { maxColumns, maxRows }, onProgress);
  if (!run.ok) return { board, adapted, run, result: null, problems: [`engine: ${run.error}`] };
  const result = layoutToBoard(run.project, adapted, board.nets, board.definitions);
  const { project } = result;
  const pcbs: PCB[] = [
    { id: 'main-pcb', name: 'Main PCB', rows: project.board.rows, cols: project.board.cols, position: { row: 0, col: 0 }, isMain: true },
  ];
  const problems: string[] = [];
  const analysis = analyzeConnectivity(project.components, project.strips, project.wires, project.nets, pcbs);
  const name = new Map(project.nets.map((n) => [n.id, n.name]));
  for (const [netId, groups] of analysis.connectedGroups) {
    if (groups.length > 1) problems.push(`split ${name.get(netId)}`);
  }
  for (const c of calculateRatsNest(project.components, project.strips, project.wires, project.nets, pcbs)) {
    problems.push(`open ${name.get(c.netId)}`);
  }
  for (const k of analysis.segmentErrors) problems.push(`short segment ${k}`);
  for (const k of analysis.wireErrors) problems.push(`short link ${k}`);
  // Every original pin keeps its net
  for (const orig of board.components) {
    const placed = project.components.find((c) => c.id === orig.id);
    if (!placed) continue;
    for (const pin of orig.pins) {
      const now = placed.pins.find((p) => p.number === pin.number);
      if (pin.netId && now?.netId !== pin.netId) problems.push(`pin ${orig.reference}.${pin.number} net changed`);
    }
  }
  return { board, adapted, run, result, problems };
}
