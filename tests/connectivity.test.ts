import { describe, it, expect } from 'vitest';
import { analyzeConnectivity } from '@/lib/connectivity';
import { calculateRatsNest } from '@/lib/ratsnest';
import type { Component, Net, PCB, Strip, Wire } from '@/lib/types';

const pcbs: PCB[] = [
  { id: 'main-pcb', name: 'Main PCB', rows: 10, cols: 20, position: { row: 0, col: 0 }, isMain: true },
];
const nets: Net[] = [
  { id: 'N', name: 'N', color: '#f00' },
  { id: 'M', name: 'M', color: '#0f0' },
];
const strips = (cuts: Strip['cuts'] = [], rows = 10): Strip[] =>
  Array.from({ length: rows }, (_, row) => ({
    id: `s${row}`, row, startCol: 0, endCol: 19, breaks: [], cuts: row === 0 ? cuts : [],
  }));
const part = (id: string, pins: Array<[string, number, number]>): Component => ({
  id, reference: id, definitionId: 'x', position: { row: 0, col: 0 }, rotation: 0,
  pins: pins.map(([netId, row, col], i) => ({ number: String(i + 1), netId, position: { row, col }, extended: 0 })),
});
const wire = (id: string, ...pts: Array<[number, number]>): Wire =>
  ({ id, points: pts.map(([row, col]) => ({ row, col })) }) as Wire;

const run = (components: Component[], s: Strip[], wires: Wire[]) => ({
  a: analyzeConnectivity(components, s, wires, nets, pcbs),
  r: calculateRatsNest(components, s, wires, nets, pcbs),
});

describe('chained links', () => {
  // pin N at row 0, link to empty row 2, second link from row 2 to row 4 with pin N
  const comps = [part('A', [['N', 0, 1]]), part('B', [['N', 4, 1]])];
  const links = [wire('l1', [0, 5], [2, 5]), wire('l2', [2, 8], [4, 8])];

  it('connects through an empty segment', () => {
    const { a, r } = run(comps, strips(), links);
    expect(a.connectedGroups.get('N')).toHaveLength(1);
    expect(r).toHaveLength(0);
    expect(a.wireNets.get('l1')).toBe('N');
    expect(a.wireNets.get('l2')).toBe('N');
    expect(a.segmentNets.get('s2:0')).toBe('N');
    expect(a.wireErrors.size + a.segmentErrors.size).toBe(0);
  });

  it('does not connect when the chain is broken', () => {
    const { a, r } = run(comps, strips(), [links[0]]);
    expect(a.connectedGroups.get('N')).toHaveLength(2);
    expect(r).toHaveLength(1);
  });

  it('follows links with wire points off any strip', () => {
    const offBoard = [wire('l1', [0, 5], [-1, 5]), wire('l2', [-1, 5], [4, 8])];
    const { a, r } = run(comps, strips(), offBoard);
    expect(a.connectedGroups.get('N')).toHaveLength(1);
    expect(r).toHaveLength(0);
  });
});

describe('shorts', () => {
  it('reports a link bridging two nets', () => {
    const comps = [part('A', [['N', 0, 1]]), part('B', [['M', 3, 1]])];
    const { a } = run(comps, strips(), [wire('l', [0, 5], [3, 5])]);
    expect(a.wireErrors.has('l')).toBe(true);
    expect(a.segmentErrors.has('s0:0')).toBe(true);
    expect(a.segmentErrors.has('s3:0')).toBe(true);
    expect(a.wireNets.get('l')).toBeNull();
  });

  it('reports a short through a chain', () => {
    const comps = [part('A', [['N', 0, 1]]), part('B', [['M', 4, 1]])];
    const { a } = run(comps, strips(), [wire('l1', [0, 5], [2, 5]), wire('l2', [2, 8], [4, 8])]);
    expect(a.wireErrors.has('l1')).toBe(true);
    expect(a.wireErrors.has('l2')).toBe(true);
  });
});

describe('cuts', () => {
  const comps = [part('A', [['N', 0, 1]]), part('B', [['N', 0, 12]])];

  it('joins pins on one uncut strip', () => {
    const { a, r } = run(comps, strips(), []);
    expect(a.connectedGroups.get('N')).toHaveLength(1);
    expect(r).toHaveLength(0);
  });

  it('splits at a slice cut', () => {
    const { a, r } = run(comps, strips([{ col: 6.5, type: 'slice' }]), []);
    expect(a.connectedGroups.get('N')).toHaveLength(2);
    expect(r).toHaveLength(1);
  });

  it('splits at a drill cut', () => {
    const { a, r } = run(comps, strips([{ col: 6, type: 'drill' }]), []);
    expect(a.connectedGroups.get('N')).toHaveLength(2);
    expect(r).toHaveLength(1);
  });

  it('a link rejoins a cut strip', () => {
    const { a, r } = run(comps, strips([{ col: 6, type: 'drill' }]), [wire('l', [0, 2], [1, 2]), wire('l2', [1, 10], [0, 10])]);
    expect(a.connectedGroups.get('N')).toHaveLength(1);
    expect(r).toHaveLength(0);
  });
});

describe('ratsnest', () => {
  it('draws a line for an unconnected pin', () => {
    const comps = [part('A', [['N', 0, 1]]), part('B', [['N', 5, 9]])];
    const { r } = run(comps, strips(), []);
    expect(r).toHaveLength(1);
    expect(r[0].netId).toBe('N');
  });
});
