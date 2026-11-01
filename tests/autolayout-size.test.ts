import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { BOOSTER, boardFromNetlist } from './autolayout-helpers';
import { adaptBoardToVero } from '@/lib/autolayout/adapter';
import {
  enlargeBoardSize,
  estimateBoardSize,
  isNoFitError,
  onBoardParts,
  MAX_COLUMNS,
  MAX_ROWS,
} from '@/lib/autolayout/board-size';

const adapt = (text: string) => {
  const b = boardFromNetlist(text);
  return adaptBoardToVero(b.components, b.nets, b.definitions).circuit;
};

const booster = () => BOOSTER;

describe('board size estimate', () => {
  it('keeps a small circuit at the old default', () => {
    expect(estimateBoardSize(adapt(booster()))).toEqual({ columns: 40, rows: 24 });
  });

  it('gives the 113-part VCO a board near 80 x 48', () => {
    const circuit = adapt(readFileSync('Digisound-80-VCO_AS3340.net', 'utf8'));
    expect(onBoardParts(circuit).length).toBeGreaterThan(40);
    const size = estimateBoardSize(circuit);
    expect(size.columns).toBeGreaterThanOrEqual(70);
    expect(size.columns).toBeLessThanOrEqual(80);
    expect(size.rows).toBeGreaterThanOrEqual(44);
    expect(size.rows).toBeLessThanOrEqual(56);
  });

  it('never exceeds the router limits', () => {
    const size = estimateBoardSize({
      components: Array.from({ length: 2000 }, (_, i) => ({ id: `R${i}`, type: 'resistor' })),
      wires: [],
    });
    expect(size.columns).toBe(MAX_COLUMNS);
    expect(size.rows).toBeLessThanOrEqual(MAX_ROWS);
  });
});

describe('enlarging the board', () => {
  it('adds about 25% to each side', () => {
    const r = enlargeBoardSize({ columns: 40, rows: 24 });
    expect(r).toEqual({ size: { columns: 50, rows: 30 }, changed: true });
  });

  it('stops growing columns at the maximum but still grows rows', () => {
    const r = enlargeBoardSize({ columns: 80, rows: 48 });
    expect(r.size).toEqual({ columns: 80, rows: 60 });
    expect(r.changed).toBe(true);
  });

  it('reports no change at both maximums', () => {
    const r = enlargeBoardSize({ columns: MAX_COLUMNS, rows: MAX_ROWS });
    expect(r.changed).toBe(false);
    expect(r.size).toEqual({ columns: MAX_COLUMNS, rows: MAX_ROWS });
  });
});

describe('no-fit errors', () => {
  it('recognises the router messages', () => {
    expect(isNoFitError('Compact could not finish a valid layout within 40 columns × 24 rows. Increase Maximum board rows or Maximum board columns and generate again.')).toBe(true);
    expect(isNoFitError('The components cannot fit within 40 columns × 24 rows, including spare rows.')).toBe(true);
    expect(isNoFitError('The autorouter could not produce a valid layout within 12 columns × 7 rows. Increase Maximum board rows.')).toBe(true);
    expect(isNoFitError('Conflicting nets share a physical IC pin: U1 3.')).toBe(false);
  });
});
