import { describe, expect, it } from 'vitest';
import { autoLayout, BOOSTER, HEADER_AND_TRIMMER } from './autolayout-helpers';

describe('auto layout', () => {
  it('lays out a small circuit with no split nets, shorts or open connections', async () => {
    const { run, result, problems, adapted } = await autoLayout(BOOSTER);
    expect(run.ok).toBe(true);
    expect(problems).toEqual([]);
    expect(result!.project.components.length).toBeGreaterThan(10);
    // Net ids and names are the netlist's own
    expect(result!.project.nets.map((n) => n.name)).toContain('Net-(C1-Pad2)');
    // The pot and jack are off-board; their nets get labelled pads
    const refs = result!.project.components.map((c) => c.reference);
    expect(refs).toContain('GND');
    expect(refs).toContain('COLL');
    expect(refs).not.toContain('RV1');
    expect(result!.warnings.join('\n')).toMatch(/RV1/);
    expect(adapted.offboard.map((p) => p.reference).sort()).toEqual(['J1', 'RV1']);
    expect(result!.project.wires.length + result!.project.strips.length).toBeGreaterThan(0);
  }, 120000);

  it('keeps references, values and ids of placed parts', async () => {
    const { board, result } = await autoLayout(BOOSTER);
    for (const orig of board.components) {
      if (['J1', 'RV1'].includes(orig.reference)) continue;
      const placed = result!.project.components.find((c) => c.id === orig.id);
      expect(placed?.reference).toBe(orig.reference);
      expect(placed?.value).toBe(orig.value);
    }
  }, 120000);
});

describe('auto layout: headers and trimmers', () => {
  it('places a pin header and a trimmer on the board and routes them', async () => {
    const { run, result, problems, adapted } = await autoLayout(HEADER_AND_TRIMMER, 40, 24);
    expect(run.ok).toBe(true);
    expect(problems).toEqual([]);
    expect(adapted.offboard).toEqual([]);
    const byRef = new Map(result!.project.components.map((c) => [c.reference, c]));
    // Each header pin sits on its own strip, with the header's library definition
    const header = byRef.get('J1')!;
    expect(header.definitionId).toBe('header-1x4');
    expect(new Set(header.pins.map((p) => p.position.row)).size).toBe(4);
    expect(header.pins.map((p) => p.netId).every(Boolean)).toBe(true);
    // The trimmer keeps pin 2 as its wiper, on the OUT net
    const trimmer = byRef.get('RV1')!;
    expect(trimmer.definitionId).toMatch(/^trimpot/);
    const out = result!.project.nets.find((n) => n.name === 'OUT')!;
    expect(trimmer.pins.find((p) => p.number === '2')!.netId).toBe(out.id);
    expect(byRef.has('NT1')).toBe(true);
  }, 120000);
});
