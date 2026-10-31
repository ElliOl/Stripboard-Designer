import { describe, it, expect } from 'vitest';
import { analyzeConnectivity } from '@/lib/connectivity';
import { calculateRatsNest } from '@/lib/ratsnest';
import type { Component, Net, PCB, Strip, Wire } from '@/lib/types';

// Synthetic board the size of a laid-out VCO: 80x50, ~150 parts, ~80 links.
const ROWS = 50;
const COLS = 80;
const pcbs: PCB[] = [
  { id: 'main-pcb', name: 'Main PCB', rows: ROWS, cols: COLS, position: { row: 0, col: 0 }, isMain: true },
];
const nets: Net[] = Array.from({ length: 120 }, (_, i) => ({ id: `n${i}`, name: `n${i}`, color: '#fff' }));
const strips: Strip[] = Array.from({ length: ROWS }, (_, row) => ({
  id: `s${row}`, row, startCol: 0, endCol: COLS - 1, breaks: [],
  cuts: [10, 20, 30, 40, 50, 60, 70].map((col) => ({ col, type: 'cut' })) as Strip['cuts'],
}));

// Deterministic pseudo-random sequence
let seed = 12345;
const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

const components: Component[] = Array.from({ length: 150 }, (_, i) => ({
  id: `c${i}`, reference: `C${i}`, definitionId: 'x', position: { row: 0, col: 0 }, rotation: 0 as const,
  pins: Array.from({ length: 3 }, (_, p) => ({
    number: String(p + 1),
    // net 0 is a big GND-like net, the rest are spread out
    netId: p === 0 ? 'n0' : `n${1 + rnd(nets.length - 1)}`,
    position: { row: rnd(ROWS), col: rnd(COLS) },
    extended: 0,
  })),
}));
const wires: Wire[] = Array.from({ length: 80 }, (_, i) => ({
  id: `w${i}`, netId: 'n0',
  points: [{ row: rnd(ROWS), col: rnd(COLS) }, { row: rnd(ROWS), col: rnd(COLS) }],
}));

describe('ratsnest and connectivity performance', () => {
  it('handles a large board quickly', () => {
    const start = performance.now();
    const rats = calculateRatsNest(components, strips, wires, nets, pcbs);
    const result = analyzeConnectivity(components, strips, wires, nets, pcbs);
    const elapsed = performance.now() - start;
    expect(rats.length).toBeGreaterThan(0);
    expect(result.connectedGroups.size).toBe(nets.length);
    expect(elapsed).toBeLessThan(500);
  });
});
