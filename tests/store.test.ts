import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { useStripboardStore } from '@/store/stripboard';
import library from '@/data/library.json';
import { convertVeroProject } from '@/lib/vero-import';
import { parseKiCadNetlist } from '@/lib/netlist-parser';
import type { Component, ComponentDefinition, ProjectData } from '@/lib/types';

const S = () => useStripboardStore.getState();
const lib = library as ComponentDefinition[];

beforeEach(() => {
  S().reset();
  S().loadComponentDefinitions(lib);
});

/** A horizontal 3-hole-span resistor at (row, col) */
const resistor = (id: string, reference: string, row: number, col: number): Component => ({
  id,
  reference,
  definitionId: 'resistor',
  position: { row, col },
  rotation: 0,
  pins: [
    { number: '1', position: { row, col }, extended: 0 },
    { number: '2', position: { row, col: col + 3 }, extended: 0 },
  ],
});

const roundTrip = () => {
  const saved = JSON.parse(JSON.stringify(S().exportProject())) as ProjectData;
  S().reset();
  S().loadComponentDefinitions(lib);
  S().importProject(saved);
};

const netlist = (footprint: string) => `(export (version "E")
  (components (comp (ref "R1") (value "10k") (footprint "${footprint}")))
  (nets
    (net (code "1") (name "A") (node (ref "R1") (pin "1")))
    (net (code "2") (name "B") (node (ref "R1") (pin "2")))))`;

describe('saving and opening', () => {
  it('keeps the footprints of a Vero-imported board', () => {
    const vero = JSON.parse(readFileSync('fixtures/vero-booster.json', 'utf8'));
    S().importProject(convertVeroProject(vero, lib).project);
    roundTrip();
    const missing = S().components.filter(
      (c) => !S().componentDefinitions.some((d) => d.id === c.definitionId)
    );
    expect(missing).toEqual([]);
  });

  it('saves net groups and reference images', () => {
    S().addNetGroup('Power', []);
    S().addReferenceImage({
      id: 'img', src: 'data:,', x: 0, y: 0, naturalWidth: 1, naturalHeight: 1,
      scale: 1, opacity: 1, inverted: false, onTop: false, visible: true,
    });
    roundTrip();
    expect(S().netGroups.map((g) => g.name)).toEqual(['Power']);
    expect(S().referenceImages.map((i) => i.id)).toEqual(['img']);
  });

  it('does not carry the previous project into an opened one', () => {
    S().addNetGroup('Old', []);
    S().addReferenceImage({
      id: 'img', src: 'data:,', x: 0, y: 0, naturalWidth: 1, naturalHeight: 1,
      scale: 1, opacity: 1, inverted: false, onTop: false, visible: true,
    });
    S().importProject({ version: '1.0', board: { rows: 10, cols: 10 }, components: [], strips: [], wires: [], nets: [] });
    expect(S().netGroups).toEqual([]);
    expect(S().referenceImages).toEqual([]);
  });
});

describe('board edits', () => {
  it('keeps drill and slice cuts when the board is resized', () => {
    S().addCut(3, 5.5, 'slice');
    S().addCut(3, 8, 'drill');
    const before = S().strips.find((s) => s.row === 3)!.cuts;
    S().setBoardSize(S().rows, S().cols + 2);
    expect(S().strips.find((s) => s.row === 3)!.cuts).toEqual(before);
  });

  it('keeps cuts when a second PCB is resized', () => {
    S().addPCB('Second', 10, 10);
    const pcb = S().pcbs.find((p) => !p.isMain)!;
    S().addCut(pcb.position.row + 2, pcb.position.col + 4.5, 'slice');
    S().updatePCB(pcb.id, { cols: 12 });
    const strip = S().strips.find((s) => s.pcbId === pcb.id && s.row === 2)!;
    expect(strip.cuts).toEqual([{ col: 4.5, type: 'slice' }]);
  });

  it('undo after adding a PCB removes the PCB together with its strips', () => {
    S().saveToHistory();
    S().addPCB('Second', 5, 5);
    S().undo();
    expect(S().pcbs.filter((p) => !p.isMain)).toEqual([]);
    for (const strip of S().strips) expect(strip.pcbId).toBeUndefined();
  });

  it('undo after a board resize restores the size', () => {
    const { rows, cols } = S();
    S().saveToHistory();
    S().setBoardSize(rows + 5, cols + 5);
    S().undo();
    expect([S().rows, S().cols]).toEqual([rows, cols]);
    expect(S().strips.filter((s) => !s.pcbId)).toHaveLength(rows);
  });
});

