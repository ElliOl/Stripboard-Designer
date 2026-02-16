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

/**
 * Normalize a string for fuzzy matching:
 * - lowercase
 * - remove version numbers (v1, v2, v3.x, etc.)
 * - remove underscores, hyphens
 * - remove common suffixes like "module", "board", etc.
 */
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_-]/g, ' ')  // replace with space first to preserve word boundaries
    .replace(/\bv\d+(\.[0-9x]+)*/g, '') // remove version like v3, v3.x, v3.0, v3.2.1
    .replace(/\b(module|board|breakout)\b/g, '')
    .replace(/\s+/g, '')  // then remove all spaces
    .trim();
}

/**
 * Check if a normalized string contains all words from a target pattern.
 * Example: "arduinonano" contains ["arduino", "nano"]
 */
function fuzzyContains(normalized: string, words: string[]): boolean {
  return words.every(word => normalized.includes(word));
}

export function mapFootprintToDefinition(
  footprint: string,
  ref: string,
  value?: string
): string | null {
  const fp = footprint.toLowerCase();
  const fpNorm = normalizeForMatching(footprint);
  const valNorm = value ? normalizeForMatching(value) : '';

  // ── MCU / Development Boards (check first for specific matches) ──
  // Check both footprint and value fields for better matching
  const combinedNorm = fpNorm + ' ' + valNorm;
  
  if (fuzzyContains(combinedNorm, ['arduino', 'nano'])) return 'mcu-arduino-nano';
  if (fuzzyContains(combinedNorm, ['daisy', 'seed'])) return 'mcu-daisy-seed';
  if (fuzzyContains(combinedNorm, ['bluepill']) || fuzzyContains(combinedNorm, ['blue', 'pill'])) return 'mcu-bluepill';
  if (fuzzyContains(combinedNorm, ['seeed', 'xiao']) || fuzzyContains(combinedNorm, ['xiao'])) return 'mcu-seeed-xiao';

  // DIP packages - match various formats like DIP-8, DIP_8, DIP-8_W7.62mm, Package_DIP:DIP-8, etc.
  if (/dip[-_]?8(?:\D|$)/.test(fp)) return 'dip-8';
  if (/dip[-_]?14(?:\D|$)/.test(fp)) return 'dip-14';
  if (/dip[-_]?16(?:\D|$)/.test(fp)) return 'dip-16';

  // TO-220 packages (regulators, power MOSFETs)
  if (fp.includes('to-220') || fp.includes('to_220')) return 'regulator-to220';

  // TO-92 packages (transistors, JFETs, small MOSFETs)
  if (fp.includes('to-92') || fp.includes('to_92') || fp.includes('sot-23'))
    return 'transistor-npn';

  // Potentiometers / trimmers
  if (fp.includes('trimmer') || fp.includes('trimpot'))
    return 'trimpot';
  if (fp.includes('potentiometer') || fp.includes('pot_'))
    return 'potentiometer';

  // Inductors
  if (fp.includes('inductor') || fp.includes('choke'))
    return 'inductor';

  // Resistors
  if (fp.includes('r_axial') || fp.includes('resistor')) {
    if (/p10|p7|10\.16|7\.62/.test(fp)) return 'resistor';
    return 'resistor-small';
  }

  // Electrolytic / polarized capacitors
  if (fp.includes('cp_radial') || fp.includes('electrolytic')) {
    if (/p7|8mm|10mm/.test(fp)) return 'electrolytic-large';
    return 'electrolytic-small';
  }

  // Non-polarized capacitors (film, ceramic, disc)
  if (
    fp.includes('c_disc') ||
    fp.includes('c_rect') ||
    fp.includes('c_radial') ||
    fp.includes('capacitor')
  ) {
    if (/cp_|polariz/.test(fp)) {
      if (/p7|8mm|10mm/.test(fp)) return 'electrolytic-large';
      return 'electrolytic-small';
    }
    return 'capacitor-rect';
  }

  // Diodes
  if (fp.includes('zener')) return 'zener-diode';
  if (fp.includes('d_do') || fp.includes('d_a-') || fp.includes('diode'))
    return 'diode';

  // LEDs
  if (fp.includes('led_rgb') || fp.includes('rgb')) return 'led-rgb';
  if (fp.includes('led')) return 'led';

  // Switches / buttons
  if (fp.includes('tact') || fp.includes('push_button'))
    return 'button-tact';
  if (fp.includes('switch') || fp.includes('toggle'))
    return 'switch-spdt';

  // Pin headers
  if (fp.includes('pinheader') || fp.includes('pin_header')) {
    if (/1x0?4/.test(fp)) return 'header-1x4';
    return 'header-1x2';
  }

  // Connector fallback
  if (fp.includes('connector') || fp.includes('terminal')) return 'header-1x2';

  // Encoder
  if (fp.includes('encoder') || fp.includes('rotary')) return 'encoder';

  // Fallback on reference designator prefix
  const prefix = ref.replace(/[0-9]/g, '').toUpperCase();
  switch (prefix) {
    case 'R':
      return 'resistor';
    case 'RV':
      return 'trimpot';
    case 'C':
      return 'electrolytic-small';
    case 'U':
      return 'dip-8';
    case 'D':
      return 'diode';
    case 'Q':
      return 'transistor-npn';
    case 'L':
      return 'inductor';
    case 'J':
    case 'P':
      return 'header-1x2';
    case 'SW':
      return 'switch-spdt';
    default:
      return null; // genuinely unsupported
  }
}
