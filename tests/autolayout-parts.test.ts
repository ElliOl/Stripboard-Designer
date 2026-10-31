import { describe, expect, it } from 'vitest';
import { adaptBoardToVero } from '@/lib/autolayout/adapter';
import type { CustomFootprint } from '@/lib/autolayout/custom-footprint';
import { boardFromNetlist } from './autolayout-helpers';

type Part = { ref: string; value?: string; footprint: string };
type Net = { name: string; nodes: [string, string][] };

/** A KiCad netlist from parts and nets */
function netlist(parts: Part[], nets: Net[]): string {
  const comps = parts.map((p) => `(comp (ref "${p.ref}") (value "${p.value ?? p.ref}") (footprint "${p.footprint}"))`).join('\n');
  const netText = nets
    .map((n, i) => `(net (code "${i + 1}") (name "${n.name}") ${n.nodes.map(([r, p]) => `(node (ref "${r}") (pin "${p}"))`).join(' ')})`)
    .join('\n');
  return `(export (version "E") (components ${comps}) (nets ${netText}))`;
}

function adapt(parts: Part[], nets: Net[]) {
  const board = boardFromNetlist(netlist(parts, nets));
  return adaptBoardToVero(board.components, board.nets, board.definitions);
}

const placed = (a: ReturnType<typeof adapt>, id: string) => a.circuit.components.find((c) => c.id === id);
const offboard = (a: ReturnType<typeof adapt>, ref: string) => a.offboard.find((o) => o.reference === ref);
const custom = (a: ReturnType<typeof adapt>, id: string) => placed(a, id)?.customFootprint as CustomFootprint | undefined;

const TRIMMER = 'Potentiometer_THT:Potentiometer_Vishay_T93YA_Vertical';
const PANEL_POT = 'Potentiometer_THT:Potentiometer_Alpha_RD901F-40-00D_Single_Vertical';
const R = 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal';

describe('auto layout adapter: potentiometers', () => {
  const a = adapt(
    [
      { ref: 'RV1', value: '10k', footprint: TRIMMER },
      { ref: 'RV2', value: '100k', footprint: PANEL_POT },
      { ref: 'RV3', value: '50k', footprint: 'Potentiometer_THT:Potentiometer_Unknown_Thing' },
      { ref: 'RV4', value: '5k', footprint: 'Potentiometer_THT:Potentiometer_Bourns_3296W_Vertical' },
      { ref: 'R1', value: '1k', footprint: R },
    ],
    [
      { name: 'A', nodes: [['RV1', '1'], ['RV2', '1'], ['RV3', '1'], ['RV4', '1'], ['R1', '1']] },
      { name: 'W', nodes: [['RV1', '2'], ['RV2', '2'], ['RV3', '2'], ['RV4', '2']] },
      { name: 'B', nodes: [['RV1', '3'], ['RV2', '3'], ['RV3', '3'], ['RV4', '3'], ['R1', '2']] },
    ]
  );

  it('places board trimmers by footprint, whatever the reference says', () => {
    expect(placed(a, 'RV1')).toMatchObject({ type: 'potentiometer', potType: 'trimmer' });
    expect(placed(a, 'RV4')).toMatchObject({ type: 'potentiometer', potType: 'trimmer-3296' });
    expect(a.definitionHints.RV1).toBe('trimpot-top');
    expect(a.definitionHints.RV4).toBe('trimpot');
  });

  it('keeps pin 2 of the footprint as the wiper', () => {
    const wiper = a.nodeNets['RV1:2'];
    expect(wiper).toBeDefined();
    expect(wiper).not.toBe(a.nodeNets['RV1:1']);
    expect(wiper).toBe(a.nodeNets['RV4:2']);
  });

  it('sends panel pots off-board and says why', () => {
    expect(placed(a, 'RV2')).toBeUndefined();
    expect(offboard(a, 'RV2')?.reason).toMatch(/^Panel pot/);
  });

  it('warns accurately about a potentiometer it does not recognise', () => {
    expect(placed(a, 'RV3')).toBeUndefined();
    const reason = offboard(a, 'RV3')?.reason ?? '';
    expect(reason).toMatch(/Unrecognised potentiometer footprint/);
    expect(reason).toContain('Potentiometer_Unknown_Thing');
  });
});