describe('editing parts', () => {
  it('rotating a part on a second PCB keeps it on that PCB', () => {
    S().addPCB('Second', 10, 10);
    const pcb = S().pcbs.find((p) => !p.isMain)!;
    S().addComponent(resistor('r', 'R5', pcb.position.row + 4, pcb.position.col + 2));
    S().rotateComponent('r');
    const cols = S().components[0].pins.map((p) => p.position.col);
    expect(Math.min(...cols)).toBeGreaterThanOrEqual(pcb.position.col);
  });

  it('pasting several parts gives each a unique reference', () => {
    S().addComponent(resistor('a', 'R1', 2, 2));
    S().addComponent(resistor('b', 'R2', 2, 8));
    S().setSelectedItems(['a', 'b']);
    S().copySelected();
    S().paste();
    const refs = S().components.map((c) => c.reference);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('dragging a pin keeps the part body type', () => {
    S().addComponent({
      id: 'c', reference: 'C1', definitionId: 'capacitor-rect', position: { row: 4, col: 2 }, rotation: 0,
      pins: [
        { number: '1', position: { row: 4, col: 2 }, extended: 0 },
        { number: '2', position: { row: 4, col: 4 }, extended: 0 },
      ],
    });
    S().moveComponentPin('c', 1, { row: 4, col: 6 });
    S().finalizePinDrag('c');
    expect(S().components[0].definitionId).toMatch(/^capacitor-rect-custom-/);
  });

  it('deleting selected reference images removes them', () => {
    S().addReferenceImage({
      id: 'img', src: 'data:,', x: 0, y: 0, naturalWidth: 1, naturalHeight: 1,
      scale: 1, opacity: 1, inverted: false, onTop: false, visible: true,
    });
    S().setSelectedItems(['img']);
    S().removeSelected();
    expect(S().referenceImages).toEqual([]);
  });

  it('removing a net also removes it from groups', () => {
    S().addNet({ id: 'n1', name: 'A', color: '#fff' });
    S().addNetGroup('G', ['n1']);
    S().removeNet('n1');
    expect(S().netGroups[0].netIds).toEqual([]);
  });
});

describe('netlist import', () => {
  const fp = 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal';

  it('update keeps a lead spacing the user changed', () => {
    S().importNetlist(parseKiCadNetlist(netlist(fp)));
    const r1 = S().components[0];
    S().moveComponentPin(r1.id, 1, { row: r1.pins[1].position.row + 3, col: r1.pins[1].position.col });
    S().finalizePinDrag(r1.id);
    const custom = S().components[0].definitionId;
    S().importNetlistWithOptions(parseKiCadNetlist(netlist(fp)), {
      mode: 'update', updateComponents: true, updateValues: true,
      updateFootprints: true, updateNets: true, removeUnusedNets: false,
    });
    expect(S().components[0].definitionId).toBe(custom);
  });

  it('update keeps net identity when KiCad renumbers nets', () => {
    S().importNetlist(parseKiCadNetlist(netlist(fp)));
    const netA = S().nets.find((n) => n.name === 'A')!;
    S().addNetGroup('Group', [netA.id]);
    // Same circuit, but KiCad swapped the net codes on re-export
    const renumbered = netlist(fp).replace('(code "1") (name "A")', '(code "X") (name "A")')
      .replace('(code "2") (name "B")', '(code "1") (name "B")').replace('(code "X")', '(code "2")');
    S().importNetlistWithOptions(parseKiCadNetlist(renumbered), {
      mode: 'update', updateComponents: true, updateValues: true,
      updateFootprints: true, updateNets: true, removeUnusedNets: true,
    });
    const pin1Net = S().nets.find((n) => n.id === S().components[0].pins.find((p) => p.number === '1')!.netId);
    expect(pin1Net?.name).toBe('A');
    expect(pin1Net?.id).toBe(netA.id);
    expect(S().netGroups[0].netIds).toEqual([netA.id]);
  });
});

describe('extra regressions', () => {
  const fp = 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal';
  const opts = {
    mode: 'update' as const, updateComponents: true, updateValues: true,
    updateFootprints: true, updateNets: true, removeUnusedNets: false,
  };

  it('a new net name never reuses the id of a differently named net', () => {
    S().importNetlist(parseKiCadNetlist(netlist(fp)));
    const swapped = netlist(fp).replace('(name "A")', '(name "C")');
    S().importNetlistWithOptions(parseKiCadNetlist(swapped), opts);
    const ids = S().nets.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pin1 = S().components[0].pins.find((p) => p.number === '1')!;
    expect(S().nets.find((n) => n.id === pin1.netId)?.name).toBe('C');
  });

  it('renaming a PCB does not add history, resizing does', () => {
    S().addPCB('Second', 10, 10);
    const pcb = S().pcbs.find((p) => !p.isMain)!;
    const n = S().past.length;
    S().updatePCB(pcb.id, { name: 'Renamed' });
    expect(S().past.length).toBe(n);
    S().updatePCB(pcb.id, { cols: 12 });
    expect(S().past.length).toBe(n + 1);
  });

  it('pin drag on a derived definition does not grow the id', () => {
    S().addComponent({
      id: 'c', reference: 'C1', definitionId: 'capacitor-rect', position: { row: 4, col: 2 }, rotation: 0,
      pins: [
        { number: '1', position: { row: 4, col: 2 }, extended: 0 },
        { number: '2', position: { row: 4, col: 4 }, extended: 0 },
      ],
    });
    S().moveComponentPin('c', 1, { row: 4, col: 6 });
    S().finalizePinDrag('c');
    S().moveComponentPin('c', 1, { row: 4, col: 7 });
    S().finalizePinDrag('c');
    expect(S().components[0].definitionId.match(/-custom-/g)).toHaveLength(1);
  });
});

describe('component library', () => {
  it('reloading the library keeps pin-drag variants and imported footprints', () => {
    S().addComponentDefinition({ ...lib.find((d) => d.id === 'capacitor-rect')!, id: 'capacitor-rect-custom-x' });
    S().addComponentDefinition({ ...lib.find((d) => d.id === 'resistor')!, id: 'vero-resistor-x' });
    S().loadComponentDefinitions(lib);
    const ids = S().componentDefinitions.map((d) => d.id);
    expect(ids).toContain('capacitor-rect-custom-x');
    expect(ids).toContain('vero-resistor-x');
    expect(ids.filter((id) => id === 'resistor')).toHaveLength(1);
  });
});

describe('history and moving', () => {
  const img = {
    id: 'img', src: 'data:,', x: 0, y: 0, naturalWidth: 1, naturalHeight: 1,
    scale: 1, opacity: 1, inverted: false, onTop: false, visible: true,
  };

  it('undo and redo cover reference image edits', () => {
    S().addReferenceImage(img);
    S().saveToHistory();
    S().updateReferenceImageById('img', { x: 50 });
    S().undo();
    expect(S().referenceImages[0].x).toBe(0);
    S().redo();
    expect(S().referenceImages[0].x).toBe(50);
    S().saveToHistory();
    S().clearAllReferenceImages();
    S().undo();
    expect(S().referenceImages.map((i) => i.id)).toEqual(['img']);
  });

  it('moving a selection never takes parts or wires off the board', () => {
    S().addComponent(resistor('r', 'R1', 1, 1));
    S().addWire({ id: 'w', netId: 'n', points: [{ row: 5, col: 5 }, { row: 5, col: 8 }] });
    S().setSelectedItems(['r', 'w']);
    S().moveSelectedItems(-10, -10);
    expect(S().components[0].pins[0].position).toEqual({ row: 0, col: 0 });
    expect(S().wires[0].points[0]).toEqual({ row: 4, col: 4 });
    S().moveSelectedItems(0, 1000);
    expect(Math.max(...S().wires[0].points.map((p) => p.col))).toBe(S().cols - 1);
    expect(Math.max(...S().components[0].pins.map((p) => p.position.col))).toBeLessThan(S().cols);
  });

  it('moving cuts keeps them, mirrors drill cuts into breaks and tracks selection', () => {
    S().addCut(3, 5, 'drill');
    S().addCut(3, 8.5, 'slice');
    S().setSelectedItems(['cut-3-5', 'cut-3-8.5', 'cut-9-9']);
    S().moveSelectedItems(1, 2);
    const strip = S().strips.find((s) => !s.pcbId && s.row === 4)!;
    expect(strip.cuts).toEqual([{ col: 7, type: 'drill' }, { col: 10.5, type: 'slice' }]);
    expect(strip.breaks).toContain(7);
    expect(S().strips.find((s) => !s.pcbId && s.row === 3)!.breaks).not.toContain(5);
    expect(S().selectedItems).toEqual(['cut-4-7', 'cut-4-10.5']);
    // A move past the edge is clamped, and moving back restores the cuts
    S().moveSelectedItems(0, 1000);
    expect(S().strips.find((s) => !s.pcbId && s.row === 4)!.cuts).toHaveLength(2);
    S().moveSelectedItems(0, -1000);
    expect(S().strips.find((s) => !s.pcbId && s.row === 4)!.cuts).toHaveLength(2);
  });

  it('keeps a selection on its own PCB', () => {
    S().addPCB('Second', 6, 6);
    const pcb = S().pcbs.find((p) => !p.isMain)!;
    S().addComponent(resistor('r', 'R1', pcb.position.row + 1, pcb.position.col));
    S().setSelectedItems(['r']);
    S().moveSelectedItems(100, 100);
    const pins = S().components[0].pins;
    for (const p of pins) {
      expect(p.position.row).toBeLessThan(pcb.position.row + pcb.rows);
      expect(p.position.col).toBeLessThan(pcb.position.col + pcb.cols);
    }
  });

  it('loading the library after a pin drag keeps the custom definition', () => {
    S().addComponent({
      id: 'c', reference: 'C1', definitionId: 'capacitor-rect', position: { row: 4, col: 2 }, rotation: 0,
      pins: [
        { number: '1', position: { row: 4, col: 2 }, extended: 0 },
        { number: '2', position: { row: 4, col: 4 }, extended: 0 },
      ],
    });
    S().moveComponentPin('c', 1, { row: 4, col: 6 });
    S().finalizePinDrag('c');
    const custom = S().components[0].definitionId;
    S().loadComponentDefinitions(lib);
    expect(S().componentDefinitions.some((d) => d.id === custom)).toBe(true);
  });
});

describe('undo snapshot', () => {
  it('restores componentDefinitions and stripColor', () => {
    const st = useStripboardStore;
    st.getState().reset();
    const before = st.getState().componentDefinitions.length;
    st.getState().saveToHistory();
    st.setState({
      componentDefinitions: [...st.getState().componentDefinitions, { id: 'x' } as never],
      stripColor: '#abcdef',
    });
    st.getState().undo();
    expect(st.getState().componentDefinitions).toHaveLength(before);
    expect(st.getState().stripColor).not.toBe('#abcdef');
  });
});
