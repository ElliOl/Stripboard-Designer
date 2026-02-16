// ─── Resistor Value → Color Band Conversion ─────────────────
//
// Converts resistance value strings (e.g. "10k", "4.7k", "100R")
// into an array of color hex strings for rendering 5-band (1%)
// resistor color codes.

const DIGIT_COLORS: Record<number, string> = {
  0: '#000000', // Black
  1: '#8B4513', // Brown
  2: '#FF0000', // Red
  3: '#FF8C00', // Orange
  4: '#FFD700', // Yellow
  5: '#228B22', // Green
  6: '#0000FF', // Blue
  7: '#8B00FF', // Violet
  8: '#808080', // Grey
  9: '#FFFFFF', // White
};

const MULTIPLIER_COLORS: Record<number, string> = {
  '-2': '#C0C0C0', // Silver (×0.01)
  '-1': '#CFB53B', // Gold (×0.1)
  '0': '#000000',  // Black (×1)
  '1': '#8B4513',  // Brown (×10)
  '2': '#FF0000',  // Red (×100)
  '3': '#FF8C00',  // Orange (×1k)
  '4': '#FFD700',  // Yellow (×10k)
  '5': '#228B22',  // Green (×100k)
  '6': '#0000FF',  // Blue (×1M)
  '7': '#8B00FF',  // Violet (×10M)
};

const TOLERANCE_1PCT = '#8B4513'; // Brown = 1%

/**
 * Parse a resistance value string into ohms.
 * Supports formats: "10k", "4.7k", "1M", "100", "47R", "4R7", "2.2M", "0.1"
 */
export function parseResistanceValue(val: string): number | null {
  if (!val) return null;
  const s = val.trim().toUpperCase();

  // Handle "4R7" style (R as decimal point)
  const rDecimal = s.match(/^(\d+)R(\d+)$/);
  if (rDecimal) {
    return parseFloat(`${rDecimal[1]}.${rDecimal[2]}`);
  }

  // Handle "47R" (R = ohms suffix)
  const rSuffix = s.match(/^([\d.]+)R$/);
  if (rSuffix) {
    return parseFloat(rSuffix[1]);
  }

  // Handle multiplier suffixes
  const suffixMatch = s.match(/^([\d.]+)\s*([KMGR]?)$/);
  if (!suffixMatch) return null;

  const num = parseFloat(suffixMatch[1]);
  if (isNaN(num) || num <= 0) return null;

  const suffix = suffixMatch[2];
  switch (suffix) {
    case 'K': return num * 1e3;
    case 'M': return num * 1e6;
    case 'G': return num * 1e9;
    default: return num;
  }
}

/**
 * Convert an ohm value to 5-band (1%) color code.
 * Returns array of 5 hex color strings, or null if value can't be represented.
 */
export function resistorValueToBands(value: string | undefined): string[] | null {
  if (!value) return null;

  const ohms = parseResistanceValue(value);
  if (ohms === null || ohms <= 0) return null;

  // Normalize to 3 significant digits
  // e.g. 4700 → significand 470, exponent 1 (×10)
  // e.g. 100  → significand 100, exponent 0 (×1)
  // e.g. 4.7  → significand 470, exponent -2 (×0.01)
  let significand = ohms;
  let exponent = 0;

  // Scale up to get 3-digit significand (100–999)
  while (significand < 100 && exponent > -2) {
    significand *= 10;
    exponent--;
  }
  // Scale down if too large
  while (significand >= 1000) {
    significand /= 10;
    exponent++;
  }

  // Round to nearest integer
  significand = Math.round(significand);

  // Edge case: rounding pushed us to 1000
  if (significand >= 1000) {
    significand = 100;
    exponent++;
  }

  // Extract 3 digits
  const d1 = Math.floor(significand / 100);
  const d2 = Math.floor((significand % 100) / 10);
  const d3 = significand % 10;

  // Ensure all digits are valid (0–9)
  if (d1 < 0 || d1 > 9 || d2 < 0 || d2 > 9 || d3 < 0 || d3 > 9) return null;

  const band1 = DIGIT_COLORS[d1];
  const band2 = DIGIT_COLORS[d2];
  const band3 = DIGIT_COLORS[d3];
  const band4 = (MULTIPLIER_COLORS as Record<string, string>)[String(exponent)] ?? '#CFB53B';
  const band5 = TOLERANCE_1PCT;

  return [band1, band2, band3, band4, band5];
}

/**
 * Get a single cathode band color for diodes (typically silver/grey).
 */
export function getDiodeBandColor(isZener: boolean): string {
  return isZener ? '#808080' : '#333333'; // Grey for zener, dark for standard
}

/**
 * Default LED colors by name.
 */
export const LED_COLORS: Record<string, { fill: string; glow: string }> = {
  red:    { fill: '#dc2626', glow: '#ff6666' },
  green:  { fill: '#16a34a', glow: '#66ff88' },
  blue:   { fill: '#2563eb', glow: '#6699ff' },
  yellow: { fill: '#eab308', glow: '#ffee66' },
  white:  { fill: '#d4d4d8', glow: '#ffffff' },
  orange: { fill: '#ea580c', glow: '#ff9966' },
};

/**
 * Resolve an LED color string to fill + glow hex values.
 * Accepts named colors or raw hex.
 */
export function resolveLedColor(color?: string): { fill: string; glow: string } {
  if (!color) return LED_COLORS.red;
  const named = LED_COLORS[color.toLowerCase()];
  if (named) return named;
  // Treat as raw hex
  return { fill: color, glow: color };
}
