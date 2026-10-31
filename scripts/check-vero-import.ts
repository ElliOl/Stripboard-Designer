// Converts a Vero Designer project and reports electrical problems using
// the app's own connectivity analysis.
// Run: npm run check:vero -- fixtures/vero-booster.json
import { readFileSync } from 'fs';
import { convertVeroProject, isVeroProject } from '../src/lib/vero-import';
import { analyzeConnectivity } from '../src/lib/connectivity';
import { calculateRatsNest } from '../src/lib/ratsnest';
import type { ComponentDefinition, PCB } from '../src/lib/types';
import library from '../src/data/library.json';

const file = process.argv[2];
const data = JSON.parse(readFileSync(file, 'utf8'));
if (!isVeroProject(data)) throw new Error(`${file} is not a Vero Designer project`);
const { project } = convertVeroProject(data, library as ComponentDefinition[]);
const pcbs: PCB[] = [{ id: 'main-pcb', name: 'Main PCB', rows: project.board.rows, cols: project.board.cols, position: { row: 0, col: 0 }, isMain: true }];
const result = analyzeConnectivity(project.components, project.strips, project.wires, project.nets, pcbs);

const netName = new Map(project.nets.map((n) => [n.id, n.name]));
let problems = 0;
for (const [netId, groups] of result.connectedGroups) {
  if (groups.length > 1) {
    problems++;
    const pins = project.components.flatMap((c) =>
      c.pins.filter((p) => p.netId === netId).map((p) => `${c.reference}.${p.number}@${p.position.col},${p.position.row}`));
    console.log(`SPLIT  ${netName.get(netId)}: ${groups.length} islands  [${pins.join(' ')}]`);
  }
}
for (const conn of calculateRatsNest(project.components, project.strips, project.wires, project.nets, pcbs)) {
  problems++;
  console.log(`OPEN   ${netName.get(conn.netId)}: ${conn.from.col},${conn.from.row} -> ${conn.to.col},${conn.to.row}`);
}
for (const key of result.segmentErrors) { problems++; console.log(`SHORT  strip segment ${key}`); }
for (const id of result.wireErrors) { problems++; console.log(`SHORT  link ${id}`); }
for (const net of project.nets) {
  const pins = project.components.flatMap((c) => c.pins.filter((p) => p.netId === net.id).map((p) => `${c.reference}.${p.number}`));
  if (pins.length < 2) console.log(`NOTE   ${net.name} has ${pins.length} pin(s) on the board [${pins.join(' ')}] (off-board only)`);
}
console.log(`${project.components.length} parts, ${project.nets.length} nets, ${project.wires.length} links -> ${problems ? problems + ' problem(s)' : 'OK'}`);
process.exitCode = problems ? 1 : 0;
