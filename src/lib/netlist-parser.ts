// ─── KiCad Netlist S-Expression Parser ──────────────────────
//
// Parses the S-expression (.net) format exported by KiCad's
// schematic editor.  The format looks like:
//
//   (export (version "E")
//     (components
//       (comp (ref "R1") (value "10k")
//         (footprint "Resistor_THT:R_Axial_...")) ...)
//     (nets
//       (net (code "1") (name "VCC")
//         (node (ref "U1") (pin "8"))
//         (node (ref "R1") (pin "1"))) ...))

// ─── Types ──────────────────────────────────────────────────

type SExpr = string | SExpr[];

export interface ParsedComponent {
  ref: string;
  value: string;
  footprint: string;
}

export interface ParsedNetNode {
  ref: string;
  pin: string;
}

export interface ParsedNet {
  code: string;
  name: string;
  nodes: ParsedNetNode[];
}

export interface ParsedNetlist {
  components: ParsedComponent[];
  nets: ParsedNet[];
}

// ─── Tokenizer ──────────────────────────────────────────────

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(' || ch === ')') {
      tokens.push(ch);
      i++;
      continue;
    }

    // Quoted string
    if (ch === '"') {
      let str = '';
      i++; // skip opening quote
      while (i < len && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < len) {
          i++;
          str += input[i];
        } else {
          str += input[i];
        }
        i++;
      }
      i++; // skip closing quote
      tokens.push(str);
      continue;
    }

    // Unquoted atom
    let atom = '';
    while (i < len && !/[\s()"']/.test(input[i])) {
      atom += input[i];
      i++;
    }
    if (atom) tokens.push(atom);
  }

  return tokens;
}

// ─── Recursive Descent Parser ───────────────────────────────

function parseSExprTokens(tokens: string[], pos: { i: number }): SExpr {
  if (pos.i >= tokens.length) throw new Error('Unexpected end of input');

  if (tokens[pos.i] === '(') {
    pos.i++; // skip '('
    const list: SExpr[] = [];
    while (pos.i < tokens.length && tokens[pos.i] !== ')') {
      list.push(parseSExprTokens(tokens, pos));
    }
    if (tokens[pos.i] !== ')') throw new Error('Missing closing parenthesis');
    pos.i++; // skip ')'
    return list;
  }

  if (tokens[pos.i] === ')') {
    throw new Error('Unexpected closing parenthesis');
  }

  return tokens[pos.i++]; // atom
}

function parseSExpr(input: string): SExpr {
  const tokens = tokenize(input);
  const pos = { i: 0 };
  return parseSExprTokens(tokens, pos);
}

// ─── Helpers ────────────────────────────────────────────────

function findChild(list: SExpr[], name: string): SExpr[] | null {
  for (const item of list) {
    if (Array.isArray(item) && item[0] === name) return item;
  }
  return null;
}

function findAllChildren(list: SExpr[], name: string): SExpr[][] {
  return list.filter(
    (item): item is SExpr[] => Array.isArray(item) && item[0] === name
  );
}

function getStringValue(list: SExpr[], name: string): string {
  const child = findChild(list, name);
  if (child && child.length > 1 && typeof child[1] === 'string') {
    return child[1];
  }
  return '';
}

// ─── Public API ─────────────────────────────────────────────

export function parseKiCadNetlist(input: string): ParsedNetlist {
  const tree = parseSExpr(input);

  if (!Array.isArray(tree) || tree[0] !== 'export') {
    throw new Error(
      'Invalid KiCad netlist: expected top-level (export ...) form'
    );
  }

  const components: ParsedComponent[] = [];
  const nets: ParsedNet[] = [];

  // ── Components ──
  const compsSection = findChild(tree, 'components');
  if (compsSection) {
    for (const comp of findAllChildren(compsSection, 'comp')) {
      components.push({
        ref: getStringValue(comp, 'ref'),
        value: getStringValue(comp, 'value'),
        footprint: getStringValue(comp, 'footprint'),
      });
    }
  }

  // ── Nets ──
  const netsSection = findChild(tree, 'nets');
  if (netsSection) {
    for (const net of findAllChildren(netsSection, 'net')) {
      const code = getStringValue(net, 'code');
      const name = getStringValue(net, 'name');
      const nodes = findAllChildren(net, 'node').map((node) => ({
        ref: getStringValue(node, 'ref'),
        pin: getStringValue(node, 'pin'),
      }));

      // Skip empty / unconnected nets
      if (nodes.length > 0) {
        nets.push({ code, name, nodes });
      }
    }
  }

  return { components, nets };
}

// ─── Virtual / Power Symbol Detection ───────────────────────
//
// KiCad power symbols (e.g. +12V, GND) appear in the component
// list with refs like #PWR01, #FLG01.  They are virtual — no
// physical part to place — but their nets are still meaningful.

export function isVirtualRef(ref: string): boolean {
  return ref.startsWith('#');
}

// ─── Footprint Mapping ──────────────────────────────────────
//
// Heuristically maps a KiCad footprint string to one of our
// built-in component definitions.  Returns `null` when the
// footprint / ref cannot be confidently mapped.

export function mapFootprintToDefinition(
  footprint: string,
  ref: string
): string | null {
  const fp = footprint.toLowerCase();

  // DIP packages
  if (/dip[-_]?8\b/.test(fp)) return 'dip-8';
  if (/dip[-_]?14\b/.test(fp)) return 'dip-14';
  if (/dip[-_]?16\b/.test(fp)) return 'dip-16';

  // Potentiometers / trimmers
  if (
    fp.includes('potentiometer') ||
    fp.includes('trimmer') ||
    fp.includes('pot_')
  )
    return 'potentiometer';

  // Resistors
  if (fp.includes('r_axial') || fp.includes('resistor')) {
    // Wider-spaced variants → standard, else small
    if (/p10|p7|10\.16|7\.62/.test(fp)) return 'resistor';
    return 'resistor-small';
  }

  // Capacitors
  if (
    fp.includes('c_disc') ||
    fp.includes('c_radial') ||
    fp.includes('cp_radial') ||
    fp.includes('capacitor')
  ) {
    if (/p5|p7|5mm|7\.5/.test(fp)) return 'capacitor-wide';
    return 'capacitor';
  }

  // LEDs
  if (fp.includes('led')) return 'led';

  // Transistors
  if (fp.includes('to-92') || fp.includes('to_92') || fp.includes('sot-23'))
    return 'transistor';

  // Pin headers
  if (fp.includes('pinheader') || fp.includes('pin_header')) {
    if (/1x0?4/.test(fp)) return 'header-1x4';
    return 'header-1x2';
  }

  // Connector fallback
  if (fp.includes('connector') || fp.includes('terminal')) return 'header-1x2';

  // Fallback on reference designator prefix
  const prefix = ref.replace(/[0-9]/g, '').toUpperCase();
  switch (prefix) {
    case 'R':
      return 'resistor';
    case 'RV':
      return 'potentiometer';
    case 'C':
      return 'capacitor';
    case 'U':
      return 'dip-8';
    case 'D':
      return 'led';
    case 'Q':
      return 'transistor';
    case 'J':
    case 'P':
      return 'header-1x2';
    default:
      return null; // genuinely unsupported
  }
}
