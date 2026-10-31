// Extracts Vero Designer's Compact (x+y) autorouter into a standalone module.
// Run: npm run extract:vero -- ../VeroDesigner/index.html
//
// Vero Designer is a single-file app whose code lives in one IIFE. This script
// parses it with acorn, follows the dependencies of the router entry points
// through the IIFE's top-level declarations, and writes the result as a
// factory `createVeroEngine(env)` with the declarations copied verbatim.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/extract-vero-engine.mjs <path to VeroDesigner/index.html>');
  process.exit(1);
}
const outFile = resolve(dirname(fileURLToPath(import.meta.url)), '../src/lib/autolayout/vero-engine.generated.js');

// Entry points of the extracted engine
const ROOTS = [
  'buildCompactXYLayout',
  'deriveNets',
  'attachStableNetIdentities',
  'detachGeneratedLayoutFromSchematic',
  'refreshManualLayoutConnectivity',
  'validateManualVeroLayout',
  'serializeVeroLayoutForProject',
  'transistorLeadOrder',
  'GENERIC_IC_PIN_COUNTS',
  'componentDef',
  'normalizeComponentRecord',
  'canonicalGenericIcPinCount',
  'uid',
  'SCHEMATIC_WIDTH',
];
// Supplied by the factory's `env` or stubbed instead of copied
const STOPS = ['els', 'state', 'renderVero', 'yieldToBrowser', 'updateVeroEditUi'];

// ── Parse ──
const html = readFileSync(input, 'utf8');
const start = html.indexOf('<script>') + '<script>'.length;
const end = html.lastIndexOf('</script>');
const src = html.slice(start, end);
const ast = acorn.parse(src, { ecmaVersion: 2022 });
const iife = ast.body[0]?.expression?.callee?.body?.body;
if (!iife) throw new Error('Expected the application code to be a single IIFE');

// Visit every Identifier that is a real reference (not a plain property name or key)
function walk(node, cb, parent = null, key = null) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'Identifier') {
    if (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed) return;
    if (parent?.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand) return;
    if ((parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') && key === 'key' && !parent.computed) return;
    cb(node);
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => walk(c, cb, node, k));
    else if (v && typeof v.type === 'string') walk(v, cb, node, k);
  }
}

const decls = new Map(); // name -> top-level statement
for (const stmt of iife) {
  const names = [];
  if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration') names.push(stmt.id.name);
  else if (stmt.type === 'VariableDeclaration') {
    for (const d of stmt.declarations) walk(d.id, (n) => names.push(n.name));
  }
  for (const n of names) decls.set(n, stmt);
}

// ── Closure ──
const refsOf = new Map();
function refs(stmt) {
  if (!refsOf.has(stmt)) {
    const set = new Set();
    walk(stmt, (n) => { if (decls.has(n.name)) set.add(n.name); });
    refsOf.set(stmt, set);
  }
  return refsOf.get(stmt);
}
const stops = new Set(STOPS);
const seen = new Set();
const picked = new Set();
const queue = [...ROOTS];
for (const root of ROOTS) if (!decls.has(root)) throw new Error(`Missing declaration: ${root}`);
while (queue.length) {
  const name = queue.pop();
  if (seen.has(name) || stops.has(name)) continue;
  seen.add(name);
  const stmt = decls.get(name);
  if (!stmt) continue;
  picked.add(stmt);
  for (const r of refs(stmt)) queue.push(r);
}
const ordered = [...picked].sort((a, b) => a.start - b.start);
const body = ordered.map((s) => src.slice(s.start, s.end)).join('\n\n');

// ── Emit ──
const exported = [...new Set(ROOTS)];
const output = `/* eslint-disable */
// GENERATED FILE - do not edit.
//
// Vero Designer's Compact (x+y) autorouter, extracted from
//   ${input.split('/').slice(-3).join('/')}
// Vero Designer is by blazethablunt (https://github.com/blazethablunt/VeroDesigner),
// used here with the author's permission. The declarations below are copied
// verbatim from Vero Designer; only the wrapper around them is new.
//
// To update, run: npm run extract:vero -- ../VeroDesigner/index.html

export function createVeroEngine(env) {
  const state = env.state;
  const els = env.els;
  const yieldToBrowser = env.yieldToBrowser;
  const updateVeroEditUi = () => {};

${body}

  return { ${exported.join(', ')} };
}
`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, output);
console.log(`Wrote ${outFile}: ${picked.size} declarations, ${output.split('\n').length} lines`);
