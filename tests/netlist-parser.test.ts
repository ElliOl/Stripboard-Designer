import { describe, expect, it } from 'vitest';
import { parseKiCadNetlist } from '@/lib/netlist-parser';

describe('KiCad netlist parser', () => {
  // A regression here hangs the test run (a synchronous loop cannot be timed out)
  it('does not hang on a stray single quote', () => {
    const parsed = parseKiCadNetlist(`(export (components (comp (ref "R1") (value 10k'))) (nets))`);
    expect(parsed.components[0].value).toBe("10k'");
  });
});

describe('KiCad netlist parser (more)', () => {
  it('handles escaped quotes inside strings', () => {
    const parsed = parseKiCadNetlist(`(export (components (comp (ref "R1") (value "10k \\"hi\\"") (footprint "F"))) (nets))`);
    expect(parsed.components[0].value).toBe('10k "hi"');
  });

  it('parses a small netlist', () => {
    const parsed = parseKiCadNetlist(`(export (version "E")
      (components
        (comp (ref "R1") (value "10k") (footprint "Resistor_THT:R_Axial")))
      (nets
        (net (code "1") (name "VCC")
          (node (ref "R1") (pin "1"))
          (node (ref "R1") (pin "2")))))`);
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0]).toMatchObject({ ref: 'R1', value: '10k', footprint: 'Resistor_THT:R_Axial' });
    expect(parsed.nets[0].name).toBe('VCC');
    expect(parsed.nets[0].nodes).toEqual([{ ref: 'R1', pin: '1' }, { ref: 'R1', pin: '2' }]);
  });
});
