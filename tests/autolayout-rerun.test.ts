import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { useStripboardStore } from '@/store/stripboard';
import { adaptBoardToVero } from '@/lib/autolayout/adapter';
import { applyLayout, mainPcbComponents } from '@/lib/autolayout/apply';
import { runVeroEngine } from '@/lib/autolayout/run-engine';
import { layoutToBoard } from '@/lib/autolayout/to-board';
import { onBoardParts } from '@/lib/autolayout/board-size';
import { convertVeroProject, type VeroProject } from '@/lib/vero-import';
import type { Component, ComponentDefinition, Net, ProjectData } from '@/lib/types';
import { BOOSTER, HEADER_AND_TRIMMER, boardFromNetlist, lib } from './autolayout-helpers';

type Board = { components: Component[]; nets: Net[]; definitions: ComponentDefinition[] };

/** One Auto layout run on a board, returning the board it produces (as the dialog applies it) */
async function layoutOnce(board: Board) {
  const adapted = adaptBoardToVero(board.components, board.nets, board.definitions);
  const run = await runVeroEngine(adapted.circuit, { maxColumns: 40, maxRows: 24 });
  if (!run.ok) throw new Error(run.error);
  const result = layoutToBoard(run.project, adapted, board.nets, board.definitions);
  const known = new Set(board.definitions.map((d) => d.id));
  const next: Board = {
    components: result.project.components,
    nets: board.nets,
    definitions: [...board.definitions, ...(result.project.customDefinitions ?? []).filter((d) => !known.has(d.id))],
  };
  return { adapted, project: result.project, next };
}

const placedRefs = (adapted: ReturnType<typeof adaptBoardToVero>) =>
  onBoardParts(adapted.circuit).map((p) => (adapted.sources[p.id] as Component).reference).sort();

describe('auto layout is repeatable', () => {
  it.each([
    ['header and trimmer circuit', HEADER_AND_TRIMMER],
    ['booster', BOOSTER],
  ])('places the same parts on every run: %s', async (_name, text) => {
    let board = boardFromNetlist(text);
    const first = adaptBoardToVero(board.components, board.nets, board.definitions);
    const expectedRefs = placedRefs(first);
    expect(expectedRefs.length).toBeGreaterThan(5);
    for (let run = 0; run < 3; run++) {
      const { adapted, next } = await layoutOnce(board);
      expect(placedRefs(adapted)).toEqual(expectedRefs);
      // Parts that were off-board in the first run are gone afterwards; nothing new goes off-board
      expect(adapted.offboard.map((p) => p.reference)).toEqual(run === 0 ? first.offboard.map((p) => p.reference) : []);
      board = next;
    }
  }, 240000);

  it('does not treat earlier edge pads as circuit parts', async () => {
    const { next } = await layoutOnce(boardFromNetlist(BOOSTER));
    expect(next.components.some((c) => c.definitionId === 'vero-pad-1')).toBe(true);
    const again = adaptBoardToVero(next.components, next.nets, next.definitions);
    expect(again.offboard).toEqual([]);
    expect(again.circuit.components.filter((p) => p.type === 'terminal').length).toBeGreaterThan(0);
  }, 120000);
});

describe('auto layout on a Vero-imported board', () => {
  it('places every real part', () => {
    const vero = JSON.parse(readFileSync('fixtures/vero-booster.json', 'utf8')) as VeroProject;
    const { project } = convertVeroProject(vero, lib);
    const definitions = [...lib, ...(project.customDefinitions ?? [])];
    const adapted = adaptBoardToVero(project.components, project.nets, definitions);
    const real = project.components.filter((c) => c.definitionId !== 'vero-pad-1');
    expect(adapted.offboard).toEqual([]);
    expect(onBoardParts(adapted.circuit).length).toBe(real.length);
  });
});

describe('auto layout with several PCBs', () => {
  const part = (id: string, row: number, col: number): Component => ({
    id,
    reference: id,
    definitionId: 'resistor',
    position: { row, col },
    rotation: 0,
    pins: [
      { number: '1', position: { row, col }, extended: 0 },
      { number: '2', position: { row, col: col + 3 }, extended: 0 },
    ],
  });
  const pcbs = [
    { id: 'main-pcb', name: 'Main PCB', rows: 10, cols: 20, position: { row: 0, col: 0 }, isMain: true },
    { id: 'pcb-2', name: 'Second', rows: 10, cols: 20, position: { row: 0, col: 30 } },
  ];
  const project = (cols: number): ProjectData => ({
    version: '1.0',
    board: { rows: 12, cols },
    components: [part('R9', 1, 1)],
    strips: [],
    wires: [],
    nets: [],
  });
  const base = () => ({
    pcbs,
    components: [part('A', 1, 1), part('B', 2, 2), part('OTHER', 3, 32)],
    strips: [{ id: 'pcb-2-strip-row-0', row: 0, startCol: 0, endCol: 19, breaks: [5], pcbId: 'pcb-2' }],
    wires: [
      { id: 'w-main', netId: 'n', points: [{ row: 1, col: 1 }, { row: 1, col: 5 }] },
      { id: 'w-other', netId: 'n', points: [{ row: 4, col: 31 }, { row: 4, col: 35 }] },
    ],
    componentDefinitions: lib,
  });

  it('lays out only the parts on the main PCB', () => {
    expect(mainPcbComponents(base().components, pcbs).map((c) => c.id)).toEqual(['A', 'B']);
  });

  it('keeps the other PCB parts, links and strips', () => {
    const result = applyLayout(base(), project(25));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { patch } = result;
    expect(patch.components!.map((c) => c.id).sort()).toEqual(['OTHER', 'R9']);
    expect(patch.wires!.map((w) => w.id)).toEqual(['w-other']);
    expect(patch.strips!.filter((s) => s.pcbId === 'pcb-2')).toHaveLength(1);
    expect(patch.pcbs!.find((p) => p.isMain)).toMatchObject({ rows: 12, cols: 25 });
    expect(patch.pcbs!.find((p) => p.id === 'pcb-2')).toMatchObject({ cols: 20, position: { row: 0, col: 30 } });
  });

  it('refuses when the new main board would overlap another PCB', () => {
    const result = applyLayout(base(), project(35));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/overlap.*Second/);
  });

  it('is unaffected in the store for a single PCB', () => {
    const S = useStripboardStore.getState;
    S().reset();
    const result = applyLayout(S(), project(25));
    expect(result.ok).toBe(true);
  });
});
