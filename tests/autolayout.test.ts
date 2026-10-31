import { describe, expect, it } from 'vitest';
import { autoLayout } from './autolayout-helpers';

// A small transistor / op-amp booster: input cap, bias divider, op-amp buffer,
// transistor stage, polarized cap, diode, a panel pot (off-board) and a jack.
const BOOSTER = `(export (version "E")
 (components
  (comp (ref "C1") (value "100n") (footprint "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm"))
  (comp (ref "C2") (value "47u") (footprint "Capacitor_THT:CP_Radial_D5.0mm_P2.00mm"))
  (comp (ref "D1") (value "1N4148") (footprint "Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal"))
  (comp (ref "J1") (value "In") (footprint "Connector_Audio:Jack_3.5mm"))
  (comp (ref "Q1") (value "2N3904") (footprint "Package_TO_SOT_THT:TO-92_Inline"))
  (comp (ref "R1") (value "1M") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "R2") (value "10k") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "R3") (value "10k") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "R4") (value "4k7") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "R5") (value "10k") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "RV1") (value "100k") (footprint "Potentiometer_THT:Potentiometer_Alpha_RD901F-40-00D_Single_Vertical"))
  (comp (ref "U1") (value "TL072") (footprint "Package_DIP:DIP-8_W7.62mm")))
 (nets
  (net (code "1") (name "IN") (node (ref "J1") (pin "1")) (node (ref "C1") (pin "1")))
  (net (code "2") (name "Net-(C1-Pad2)") (node (ref "C1") (pin "2")) (node (ref "R1") (pin "1")) (node (ref "U1") (pin "3")))
  (net (code "3") (name "VBIAS") (node (ref "R1") (pin "2")) (node (ref "R2") (pin "2")) (node (ref "R3") (pin "1")) (node (ref "C2") (pin "1")) (node (ref "U1") (pin "5")))
  (net (code "4") (name "+9V") (node (ref "R2") (pin "1")) (node (ref "U1") (pin "8")) (node (ref "R5") (pin "2")) (node (ref "D1") (pin "1")))
  (net (code "5") (name "GND") (node (ref "R3") (pin "2")) (node (ref "C2") (pin "2")) (node (ref "U1") (pin "4")) (node (ref "Q1") (pin "1")) (node (ref "J1") (pin "2")) (node (ref "RV1") (pin "1")) (node (ref "D1") (pin "2")))
  (net (code "6") (name "BUF") (node (ref "U1") (pin "1")) (node (ref "U1") (pin "2")) (node (ref "R4") (pin "1")))
  (net (code "7") (name "Net-(Q1-B)") (node (ref "R4") (pin "2")) (node (ref "Q1") (pin "2")))
  (net (code "8") (name "COLL") (node (ref "Q1") (pin "3")) (node (ref "R5") (pin "1")) (node (ref "RV1") (pin "3")))
  (net (code "9") (name "OUT") (node (ref "RV1") (pin "2")))))`;

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

// A header, a board trimmer and a net tie around a small RC stage
const HEADER_AND_TRIMMER = `(export (version "E")
 (components
  (comp (ref "C1") (value "100n") (footprint "Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm"))
  (comp (ref "J1") (value "Power and signal") (footprint "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical"))
  (comp (ref "NT1") (value "NetTie_2") (footprint "NetTie:NetTie-2_SMD_Pad2.0mm"))
  (comp (ref "R1") (value "10k") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "R2") (value "4k7") (footprint "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P7.62mm_Horizontal"))
  (comp (ref "RV1") (value "10k") (footprint "Potentiometer_THT:Potentiometer_Vishay_T93YA_Vertical")))
 (nets
  (net (code "1") (name "+9V") (node (ref "J1") (pin "1")) (node (ref "R1") (pin "1")))
  (net (code "2") (name "GND") (node (ref "J1") (pin "2")) (node (ref "RV1") (pin "3")) (node (ref "C1") (pin "2")) (node (ref "NT1") (pin "1")))
  (net (code "3") (name "IN") (node (ref "J1") (pin "3")) (node (ref "R2") (pin "1")))
  (net (code "4") (name "OUT") (node (ref "J1") (pin "4")) (node (ref "RV1") (pin "2")) (node (ref "C1") (pin "1")))
  (net (code "5") (name "MID") (node (ref "R1") (pin "2")) (node (ref "RV1") (pin "1")) (node (ref "R2") (pin "2")))
  (net (code "6") (name "AGND") (node (ref "NT1") (pin "2")))))`;

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
