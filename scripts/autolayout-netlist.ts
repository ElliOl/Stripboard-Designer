// Runs Auto layout on a KiCad netlist headlessly and reports time and problems.
// Run: npm run autolayout:netlist -- Digisound-80-VCO_AS3340.net [maxColumns] [maxRows]
import { readFileSync, writeFileSync } from 'fs';
import { autoLayout } from '../tests/autolayout-helpers';

const file = process.argv[2];
const maxColumns = Number(process.argv[3]) || 60;
const maxRows = Number(process.argv[4]) || 40;
const started = Date.now();
let last = '';
const { board, adapted, run, result, problems } = await autoLayout(readFileSync(file, 'utf8'), maxColumns, maxRows, (t) => {
  if (t !== last) console.log(`  ${((Date.now() - started) / 1000).toFixed(1)}s  ${t}`);
  last = t;
});
console.log(`${board.components.length} parts: ${adapted.circuit.components.filter((c) => c.type !== 'terminal').length} on board, ${adapted.offboard.length} off-board, ${adapted.padNotes.length} pads`);
if (!run.ok) {
  console.log(`FAILED after ${((Date.now() - started) / 1000).toFixed(1)}s: ${run.error}`);
  process.exitCode = 1;
} else {
  if (process.env.DUMP_VERO) writeFileSync(process.env.DUMP_VERO, JSON.stringify(run.project));
  const p = result!.project;
  console.log(`Board ${p.board.cols} x ${p.board.rows}, ${p.wires.length} links, ${p.components.length} parts incl. pads, ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`engine reports: ${run.shorts} short(s), ${run.disconnectedNets} disconnected net(s)`);
  console.log(problems.length ? problems.join('\n') : 'OK: no split nets, shorts or open connections');
  for (const w of result!.warnings) console.log(`warning: ${w}`);
  process.exitCode = problems.length ? 1 : 0;
}