describe('auto layout adapter: net ties and off-board parts', () => {
  const a = adapt(
    [
      { ref: 'NT1', value: 'NetTie_2', footprint: 'NetTie:NetTie-2_SMD_Pad2.0mm' },
      { ref: 'J1', value: 'In', footprint: '4ms_Jack:EighthInch_PJ398SM' },
      { ref: 'SW1', value: 'Mode', footprint: '4ms_Switch:Switch_Toggle_SPDT_Mini_SolderLug' },
      { ref: 'R1', value: '1k', footprint: R },
    ],
    [
      { name: 'GND', nodes: [['NT1', '1'], ['J1', '1'], ['R1', '1']] },
      { name: 'SHIELD', nodes: [['NT1', '2'], ['J1', '2'], ['SW1', '1']] },
      { name: 'SIG', nodes: [['J1', '3'], ['R1', '2'], ['SW1', '2'], ['SW1', '3']] },
    ]
  );

  it('turns a net tie into a jumper link', () => {
    expect(placed(a, 'NT1')).toMatchObject({ type: 'jumper' });
    expect(a.nodeNets['NT1:1']).not.toBe(a.nodeNets['NT1:2']);
    expect(offboard(a, 'NT1')).toBeUndefined();
  });

  it('gives jacks and switches an accurate reason', () => {
    expect(offboard(a, 'J1')?.reason).toMatch(/^Panel jack/);
    expect(offboard(a, 'SW1')?.reason).toMatch(/^Switch/);
    for (const o of a.offboard) expect(o.reason).not.toMatch(/Unknown footprint/);
  });
});

