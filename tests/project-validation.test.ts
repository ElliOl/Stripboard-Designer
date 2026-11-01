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

describe('sanitizeProject normalisation', () => {
  const crashing = {
    board: { rows: 8, cols: 12 },
    components: [
      {
        id: 'c1', reference: 'R1', definitionId: 'resistor', position: { row: 2, col: 2 }, rotation: 0,
        pins: [{ number: '1', position: { row: 1, col: 1 }, netId: { a: 1 } }],
      },
    ],
  };

  it('normalises the pin shape that crashed the canvas', () => {
    const r = sanitizeProject(crashing)!;
    const pin = r.project.components[0].pins[0];
    expect(pin.extended).toBe(0);
    expect(pin.netId).toBeUndefined();
    expect(pin.position).toEqual({ row: 1, col: 1 });
    expect(r.fixed).toBeGreaterThan(0);
  });

  it('stringifies numeric pin numbers and drops pins with bad positions', () => {
    const base = crashing.components[0];
    const ok = sanitizeProject({ ...crashing, components: [{ ...base, pins: [{ number: 1, position: { row: 0, col: 0 } }] }] })!;
    expect(ok.project.components[0].pins[0].number).toBe('1');
    const bad = sanitizeProject({
      ...crashing,
      components: [{ ...base, pins: [{ number: '1', position: { row: NaN, col: 0 } }] }, { ...base, id: 'c2', pins: [{ number: '1' }] }],
    })!;
    expect(bad.project.components).toHaveLength(0);
    expect(bad.dropped).toBe(2);
  });

  it('rejects odd rotations and repairs wrong-typed optional fields', () => {
    const base = crashing.components[0];
    const r = sanitizeProject({
      board: { rows: 5, cols: 5 },
      components: [{ ...base, rotation: 45 }, { ...base, id: 'c2', rotation: -90, color: 5 }],
      strips: [{ id: 's', row: 0, startCol: 0, endCol: 4, breaks: [1, 'x'], cuts: [{ col: 2, type: 'drill' }, { col: 'a', type: 'slice' }], netId: 7 }],
      wires: [{ id: 'w', netId: 'n', points: [{ row: 0, col: 0 }], color: 3 }, { id: 'w2', netId: 'n', points: [{ row: 'a', col: 0 }] }],
      nets: [{ id: 'n', name: 'N', color: 4 }],
    })!;
    expect(r.project.components.map((c) => c.id)).toEqual(['c2']);
    expect(r.project.components[0].rotation).toBe(270);
    expect(r.project.components[0].color).toBeUndefined();
    expect(r.project.strips[0].breaks).toEqual([1]);
    expect(r.project.strips[0].cuts).toEqual([{ col: 2, type: 'drill' }]);
    expect(r.project.strips[0].netId).toBeUndefined();
    expect(r.project.wires).toHaveLength(1);
    expect(r.project.wires[0].color).toBeUndefined();
    expect(typeof r.project.nets[0].color).toBe('string');
  });
});

describe('getStripCuts', () => {
  it('merges cuts and legacy breaks without duplicates', () => {
    const strip = { id: 's', row: 0, startCol: 0, endCol: 9, breaks: [2, 5], cuts: [{ col: 2, type: 'drill' as const }, { col: 6.5, type: 'slice' as const }] };
    expect(getStripCuts(strip).map((c) => c.col).sort()).toEqual([2, 5, 6.5]);
    expect(getStripSegments(strip)).toHaveLength(4);
  });
});
