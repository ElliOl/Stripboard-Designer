import { describe, expect, it } from 'vitest';
import { sanitizeProject } from '@/lib/project-validation';
import { getStripCuts, getStripSegments } from '@/lib/strip-segments';

const comp = {
  id: 'c1', reference: 'R1', definitionId: 'resistor', position: { row: 1, col: 1 }, rotation: 0,
  pins: [{ number: '1', position: { row: 1, col: 1 }, extended: 0 }],
};

describe('sanitizeProject', () => {
  it('rejects non-projects', () => {
    expect(sanitizeProject(null)).toBeNull();
    expect(sanitizeProject('x')).toBeNull();
    expect(sanitizeProject([])).toBeNull();
    expect(sanitizeProject({})).toBeNull();
    expect(sanitizeProject({ components: 'abc' })).toBeNull();
    expect(sanitizeProject({ board: { rows: 'a', cols: 3 }, components: [] })).toBeNull();
  });

  it('accepts a valid project and drops malformed entries', () => {
    const r = sanitizeProject({
      board: { rows: 5, cols: 5 },
      components: [comp, { ...comp, id: 'bad', pins: 'nope' }, null],
      strips: [{ id: 's', row: 0, startCol: 0, endCol: 4 }],
      wires: [{ id: 'w', netId: 'n', points: [{ row: 0, col: 0 }] }, { id: 'w2' }],
      nets: [{ id: 'n', name: 'N' }],
    });
    expect(r).not.toBeNull();
    expect(r!.project.components).toHaveLength(1);
    expect(r!.project.wires).toHaveLength(1);
    expect(r!.project.strips[0].breaks).toEqual([]);
    expect(r!.dropped).toBe(3);
  });
});

describe('getStripCuts', () => {
  it('merges cuts and legacy breaks without duplicates', () => {
    const strip = { id: 's', row: 0, startCol: 0, endCol: 9, breaks: [2, 5], cuts: [{ col: 2, type: 'drill' as const }, { col: 6.5, type: 'slice' as const }] };
    expect(getStripCuts(strip).map((c) => c.col).sort()).toEqual([2, 5, 6.5]);
    expect(getStripSegments(strip)).toHaveLength(4);
  });
});
