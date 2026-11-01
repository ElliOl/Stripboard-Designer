import { describe, expect, it } from 'vitest';
import {
  clampDropPosition,
  clampPartToPcb,
  findPcbAt,
  interpretWheel,
  normalizeWheelDelta,
  pinExtents,
  scaleHitTolerance,
  uniqueId,
} from '@/lib/canvas-geometry';

const pcbs = [
  { position: { row: 0, col: 0 }, rows: 10, cols: 20 },
  { position: { row: 0, col: 30 }, rows: 5, cols: 8 },
];
const ev = (o: Partial<Parameters<typeof interpretWheel>[0]>) => ({
  deltaX: 0, deltaY: 0, deltaMode: 0, shiftKey: false, metaKey: false, ctrlKey: false, ...o,
});

describe('hit tolerance', () => {
  it('grows when zoomed out, capped, and shrinks when zoomed in', () => {
    expect(scaleHitTolerance(10, 1)).toBe(10);
    expect(scaleHitTolerance(10, 0.5)).toBe(20);
    expect(scaleHitTolerance(10, 0.15)).toBe(30);
    expect(scaleHitTolerance(10, 5)).toBe(5);
  });
});

describe('pcb lookup and drop clamping', () => {
  it('finds the pcb under a point', () => {
    expect(findPcbAt(pcbs, 2, 31)).toBe(pcbs[1]);
    expect(findPcbAt(pcbs, 2, 25)).toBeUndefined();
  });
  it('clamps using rotated extents against the second pcb', () => {
    const ext = pinExtents([{ row: 0, col: 0 }, { row: 3, col: 0 }, { row: 3, col: 2 }]);
    expect(clampDropPosition(pcbs, { row: 4, col: 37 }, ext)).toEqual({ row: 1, col: 35 });
  });
  it('does not clamp when over no pcb', () => {
    const ext = pinExtents([{ row: 0, col: 0 }, { row: 3, col: 0 }]);
    expect(clampDropPosition(pcbs, { row: 50, col: 50 }, ext)).toEqual({ row: 50, col: 50 });
  });
  it('clamps negative extents', () => {
    const ext = pinExtents([{ row: -2, col: -1 }, { row: 0, col: 0 }]);
    expect(clampPartToPcb({ row: 0, col: 0 }, ext, pcbs[0])).toEqual({ row: 2, col: 1 });
  });
});

describe('wheel', () => {
  it('normalises line and page units', () => {
    expect(normalizeWheelDelta(3, 1)).toBe(48);
    expect(normalizeWheelDelta(1, 2, 600)).toBe(600);
  });
  it('shift pans horizontally from deltaY or deltaX', () => {
    expect(interpretWheel(ev({ shiftKey: true, deltaY: 30 }))).toEqual({ kind: 'pan', dx: -30, dy: 0 });
    expect(interpretWheel(ev({ shiftKey: true, deltaX: 30 }))).toEqual({ kind: 'pan', dx: -30, dy: 0 });
  });
  it('horizontal scroll pans, vertical zooms, ctrl zooms', () => {
    expect(interpretWheel(ev({ deltaX: 20, deltaY: 2 })).kind).toBe('pan');
    const z = interpretWheel(ev({ deltaY: -100 }));
    expect(z.kind === 'zoom' && z.factor > 1).toBe(true);
    expect(interpretWheel(ev({ ctrlKey: true, deltaX: 50, deltaY: 1 })).kind).toBe('zoom');
  });
  it('line-mode zoom steps match pixel-mode', () => {
    const a = interpretWheel(ev({ deltaY: 3, deltaMode: 1 }));
    const b = interpretWheel(ev({ deltaY: 48 }));
    expect(a).toEqual(b);
  });
});

describe('uniqueId', () => {
  it('does not collide', () => {
    const s = new Set(Array.from({ length: 500 }, () => uniqueId('comp')));
    expect(s.size).toBe(500);
  });
});
