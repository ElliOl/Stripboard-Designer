import { useStripboardStore } from '@/store/stripboard';
import library from '@/data/library.json';
import { parseKiCadNetlist } from '@/lib/netlist-parser';
import { analyzeConnectivity } from '@/lib/connectivity';
import { calculateRatsNest } from '@/lib/ratsnest';
import { adaptBoardToVero } from '@/lib/autolayout/adapter';
import { runVeroEngine } from '@/lib/autolayout/run-engine';
import { layoutToBoard } from '@/lib/autolayout/to-board';
import type { ComponentDefinition, PCB } from '@/lib/types';

export const lib = library as ComponentDefinition[];

/** Import a netlist through the store, as the app does, and return the resulting board */
export function boardFromNetlist(text: string) {
  const S = () => useStripboardStore.getState();
  S().reset();
  S().loadComponentDefinitions(lib);
  S().importNetlist(parseKiCadNetlist(text));
  return { components: S().components, nets: S().nets, definitions: S().componentDefinitions };
}

/** Run the whole auto layout pipeline and check the result with the app's own analysis */
export async function autoLayout(
  text: string,
  maxColumns = 40,
  maxRows = 24,
  onProgress?: (text: string) => void
) {
  const board = boardFromNetlist(text);
  const adapted = adaptBoardToVero(board.components, board.nets, board.definitions);
  const run = await runVeroEngine(adapted.circuit, { maxColumns, maxRows }, onProgress);
  if (!run.ok) return { board, adapted, run, result: null, problems: [`engine: ${run.error}`] };
  const result = layoutToBoard(run.project, adapted, board.nets, board.definitions);
  const { project } = result;
  const pcbs: PCB[] = [
    { id: 'main-pcb', name: 'Main PCB', rows: project.board.rows, cols: project.board.cols, position: { row: 0, col: 0 }, isMain: true },
  ];
  const problems: string[] = [];
  const analysis = analyzeConnectivity(project.components, project.strips, project.wires, project.nets, pcbs);
  const name = new Map(project.nets.map((n) => [n.id, n.name]));
  for (const [netId, groups] of analysis.connectedGroups) {
    if (groups.length > 1) problems.push(`split ${name.get(netId)}`);
  }
  for (const c of calculateRatsNest(project.components, project.strips, project.wires, project.nets, pcbs)) {
    problems.push(`open ${name.get(c.netId)}`);
  }
  for (const k of analysis.segmentErrors) problems.push(`short segment ${k}`);
  for (const k of analysis.wireErrors) problems.push(`short link ${k}`);
  // Every original pin keeps its net
  for (const orig of board.components) {
    const placed = project.components.find((c) => c.id === orig.id);
    if (!placed) continue;
    for (const pin of orig.pins) {
      const now = placed.pins.find((p) => p.number === pin.number);
      if (pin.netId && now?.netId !== pin.netId) problems.push(`pin ${orig.reference}.${pin.number} net changed`);
    }
  }
  return { board, adapted, run, result, problems };
}

// A small transistor / op-amp booster: input cap, bias divider, op-amp buffer,
// transistor stage, polarized cap, diode, a panel pot (off-board) and a jack.
export const BOOSTER = `(export (version "E")
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

// A header, a board trimmer and a net tie around a small RC stage
export const HEADER_AND_TRIMMER = `(export (version "E")
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