describe('auto layout adapter: pin headers', () => {
  it('places a 1xN header with pins down a column, one strip each', () => {
    const a = adapt(
      [
        { ref: 'J1', value: 'Power', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical' },
        { ref: 'R1', value: '1k', footprint: R },
      ],
      [
        { name: '+9V', nodes: [['J1', '1'], ['R1', '1']] },
        { name: 'GND', nodes: [['J1', '2'], ['R1', '2']] },
        { name: 'IN', nodes: [['J1', '3']] },
      ]
    );
    expect(placed(a, 'J1')).toMatchObject({ type: 'otherIC' });
    expect(a.definitionHints.J1).toBe('header-1x4');
    const fp = custom(a, 'J1')!;
    expect(fp.kind).toBe('header');
    expect(fp.pins).toEqual(['1', '2', '3', '4']);
    // Different nets: only the vertical orientations, never pins side by side on a strip
    expect(fp.variants).toHaveLength(2);
    for (const v of fp.variants) {
      expect(v.width).toBe(1);
      expect(new Set(v.pins.map((p) => p.y)).size).toBe(4);
    }
    expect(a.nodeNets['J1:1']).toBe(a.nodeNets['R1:1']);
  });

  it('offers a horizontal 1xN orientation only when every used pin shares a net', () => {
    const a = adapt(
      [{ ref: 'J1', footprint: 'Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical' }, { ref: 'R1', value: '1k', footprint: R }],
      [
        { name: 'GND', nodes: [['J1', '1'], ['J1', '3'], ['R1', '1']] },
        { name: 'X', nodes: [['R1', '2']] },
      ]
    );
    const variants = custom(a, 'J1')!.variants;
    expect(variants.some((v) => v.height === 1)).toBe(true);
    expect(variants.some((v) => v.width === 1 && v.height === 3)).toBe(true);
  });

  it('places a 2xN header with pairs along the strips when each pair shares a net', () => {
    const nets: Net[] = [
      { name: '-12V', nodes: [['J1', '1'], ['J1', '2'], ['R1', '1']] },
      { name: 'GND', nodes: [['J1', '3'], ['J1', '4'], ['R1', '2']] },
      { name: '+12V', nodes: [['J1', '5'], ['J1', '6']] },
    ];
    const a = adapt(
      [{ ref: 'J1', footprint: '4ms_Connector:Pins_2x03_2.54mm_TH_EuroPower_Shrouded' }, { ref: 'R1', value: '1k', footprint: R }],
      nets
    );
    const fp = custom(a, 'J1')!;
    expect(fp.variants.length).toBeGreaterThan(0);
    // KiCad numbering: pins 1 and 2 are side by side, so they are on one strip
    for (const v of fp.variants) {
      const pin = (n: string) => v.pins.find((p) => p.logical === n)!;
      expect(pin('1').y).toBe(pin('2').y);
      expect(Math.abs(pin('1').x - pin('2').x)).toBe(1);
      expect(pin('1').y).not.toBe(pin('3').y);
    }
    expect(offboard(a, 'J1')).toBeUndefined();
  });

  it('keeps a 2xN header off-board when neighbouring pins are on different nets', () => {
    const a = adapt(
      [{ ref: 'J2', value: 'Board to board', footprint: 'Connector_PinHeader_2.54mm:PinHeader_2x03_P2.54mm_Vertical' }, { ref: 'R1', value: '1k', footprint: R }],
      [
        { name: 'A', nodes: [['J2', '1'], ['R1', '1']] },
        { name: 'B', nodes: [['J2', '2'], ['R1', '2']] },
        { name: 'C', nodes: [['J2', '3']] },
        { name: 'D', nodes: [['J2', '4']] },
        { name: 'E', nodes: [['J2', '5']] },
        { name: 'F', nodes: [['J2', '6']] },
      ]
    );
    expect(placed(a, 'J2')).toBeUndefined();
    const reason = offboard(a, 'J2')?.reason ?? '';
    expect(reason).toMatch(/2x3 header/);
    expect(reason).toMatch(/different nets/);
  });

  it('sizes a header from the netlist when the footprint has fewer pins', () => {
    const a = adapt(
      [{ ref: 'J3', footprint: 'Connector_PinSocket_2.54mm:PinSocket_1x01_P2.54mm_Vertical' }, { ref: 'R1', value: '1k', footprint: R }],
      [
        { name: 'A', nodes: [['J3', '1'], ['R1', '1']] },
        { name: 'B', nodes: [['J3', '2'], ['R1', '2']] },
      ]
    );
    expect(custom(a, 'J3')!.pins).toEqual(['1', '2']);
    expect(a.definitionHints.J3).toBe('header-1x2');
    expect(a.warnings.join('\n')).toMatch(/J3.*pin 2/);
  });
});

describe('auto layout adapter: Arduino Nano', () => {
  const pins: [string, string][] = Array.from({ length: 30 }, (_, i) => ['A1', String(i + 1)]);
  const a = adapt(
    [{ ref: 'A1', value: 'Arduino_Nano_v3.x', footprint: 'Module:Arduino_Nano' }, { ref: 'R1', value: '1k', footprint: R }],
    [
      ...pins.slice(0, 29).map(([r, p], i) => ({ name: `P${i + 1}`, nodes: [[r, p]] as [string, string][] })),
      { name: 'GND', nodes: [['A1', '30'], ['R1', '1'], ['R1', '2']] },
    ]
  );

  it('is placed as a fixed 30-pin module, pins down the strips, either way round', () => {
    expect(placed(a, 'A1')).toMatchObject({ type: 'otherIC' });
    expect(a.definitionHints.A1).toBe('mcu-arduino-nano');
    const fp = custom(a, 'A1')!;
    expect(fp.kind).toBe('module');
    expect(fp.variants).toHaveLength(2);
    const v = fp.variants[0];
    const pin = (n: string) => v.pins.find((p) => p.logical === n)!;
    expect(v.height).toBe(15);
    // 15.24 mm = 6 holes between the rows of pins
    expect(Math.abs(pin('16').x - pin('1').x)).toBe(6);
    // Counter-clockwise: down one side, back up the other
    expect(pin('2').y - pin('1').y).toBe(1);
    expect(pin('16').y).toBe(pin('15').y);
    expect(pin('30').y).toBe(pin('1').y);
    expect(offboard(a, 'A1')).toBeUndefined();
  });
});
