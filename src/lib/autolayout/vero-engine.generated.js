/* eslint-disable */
// GENERATED FILE - do not edit.
//
// Vero Designer's Compact (x+y) autorouter, extracted from
//   ../VeroDesigner/index.html
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

const GRID = 20;

const SCHEMATIC_WIDTH = 5000;

const TYPE_DEFS = {
        resistor: {
          name: "Resistor",
          prefix: "R",
          defaultValue: "10kΩ",
          bounds: { x: -62, y: -30, width: 124, height: 60 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -50, labelY: 15 },
            { name: "2", x: 60, y: 0, labelX: 50, labelY: 15 }
          ]
        },
        potentiometer: {
          name: "Variable resistor / potentiometer",
          prefix: "VR",
          defaultValue: "pot",
          defaultResistance: "100k",
          defaultPotType: "pot",
          bounds: { x: -68, y: -62, width: 136, height: 130 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "2", x: 0, y: 60, labelX: 12, labelY: 49 },
            { name: "3", x: 60, y: 0, labelX: 48, labelY: 16 }
          ]
        },
        capacitor: {
          name: "Non-polarized capacitor",
          prefix: "C",
          defaultValue: "100nF",
          bounds: { x: -62, y: -34, width: 124, height: 68 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -48, labelY: 15 },
            { name: "2", x: 60, y: 0, labelX: 48, labelY: 15 }
          ]
        },
        capacitorPolarized: {
          name: "Polarized capacitor",
          prefix: "C",
          defaultValue: "10µF",
          bounds: { x: -62, y: -38, width: 124, height: 76 },
          pins: [
            { name: "+", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "−", x: 60, y: 0, labelX: 48, labelY: 16 }
          ]
        },
        transistor: {
          name: "BJT NPN transistor",
          prefix: "Q",
          defaultValue: "BC547",
          bounds: { x: -48, y: -36, width: 96, height: 94 },
          pins: [
            { name: "B", x: -40, y: 0, labelX: -32, labelY: 11 },
            { name: "C", x: 20, y: -20, labelX: 12, labelY: -14 },
            { name: "E", x: 20, y: 20, labelX: 12, labelY: 28 }
          ]
        },
        tube: {
          name: "Dual-triode vacuum tube, section A",
          prefix: "V",
          defaultValue: "12AX7",
          externalOnly: true,
          hidePinLabels: true,
          bounds: { x: -76, y: -76, width: 152, height: 152 },
          pins: [
            { name: "1", physical: "1", signal: "plate A", x: 0, y: -60 },
            { name: "2", physical: "2", signal: "grid A", x: -60, y: 0 },
            { name: "3", physical: "3", signal: "cathode A", x: -40, y: 40 },
            { name: "4", physical: "4", signal: "heater", x: -20, y: 60 },
            { name: "5", physical: "5", signal: "heater", x: 20, y: 60 },
            { name: "9", physical: "9", signal: "heater centre tap", x: 0, y: 60 }
          ]
        },
        opamp: {
          name: "Op-amp, section A",
          prefix: "U",
          defaultValue: "TL072",
          bounds: { x: -66, y: -66, width: 132, height: 132 },
          pins: [
            { name: "IN−", x: -60, y: -20, labelX: -48, labelY: -9 },
            { name: "IN+", x: -60, y: 20, labelX: -48, labelY: 31 },
            { name: "OUT", x: 60, y: 0, labelX: 48, labelY: 15 },
            { name: "V+", x: 0, y: -60, labelX: 11, labelY: -48 },
            { name: "V−", x: 0, y: 60, labelX: 11, labelY: 49 }
          ]
        },
        diode: {
          name: "Diode",
          prefix: "D",
          defaultValue: "1N4148",
          bounds: { x: -62, y: -34, width: 124, height: 68 },
          pins: [
            { name: "A", x: -60, y: 0, labelX: -49, labelY: 15 },
            { name: "K", x: 60, y: 0, labelX: 49, labelY: 15 }
          ]
        },
        led: {
          name: "Light-emitting diode",
          prefix: "LED",
          defaultValue: "LED",
          bounds: { x: -66, y: -46, width: 132, height: 92 },
          pins: [
            { name: "A", signal: "anode", x: -60, y: 0, labelX: -49, labelY: 15 },
            { name: "K", signal: "cathode", x: 60, y: 0, labelX: 49, labelY: 15 }
          ]
        },
        voltageRegulator: {
          name: "78L05 voltage regulator",
          prefix: "REG",
          defaultValue: "78L05",
          bounds: { x: -66, y: -42, width: 132, height: 108 },
          pins: [
            { name: "I", signal: "pin 3 — input", number: "3", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "G", signal: "pin 2 — ground", number: "2", x: 0, y: 60, labelX: 12, labelY: 49 },
            { name: "O", signal: "pin 1 — output", number: "1", x: 60, y: 0, labelX: 48, labelY: 16 }
          ]
        },
        jumper: {
          name: "Jumper link",
          prefix: "J",
          defaultValue: "Link",
          bounds: { x: -62, y: -42, width: 124, height: 84 },
          pins: [
            { name: "1", x: -60, y: 20, labelX: -48, labelY: 35 },
            { name: "2", x: 60, y: 20, labelX: 48, labelY: 35 }
          ]
        },
        switch: {
          name: "SPST switch",
          prefix: "SW",
          defaultValue: "switch",
          externalOnly: true,
          bounds: { x: -66, y: -42, width: 132, height: 84 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "2", x: 60, y: 0, labelX: 48, labelY: 16 }
          ]
        },
        otherIC: {
          name: "PT2399 reverb / delay IC",
          prefix: "IC",
          defaultValue: "PT2399",
          hidePinLabels: true,
          bounds: { x: -112, y: -104, width: 224, height: 208 },
          pins: [
            { name: "1", signal: "VCC", x: -100, y: -70 },
            { name: "2", signal: "REF", x: -100, y: -50 },
            { name: "3", signal: "AGND", x: -100, y: -30 },
            { name: "4", signal: "DGND", x: -100, y: -10 },
            { name: "5", signal: "CLK_O", x: -100, y: 10 },
            { name: "6", signal: "VCO", x: -100, y: 30 },
            { name: "7", signal: "CC1", x: -100, y: 50 },
            { name: "8", signal: "CC0", x: -100, y: 70 },
            { name: "9", signal: "OP1-OUT", x: 100, y: 70 },
            { name: "10", signal: "OP1-IN", x: 100, y: 50 },
            { name: "11", signal: "OP2-IN", x: 100, y: 30 },
            { name: "12", signal: "OP2-OUT", x: 100, y: 10 },
            { name: "13", signal: "LPF2-IN", x: 100, y: -10 },
            { name: "14", signal: "LPF2-OUT", x: 100, y: -30 },
            { name: "15", signal: "LPF1-OUT", x: 100, y: -50 },
            { name: "16", signal: "LPF1-IN", x: 100, y: -70 }
          ]
        },
        terminal: {
          name: "Net label",
          prefix: "P",
          defaultValue: "NET",
          bounds: { x: -12, y: -28, width: 108, height: 56 },
          pins: [
            { name: "1", x: 0, y: 0, labelX: 12, labelY: 16 }
          ]
        }
      };

const TRANSISTOR_KIND_DEFS = Object.freeze({
        npn: Object.freeze({
          name: "BJT NPN transistor",
          shortName: "NPN",
          defaultValue: "BC547",
          bounds: { x: -48, y: -36, width: 96, height: 94 },
          pins: [
            { name: "B", x: -40, y: 0, labelX: -32, labelY: 11 },
            { name: "C", x: 20, y: -20, labelX: 12, labelY: -14 },
            { name: "E", x: 20, y: 20, labelX: 12, labelY: 28 }
          ]
        }),
        pnp: Object.freeze({
          name: "BJT PNP transistor",
          shortName: "PNP",
          defaultValue: "BC557",
          bounds: { x: -48, y: -36, width: 96, height: 94 },
          pins: [
            { name: "B", x: -40, y: 0, labelX: -32, labelY: 11 },
            { name: "E", x: 20, y: -20, labelX: 12, labelY: -14 },
            { name: "C", x: 20, y: 20, labelX: 12, labelY: 28 }
          ]
        }),
        jfet: Object.freeze({
          name: "jFET transistor",
          shortName: "jFET",
          defaultValue: "J201",
          bounds: { x: -48, y: -36, width: 96, height: 94 },
          pins: [
            { name: "G", x: -40, y: 0, labelX: -32, labelY: 11 },
            { name: "D", x: 20, y: -20, labelX: 12, labelY: -14 },
            { name: "S", x: 20, y: 20, labelX: 12, labelY: 28 }
          ]
        }),
        mosfetn: Object.freeze({
          name: "N-channel MOSFET",
          shortName: "MOSFET N",
          defaultValue: "2N7000",
          bounds: { x: -48, y: -36, width: 96, height: 94 },
          pins: [
            { name: "G", x: -40, y: 0, labelX: -32, labelY: 11 },
            { name: "D", x: 20, y: -20, labelX: 12, labelY: -14 },
            { name: "S", x: 20, y: 20, labelX: 12, labelY: 28 }
          ]
        }),
        mosfetp: Object.freeze({
          name: "P-channel MOSFET",
          shortName: "MOSFET P",
          defaultValue: "BS250",
          bounds: { x: -48, y: -36, width: 96, height: 94 },
          pins: [
            { name: "G", x: -40, y: 0, labelX: -32, labelY: 11 },
            { name: "D", x: 20, y: -20, labelX: 12, labelY: -14 },
            { name: "S", x: 20, y: 20, labelX: 12, labelY: 28 }
          ]
        })
      });

const TUBE_MODEL_OPTIONS = Object.freeze(["12AX7", "12AU7", "12AT7", "12AY7", "E88CC"]);

const TUBE_MODEL_DATA = Object.freeze({
        "12AT7": Object.freeze({ pin9: "heater centre tap", datasheet: "https://www.jj-electronic.com/images/stories/product/preamplifying_tubes/pdf/ecc81.pdf" }),
        "12AY7": Object.freeze({ pin9: "heater centre tap", datasheet: "https://www.jj-electronic.com/images/stories/product/preamplifying_tubes/pdf/12AY7.pdf" }),
        E88CC: Object.freeze({ pin9: "internal shield", heaterVolts: 6.3, datasheet: "https://www.jj-electronic.com/images/stories/product/preamplifying_tubes/pdf/e88cc.pdf" })
      });

const TUBE_SECTION_DEFS = Object.freeze({
        A: Object.freeze({
          ...TYPE_DEFS.tube,
          name: "Dual-triode vacuum tube, section A",
          section: "A"
        }),
        B: Object.freeze({
          name: "Dual-triode vacuum tube, section B",
          prefix: "V",
          defaultValue: "12AX7",
          externalOnly: true,
          hidePinLabels: true,
          section: "B",
          bounds: { x: -76, y: -76, width: 152, height: 152 },
          pins: [
            { name: "6", physical: "6", signal: "plate B", x: 0, y: -60 },
            { name: "7", physical: "7", signal: "grid B", x: -60, y: 0 },
            { name: "8", physical: "8", signal: "cathode B", x: -40, y: 40 }
          ]
        })
      });

const OPAMP_KIND_DEFS = Object.freeze({
        single: Object.freeze({
          name: "Single op-amp",
          defaultValue: "LM741",
          packageLabel: "LM741",
          defaultSection: "A",
          bounds: { x: -66, y: -66, width: 132, height: 132 },
          pins: [
            { name: "IN−", physical: "2", x: -60, y: -20, labelX: -50, labelY: -4 },
            { name: "IN+", physical: "3", x: -60, y: 20, labelX: -50, labelY: 36 },
            { name: "OUT", physical: "6", x: 60, y: 0, labelX: 50, labelY: 16 },
            { name: "V+", physical: "7", x: 0, y: -60, labelX: 20, labelY: -68 },
            { name: "V−", physical: "4", x: 0, y: 60, labelX: 20, labelY: 72 }
          ]
        }),
        doubleA: Object.freeze({
          name: "Dual op-amp, section A", defaultValue: "TL072", packageLabel: "TL072", section: "A",
          bounds: { x: -66, y: -66, width: 132, height: 132 },
          pins: [
            { name: "IN−", physical: "2", x: -60, y: -20, labelX: -48, labelY: -9 },
            { name: "IN+", physical: "3", x: -60, y: 20, labelX: -48, labelY: 31 },
            { name: "OUT", physical: "1", x: 60, y: 0, labelX: 48, labelY: 15 },
            { name: "V+", physical: "8", x: 0, y: -60, labelX: 11, labelY: -48 },
            { name: "V−", physical: "4", x: 0, y: 60, labelX: 11, labelY: 49 }
          ]
        }),
        doubleB: Object.freeze({
          name: "Dual op-amp, section B", defaultValue: "TL072", packageLabel: "TL072", section: "B",
          bounds: { x: -66, y: -48, width: 132, height: 96 },
          pins: [
            { name: "IN−", physical: "6", x: -60, y: -20, labelX: -48, labelY: -9 },
            { name: "IN+", physical: "5", x: -60, y: 20, labelX: -48, labelY: 31 },
            { name: "OUT", physical: "7", x: 60, y: 0, labelX: 48, labelY: 15 }
          ]
        }),
        quadA: Object.freeze({
          name: "Quad op-amp, section A", defaultValue: "LM324", packageLabel: "LM324", section: "A",
          bounds: { x: -66, y: -66, width: 132, height: 132 },
          pins: [
            { name: "IN−", physical: "2", x: -60, y: -20, labelX: -50, labelY: -4 },
            { name: "IN+", physical: "3", x: -60, y: 20, labelX: -50, labelY: 36 },
            { name: "OUT", physical: "1", x: 60, y: 0, labelX: 50, labelY: 16 },
            { name: "V+", physical: "4", x: 0, y: -60, labelX: 20, labelY: -68 },
            { name: "V−", physical: "11", x: 0, y: 60, labelX: 20, labelY: 72 }
          ]
        }),
        quadB: Object.freeze({
          name: "Quad op-amp, section B", defaultValue: "LM324", packageLabel: "LM324", section: "B",
          bounds: { x: -66, y: -48, width: 132, height: 96 },
          pins: [
            { name: "IN−", physical: "6", x: -60, y: -20, labelX: -50, labelY: -4 },
            { name: "IN+", physical: "5", x: -60, y: 20, labelX: -50, labelY: 36 },
            { name: "OUT", physical: "7", x: 60, y: 0, labelX: 50, labelY: 16 }
          ]
        }),
        quadC: Object.freeze({
          name: "Quad op-amp, section C", defaultValue: "LM324", packageLabel: "LM324", section: "C",
          bounds: { x: -66, y: -48, width: 132, height: 96 },
          pins: [
            { name: "IN−", physical: "9", x: -60, y: -20, labelX: -50, labelY: -4 },
            { name: "IN+", physical: "10", x: -60, y: 20, labelX: -50, labelY: 36 },
            { name: "OUT", physical: "8", x: 60, y: 0, labelX: 50, labelY: 16 }
          ]
        }),
        quadD: Object.freeze({
          name: "Quad op-amp, section D", defaultValue: "LM324", packageLabel: "LM324", section: "D",
          bounds: { x: -66, y: -48, width: 132, height: 96 },
          pins: [
            { name: "IN−", physical: "13", x: -60, y: -20, labelX: -50, labelY: -4 },
            { name: "IN+", physical: "12", x: -60, y: 20, labelX: -50, labelY: 36 },
            { name: "OUT", physical: "14", x: 60, y: 0, labelX: 50, labelY: 16 }
          ]
        })
      });

const TRANSISTOR_MODEL_OPTIONS = Object.freeze({
        npn: Object.freeze([
          "BC547", "BC548", "BC549", "BC550", "BC184",
          "2N3904", "2N5088", "2N5089", "MPSA13", "MPSA14", "MPSA18",
          "2N2222", "2N4401", "2N5551", "BC337", "KSC1845"
        ]),
        pnp: Object.freeze(["BC557", "BC558", "BC559", "BC560", "BC327", "2N3906", "2N2907", "2N4403", "2N5401", "KSA992"]),
        jfet: Object.freeze([
          "J201", "J112", "J113", "2N3819", "2N5457", "2N5458", "2N5459", "2N5484",
          "MPF102", "MPF103", "BF245", "2SK30A", "2SK117"
        ]),
        mosfetn: Object.freeze(["2N7000", "BS170"]),
        mosfetp: Object.freeze(["BS250", "ZVP3306A"])
      });

const TRANSISTOR_MODEL_PIN_ORDERS = Object.freeze({
        // Requested TO-92 lead variants; order is left-to-right facing the flat face.
        // KSC1845 / KSA992: onsemi diagrams specify 1=E, 2=C, 3=B.
        // https://www.onsemi.com/pdf/datasheet/ksc1845-d.pdf
        // https://www.onsemi.cn/pdf/datasheet/ksa992-d.pdf
        "2N2222": Object.freeze(["E", "B", "C"]),
        "2N4401": Object.freeze(["E", "B", "C"]),
        "2N5551": Object.freeze(["E", "B", "C"]),
        "BC337": Object.freeze(["C", "B", "E"]),
        "2N2907": Object.freeze(["E", "B", "C"]),
        "2N4403": Object.freeze(["E", "B", "C"]),
        "2N5401": Object.freeze(["E", "B", "C"]),
        "KSC1845": Object.freeze(["E", "C", "B"]),
        "KSA992": Object.freeze(["E", "C", "B"]),
        BC184: Object.freeze(["C", "B", "E"]),
        BC546: Object.freeze(["C", "B", "E"]),
        BC547: Object.freeze(["C", "B", "E"]),
        BC548: Object.freeze(["C", "B", "E"]),
        BC549: Object.freeze(["C", "B", "E"]),
        BC550: Object.freeze(["C", "B", "E"]),
        BC556: Object.freeze(["C", "B", "E"]),
        BC557: Object.freeze(["C", "B", "E"]),
        BC558: Object.freeze(["C", "B", "E"]),
        BC559: Object.freeze(["C", "B", "E"]),
        BC560: Object.freeze(["C", "B", "E"]),
        BC327: Object.freeze(["C", "B", "E"]),
        "2N3904": Object.freeze(["E", "B", "C"]),
        "2N5088": Object.freeze(["E", "B", "C"]),
        "2N5089": Object.freeze(["E", "B", "C"]),
        "2N3906": Object.freeze(["E", "B", "C"]),
        MPSA13: Object.freeze(["E", "B", "C"]),
        MPSA14: Object.freeze(["E", "B", "C"]),
        MPSA18: Object.freeze(["E", "B", "C"]),
        "2N7000": Object.freeze(["S", "G", "D"]),
        BS170: Object.freeze(["D", "G", "S"]),
        BS250: Object.freeze(["D", "G", "S"]),
        ZVP3306A: Object.freeze(["D", "G", "S"]),
        J201: Object.freeze(["D", "S", "G"]),
        J112: Object.freeze(["D", "S", "G"]),
        J113: Object.freeze(["D", "S", "G"]),
        "2N3819": Object.freeze(["S", "G", "D"]),
        "2N5457": Object.freeze(["D", "S", "G"]),
        "2N5458": Object.freeze(["D", "S", "G"]),
        "2N5459": Object.freeze(["D", "S", "G"]),
        "2N5484": Object.freeze(["D", "S", "G"]),
        MPF102: Object.freeze(["D", "S", "G"]),
        MPF103: Object.freeze(["D", "S", "G"]),
        BF245: Object.freeze(["D", "S", "G"]),
        "2SK30A": Object.freeze(["S", "G", "D"]),
        "2SK117": Object.freeze(["D", "G", "S"])
      });

const DIODE_MODEL_OPTIONS = Object.freeze({
        standard: Object.freeze(["1N4148", "1N914", "1N34A", "1N60", "1N4001", "1N4004", "1N4007"]),
        schottky: Object.freeze(["1N5817", "1N5819", "BAT41", "BAT46"]),
        zener: Object.freeze(["1N4733A", "1N4739A", "1N4742A", "1N4744A"])
      });

const OPAMP_MODEL_OPTIONS = Object.freeze({
        single: Object.freeze(["LM741", "NE5534", "TL071", "LM308", "OPA134"]),
        double: Object.freeze(["TL072", "NE5532", "LM833", "JRC4558", "OPA2134", "TL082", "JRC4580", "LM358"]),
        quad: Object.freeze(["LM324", "TL074", "TL064", "TL084"])
      });

const STANDARD_DUAL_OPAMP_PINOUT = Object.freeze({
        1: "OUT A", 2: "IN− A", 3: "IN+ A", 4: "V−",
        5: "IN+ B", 6: "IN− B", 7: "OUT B", 8: "V+"
      });

const STANDARD_QUAD_OPAMP_PINOUT = Object.freeze({
        1: "OUT A", 2: "IN− A", 3: "IN+ A", 4: "V+",
        5: "IN+ B", 6: "IN− B", 7: "OUT B",
        8: "OUT C", 9: "IN− C", 10: "IN+ C", 11: "V−",
        12: "IN+ D", 13: "IN− D", 14: "OUT D"
      });

const OPAMP_MODEL_PINOUTS = Object.freeze({
        LM741: Object.freeze({ kind: "single", package: "DIP8", pins: Object.freeze({ 1: "OFFSET NULL 1", 2: "IN−", 3: "IN+", 4: "V−", 5: "OFFSET NULL 2", 6: "OUT", 7: "V+", 8: "NC" }) }),
        NE5534: Object.freeze({ kind: "single", package: "DIP8", pins: Object.freeze({ 1: "BALANCE", 2: "IN−", 3: "IN+", 4: "V−", 5: "COMP", 6: "OUT", 7: "V+", 8: "COMP / BALANCE" }) }),
        TL071: Object.freeze({ kind: "single", package: "DIP8", pins: Object.freeze({ 1: "OFFSET NULL 1", 2: "IN−", 3: "IN+", 4: "V−", 5: "OFFSET NULL 2", 6: "OUT", 7: "V+", 8: "NC" }) }),
        LM308: Object.freeze({ kind: "single", package: "DIP8", pins: Object.freeze({ 1: "COMP 1", 2: "IN−", 3: "IN+", 4: "V−", 5: "NC", 6: "OUT", 7: "V+", 8: "COMP 2" }) }),
        // Vero Designer intentionally keeps the legacy/common OPA134 offset-trim
        // assignment used by the original Burr-Brown/TI documentation: pins
        // 1 and 8 are offset trim, while pin 5 is NC and is not exposed on
        // the schematic symbol.
        OPA134: Object.freeze({ kind: "single", package: "DIP8", pins: Object.freeze({ 1: "OFFSET TRIM 1", 2: "IN−", 3: "IN+", 4: "V−", 5: "NC", 6: "OUT", 7: "V+", 8: "OFFSET TRIM 2" }) }),
        TL072: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        NE5532: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        LM833: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        JRC4558: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        OPA2134: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        TL082: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        JRC4580: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        LM358: Object.freeze({ kind: "double", package: "DIP8", pins: STANDARD_DUAL_OPAMP_PINOUT }),
        LM324: Object.freeze({ kind: "quad", package: "DIP14", pins: STANDARD_QUAD_OPAMP_PINOUT }),
        TL074: Object.freeze({ kind: "quad", package: "DIP14", pins: STANDARD_QUAD_OPAMP_PINOUT }),
        TL064: Object.freeze({ kind: "quad", package: "DIP14", pins: STANDARD_QUAD_OPAMP_PINOUT }),
        TL084: Object.freeze({ kind: "quad", package: "DIP14", pins: STANDARD_QUAD_OPAMP_PINOUT })
      });

const SINGLE_OPAMP_AUX_PIN_DEFS = Object.freeze({
        // Conventional triangular single-op-amp symbols. Every endpoint stays
        // on the 20 px schematic grid. shortLabel changes only the visible
        // abbreviation; the full pin name remains the stable electrical key.
        LM741: Object.freeze([
          // Conventional LM741 offset-null pins: both auxiliary leads leave
          // the right-hand sloping side of the triangle, one above and one
          // below the output, as commonly shown in pedal schematics.
          Object.freeze({ name: "OFFSET 1", shortLabel: "OS1", signal: "OFFSET NULL 1", physical: "1", x: 80, y: -40, attachX: 0, attachY: -20, bendX: 20, bendY: -40, sideAux: true, labelX: 46, labelY: -44 }),
          Object.freeze({ name: "OFFSET 2", shortLabel: "OS2", signal: "OFFSET NULL 2", physical: "5", x: 80, y: 40, attachX: 0, attachY: 20, bendX: 20, bendY: 40, sideAux: true, labelX: 46, labelY: 48 })
        ]),
        NE5534: Object.freeze([
          Object.freeze({ name: "BALANCE", shortLabel: "BAL", signal: "BALANCE", physical: "1", x: -40, y: -60, labelX: -40, labelY: -92 }),
          Object.freeze({ name: "COMP", shortLabel: "COMP", signal: "COMPENSATION", physical: "5", x: 40, y: 60, labelX: 40, labelY: 94 }),
          Object.freeze({ name: "COMP/BAL", shortLabel: "C/B", signal: "COMPENSATION / BALANCE", physical: "8", x: 40, y: -60, labelX: 40, labelY: -92 })
        ]),
        TL071: Object.freeze([
          // TL071 uses the same conventional side-mounted offset-null
          // presentation as the LM741 for pins 1 and 5.
          Object.freeze({ name: "OFFSET 1", shortLabel: "OS1", signal: "OFFSET N1", physical: "1", x: 80, y: -40, attachX: 0, attachY: -20, bendX: 20, bendY: -40, sideAux: true, labelX: 46, labelY: -44 }),
          Object.freeze({ name: "OFFSET 2", shortLabel: "OS2", signal: "OFFSET N2", physical: "5", x: 80, y: 40, attachX: 0, attachY: 20, bendX: 20, bendY: 40, sideAux: true, labelX: 46, labelY: 48 })
        ]),
        LM308: Object.freeze([
          Object.freeze({ name: "COMP 1", shortLabel: "COMP1", signal: "COMPENSATION 1", physical: "1", x: -40, y: -60, labelX: -40, labelY: -92 }),
          Object.freeze({ name: "COMP 2", shortLabel: "COMP2", signal: "COMPENSATION 2", physical: "8", x: 40, y: -60, labelX: 40, labelY: -92 })
        ]),
        OPA134: Object.freeze([
          // Legacy/common OPA134 offset-trim presentation. Pin 5 is NC and
          // deliberately omitted from the schematic.
          Object.freeze({ name: "OFFSET 1", shortLabel: "OS1", signal: "OFFSET TRIM 1", physical: "1", x: 80, y: -40, attachX: 0, attachY: -20, bendX: 20, bendY: -40, sideAux: true, labelX: 46, labelY: -44 }),
          Object.freeze({ name: "OFFSET 2", shortLabel: "OS2", signal: "OFFSET TRIM 2", physical: "8", x: 80, y: 40, attachX: 0, attachY: 20, bendX: 20, bendY: 40, sideAux: true, labelX: 46, labelY: 48 })
        ])
      });

const SWITCH_KIND_DEFS = Object.freeze({
        spst: Object.freeze({
          name: "SPST switch", shortName: "SPST",
          bounds: { x: -66, y: -42, width: 132, height: 84 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "2", x: 60, y: 0, labelX: 48, labelY: 16 }
          ]
        }),
        spdt: Object.freeze({
          name: "SPDT switch", shortName: "SPDT",
          bounds: { x: -66, y: -48, width: 132, height: 96 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "2", x: 60, y: -20, labelX: 48, labelY: -8 },
            { name: "3", x: 60, y: 20, labelX: 48, labelY: 32 }
          ]
        }),
        sp3t: Object.freeze({
          name: "SP3T switch", shortName: "SP3T",
          bounds: { x: -66, y: -78, width: 132, height: 156 },
          pins: [
            { name: "1", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "2", x: 60, y: -40, labelX: 48, labelY: -28 },
            { name: "3", x: 60, y: 0, labelX: 48, labelY: 12 },
            { name: "4", x: 60, y: 40, labelX: 48, labelY: 52 }
          ]
        }),
        dpst: Object.freeze({
          name: "DPST switch", shortName: "DPST",
          bounds: { x: -66, y: -56, width: 132, height: 112 },
          pins: [
            { name: "1", x: -60, y: -20, labelX: -48, labelY: -8 },
            { name: "2", x: 60, y: -20, labelX: 48, labelY: -8 },
            { name: "3", x: -60, y: 20, labelX: -48, labelY: 32 },
            { name: "4", x: 60, y: 20, labelX: 48, labelY: 32 }
          ]
        }),
        dpdt: Object.freeze({
          name: "DPDT switch", shortName: "DPDT",
          bounds: { x: -66, y: -72, width: 132, height: 144 },
          pins: [
            { name: "1", x: -60, y: -40, labelX: -48, labelY: -28 },
            { name: "2", x: 60, y: -60, labelX: 48, labelY: -48 },
            { name: "3", x: 60, y: -20, labelX: 48, labelY: -8 },
            { name: "4", x: -60, y: 40, labelX: -48, labelY: 52 },
            { name: "5", x: 60, y: 20, labelX: 48, labelY: 32 },
            { name: "6", x: 60, y: 60, labelX: 48, labelY: 72 }
          ]
        }),
        dp3t: Object.freeze({
          name: "DP3T switch", shortName: "DP3T",
          bounds: { x: -66, y: -128, width: 132, height: 256 },
          pins: [
            { name: "1", x: -60, y: -60, labelX: -48, labelY: -44 },
            { name: "2", x: 60, y: -100, labelX: 48, labelY: -88 },
            { name: "3", x: 60, y: -60, labelX: 48, labelY: -48 },
            { name: "4", x: 60, y: -20, labelX: 48, labelY: -8 },
            { name: "5", x: -60, y: 60, labelX: -48, labelY: 76 },
            { name: "6", x: 60, y: 20, labelX: 48, labelY: 32 },
            { name: "7", x: 60, y: 60, labelX: 48, labelY: 72 },
            { name: "8", x: 60, y: 100, labelX: 48, labelY: 112 }
          ]
        }),
        "3pst": Object.freeze({
          name: "3PST switch", shortName: "3PST",
          bounds: { x: -66, y: -76, width: 132, height: 152 },
          pins: [
            { name: "1", x: -60, y: -40, labelX: -48, labelY: -28 },
            { name: "2", x: 60, y: -40, labelX: 48, labelY: -28 },
            { name: "3", x: -60, y: 0, labelX: -48, labelY: 12 },
            { name: "4", x: 60, y: 0, labelX: 48, labelY: 12 },
            { name: "5", x: -60, y: 40, labelX: -48, labelY: 52 },
            { name: "6", x: 60, y: 40, labelX: 48, labelY: 52 }
          ]
        }),
        "3pdt": Object.freeze({
          name: "3PDT switch", shortName: "3PDT",
          bounds: { x: -66, y: -128, width: 132, height: 256 },
          pins: [
            { name: "1", x: -60, y: -80, labelX: -48, labelY: -64 },
            { name: "2", x: 60, y: -100, labelX: 48, labelY: -88 },
            { name: "3", x: 60, y: -60, labelX: 48, labelY: -48 },
            { name: "4", x: -60, y: 0, labelX: -48, labelY: 16 },
            { name: "5", x: 60, y: -20, labelX: 48, labelY: -8 },
            { name: "6", x: 60, y: 20, labelX: 48, labelY: 32 },
            { name: "7", x: -60, y: 80, labelX: -48, labelY: 96 },
            { name: "8", x: 60, y: 60, labelX: 48, labelY: 72 },
            { name: "9", x: 60, y: 100, labelX: 48, labelY: 112 }
          ]
        })
      });

function makeDipIcDefinition(model, name, signals) {
        const pinCount = signals.length;
        const half = pinCount / 2;
        // DIP packages with an even number of pins per side previously landed
        // halfway between schematic-grid lines (for example ±30 on DIP-8 and
        // ±70 on DIP-16). Shift the complete package by half a grid pitch so
        // every physical pin is exactly on a 20 px grid intersection while
        // preserving the correct 20 px pin spacing.
        const packageCenterY = half % 2 === 0 ? GRID / 2 : 0;
        const pins = signals.map((signal, index) => {
          const number = index + 1;
          const left = number <= half;
          const rowIndex = left ? number - 1 : pinCount - number;
          const y = packageCenterY + (rowIndex - (half - 1) / 2) * GRID;
          return { name: String(number), signal, x: left ? -100 : 100, y };
        });
        const bodyHalfHeight = (half - 1) * GRID / 2 + 18;
        const pinout = Object.freeze(Object.fromEntries(signals.map((signal, index) => [String(index + 1), signal])));
        return Object.freeze({
          name,
          prefix: "IC",
          defaultValue: model,
          hidePinLabels: true,
          pinCount,
          package: `DIP${pinCount}`,
          pinout,
          body: { x: -65, y: packageCenterY - bodyHalfHeight, width: 130, height: bodyHalfHeight * 2 },
          bounds: { x: -112, y: packageCenterY - bodyHalfHeight - 16, width: 224, height: bodyHalfHeight * 2 + 32 },
          pins
        });
      }

const GENERIC_IC_PIN_COUNTS = Object.freeze([4, 6, 8, 14, 16, 18, 20]);

const GENERIC_IC_DEFINITION_CACHE = new Map();

function canonicalGenericIcPinCount(value) {
        const requested = Number(value);
        if (GENERIC_IC_PIN_COUNTS.includes(requested)) return requested;
        if (!Number.isFinite(requested)) return 8;
        return GENERIC_IC_PIN_COUNTS.reduce((best, candidate) =>
          Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best, 8);
      }

function makeGenericIcDefinition(pinCountValue) {
        const pinCount = canonicalGenericIcPinCount(pinCountValue);
        if (GENERIC_IC_DEFINITION_CACHE.has(pinCount)) return GENERIC_IC_DEFINITION_CACHE.get(pinCount);
        const half = pinCount / 2;
        const firstPinY = -GRID;
        const pins = Array.from({ length: pinCount }, (_, index) => {
          const number = index + 1;
          const left = number <= half;
          const rowIndex = left ? number - 1 : pinCount - number;
          return Object.freeze({
            name: String(number),
            signal: "",
            x: left ? -100 : 100,
            y: firstPinY + rowIndex * GRID
          });
        });
        const bodyY = -38;
        const finalPinY = firstPinY + (half - 1) * GRID;
        const bodyBottom = finalPinY + 18;
        const bodyHeight = bodyBottom - bodyY;
        const definition = Object.freeze({
          name: `Generic DIP-${pinCount} IC`,
          prefix: "IC",
          defaultValue: "Generic IC",
          hidePinLabels: true,
          generic: true,
          pinCount,
          package: `DIP${pinCount}`,
          pinout: Object.freeze(Object.fromEntries(pins.map(pin => [pin.name, `PIN ${pin.name}`]))),
          body: Object.freeze({ x: -65, y: bodyY, width: 130, height: bodyHeight }),
          bounds: Object.freeze({ x: -112, y: bodyY - 16, width: 224, height: bodyHeight + 32 }),
          resizeBottomY: bodyBottom,
          pins: Object.freeze(pins)
        });
        GENERIC_IC_DEFINITION_CACHE.set(pinCount, definition);
        return definition;
      }

function makeDaisyIcDefinition() {
        const pinCount = 40;
        const half = pinCount / 2;
        // Daisy is a fixed 40-pin module. Its schematic pins use the same
        // consecutive vertical pitch as the existing DIP symbols, but unlike
        // Generic IC it has no resize handle and cannot change package size.
        const packageCenterY = GRID / 2;
        const pins = Array.from({ length: pinCount }, (_, index) => {
          const number = index + 1;
          const left = number <= half;
          const rowIndex = left ? number - 1 : pinCount - number;
          const y = packageCenterY + (rowIndex - (half - 1) / 2) * GRID;
          return Object.freeze({
            name: String(number),
            signal: "",
            x: left ? -100 : 100,
            y
          });
        });
        const bodyHalfHeight = (half - 1) * GRID / 2 + 18;
        return Object.freeze({
          name: "Daisy",
          prefix: "IC",
          defaultValue: "Daisy",
          hidePinLabels: true,
          pinCount,
          package: "DAISY40",
          pinout: Object.freeze(Object.fromEntries(pins.map(pin => [pin.name, `PIN ${pin.name}`]))),
          body: Object.freeze({ x: -65, y: packageCenterY - bodyHalfHeight, width: 130, height: bodyHalfHeight * 2 }),
          bounds: Object.freeze({ x: -112, y: packageCenterY - bodyHalfHeight - 16, width: 224, height: bodyHalfHeight * 2 + 32 }),
          pins: Object.freeze(pins)
        });
      }

const SYNTH_IC_DATA = Object.freeze(Object.fromEntries(Object.entries({
  "CD40106": {
    "manufacturer": "Texas Instruments",
    "device": "CD40106B",
    "function": "hex Schmitt-trigger inverter",
    "package": "DIP14",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "IN A",
      "OUT A",
      "IN B",
      "OUT B",
      "IN C",
      "OUT C",
      "VSS",
      "OUT D",
      "IN D",
      "OUT E",
      "IN E",
      "OUT F",
      "IN F",
      "VDD"
    ],
    "supplyPins": {
      "positive": "14",
      "ground": "7"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd40106b.pdf"
  },
  "CD4066": {
    "manufacturer": "Texas Instruments",
    "device": "CD4066B",
    "function": "quad bilateral analog switch",
    "package": "DIP14",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "A I/O",
      "A O/I",
      "B O/I",
      "B I/O",
      "CTRL B",
      "CTRL C",
      "VSS",
      "C I/O",
      "C O/I",
      "D O/I",
      "D I/O",
      "CTRL D",
      "CTRL A",
      "VDD"
    ],
    "supplyPins": {
      "positive": "14",
      "ground": "7"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4066b.pdf"
  },
  "CD4051": {
    "manufacturer": "Texas Instruments",
    "device": "CD4051B",
    "function": "8-channel analog multiplexer",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "CH4",
      "CH6",
      "COM",
      "CH7",
      "CH5",
      "INH",
      "VEE",
      "VSS",
      "C",
      "B",
      "A",
      "CH3",
      "CH0",
      "CH1",
      "CH2",
      "VDD"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8",
      "negative": "7"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4051b.pdf"
  },
  "CD4046": {
    "manufacturer": "Texas Instruments",
    "device": "CD4046B",
    "function": "phase-locked loop with VCO",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "PH PULSES",
      "PC1 OUT",
      "COMP IN",
      "VCO OUT",
      "INH",
      "C1 A",
      "C1 B",
      "VSS",
      "VCO IN",
      "DEMOD OUT",
      "R1",
      "R2",
      "PC2 OUT",
      "SIG IN",
      "ZENER",
      "VDD"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4046b.pdf"
  },
  "CD4017": {
    "manufacturer": "Texas Instruments",
    "device": "CD4017B",
    "function": "decade counter / divider",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "Q5",
      "Q1",
      "Q0",
      "Q2",
      "Q6",
      "Q7",
      "Q3",
      "VSS",
      "Q8",
      "Q4",
      "Q9",
      "CARRY OUT",
      "CLK INH",
      "CLOCK",
      "RESET",
      "VDD"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4017b.pdf",
    "clockEdge": "rising"
  },
  "CD4093": {
    "manufacturer": "Texas Instruments",
    "device": "CD4093B",
    "function": "quad Schmitt-trigger NAND gate",
    "package": "DIP14",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "1A",
      "1B",
      "1Y",
      "2Y",
      "2A",
      "2B",
      "VSS",
      "3A",
      "3B",
      "3Y",
      "4Y",
      "4A",
      "4B",
      "VDD"
    ],
    "supplyPins": {
      "positive": "14",
      "ground": "7"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4093b.pdf"
  },
  "CD4052": {
    "manufacturer": "Texas Instruments",
    "device": "CD4052B",
    "function": "dual 4-channel analog multiplexer",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "Y0",
      "Y2",
      "Y COM",
      "Y3",
      "Y1",
      "INH",
      "VEE",
      "VSS",
      "B",
      "A",
      "X3",
      "X0",
      "X COM",
      "X1",
      "X2",
      "VDD"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8",
      "negative": "7"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4051b.pdf"
  },
  "CD4053": {
    "manufacturer": "Texas Instruments",
    "device": "CD4053B",
    "function": "triple 2-channel analog multiplexer",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "BY",
      "BX",
      "CY",
      "C COM",
      "CX",
      "INH",
      "VEE",
      "VSS",
      "C",
      "B",
      "A",
      "AX",
      "AY",
      "A COM",
      "B COM",
      "VDD"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8",
      "negative": "7"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4051b.pdf"
  },
  "CD4040": {
    "manufacturer": "Texas Instruments",
    "device": "CD4040B",
    "function": "12-stage binary ripple counter",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "Q12",
      "Q6",
      "Q5",
      "Q7",
      "Q4",
      "Q3",
      "Q2",
      "VSS",
      "Q1",
      "CLOCK",
      "RESET",
      "Q9",
      "Q8",
      "Q10",
      "Q11",
      "VDD"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8"
    },
    "datasheet": "https://www.ti.com/lit/ds/symlink/cd4040b.pdf",
    "clockEdge": "falling"
  },
  "V2164": {
    "manufacturer": "Coolaudio",
    "device": "V2164D",
    "function": "quad voltage-controlled amplifier",
    "package": "DIP16",
    "pinView": "Top view, notch up; pin 1 upper left, counterclockwise numbering",
    "signals": [
      "MODE",
      "IIN1",
      "VC1",
      "IOUT1",
      "IOUT2",
      "VC2",
      "IIN2",
      "GND",
      "V−",
      "IIN3",
      "VC3",
      "IOUT3",
      "IOUT4",
      "VC4",
      "IIN4",
      "V+"
    ],
    "supplyPins": {
      "positive": "16",
      "ground": "8",
      "negative": "9"
    },
    "datasheet": "https://electricdruid.net/wp-content/uploads/2015/07/V2164.pdf",
    "notes": "Pin 1 selects amplifier bias mode. IIN / IOUT are current inputs / outputs; VC controls gain. DIP-16 (V2164D) footprint, not SOIC."
  }
}).map(([model, data]) => [model, Object.freeze({ ...data,
        signals: Object.freeze(data.signals), supplyPins: Object.freeze(data.supplyPins)
      })])));

const OTHER_IC_DEFS = Object.freeze({
        PT2399: makeDipIcDefinition("PT2399", "PT2399 reverb / delay IC", [
          "VCC", "REF", "AGND", "DGND", "CLK_O", "VCO", "CC1", "CC0",
          "OP1-OUT", "OP1-IN", "OP2-IN", "OP2-OUT", "LPF2-IN", "LPF2-OUT", "LPF1-OUT", "LPF1-IN"
        ]),
        NE555: makeDipIcDefinition("NE555", "NE555 timer", [
          "GND", "TRIGGER", "OUTPUT", "RESET", "CONTROL", "THRESHOLD", "DISCHARGE", "VCC"
        ]),
        LM386: makeDipIcDefinition("LM386", "LM386 audio power amplifier", [
          "GAIN", "IN−", "IN+", "GND", "OUTPUT", "VS", "BYPASS", "GAIN"
        ]),
        LM13700: makeDipIcDefinition("LM13700", "LM13700 dual operational transconductance amplifier", [
          "IABC A", "DIODE BIAS A", "IN+ A", "IN− A", "OUT A", "V−", "BUF IN A", "BUF OUT A",
          "BUF OUT B", "BUF IN B", "V+", "OUT B", "IN− B", "IN+ B", "DIODE BIAS B", "IABC B"
        ]),
        LM3914: makeDipIcDefinition("LM3914", "LM3914 linear LED meter", [
          "LED1", "V−", "V+", "RLO", "SIG", "RHI", "REF OUT", "REF ADJ", "MODE",
          "LED10", "LED9", "LED8", "LED7", "LED6", "LED5", "LED4", "LED3", "LED2"
        ]),
        LM3915: makeDipIcDefinition("LM3915", "LM3915 logarithmic LED VU meter", [
          "LED1", "V−", "V+", "RLO", "SIG", "RHI", "REF OUT", "REF ADJ", "MODE",
          "LED10", "LED9", "LED8", "LED7", "LED6", "LED5", "LED4", "LED3", "LED2"
        ]),
        CD40106: makeDipIcDefinition("CD40106", "CD40106 hex Schmitt-trigger inverter", SYNTH_IC_DATA.CD40106.signals),
        CD4066: makeDipIcDefinition("CD4066", "CD4066 quad bilateral analog switch", SYNTH_IC_DATA.CD4066.signals),
        CD4051: makeDipIcDefinition("CD4051", "CD4051 8-channel analog multiplexer", SYNTH_IC_DATA.CD4051.signals),
        CD4046: makeDipIcDefinition("CD4046", "CD4046 phase-locked loop with VCO", SYNTH_IC_DATA.CD4046.signals),
        CD4017: makeDipIcDefinition("CD4017", "CD4017 decade counter / divider", SYNTH_IC_DATA.CD4017.signals),
        CD4093: makeDipIcDefinition("CD4093", "CD4093 quad Schmitt-trigger NAND gate", SYNTH_IC_DATA.CD4093.signals),
        CD4052: makeDipIcDefinition("CD4052", "CD4052 dual 4-channel analog multiplexer", SYNTH_IC_DATA.CD4052.signals),
        CD4053: makeDipIcDefinition("CD4053", "CD4053 triple 2-channel analog multiplexer", SYNTH_IC_DATA.CD4053.signals),
        CD4040: makeDipIcDefinition("CD4040", "CD4040 12-stage binary ripple counter", SYNTH_IC_DATA.CD4040.signals),
        V2164: makeDipIcDefinition("V2164", "V2164 quad voltage-controlled amplifier", SYNTH_IC_DATA.V2164.signals),
        Daisy: makeDaisyIcDefinition(),
        GENERIC: makeGenericIcDefinition(8)
      });

const VOLTAGE_REGULATOR_MODELS = Object.freeze(["78L05", "78L09", "78L12", "78L15"]);

const LED_COLOR_OPTIONS = Object.freeze({
        red: Object.freeze({ label: "Red", fill: "#d9464f", stroke: "#ff9298" }),
        green: Object.freeze({ label: "Green", fill: "#2fbf71", stroke: "#8cf0b6" }),
        blue: Object.freeze({ label: "Blue", fill: "#3b82f6", stroke: "#93c5fd" })
      });

function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

function parseHexColor(value) {
        let candidate = String(value || "").trim().toLowerCase();
        if (/^[0-9a-f]{6}$/.test(candidate)) candidate = `#${candidate}`;
        if (/^#[0-9a-f]{3}$/.test(candidate)) {
          candidate = `#${candidate[1]}${candidate[1]}${candidate[2]}${candidate[2]}${candidate[3]}${candidate[3]}`;
        }
        return /^#[0-9a-f]{6}$/.test(candidate) ? candidate : null;
      }

function uid(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      }

function pinKey(componentId, pinName) {
        return `${componentId}:${pinName}`;
      }

function splitPinKey(key) {
        const index = key.indexOf(":");
        return { componentId: key.slice(0, index), pinName: key.slice(index + 1) };
      }

function normalizeNetLabel(value) {
        return String(value || "NET").trim().replace(/\s+/g, " ").toUpperCase() || "NET";
      }

function canonicalComponentType(value) {
        const raw = String(value || "").trim();
        const key = raw.replace(/[\s_-]+/g, "").toLowerCase();
        if ([
          "capacitorpolarized",
          "polarizedcapacitor",
          "capacitorpolarised",
          "polarisedcapacitor",
          "electrolytic",
          "electrolyticcapacitor",
          "capacitorelectrolytic"
        ].includes(key)) return "capacitorPolarized";
        if ([
          "npn",
          "bjtnpn",
          "npntransistor",
          "pnp",
          "bjtpnp",
          "pnptransistor",
          "jfet",
          "jfettransistor",
          "fet",
          "mosfet",
          "mosfetn",
          "mosfetp",
          "nmos",
          "pmos",
          "nchannelmosfet",
          "pchannelmosfet",
          "mosfetnchannel",
          "mosfetpchannel"
        ].includes(key)) return "transistor";
        if (["pot", "potentiometer", "variableresistor", "variablepot", "variable-resistor"].includes(key)) return "potentiometer";
        if (["tube", "vacuumtube", "valve", "triode", "12ax7", "12au7"].includes(key)) return "tube";
        if (["switch", "spst", "spdt", "dpst", "dpdt"].includes(key)) return "switch";
        if (["led", "lightemittingdiode", "light-emitting-diode"].includes(key)) return "led";
        if (["voltageregulator", "regulator", "78l05", "lm78l05", "l78l05"].includes(key)) return "voltageRegulator";
        if (["otheric", "otherics", "pt2399", "delayic", "reverbic", "daisy"].includes(key)) return "otherIC";
        return raw;
      }

function canonicalTransistorKind(value) {
        const key = String(value || "").trim().replace(/[\s_-]+/g, "").toLowerCase();
        if (["pnp", "bjtpnp", "pnptransistor"].includes(key)) return "pnp";
        if (["jfet", "jfettransistor", "fet"].includes(key)) return "jfet";
        if (["mosfetp", "pmos", "pchannelmosfet", "mosfetpchannel"].includes(key)) return "mosfetp";
        if (["mosfetn", "nmos", "mosfet", "nchannelmosfet", "mosfetnchannel"].includes(key)) return "mosfetn";
        return "npn";
      }

function transistorKindUsesGate(kind) {
        const canonical = canonicalTransistorKind(kind);
        return canonical === "jfet" || canonical === "mosfetn" || canonical === "mosfetp";
      }

function defaultTransistorLeadOrder(kind) {
        const canonical = canonicalTransistorKind(kind);
        if (canonical === "jfet") return ["D", "S", "G"];
        if (canonical === "mosfetn" || canonical === "mosfetp") return ["D", "G", "S"];
        return ["C", "B", "E"];
      }

function transistorKindOf(component) {
        if (!component || canonicalComponentType(component.type) !== "transistor") return "npn";
        return canonicalTransistorKind(component.transistorKind || component.type);
      }

function normalizedPartModel(value) {
        return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
      }

function transistorFamilyData(model) {
        const normalized = normalizedPartModel(model);
        if (!normalized) return null;

        const exactKey = Object.keys(TRANSISTOR_MODEL_PIN_ORDERS)
          .find(key => normalizedPartModel(key) === normalized);
        if (exactKey) {
          const order = [...TRANSISTOR_MODEL_PIN_ORDERS[exactKey]];
          const configuredKind = Object.entries(TRANSISTOR_MODEL_OPTIONS)
            .find(([, models]) => models.some(model => normalizedPartModel(model) === normalizedPartModel(exactKey)))?.[0];
          const kind = configuredKind
            || (order.includes("B")
              ? (["BC556", "BC557", "BC558", "BC559", "BC560", "BC327", "2N3906"].includes(exactKey) ? "pnp" : "npn")
              : "jfet");
          return { kind, order, family: exactKey, recognized: true };
        }

        // Preserve the checked TO-92 mapping for gain, reel and vendor suffixes.
        const addedFamily = normalized.match(/^(2N2222|2N4401|2N5551|BC337|2N2907|2N4403|2N5401|KSC1845|KSA992)[A-Z0-9-]*$/);
        if (addedFamily) {
          const family = addedFamily[1];
          const kind = ["2N2907", "2N4403", "2N5401", "KSA992"].includes(family) ? "pnp" : "npn";
          return { kind, order: [...TRANSISTOR_MODEL_PIN_ORDERS[family]], family, recognized: true };
        }

        // Recognize common suffixes and manufacturer/package suffixes without
        // requiring the exact text to be present in the model drop-down.
        const bcNpn = normalized.match(/^BC(184|546|547|548|549|550)[A-Z0-9-]*$/);
        if (bcNpn) return { kind: "npn", order: ["C", "B", "E"], family: `BC${bcNpn[1]}`, recognized: true };
        const bcPnp = normalized.match(/^BC(327|556|557|558|559|560)[A-Z0-9-]*$/);
        if (bcPnp) return { kind: "pnp", order: ["C", "B", "E"], family: `BC${bcPnp[1]}`, recognized: true };
        if (/^2N3904[A-Z0-9-]*$/.test(normalized)) return { kind: "npn", order: ["E", "B", "C"], family: "2N3904", recognized: true };
        const twoN508x = normalized.match(/^2N508(8|9)[A-Z0-9-]*$/);
        if (twoN508x) return { kind: "npn", order: ["E", "B", "C"], family: `2N508${twoN508x[1]}`, recognized: true };
        if (/^2N3906[A-Z0-9-]*$/.test(normalized)) return { kind: "pnp", order: ["E", "B", "C"], family: "2N3906", recognized: true };
        const mpsa = normalized.match(/^MPSA(13|14|18)[A-Z0-9-]*$/);
        if (mpsa) return { kind: "npn", order: ["E", "B", "C"], family: `MPSA${mpsa[1]}`, recognized: true };
        if (/^2N7000[A-Z0-9-]*$/.test(normalized)) return { kind: "mosfetn", order: ["S", "G", "D"], family: "2N7000", recognized: true };
        if (/^BS170[A-Z0-9-]*$/.test(normalized)) return { kind: "mosfetn", order: ["D", "G", "S"], family: "BS170", recognized: true };
        if (/^BS250[A-Z0-9-]*$/.test(normalized)) return { kind: "mosfetp", order: ["D", "G", "S"], family: "BS250", recognized: true };
        if (/^ZVP3306A[A-Z0-9-]*$/.test(normalized)) return { kind: "mosfetp", order: ["D", "G", "S"], family: "ZVP3306A", recognized: true };
        if (/^J201[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "J201", recognized: true };
        if (/^J112[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "J112", recognized: true };
        if (/^J113[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "J113", recognized: true };
        if (/^2N3819[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["S", "G", "D"], family: "2N3819", recognized: true };
        const jfet = normalized.match(/^2N545(7|8|9)[A-Z0-9-]*$/);
        if (jfet) return { kind: "jfet", order: ["D", "S", "G"], family: `2N545${jfet[1]}`, recognized: true };
        if (/^2N5484[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "2N5484", recognized: true };
        if (/^MPF102[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "MPF102", recognized: true };
        if (/^MPF103[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "MPF103", recognized: true };
        if (/^BF245[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "S", "G"], family: "BF245", recognized: true };
        if (/^2SK30A[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["S", "G", "D"], family: "2SK30A", recognized: true };
        if (/^2SK117[A-Z0-9-]*$/.test(normalized)) return { kind: "jfet", order: ["D", "G", "S"], family: "2SK117", recognized: true };
        return null;
      }

function validTransistorPinout(order, kind) {
        if (!Array.isArray(order) || order.length !== 3) return false;
        const expected = transistorKindUsesGate(kind) ? ["D", "S", "G"] : ["C", "B", "E"];
        return expected.every(pin => order.includes(pin)) && new Set(order).size === 3;
      }

function transistorLeadOrder(component) {
        const kind = transistorKindOf(component);
        if (component?.transistorPinoutCustom === true && validTransistorPinout(component.transistorPinout, kind)) {
          return [...component.transistorPinout];
        }
        const family = transistorFamilyData(component?.value);
        // A recognized model is authoritative. This repairs older projects
        // that saved an incorrect transistorPinout array before model-aware
        // package orientation was introduced.
        if (family && validTransistorPinout(family.order, family.kind)) return [...family.order];
        if (validTransistorPinout(component?.transistorPinout, kind)) return [...component.transistorPinout];
        return defaultTransistorLeadOrder(kind);
      }

function canonicalDiodeKind(value) {
        const key = String(value || "").trim().replace(/[\s_-]+/g, "").toLowerCase();
        if (["schottky", "schottkydiode"].includes(key)) return "schottky";
        if (["zener", "zenerdiode"].includes(key)) return "zener";
        return "standard";
      }

function inferredDiodeKindFromModel(model) {
        const normalized = normalizedPartModel(model);
        if (["1N5817", "1N5818", "1N5819", "BAT41", "BAT46"].includes(normalized)) return "schottky";
        if (/^1N47\d{2}A$/.test(normalized) || /^BZX/i.test(normalized) || /^1N52\d{2}B$/.test(normalized)) return "zener";
        return null;
      }

function canonicalTubeModel(value) {
        const normalized = normalizedPartModel(value);
        return TUBE_MODEL_OPTIONS.find(model => normalizedPartModel(model) === normalized) || TUBE_MODEL_OPTIONS[0];
      }

function tubeSectionOf(component) {
        return String(component?.tubeSection || String(component?.id || "").match(/([AB])$/i)?.[1] || "A").toUpperCase() === "B" ? "B" : "A";
      }

function tubeBaseIdOf(component) {
        return component?.tubeBaseId || String(component?.id || "").replace(/[AB]$/i, "");
      }

function tubeDefinitionFor(component) {
        const section = tubeSectionOf(component);
        const base = TUBE_SECTION_DEFS[section] || TUBE_SECTION_DEFS.A;
        const model = canonicalTubeModel(component?.value);
        if (model === "E88CC" && section === "A") {
          return { ...base, name: `${model} tube, section ${section}`, defaultValue: model,
            pins: base.pins.map(pin => pin.name === "9"
              ? { ...pin, signal: TUBE_MODEL_DATA.E88CC.pin9, x: 60, y: 20 }
              : pin) };
        }
        return { ...base, name: `${model} tube, section ${section}`, defaultValue: model };
      }

function tubePackageKey(component) {
        return String(component?.tubePackageUid || tubeBaseIdOf(component) || component?.instanceUid || component?.id || "");
      }

function tubeExternalControlName(component) {
        const section = tubeSectionOf(component);
        const number = tubeBaseIdOf(component).match(/(\d+)/)?.[1] || "1";
        return number === "1" ? `tube ${section}` : `tube ${number}${section}`;
      }

function canonicalOpampKind(value) {
        const key = String(value || "").trim().toLowerCase();
        if (key === "single") return "single";
        if (key === "quad" || key === "quadruple") return "quad";
        return "double";
      }

function inferredOpampKindFromModel(value) {
        const model = normalizedPartModel(value);
        for (const [kind, models] of Object.entries(OPAMP_MODEL_OPTIONS)) {
          if (models.some(candidate => normalizedPartModel(candidate) === model)) return kind;
        }
        return null;
      }

function canonicalOpampModel(value, preferredKind = null) {
        const normalized = normalizedPartModel(value);
        const exact = Object.keys(OPAMP_MODEL_PINOUTS).find(model => normalizedPartModel(model) === normalized);
        if (exact && (!preferredKind || OPAMP_MODEL_PINOUTS[exact].kind === canonicalOpampKind(preferredKind))) return exact;
        const kind = canonicalOpampKind(preferredKind || inferredOpampKindFromModel(value) || "double");
        return OPAMP_MODEL_OPTIONS[kind][0];
      }

function opampModelPinout(value, preferredKind = null) {
        return OPAMP_MODEL_PINOUTS[canonicalOpampModel(value, preferredKind)];
      }

function opampKindOf(component) {
        if (!component || canonicalComponentType(component.type) !== "opamp") return "double";
        return canonicalOpampKind(component.opampKind || inferredOpampKindFromModel(component.value) || "double");
      }

function opampSectionsForKind(kindValue) {
        const kind = canonicalOpampKind(kindValue);
        if (kind === "single") return ["A"];
        if (kind === "quad") return ["A", "B", "C", "D"];
        return ["A", "B"];
      }

function opampSectionOf(component) {
        const allowed = opampSectionsForKind(opampKindOf(component));
        const section = String(component?.opampSection || "A").toUpperCase();
        return allowed.includes(section) ? section : "A";
      }

function opampBaseIdOf(component) {
        return component?.opampBaseId || String(component?.id || "").replace(/[ABCD]$/, "");
      }

function singleOpampModelOf(component) {
        const normalized = normalizedPartModel(component?.value);
        return OPAMP_MODEL_OPTIONS.single.find(model => normalizedPartModel(model) === normalized) || null;
      }

function opampDefinitionFor(component) {
        const kind = opampKindOf(component);
        if (kind === "single") {
          const base = OPAMP_KIND_DEFS.single;
          const model = singleOpampModelOf(component);
          const auxiliaryPins = model ? (SINGLE_OPAMP_AUX_PIN_DEFS[model] || []) : [];
          const pins = [...base.pins.map(pin => ({ ...pin })), ...auxiliaryPins.map(pin => ({ ...pin }))]
            .map(pin => ({ ...pin, physical: component?.opampPhysicalPins?.[pin.name] || pin.physical }));
          return {
            ...base,
            name: `${model || component?.value || "Single"} single op-amp`,
            defaultValue: model || base.defaultValue,
            packageLabel: model || component?.value || base.packageLabel,
            // Side-mounted LM741/TL071/OPA134 offset pins fit inside the normal
            // compact symbol bounds. Top/bottom auxiliary pins used by the
            // other single models retain the taller selection outline.
            bounds: auxiliaryPins.length
              ? (auxiliaryPins.every(pin => pin.sideAux)
                  ? { x: -72, y: -72, width: 160, height: 144 }
                  : { x: -72, y: -100, width: 144, height: 200 })
              : { ...base.bounds },
            pins
          };
        }
        const base = OPAMP_KIND_DEFS[`${kind}${opampSectionOf(component)}`] || OPAMP_KIND_DEFS[`${kind}A`];
        return component?.opampPhysicalPins && Object.keys(component.opampPhysicalPins).length
          ? { ...base, pins: base.pins.map(pin => ({ ...pin, physical: component.opampPhysicalPins[pin.name] || pin.physical })) }
          : base;
      }

function opampPackagePinCount(kindValue, modelValue = null) {
        const modelData = modelValue ? opampModelPinout(modelValue, kindValue) : null;
        if (modelData) return Object.keys(modelData.pins).length;
        return canonicalOpampKind(kindValue) === "quad" ? 14 : 8;
      }

function componentIdentity(component) {
        if (!component) return "";
        if (canonicalComponentType(component.type) === "opamp") {
          return `opamp:${component.opampPackageUid || component.instanceUid || opampBaseIdOf(component)}`;
        }
        if (canonicalComponentType(component.type) === "tube") {
          return `tube:${tubePackageKey(component)}:${tubeSectionOf(component)}`;
        }
        return `component:${component.instanceUid || component.id || "unknown"}`;
      }

function canonicalSwitchKind(value) {
        const key = String(value || "").trim().replace(/[\s_-]+/g, "").toLowerCase();
        return ["spst", "spdt", "sp3t", "dpst", "dpdt", "dp3t", "3pst", "3pdt"].includes(key) ? key : "spst";
      }

function switchKindOf(component) {
        return canonicalSwitchKind(component?.switchKind || component?.type);
      }

function canonicalOtherIcModel(value) {
        const normalized = normalizedPartModel(value);
        if (["GENERIC", "GENERICIC"].includes(normalized)) return "GENERIC";
        const exact = Object.keys(OTHER_IC_DEFS).find(model => normalizedPartModel(model) === normalized);
        if (exact) return exact;
        const synthFamily = Object.keys(SYNTH_IC_DATA).find(model => new RegExp(`^${model}[A-Z0-9-]*$`).test(normalized));
        return synthFamily || "PT2399";
      }

function otherIcModelOf(component) {
        return canonicalOtherIcModel(component?.otherIcModel || component?.value);
      }

function otherIcGridSpacingOf(component) {
        return component?.type === "otherIC" && otherIcModelOf(component) !== "Daisy" &&
          Number(component.icGridSpacing) === 1 ? 1 : 0;
      }

const SPACED_OTHER_IC_DEFINITION_CACHE = new WeakMap();

function spacedOtherIcDefinition(base, spacing) {
        if (Number(spacing) !== 1) return base;
        if (SPACED_OTHER_IC_DEFINITION_CACHE.has(base)) return SPACED_OTHER_IC_DEFINITION_CACHE.get(base);
        // Retain the top pin row and the package width. Insert one empty grid
        // row between adjacent pins; no electrical names or physical DIP data
        // change. The original definitions remain untouched for other instances.
        const firstPinY = Math.min(...base.pins.map(pin => pin.y));
        const extraHeight = Math.max(...base.pins.map(pin => pin.y)) - firstPinY;
        const definition = Object.freeze({
          ...base,
          body: Object.freeze({ ...base.body, height: base.body.height + extraHeight }),
          bounds: Object.freeze({ ...base.bounds, height: base.bounds.height + extraHeight }),
          ...(Number.isFinite(base.resizeBottomY) ? { resizeBottomY: base.resizeBottomY + extraHeight } : {}),
          pins: Object.freeze(base.pins.map(pin => Object.freeze({
            ...pin, y: firstPinY + (pin.y - firstPinY) * 2
          })))
        });
        SPACED_OTHER_IC_DEFINITION_CACHE.set(base, definition);
        return definition;
      }

function otherIcDefinitionFor(component) {
        const model = otherIcModelOf(component);
        const base = model === "GENERIC"
          ? makeGenericIcDefinition(genericIcPinCountOf(component))
          : OTHER_IC_DEFS[model];
        return spacedOtherIcDefinition(base, otherIcGridSpacingOf(component));
      }

function genericIcPinCountOf(component) {
        return canonicalGenericIcPinCount(component?.genericIcPinCount);
      }

function canonicalVoltageRegulatorModel(value) {
        const normalized = normalizedPartModel(value);
        return VOLTAGE_REGULATOR_MODELS.find(model => normalized === model ||
          new RegExp(`^(?:L|LM)?${model}[A-Z0-9-]*$`).test(normalized)) || "78L05";
      }

function voltageRegulatorModelOf(component) {
        return canonicalVoltageRegulatorModel(component?.voltageRegulatorModel || component?.value);
      }

function ledScopeOf(component) {
        return component?.ledScope === "offboard" ? "offboard" : "onboard";
      }

function canonicalLedColor(value) {
        const key = String(value || "").trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(LED_COLOR_OPTIONS, key) ? key : "red";
      }

function ledColorOf(component) {
        return canonicalLedColor(component?.ledColor);
      }

function canonicalPotType(value) {
        const type = String(value || "").trim().toLowerCase();
        if (type === "trimmer-3296" || type === "3296") return "trimmer-3296";
        if (type === "trimmer-3362p" || type === "3362p") return "trimmer-3362p";
        return ["trimmer", "trimmer-3266w", "3266w"].includes(type) ? "trimmer" : "pot";
      }

function trimmerModelOf(component) {
        const type = potTypeOf(component);
        return type === "trimmer-3296" ? "3296" : type === "trimmer-3362p" ? "3362P" : type === "trimmer" ? "3266W" : null;
      }

function potTypeOf(component) {
        return canonicalPotType(component?.potType);
      }

function isOffboardComponent(componentOrType) {
        const component = typeof componentOrType === "string" ? null : componentOrType;
        const type = canonicalComponentType(typeof componentOrType === "string" ? componentOrType : componentOrType?.type);
        return type === "tube" || (type === "potentiometer" && potTypeOf(component) === "pot") || type === "switch" || (type === "led" && ledScopeOf(component) === "offboard");
      }

function isBoardPhysicalComponent(component) {
        return Boolean(component && component.type !== "terminal" && !isOffboardComponent(component));
      }

function externalControlName(component) {
        const fallback = String(component?.id || "control").toLowerCase();
        const entered = String(component?.value || "").trim();
        if (component?.type === "tube") return tubeExternalControlName(component);
        if (component?.type === "led" && (!entered || normalizedPartModel(entered) === "LED")) return fallback;
        return entered || fallback;
      }

const offboardRoutingPlanCache = new WeakMap();

function externalPinNameSort(a, b) {
        const numberA = Number(a);
        const numberB = Number(b);
        if (Number.isFinite(numberA) && Number.isFinite(numberB) && numberA !== numberB) return numberA - numberB;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
      }

function joinExternalPinNames(pinNames = []) {
        return [...new Set(pinNames.map(String))].sort(externalPinNameSort).join(" & ");
      }

function uniqueDescriptionLines(lines = []) {
        const seen = new Set();
        const result = [];
        for (const source of lines) {
          const line = String(source || "").trim();
          if (!line) continue;
          const key = line.toLocaleLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          result.push(line);
        }
        return result;
      }

function componentIdSortData(componentOrId) {
        const id = String(typeof componentOrId === "string" ? componentOrId : componentOrId?.id || "").trim();
        const match = id.match(/^([^\d]*?)(\d+)(.*)$/);
        return {
          id,
          prefix: match ? match[1] : id,
          number: match ? Number(match[2]) : Number.POSITIVE_INFINITY,
          suffix: match ? match[3] : ""
        };
      }

function compareComponentIds(a, b) {
        const left = componentIdSortData(a);
        const right = componentIdSortData(b);
        return left.prefix.localeCompare(right.prefix, undefined, { sensitivity: "base" }) ||
          left.number - right.number ||
          left.suffix.localeCompare(right.suffix, undefined, { numeric: true, sensitivity: "base" }) ||
          left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: "base" });
      }

function formatComponentIdSequence(ids = []) {
        const unique = [...new Set(ids.map(String))].sort(compareComponentIds);
        if (!unique.length) return "";
        const parts = unique.map(componentIdSortData);
        const segments = [];
        let start = 0;
        for (let index = 1; index <= parts.length; index += 1) {
          const previous = parts[index - 1];
          const current = parts[index];
          const continues = current &&
            current.prefix === previous.prefix &&
            current.suffix === previous.suffix &&
            current.number === previous.number + 1;
          if (continues) continue;
          const first = parts[start];
          const last = previous;
          segments.push(start === index - 1 ? first.id : `${first.id} - ${last.id}`);
          start = index;
        }
        return segments.join(" & ");
      }

function groupedComponentModelDescriptionLines(type) {
        const groups = new Map();
        for (const component of state.components.filter(item => item.type === type).sort((a, b) => compareComponentIds(a.id, b.id))) {
          const displayModel = String(component.value || component.id || "").trim();
          if (!displayModel) continue;
          const modelKey = normalizedPartModel(displayModel) || displayModel.toLocaleLowerCase();
          if (!groups.has(modelKey)) groups.set(modelKey, { model: displayModel, ids: [], firstId: component.id });
          groups.get(modelKey).ids.push(component.id);
        }
        return [...groups.values()]
          .sort((a, b) => compareComponentIds(a.firstId, b.firstId))
          .map(group => {
            const idText = formatComponentIdSequence(group.ids);
            return `${idText} ${group.ids.length === 1 ? "is" : "are"} ${group.model}`;
          });
      }

function groupedOpampModelDescriptionLines() {
        const packages = new Map();
        for (const component of state.components.filter(item => item.type === "opamp")) {
          const packageKey = component.opampPackageUid || opampBaseIdOf(component) || component.id;
          if (!packages.has(packageKey)) packages.set(packageKey, []);
          packages.get(packageKey).push(component);
        }

        const groups = new Map();
        for (const members of packages.values()) {
          const representative = members.find(member => opampSectionOf(member) === "A") || members[0];
          if (!representative) continue;
          const packageId = String(opampBaseIdOf(representative) || representative.id || "").trim();
          const displayModel = String(
            representative.value ||
            OPAMP_MODEL_OPTIONS[opampKindOf(representative)]?.[0] ||
            ""
          ).trim();
          if (!packageId || !displayModel) continue;
          const modelKey = normalizedPartModel(displayModel) || displayModel.toLocaleLowerCase();
          if (!groups.has(modelKey)) groups.set(modelKey, { model: displayModel, ids: [], firstId: packageId });
          const group = groups.get(modelKey);
          if (!group.ids.includes(packageId)) group.ids.push(packageId);
          if (compareComponentIds(packageId, group.firstId) < 0) group.firstId = packageId;
        }

        return [...groups.values()]
          .sort((a, b) => compareComponentIds(a.firstId, b.firstId))
          .map(group => {
            const idText = formatComponentIdSequence(group.ids);
            return `${idText} ${group.ids.length === 1 ? "is" : "are"} ${group.model}`;
          });
      }

function automaticInventoryDescriptionLines() {
        const lines = [];
        const potentiometers = state.components
          .filter(component => component.type === "potentiometer")
          .sort((a, b) => compareComponentIds(a.id, b.id));
        if (potentiometers.length) {
          lines.push(potentiometers.map(component => {
            const name = externalControlName(component);
            const resistance = String(component.potResistance || TYPE_DEFS.potentiometer.defaultResistance).trim();
            return `${name} ${resistance}`;
          }).join(", "));
        }
        lines.push(...groupedOpampModelDescriptionLines());
        lines.push(...groupedComponentModelDescriptionLines("otherIC"));
        lines.push(...groupedComponentModelDescriptionLines("transistor"));
        lines.push(...groupedComponentModelDescriptionLines("voltageRegulator"));
        lines.push(...groupedComponentModelDescriptionLines("diode"));
        return uniqueDescriptionLines(lines);
      }

function buildOffboardControlRoutingPlan(netData, activeNetIndexes) {
        const autoDescribeEnabled = state.boardSettings.autoDescribe !== false;
        const activeKey = `${autoDescribeEnabled ? "auto" : "raw"}|${[...activeNetIndexes].sort((a, b) => a - b).join(",")}`;
        let cacheForNetData = offboardRoutingPlanCache.get(netData);
        if (!cacheForNetData) {
          cacheForNetData = new Map();
          offboardRoutingPlanCache.set(netData, cacheForNetData);
        }
        if (cacheForNetData.has(activeKey)) return cacheForNetData.get(activeKey);

        const outputNetIndexes = new Set();
        const inputNetIndexes = new Set();
        for (const terminal of state.components.filter(component =>
          component.type === "terminal" &&
          terminalScopeOf(component) === "offboard"
        )) {
          const net = netData.pinToNet.get(pinKey(terminal.id, "1"));
          if (!net) continue;
          const role = quickNetRoleOf(terminal);
          const label = normalizeNetLabel(terminal.value);
          if (role === "output" || ["OUTPUT", "OUT"].includes(label)) outputNetIndexes.add(net.index);
          if (role === "input" || ["INPUT", "IN"].includes(label)) inputNetIndexes.add(net.index);
        }

        const pureOffboardControlNetIndexes = new Set();
        for (const net of netData.nets || []) {
          let physicalNodeCount = 0;
          let offboardControlNodeCount = 0;
          for (const node of net.nodes || []) {
            const component = getComponent(splitPinKey(node).componentId);
            if (isBoardPhysicalComponent(component)) physicalNodeCount += 1;
            else if (isOffboardComponent(component)) offboardControlNodeCount += 1;
          }
          // A net that exists only between off-board control pins is wired
          // directly between those controls. It must be documented, but it
          // must never consume a Vero edge pad or copper strip.
          if (physicalNodeCount === 0 && offboardControlNodeCount > 1) {
            pureOffboardControlNetIndexes.add(net.index);
          }
        }

        const pinRecords = [];
        for (const component of state.components.filter(isOffboardComponent)) {
          const preferredSide = Number(component.x) < SCHEMATIC_WIDTH / 2 ? "left" : "right";
          const controlName = externalControlName(component);
          for (const pin of componentDef(component).pins) {
            const net = netData.pinToNet.get(pinKey(component.id, pin.name));
            if (!net || net.nodes.length < 2) continue;
            pinRecords.push({
              component,
              net,
              pinName: String(pin.name),
              controlName,
              preferredSide,
              active: activeNetIndexes.has(net.index)
            });
          }
        }

        if (!autoDescribeEnabled) {
          const externalControlTerminals = pinRecords
            .filter(record => record.active)
            .map(record => ({
              component: record.component,
              net: record.net,
              key: `${record.component.id}:${record.pinName}`,
              pinName: record.pinName,
              pinNames: [record.pinName],
              controlName: record.controlName,
              label: `${record.controlName} ${record.pinName}`,
              preferredSide: record.preferredSide,
              allowAlternateSide: true,
              isOffboardControl: true
            }));
          const plan = { externalControlTerminals, autoDescriptionLines: [] };
          cacheForNetData.set(activeKey, plan);
          return plan;
        }

        const autoDescriptionLines = [...automaticInventoryDescriptionLines()];
        for (const record of pinRecords) {
          if (record.component.type === "potentiometer" && record.pinName === "2" && outputNetIndexes.has(record.net.index)) {
            autoDescriptionLines.push(`${record.controlName} 2 to output`);
          }
        }

        // When INPUT connects only to an off-board potentiometer pin, there is
        // intentionally no Vero edge landing. Preserve that build instruction
        // in Auto-describe instead, e.g. “input to fuzz 3”. Group pins when a
        // control ties more than one of its terminals directly to INPUT.
        const directInputPotGroups = new Map();
        for (const record of pinRecords) {
          if (record.component.type !== "potentiometer") continue;
          if (!inputNetIndexes.has(record.net.index)) continue;
          if (activeNetIndexes.has(record.net.index)) continue;
          const key = `${record.component.id}|${record.net.index}`;
          if (!directInputPotGroups.has(key)) {
            directInputPotGroups.set(key, {
              controlName: record.controlName,
              pinNames: []
            });
          }
          directInputPotGroups.get(key).pinNames.push(record.pinName);
        }
        for (const group of directInputPotGroups.values()) {
          autoDescriptionLines.push(`input to ${group.controlName} ${joinExternalPinNames(group.pinNames)}`);
        }

        const potentiometerGroupsByKey = new Map();
        for (const record of pinRecords.filter(record => record.component.type === "potentiometer")) {
          const key = `${record.component.id}|${record.net.index}`;
          if (!potentiometerGroupsByKey.has(key)) {
            potentiometerGroupsByKey.set(key, {
              component: record.component,
              net: record.net,
              controlName: record.controlName,
              preferredSide: record.preferredSide,
              active: record.active,
              pinNames: []
            });
          }
          const group = potentiometerGroupsByKey.get(key);
          group.active ||= record.active;
          group.pinNames.push(record.pinName);
        }

        const potentiometerGroups = [...potentiometerGroupsByKey.values()].map(group => {
          const pinNames = [...new Set(group.pinNames)].sort(externalPinNameSort);
          return {
            ...group,
            pinNames,
            label: `${group.controlName} ${joinExternalPinNames(pinNames)}`,
            referenceLabel: `${group.controlName} ${pinNames[0]}`
          };
        });

        const pureOffboardPotGroupsByNet = new Map();
        for (const group of potentiometerGroups.filter(group => pureOffboardControlNetIndexes.has(group.net.index))) {
          if (!pureOffboardPotGroupsByNet.has(group.net.index)) pureOffboardPotGroupsByNet.set(group.net.index, []);
          pureOffboardPotGroupsByNet.get(group.net.index).push(group);
        }

        // Direct control-to-control nets never touch the board. Preserve their
        // construction information as an external wiring note only. The same
        // ordering used for ordinary grouped controls keeps notes deterministic;
        // for example: “volume 3 to vr2 1”.
        for (const groups of pureOffboardPotGroupsByNet.values()) {
          groups.sort((a, b) =>
            b.pinNames.length - a.pinNames.length ||
            Number(a.component.x || 0) - Number(b.component.x || 0) ||
            Number(a.component.y || 0) - Number(b.component.y || 0) ||
            String(a.component.id).localeCompare(String(b.component.id), undefined, { numeric: true })
          );
          const representative = groups[0];
          if (!representative) continue;
          const referenceLabel = representative.referenceLabel;
          for (const extraPin of representative.pinNames.slice(1)) {
            autoDescriptionLines.push(`${representative.controlName} ${extraPin} to ${referenceLabel}`);
          }
          for (const related of groups.slice(1)) {
            autoDescriptionLines.push(`${related.label} to ${referenceLabel}`);
          }
        }

        const activePotGroupsByNet = new Map();
        for (const group of potentiometerGroups.filter(group => group.active && !pureOffboardControlNetIndexes.has(group.net.index))) {
          if (!activePotGroupsByNet.has(group.net.index)) activePotGroupsByNet.set(group.net.index, []);
          activePotGroupsByNet.get(group.net.index).push(group);
        }

        const keptPotGroups = [];
        for (const groups of activePotGroupsByNet.values()) {
          groups.sort((a, b) =>
            b.pinNames.length - a.pinNames.length ||
            Number(a.component.x || 0) - Number(b.component.x || 0) ||
            Number(a.component.y || 0) - Number(b.component.y || 0) ||
            String(a.component.id).localeCompare(String(b.component.id), undefined, { numeric: true })
          );
          const representative = groups[0];
          keptPotGroups.push(representative);
          for (const related of groups.slice(1)) {
            autoDescriptionLines.push(`${related.label} to ${representative.referenceLabel}`);
          }
        }

        const externalControlTerminals = keptPotGroups.map(group => ({
          component: group.component,
          net: group.net,
          key: `${group.component.id}:${group.pinNames.join("&")}`,
          pinName: group.pinNames[0],
          pinNames: group.pinNames,
          controlName: group.controlName,
          label: group.label,
          preferredSide: group.preferredSide,
          allowAlternateSide: true,
          isOffboardControl: true,
          isGroupedPotentiometerPins: group.pinNames.length > 1
        }));

        for (const record of pinRecords.filter(record => record.component.type !== "potentiometer" && record.active)) {
          externalControlTerminals.push({
            component: record.component,
            net: record.net,
            key: `${record.component.id}:${record.pinName}`,
            pinName: record.pinName,
            pinNames: [record.pinName],
            controlName: record.controlName,
            label: `${record.controlName} ${record.pinName}`,
            preferredSide: record.preferredSide,
            allowAlternateSide: true,
            isOffboardControl: true
          });
        }

        const plan = {
          externalControlTerminals,
          autoDescriptionLines: uniqueDescriptionLines(autoDescriptionLines)
        };
        cacheForNetData.set(activeKey, plan);
        return plan;
      }

function terminalScopeOf(component) {
        return component?.netScope === "onboard" ? "onboard" : "offboard";
      }

function isQuickNetTerminal(component) {
        if (!component || component.type !== "terminal") return false;
        if (component.quickNet === true) return true;
        if (component.quickNet === false) return false;
        const label = normalizeNetLabel(component.value);
        return terminalScopeOf(component) === "offboard" && ["INPUT", "OUTPUT", "9V", "GND"].includes(label);
      }

function canonicalQuickNetRole(value) {
        const role = String(value || "").trim().toLowerCase();
        return ["input", "output", "power", "ground"].includes(role) ? role : "";
      }

function inferredQuickNetRoleFromLabel(value) {
        const label = normalizeNetLabel(value);
        if (label === "INPUT" || label === "IN") return "input";
        if (label === "OUTPUT" || label === "OUT") return "output";
        if (label === "GND" || label === "GROUND" || label === "0V") return "ground";
        if (/^(?:\+?\d+(?:\.\d+)?V|VCC|VDD|V\+|POWER|SUPPLY)$/i.test(label)) return "power";
        return "";
      }

function quickNetRoleOf(component) {
        if (!component || component.type !== "terminal" || !isQuickNetTerminal(component)) return "";
        return canonicalQuickNetRole(component.quickNetRole) || inferredQuickNetRoleFromLabel(component.value);
      }

function normalizeComponentRecord(component) {
        const rawType = component?.type;
        const type = canonicalComponentType(rawType);
        const normalized = { ...component, type };
        normalized.instanceUid = String(component?.instanceUid || "").trim() || uid("CMP");
        normalized.mirrored = Boolean(component?.mirrored);
        if (type === "transistor") {
          const family = transistorFamilyData(component?.value);
          const customKind = canonicalTransistorKind(component?.transistorKind || rawType);
          const customPinout = component?.transistorPinoutCustom === true && validTransistorPinout(component?.transistorPinout, customKind);
          normalized.transistorKind = customPinout ? customKind : (family?.kind || customKind);
          normalized.transistorPinout = customPinout ? [...component.transistorPinout] : family?.order
            ? [...family.order]
            : validTransistorPinout(component?.transistorPinout, normalized.transistorKind)
              ? [...component.transistorPinout]
              : defaultTransistorLeadOrder(normalized.transistorKind);
          if (customPinout) normalized.transistorPinoutCustom = true;
          else delete normalized.transistorPinoutCustom;
        }
        if (type === "diode") {
          normalized.diodeKind = canonicalDiodeKind(component?.diodeKind || inferredDiodeKindFromModel(component?.value));
          if (!String(normalized.value || "").trim()) normalized.value = DIODE_MODEL_OPTIONS[normalized.diodeKind][0];
        }
        if (type === "tube") {
          normalized.tubeSection = tubeSectionOf(component);
          normalized.tubeBaseId = component?.tubeBaseId || String(component?.id || "").replace(/[AB]$/i, "") || "V1";
          normalized.tubePackageUid = String(component?.tubePackageUid || "").trim();
          normalized.value = canonicalTubeModel(component?.value);
          normalized.tubePackage = "Noval 9-pin";
          normalized.id = `${normalized.tubeBaseId}${normalized.tubeSection}`;
        }
        if (type === "opamp") {
          normalized.opampKind = canonicalOpampKind(component?.opampKind || inferredOpampKindFromModel(component?.value) || "double");
          const allowedSections = opampSectionsForKind(normalized.opampKind);
          const requestedSection = String(component?.opampSection || "A").toUpperCase();
          normalized.opampPhysicalPins = component?.opampPhysicalPins && typeof component.opampPhysicalPins === "object"
            ? Object.fromEntries(Object.entries(component.opampPhysicalPins).map(([logical, physical]) => [logical, String(physical)]))
            : {};
          normalized.opampSection = allowedSections.includes(requestedSection) ? requestedSection : "A";
          normalized.opampBaseId = component?.opampBaseId || String(component?.id || "").replace(/[ABCD]$/, "");
          normalized.opampPackageUid = String(component?.opampPackageUid || "").trim();
          const importedCustomModel = Boolean(component?.importedCustomModel) && String(component?.value || "").trim();
          if (importedCustomModel) {
            normalized.value = String(component.value).trim();
            const fallbackData = opampModelPinout(OPAMP_MODEL_OPTIONS[normalized.opampKind][0], normalized.opampKind);
            normalized.opampPackage = String(component?.opampPackage || fallbackData.package);
            normalized.opampPinout = component?.opampPinout && typeof component.opampPinout === "object"
              ? { ...component.opampPinout }
              : { ...fallbackData.pins };
            normalized.importedCustomModel = true;
          } else {
            normalized.value = canonicalOpampModel(normalized.value, normalized.opampKind);
            const modelData = opampModelPinout(normalized.value, normalized.opampKind);
            normalized.opampPackage = modelData.package;
            normalized.opampPinout = { ...modelData.pins };
            delete normalized.importedCustomModel;
          }
        }
        if (type === "switch") normalized.switchKind = canonicalSwitchKind(component?.switchKind || component?.type);
        if (type === "otherIC") {
          normalized.otherIcModel = canonicalOtherIcModel(component?.otherIcModel || component?.value);
          normalized.icGridSpacing = otherIcGridSpacingOf(normalized);
          if (normalized.otherIcModel === "GENERIC") {
            normalized.genericIcPinCount = canonicalGenericIcPinCount(component?.genericIcPinCount);
            normalized.genericIcLabel = String(component?.genericIcLabel || component?.value || "Generic IC").trim() || "Generic IC";
            normalized.value = normalized.genericIcLabel;
            if (component?.importedCustomModel) normalized.importedCustomModel = true;
          } else {
            delete normalized.genericIcPinCount;
            normalized.value = normalized.otherIcModel;
          }
        }
        if (type === "voltageRegulator") {
          normalized.voltageRegulatorModel = canonicalVoltageRegulatorModel(component?.voltageRegulatorModel || component?.value);
          if (component?.importedCustomModel && String(component?.value || "").trim()) {
            normalized.value = String(component.value).trim();
            normalized.importedCustomModel = true;
          } else {
            normalized.value = normalized.voltageRegulatorModel;
            delete normalized.importedCustomModel;
          }
        }
        if (type === "led") {
          normalized.ledScope = ledScopeOf(component);
          normalized.ledColor = ledColorOf(component);
        }
        if (type === "potentiometer") {
          if (!String(normalized.value || "").trim()) {
            const number = String(normalized.id || "").match(/(\d+)/)?.[1] || "1";
            normalized.value = `pot${number}`;
          }
          normalized.potType = canonicalPotType(component?.potType);
          normalized.potResistance = String(component?.potResistance || TYPE_DEFS.potentiometer.defaultResistance).trim() || TYPE_DEFS.potentiometer.defaultResistance;
        }
        if (type === "switch" && !String(normalized.value || "").trim()) normalized.value = String(normalized.id || "switch").toLowerCase().replace(/^sw/, "switch");
        if (type === "terminal") {
          normalized.netScope = terminalScopeOf(component);
          if (component?.quickNet === true || component?.quickNet === false) normalized.quickNet = Boolean(component.quickNet);
          else normalized.quickNet = normalized.netScope === "offboard" && ["INPUT", "OUTPUT", "9V", "GND"].includes(normalizeNetLabel(normalized.value));
          normalized.quickNetRole = normalized.quickNet
            ? (canonicalQuickNetRole(component?.quickNetRole) || inferredQuickNetRoleFromLabel(component?.value))
            : "";
        }
        return normalized;
      }

function isPolarizedCapacitor(componentOrType) {
        const type = typeof componentOrType === "string" ? componentOrType : componentOrType?.type;
        return canonicalComponentType(type) === "capacitorPolarized";
      }

function getComponent(id) {
        return state.components.find(component => component.id === id) || null;
      }

const SPACING_COMPONENT_TYPES = new Set(["resistor", "potentiometer", "capacitor", "capacitorPolarized", "diode", "led"]);

function compactSchematicComponent(componentOrType) {
        const type = typeof componentOrType === "string" ? componentOrType : componentOrType?.type;
        return state.schematicSettings?.componentGridSpacing === 5 && SPACING_COMPONENT_TYPES.has(type);
      }

function spacedComponentDefinition(base) {
        return {
          ...base,
          bounds: { ...base.bounds, x: base.bounds.x + 10, width: base.bounds.width - 20 },
          pins: base.pins.map(pin => Math.abs(pin.x) === 60
            ? { ...pin, x: pin.x - Math.sign(pin.x) * 10, labelX: pin.labelX - Math.sign(pin.x) * 10 }
            : base === TYPE_DEFS.potentiometer && pin.name === "2"
              // Five intervals have no on-grid midpoint. Keep the wiper on the
              // original electrical anchor, one half-space right of the body.
              ? { ...pin, x: GRID / 2, labelX: pin.labelX + GRID / 2 }
              : { ...pin })
        };
      }

function componentDef__vero(componentOrType) {
        const rawType = typeof componentOrType === "string" ? componentOrType : componentOrType.type;
        const type = canonicalComponentType(rawType);
        if (type === "transistor" && typeof componentOrType !== "string") {
          return TRANSISTOR_KIND_DEFS[transistorKindOf(componentOrType)];
        }
        if (type === "opamp" && typeof componentOrType !== "string") return opampDefinitionFor(componentOrType);
        if (type === "tube" && typeof componentOrType !== "string") return tubeDefinitionFor(componentOrType);
        if (type === "switch" && typeof componentOrType !== "string") return SWITCH_KIND_DEFS[switchKindOf(componentOrType)];
        if (type === "otherIC" && typeof componentOrType !== "string") return otherIcDefinitionFor(componentOrType);
        if (type === "voltageRegulator" && typeof componentOrType !== "string") {
          const model = voltageRegulatorModelOf(componentOrType);
          return { ...TYPE_DEFS.voltageRegulator, name: `${model} voltage regulator`, defaultValue: model };
        }
        if (type === "terminal" && typeof componentOrType !== "string") {
          const base = TYPE_DEFS.terminal;
          const inputFacesRight = normalizeNetLabel(componentOrType.value) === "INPUT";
          return {
            ...base,
            bounds: inputFacesRight
              ? { x: -96, y: -28, width: 108, height: 56 }
              : { x: -12, y: -28, width: 108, height: 56 }
          };
        }
        return compactSchematicComponent(type) ? spacedComponentDefinition(TYPE_DEFS[type]) : TYPE_DEFS[type];
      }

function serializeVeroLayoutForProject(layout = state.veroLayout) {
        if (!layout || layout.error) return null;
        const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
        const serializePlacement = placement => ({
          componentId: placement.component?.id || "",
          componentIdentity: componentIdentity(placement.component),
          component: clone(placement.component),
          ...(isPolarizedCapacitor(placement.component) && electrolyticRadiusOf(placement) !== 14
              ? {electrolyticRadius: electrolyticRadiusOf(placement)} : {}),
          x: placement.x,
          y: placement.y,
          footprint: cloneVeroFootprint(placement.footprint)
        });
        return {
          format: "Vero Designer saved layout",
          version: 1,
          ...((layout.annotations || []).length ? { annotations: cleanLayoutAnnotations(layout.annotations) } : {}),
          ...(isPerfLayout(layout) ? {boardType: "perf", perfTraces: perfSerializedTraces(layout)} : {}),
          columns: layout.columns,
          rows: layout.rows,
          placements: (layout.placements || []).map(serializePlacement),
          sourcePlacements: (layout.sourcePlacements || []).map(serializePlacement),
          routes: (layout.routes || []).map(route => ({
            node: route.node || "",
            fromSegment: route.fromSegment || null,
            toSegment: route.toSegment || null,
            isRoutingBusLink: Boolean(route.isRoutingBusLink),
            schematicNetIndex: Number.isFinite(route.schematicNetIndex) ? route.schematicNetIndex : route.net?.index,
            schematicNetIdentity: route.schematicNetIdentity || route.net?.stableIdentity || "",
            netName: route.net?.name || route.displayNet?.name || "",
            points: (route.points || []).map(point => ({ x: point.x, y: point.y }))
          })),
          cuts: (layout.cuts || []).map(cut => ({ x: cut.x, y: cut.y, hole: cut.x })),
          terminals: (layout.terminals || []).map(terminal => ({
            componentId: terminal.component?.id || "",
            componentIdentity: componentIdentity(terminal.component),
            component: clone(terminal.component),
            schematicNetIndex: terminal.net?.index,
            schematicNetIdentity: terminal.schematicNetIdentity || terminal.net?.stableIdentity || "",
            netName: terminal.net?.name || terminal.label || "",
            side: terminal.side,
            row: terminal.row,
            pinName: terminal.pinName || "1",
            pinNames: Array.isArray(terminal.pinNames) ? [...terminal.pinNames] : [terminal.pinName || "1"],
            controlName: terminal.controlName || "",
            isGroupedPotentiometerPins: Boolean(terminal.isGroupedPotentiometerPins),
            labelOffset: terminal.labelOffset || 0,
            isOffboardControl: Boolean(terminal.isOffboardControl),
            key: terminal.key || "",
            label: terminal.label || ""
          })),
          autoDescriptionLines: uniqueDescriptionLines(layout.autoDescriptionLines || state.projectMeta?.autoDescriptionLines || []),
          schematicStructureSignature: layout.schematicStructureSignature || "",
          manualEdited: Boolean(state.veroManualEdited || layout.manualEdited)
        };
      }

class UnionFind {
        constructor(items) {
          this.parent = new Map();
          this.rank = new Map();
          for (const item of items) {
            this.parent.set(item, item);
            this.rank.set(item, 0);
          }
        }
        find(item) {
          const parent = this.parent.get(item);
          if (parent === undefined) return null;
          if (parent !== item) this.parent.set(item, this.find(parent));
          return this.parent.get(item);
        }
        union(a, b) {
          let rootA = this.find(a);
          let rootB = this.find(b);
          if (rootA === null || rootB === null || rootA === rootB) return;
          const rankA = this.rank.get(rootA) || 0;
          const rankB = this.rank.get(rootB) || 0;
          if (rankA < rankB) [rootA, rootB] = [rootB, rootA];
          this.parent.set(rootB, rootA);
          if (rankA === rankB) this.rank.set(rootA, rankA + 1);
        }
      }

function deriveNets() {
        const allPins = [];
        for (const component of state.components) {
          const def = componentDef(component);
          for (const pin of def.pins) allPins.push(pinKey(component.id, pin.name));
        }

        const unionFind = new UnionFind(allPins);
        for (const wire of state.wires) unionFind.union(wire.a, wire.b);

        const labeledGroups = new Map();
        for (const component of state.components) {
          if (component.type !== "terminal") continue;
          const label = normalizeNetLabel(component.value);
          const key = pinKey(component.id, "1");
          if (labeledGroups.has(label)) unionFind.union(key, labeledGroups.get(label));
          else labeledGroups.set(label, key);
        }

        const grouped = new Map();
        for (const key of allPins) {
          const root = unionFind.find(key);
          if (!grouped.has(root)) grouped.set(root, []);
          grouped.get(root).push(key);
        }

        const preliminary = [...grouped.values()].map(nodes => {
          const labels = [];
          const quickNetRoles = [];
          for (const node of nodes) {
            const { componentId } = splitPinKey(node);
            const component = getComponent(componentId);
            if (component?.type === "terminal") {
              labels.push(normalizeNetLabel(component.value));
              const role = quickNetRoleOf(component);
              if (role) quickNetRoles.push(role);
            }
          }
          const uniqueLabels = [...new Set(labels)];
          const uniqueQuickNetRoles = [...new Set(quickNetRoles)];
          return { nodes, labels: uniqueLabels, quickNetRoles: uniqueQuickNetRoles };
        });

        const priority = label => {
          const upper = normalizeNetLabel(label);
          if (upper === "GND" || upper === "0V") return 0;
          if (/^(9V|VCC|VDD|V\+|\+\d+V)$/.test(upper)) return 1;
          if (upper === "INPUT" || upper === "IN") return 2;
          if (upper === "OUTPUT" || upper === "OUT") return 3;
          return 10;
        };

        preliminary.sort((a, b) => {
          const aNamed = a.labels.length ? 0 : 1;
          const bNamed = b.labels.length ? 0 : 1;
          if (aNamed !== bNamed) return aNamed - bNamed;
          if (a.labels.length && b.labels.length) {
            const pa = Math.min(...a.labels.map(priority));
            const pb = Math.min(...b.labels.map(priority));
            if (pa !== pb) return pa - pb;
            return a.labels[0].localeCompare(b.labels[0]);
          }
          return allPins.indexOf(a.nodes[0]) - allPins.indexOf(b.nodes[0]);
        });

        let unnamed = 1;
        const nets = preliminary.map((net, index) => {
          let name;
          if (net.labels.length === 1) name = net.labels[0];
          else if (net.labels.length > 1) name = net.labels.join(" / ");
          else name = `N${String(unnamed++).padStart(3, "0")}`;
          return {
            ...net,
            name,
            index,
            quickNetRole: net.quickNetRoles.includes("power") ? "power"
              : net.quickNetRoles.includes("ground") ? "ground"
              : net.quickNetRoles.includes("input") ? "input"
              : net.quickNetRoles.includes("output") ? "output"
              : "",
            conflict: net.labels.length > 1
          };
        });

        const pinToNet = new Map();
        for (const net of nets) {
          for (const node of net.nodes) pinToNet.set(node, net);
        }

        return { nets, pinToNet };
      }

function makeDipFootprint(pinCount, { logicalPrefix = "", keyPrefix = "dip" } = {}) {
        const half = pinCount / 2;
        const leftPins = Array.from({ length: half }, (_, index) => {
          const number = index + 1;
          const physical = String(number);
          return { logical: logicalPrefix ? `${logicalPrefix}${number}` : physical, physical, x: 0, y: index };
        });
        const rightPins = Array.from({ length: half }, (_, index) => {
          const number = half + 1 + index;
          const physical = String(number);
          return { logical: logicalPrefix ? `${logicalPrefix}${number}` : physical, physical, x: 3, y: half - 1 - index };
        });
        return {
          key: `${keyPrefix}${pinCount}-normal`,
          orientation: `${keyPrefix}${pinCount}-normal`,
          width: 4,
          height: half,
          pins: [...leftPins, ...rightPins]
        };
      }

function makeDaisyFootprint() {
        const pinCount = 40;
        const half = pinCount / 2;
        const pinColumnSpan = 6;
        const leftPins = Array.from({ length: half }, (_, index) => {
          const number = index + 1;
          const physical = String(number);
          return { logical: physical, physical, x: 0, y: index };
        });
        const rightPins = Array.from({ length: half }, (_, index) => {
          const number = half + 1 + index;
          const physical = String(number);
          return { logical: physical, physical, x: pinColumnSpan, y: half - 1 - index };
        });
        return {
          key: "daisy40-fixed",
          orientation: "daisy40-normal",
          width: pinColumnSpan + 1,
          height: half,
          pins: [...leftPins, ...rightPins]
        };
      }

function newTrimmerFootprintVariants(model) {
        const width = model === "3296" ? 1 : 3;
        const initial = {
          width, height: 3,
          pins: [
            { logical: "1", physical: "1", x: model === "3296" ? 0 : 1, y: 0 },
            { logical: "2", physical: "2", x: 0, y: 1 },
            { logical: "3", physical: "3", x: model === "3296" ? 0 : 1, y: 2 }
          ]
        };
        const variants = [];
        let current = initial;
        for (let rotation = 0; rotation < 360; rotation += 90) {
          variants.push({ ...current, key: `trimmer-${model}-${rotation}`, orientation: `trimmer-${model}-${rotation}`, trimmerModel: model, pins: current.pins.map(pin => ({ ...pin })) });
          current = { width: current.height, height: current.width,
            pins: current.pins.map(pin => ({ ...pin, x: current.height - 1 - pin.y, y: pin.x })) };
        }
        return variants;
      }

function boardFootprintVariants__vero(component) {
        const def = componentDef(component);

        if (component.type === "jumper") {
          const names = def.pins.map(pin => pin.name);
          const variants = [];
          for (const span of [2, 3]) {
            for (const reversed of [false, true]) {
              const order = reversed ? [names[1], names[0]] : [names[0], names[1]];
              variants.push({
                key: `vertical-${span}-${reversed ? "reversed" : "normal"}`,
                orientation: "vertical",
                width: 1,
                height: span + 1,
                pins: [
                  { logical: order[0], physical: order[0], x: 0, y: 0 },
                  { logical: order[1], physical: order[1], x: 0, y: span }
                ]
              });
            }
          }
          return variants;
        }

        if (component.type === "potentiometer" && ["3296", "3362P"].includes(trimmerModelOf(component))) {
          return newTrimmerFootprintVariants(trimmerModelOf(component));
        }

        if (component.type === "potentiometer" && potTypeOf(component) === "trimmer") {
          // Common compact board trimmer footprint: pins 1 and 3 are two
          // hole pitches apart, with the wiper on the centered adjacent row.
          // Four rotations preserve the physical 1/2/3 relationship.
          return [
            {
              key: "trimmer-0", orientation: "trimmer-0", width: 3, height: 2,
              pins: [
                { logical: "1", physical: "1", x: 0, y: 0 },
                { logical: "2", physical: "2", x: 1, y: 1 },
                { logical: "3", physical: "3", x: 2, y: 0 }
              ]
            },
            {
              key: "trimmer-90", orientation: "trimmer-90", width: 2, height: 3,
              pins: [
                { logical: "1", physical: "1", x: 1, y: 0 },
                { logical: "2", physical: "2", x: 0, y: 1 },
                { logical: "3", physical: "3", x: 1, y: 2 }
              ]
            },
            {
              key: "trimmer-180", orientation: "trimmer-180", width: 3, height: 2,
              pins: [
                { logical: "1", physical: "1", x: 2, y: 1 },
                { logical: "2", physical: "2", x: 1, y: 0 },
                { logical: "3", physical: "3", x: 0, y: 1 }
              ]
            },
            {
              key: "trimmer-270", orientation: "trimmer-270", width: 2, height: 3,
              pins: [
                { logical: "1", physical: "1", x: 0, y: 2 },
                { logical: "2", physical: "2", x: 1, y: 1 },
                { logical: "3", physical: "3", x: 0, y: 0 }
              ]
            }
          ];
        }

        if (["resistor", "capacitor", "capacitorPolarized", "diode", "led"].includes(component.type)) {
          const names = def.pins.map(pin => pin.name);
          const variants = [];
          const reversedOrders = [false, true];

          // A real axial resistor needs at least two complete Vero holes
          // between its leads. Three pitches is therefore the minimum, not a
          // fixed length: the optimizer may stretch a resistor farther when
          // doing so saves board area, links, or cuts.
          // Span is measured in hole pitches. A span of 3 leaves two complete
          // holes between resistor leads; a span of 9 leaves eight. Longer
          // vertical passives can replace otherwise necessary link wires by
          // reaching the two copper rows that their schematic nets already use.
          const resistorSpans = [3, 4, 5, 6, 7, 8, 9];
          const standingResistorSpans = state.boardSettings.standingResistors === true ? [1, 2] : [];
          const capacitorSpans = [1, 2, 3, 4, 5, 6, 7, 8, 9];
          const verticalSpans = component.type === "resistor"
            ? [...standingResistorSpans, ...resistorSpans]
            : (component.type === "capacitor" || component.type === "capacitorPolarized")
              ? capacitorSpans
              : [2, 3];
          // Standing resistors bridge adjacent copper strips vertically. The
          // released horizontal-resistor search remains unchanged.
          const horizontalSpans = component.type === "resistor"
            ? resistorSpans
            : (component.type === "capacitor" || component.type === "capacitorPolarized")
              ? capacitorSpans
              : [2, 3];

          for (const reversed of reversedOrders) {
            const order = reversed ? [names[1], names[0]] : [names[0], names[1]];
            for (const span of verticalSpans) {
              const standing = component.type === "resistor" && span <= 2;
              variants.push({
                key: `${standing ? "vertical-standing" : "vertical"}-${span}-${reversed ? "reversed" : "normal"}`,
                orientation: standing ? "vertical-standing" : "vertical",
                ...(standing ? { standingBodyPinIndex: 0 } : {}),
                width: 1,
                height: span + 1,
                pins: [
                  { logical: order[0], physical: order[0], x: 0, y: 0 },
                  { logical: order[1], physical: order[1], x: 0, y: span }
                ]
              });
            }
            for (const span of horizontalSpans) {
              variants.push({
                key: `horizontal-${span}-${reversed ? "reversed" : "normal"}`,
                orientation: "horizontal",
                width: span + 1,
                height: 1,
                pins: [
                  { logical: order[0], physical: order[0], x: 0, y: 0 },
                  { logical: order[1], physical: order[1], x: span, y: 0 }
                ]
              });
            }
          }
          return variants;
        }

        if (component.type === "transistor") {
          // transistorLeadOrder() is the lead sequence viewed from the flat
          // face, left-to-right. On a vertical Vero column, a package whose
          // flat face points right is therefore read bottom-to-top; its visual
          // top-to-bottom order must be reversed. A flat face pointing left
          // uses the datasheet order directly.
          const leadOrder = transistorLeadOrder(component);
          const flatRightOrder = [...leadOrder].reverse();
          const flatLeftOrder = [...leadOrder];
          return [
            {
              key: `to92-flat-right-${flatRightOrder.join("")}`,
              orientation: "to92-flat-right",
              width: 1,
              height: 3,
              pins: flatRightOrder.map((logical, index) => ({ logical, physical: logical, x: 0, y: index }))
            },
            {
              key: `to92-flat-left-${flatLeftOrder.join("")}`,
              orientation: "to92-flat-left",
              width: 1,
              height: 3,
              pins: flatLeftOrder.map((logical, index) => ({ logical, physical: logical, x: 0, y: index }))
            }
          ];
        }

        if (component.type === "voltageRegulator") {
          // TO-92, flat face toward the viewer: OUT, GND, IN (pins 1, 2, 3).
          // ST L78L datasheet, Figure 2 (TO-92 bottom view):
          // https://www.st.com/resource/en/datasheet/l78l.pdf
          const leadOrder = ["O", "G", "I"];
          return ["right", "left"].map(side => {
            const order = side === "right" ? [...leadOrder].reverse() : [...leadOrder];
            return { key: `to92-flat-${side}-${order.join("")}`, orientation: `to92-flat-${side}`,
              width: 1, height: 3,
              pins: order.map((logical, index) => ({ logical, physical: logical, x: 0, y: index })) };
          });
        }

        if (component.type === "otherIC") {
          if (otherIcModelOf(component) === "Daisy") return [makeDaisyFootprint()];
          const pinCount = componentDef(component).pins.length;
          return [makeDipFootprint(pinCount, { keyPrefix: "dip" })];
        }

        if (component.type === "opamp") {
          const storedPinCount = Number(component.packagePins) || Math.max(0, ...Object.keys(component.opampPinout || {}).map(Number).filter(Number.isFinite));
          const pinCount = Math.max(opampKindOf(component) === "quad" ? 14 : 8, storedPinCount || opampPackagePinCount(opampKindOf(component), component.value));
          // Keep DIP packages upright: pin 1 at the upper-left and the notch
          // at the top. Quad op-amps use DIP-14; single and dual use DIP-8.
          return [makeDipFootprint(pinCount, { logicalPrefix: "P", keyPrefix: "dip" })];
        }

        return [{ key: "default", orientation: "vertical", width: 1, height: 1, pins: [] }];
      }

function seededRandom(seed) {
        let value = seed >>> 0;
        return () => {
          value += 0x6D2B79F5;
          let result = value;
          result = Math.imul(result ^ (result >>> 15), result | 1);
          result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
          return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
        };
      }

function hashString(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
          hash ^= value.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      }

function rectanglesOverlap(a, b, clearance = 0) {
        return !(
          a.x + a.width + clearance <= b.x ||
          b.x + b.width + clearance <= a.x ||
          a.y + a.height + clearance <= b.y ||
          b.y + b.height + clearance <= a.y
        );
      }

function buildBoardElectricalComponents() {
        const result = state.components
          .filter(component => component.type !== "opamp" && isBoardPhysicalComponent(component))
          .slice();
        const packages = new Map();
        for (const component of state.components.filter(item => item.type === "opamp")) {
          const packageKey = component.opampPackageUid || opampBaseIdOf(component);
          if (!packages.has(packageKey)) packages.set(packageKey, []);
          packages.get(packageKey).push(component);
        }
        for (const members of packages.values()) {
          const packageId = opampBaseIdOf(members[0]);
          const kind = opampKindOf(members[0]);
          const packageModel = canonicalOpampModel(members[0]?.value, kind);
          const packageData = opampModelPinout(packageModel, kind);
          const storedPackagePinout = members.find(member => member.opampPinout && Object.keys(member.opampPinout).length)?.opampPinout;
          const packagePinout = storedPackagePinout ? { ...storedPackagePinout } : { ...packageData.pins };
          const storedPinCount = Math.max(0, ...Object.keys(packagePinout).map(Number).filter(Number.isFinite));
          const pinCount = Math.max(kind === "quad" ? 14 : 8, storedPinCount || opampPackagePinCount(kind, packageModel));
          const boardPinSources = Object.fromEntries(Array.from({ length: pinCount }, (_, index) => [`P${index + 1}`, []]));
          for (const member of members) {
            for (const pin of componentDef(member).pins) {
              const physical = Number(pin.physical);
              if (!Number.isInteger(physical) || physical < 1 || physical > pinCount) continue;
              const key = `P${physical}`;
              const sourceNode = pinKey(member.id, pin.name);
              if (!boardPinSources[key].includes(sourceNode)) boardPinSources[key].push(sourceNode);
            }
          }
          const sectionA = members.find(member => opampSectionOf(member) === "A") || members[0];
          const packageUid = sectionA?.opampPackageUid || members[0]?.opampPackageUid || members[0]?.instanceUid || uid("OPKG");
          result.push({
            id: packageId,
            instanceUid: packageUid,
            opampPackageUid: packageUid,
            type: "opamp",
            value: members[0]?.value || OPAMP_MODEL_OPTIONS[kind][0],
            x: Math.min(...members.map(member => Number(member.x) || 0)),
            y: Math.min(...members.map(member => Number(member.y) || 0)),
            rotation: 0,
            opampKind: kind,
            opampSection: "A",
            opampBaseId: packageId,
            packagePins: pinCount,
            opampPackage: members[0]?.opampPackage || packageData.package,
            opampPinout: packagePinout,
            boardMembers: members.map(member => member.id),
            boardPinSources
          });
        }
        return result.sort((a, b) => (a.x - b.x) || (a.y - b.y) || a.id.localeCompare(b.id));
      }

function schematicEndpointIdentity(component) {
        if (!component) return "missing";
        const base = componentIdentity(component);
        return component.type === "opamp" ? `${base}:${opampSectionOf(component)}` : base;
      }

function schematicNetIdentity(net) {
        if (!net) return "";
        const byId = new Map(state.components.map(component => [component.id, component]));
        const nodes = (net.nodes || []).map(node => {
          const info = splitPinKey(node);
          return `${schematicEndpointIdentity(byId.get(info.componentId))}:${info.pinName}`;
        }).sort();
        return JSON.stringify(nodes);
      }

function attachStableNetIdentities(layout) {
        if (!layout || layout.error) return layout;
        const identityByIndex = new Map();
        for (const net of layout.netData?.nets || []) {
          const identity = schematicNetIdentity(net);
          net.stableIdentity = identity;
          identityByIndex.set(net.index, identity);
        }
        for (const route of [...(layout.routes || []), ...(layout.perfTraces || [])]) {
          route.schematicNetIdentity = route.net?.stableIdentity || identityByIndex.get(route.schematicNetIndex ?? route.net?.index) || "";
        }
        for (const terminal of layout.terminals || []) {
          terminal.schematicNetIdentity = terminal.net?.stableIdentity || identityByIndex.get(terminal.net?.index) || "";
        }
        return layout;
      }

function boardLogicalPins(component) {
        if (component.type === "opamp" && component.boardPinSources) {
          return Object.entries(component.boardPinSources).map(([logical, sourceNodes]) => ({ logical, sourceNodes }));
        }
        return componentDef(component).pins.map(pin => ({ logical: pin.name, sourceNodes: [pinKey(component.id, pin.name)] }));
      }

function componentPlacementMetadata(component, netData, activeNetIndexes) {
        const pinNets = new Map();
        const realNets = new Map();
        const physicalPinConflicts = [];
        for (const pin of boardLogicalPins(component)) {
          const uniqueNets = [...new Map(pin.sourceNodes
            .map(sourceNode => netData.pinToNet.get(sourceNode))
            .filter(net => net && activeNetIndexes.has(net.index))
            .map(net => [net.index, net])).values()];
          if (uniqueNets.length > 1) physicalPinConflicts.push(pin.logical);
          const net = uniqueNets[0] || null;
          pinNets.set(pin.logical, net);
          if (net) realNets.set(net.index, net);
        }
        const variants = boardFootprintVariants(component);
        return {
          component, variants, pinNets, physicalPinConflicts,
          realNets: [...realNets.values()],
          minArea: Math.min(...variants.map(variant => variant.width * variant.height)),
          maxPins: Math.max(...variants.map(variant => variant.pins.length)),
          schematicOrder: component.x * 10000 + component.y
        };
      }

function placementOrder(metadata, random, trialIndex) {
        const remaining = metadata.slice();
        const ordered = [];
        const placedNets = new Set();

        const inputCandidate = remaining
          .filter(meta => meta.realNets.some(net => /(^|\b)(INPUT|IN)(\b|$)/.test(normalizeNetLabel(net.name))))
          .sort((a, b) => a.schematicOrder - b.schematicOrder)[0];

        let first;
        const mode = trialIndex % 4;
        if (mode === 0 && inputCandidate) {
          first = inputCandidate;
        } else if (mode === 1) {
          first = remaining.slice().sort((a, b) => (b.minArea - a.minArea) || (b.maxPins - a.maxPins) || (a.schematicOrder - b.schematicOrder))[0];
        } else if (mode === 2) {
          first = remaining.slice().sort((a, b) => {
            const degreeA = a.realNets.reduce((sum, net) => sum + net.nodes.length, 0);
            const degreeB = b.realNets.reduce((sum, net) => sum + net.nodes.length, 0);
            return (degreeB - degreeA) || (b.maxPins - a.maxPins) || (a.schematicOrder - b.schematicOrder);
          })[0];
        } else {
          const ranked = remaining.slice().sort((a, b) => (b.maxPins - a.maxPins) || (b.minArea - a.minArea));
          first = ranked[Math.floor(random() * Math.min(4, ranked.length))];
        }

        if (first) {
          ordered.push(first);
          remaining.splice(remaining.indexOf(first), 1);
          for (const net of first.realNets) placedNets.add(net.index);
        }

        while (remaining.length) {
          let best = null;
          for (const meta of remaining) {
            const shared = meta.realNets.filter(net => placedNets.has(net.index));
            const sharedWeight = shared.reduce((sum, net) => sum + Math.min(8, net.nodes.length), 0);
            const score = shared.length * 130 + sharedWeight * 10 + meta.realNets.length * 7 + meta.maxPins * 3 + random() * 18 - meta.schematicOrder / 100000000;
            if (!best || score > best.score) best = { meta, score };
          }
          const next = best.meta;
          ordered.push(next);
          remaining.splice(remaining.indexOf(next), 1);
          for (const net of next.realNets) placedNets.add(net.index);
        }

        return ordered;
      }

function sameRowConnectionScore(rowContacts, netIndex, x, existingX) {
        const left = Math.min(x, existingX);
        const right = Math.max(x, existingX);
        const blocked = rowContacts.some(contact => contact.netIndex !== netIndex && contact.x > left && contact.x < right);
        return blocked ? -7 + Math.abs(existingX - x) * .22 : -29 + Math.abs(existingX - x) * .18;
      }

function passiveFootprintSpan(footprint) {
        const pins = (footprint?.pins || []).filter(pin => pin.logical);
        if (pins.length < 2) return 0;
        return Math.max(Math.abs(pins[0].x - pins[1].x), Math.abs(pins[0].y - pins[1].y));
      }

function passiveOrientationBias(component, footprint, scale = 1) {
        const orientation = String(footprint?.orientation || "");
        const horizontal = orientation.startsWith("horizontal");
        const vertical = orientation.startsWith("vertical");
        const span = passiveFootprintSpan(footprint);
        if (component?.type === "resistor") {
          // Horizontal axial resistors are still legal as an escape hatch, but
          // vertical placement is the normal stripboard choice. A longer
          // vertical resistor is gently favoured because it may replace a link.
          if (horizontal) return (15 + Math.max(0, span - 3) * .35) * scale;
          if (vertical && span <= 2 && state.boardSettings.standingResistors === true) return -5.8 * scale;
          if (vertical) return -3.2 * scale;
        }
        if (component?.type === "capacitor" || component?.type === "capacitorPolarized") {
          // Capacitors may be horizontal, though vertical lead stretching is
          // preferred when it joins existing rows without increasing the board.
          if (horizontal) return 1.35 * scale;
          if (vertical) return -.7 * scale;
        }
        return 0;
      }

function passiveBridgeAlignmentBonus(component, footprint, x, y, meta, contactsByNet, scale = 1) {
        if (!["resistor", "capacitor", "capacitorPolarized"].includes(component?.type)) return 0;
        if (!String(footprint?.orientation || "").startsWith("vertical")) return 0;
        const logicalPins = (footprint.pins || []).filter(pin => pin.logical && meta.pinNets.get(pin.logical));
        if (logicalPins.length !== 2) return 0;

        let rowsMatched = 0;
        let proximity = 0;
        for (const pin of logicalPins) {
          const net = meta.pinNets.get(pin.logical);
          const targets = contactsByNet.get(net.index) || [];
          const pinX = x + pin.x;
          const pinY = y + pin.y;
          const sameRow = targets.filter(target => target.y === pinY);
          if (!sameRow.length) continue;
          rowsMatched += 1;
          proximity += Math.min(...sameRow.map(target => Math.abs(target.x - pinX)));
        }

        const resistor = component.type === "resistor";
        if (rowsMatched === 2) {
          const base = resistor ? -20 : -8.5;
          return (base + Math.min(12, proximity) * (resistor ? .16 : .1)) * scale;
        }
        if (rowsMatched === 1) return (resistor ? -4.2 : -1.8) * scale;
        return 0;
      }

function buildGreedyPlacement(metadata, width, heightLimit, clearance, random, trialIndex, forceLegacyScoring = false) {
        const ordered = placementOrder(metadata, random, trialIndex);
        const placements = [];
        const rectangles = [];
        const contactsByNet = new Map();
        const contactsByRow = new Map();
        let maxX = 0;
        let maxY = 0;

        for (const meta of ordered) {
          let best = null;
          for (const footprint of meta.variants) {
            if (footprint.width > width || footprint.height > heightLimit) continue;
            for (let y = 0; y <= heightLimit - footprint.height; y += 1) {
              for (let x = 0; x <= width - footprint.width; x += 1) {
                const rectangle = { x, y, width: footprint.width, height: footprint.height };
                if (rectangles.some(existing => rectanglesOverlap(rectangle, existing, clearance))) continue;

                const nextMaxX = Math.max(maxX, x + footprint.width);
                const nextMaxY = Math.max(maxY, y + footprint.height);
                // Most trials are strongly area-biased, while a minority keep
                // the older connectivity-first weighting. The latter provide a
                // robust fallback for dense or awkward netlists where an overly
                // tight early placement leaves no legal cut or jumper landing.
                const placementMode = forceLegacyScoring ? 5 : trialIndex % 6;
                const areaWeight = placementMode <= 2 ? 3.4 : placementMode <= 4 ? 2.05 : 1.28;
                let score = nextMaxX * nextMaxY * areaWeight + nextMaxX * (placementMode <= 2 ? .22 : .08) + nextMaxY * (placementMode <= 2 ? .28 : .16) + x * (placementMode <= 2 ? .025 : .04) + y * (placementMode <= 2 ? .035 : .06);

                let invalidCopperSpacing = false;
                for (const pin of footprint.pins) {
                  if (!pin.logical) continue;
                  const net = meta.pinNets.get(pin.logical);
                  if (!net) continue;
                  const pinX = x + pin.x;
                  const pinY = y + pin.y;
                  const rowContacts = contactsByRow.get(pinY) || [];
                  if (rowContacts.some(contact => contact.netIndex !== net.index && Math.abs(contact.x - pinX) <= 1)) {
                    invalidCopperSpacing = true;
                    break;
                  }
                  const existing = contactsByNet.get(net.index) || [];
                  if (existing.length) {
                    let bestPinScore = Infinity;
                    for (const contact of existing) {
                      let candidateScore;
                      if (contact.y === pinY) {
                        candidateScore = sameRowConnectionScore(contactsByRow.get(pinY) || [], net.index, pinX, contact.x);
                      } else if (contact.x === pinX) {
                        candidateScore = Math.abs(contact.y - pinY) * 2.35 - 5;
                      } else {
                        candidateScore = Math.abs(contact.y - pinY) * 4.15 + Math.abs(contact.x - pinX) * .42;
                      }
                      bestPinScore = Math.min(bestPinScore, candidateScore);
                    }
                    score += bestPinScore;
                  } else {
                    score += pinY * .1;
                  }

                  if (rowContacts.length) {
                    const nearestDifferent = rowContacts
                      .filter(contact => contact.netIndex !== net.index)
                      .reduce((nearest, contact) => Math.min(nearest, Math.abs(contact.x - pinX)), Infinity);
                    if (nearestDifferent <= 1) score += 1.2;
                    else if (nearestDifferent === 2 && placementMode <= 2) score -= 1.1;
                    else if (nearestDifferent < Infinity) score += placementMode <= 2 ? .05 : .12;
                  }
                }

                if (invalidCopperSpacing) continue;
                score += passiveOrientationBias(meta.component, footprint, 1);
                score += passiveBridgeAlignmentBonus(meta.component, footprint, x, y, meta, contactsByNet, 1);
                if (!["resistor", "capacitor", "capacitorPolarized"].includes(meta.component.type) && String(footprint.orientation).startsWith("vertical")) score -= .25;
                score += random() * (placementMode <= 2 ? 1.15 : 3.2);
                if (!best || score < best.score) best = { score, x, y, footprint };
              }
            }
          }

          if (!best) return null;

          const placement = {
            component: meta.component,
            footprint: best.footprint,
            x: best.x,
            y: best.y
          };
          placements.push(placement);
          rectangles.push({ x: best.x, y: best.y, width: best.footprint.width, height: best.footprint.height });
          maxX = Math.max(maxX, best.x + best.footprint.width);
          maxY = Math.max(maxY, best.y + best.footprint.height);

          for (const pin of best.footprint.pins) {
            if (!pin.logical) continue;
            const net = meta.pinNets.get(pin.logical);
            if (!net) continue;
            const contact = { x: best.x + pin.x, y: best.y + pin.y, netIndex: net.index };
            if (!contactsByNet.has(net.index)) contactsByNet.set(net.index, []);
            contactsByNet.get(net.index).push(contact);
            if (!contactsByRow.has(contact.y)) contactsByRow.set(contact.y, []);
            contactsByRow.get(contact.y).push(contact);
          }
        }

        return placements;
      }

function segmentAvailableHoleXs(segment, occupiedBodyCells) {
        const contactXs = new Set(segment.contacts.map(contact => contact.x));
        const holes = [];
        for (let x = segment.start; x <= segment.end; x += 1) {
          // Jumper leads require dedicated holes. A component pin, an external
          // terminal pad, or a hole covered by a component body is unavailable.
          if (contactXs.has(x)) continue;
          if (occupiedBodyCells.has(`${x},${segment.row}`)) continue;
          holes.push(x);
        }
        return holes;
      }

function segmentEndpointCandidates(segment, occupiedBodyCells) {
        const contactXs = segment.contacts.map(contact => contact.x);
        return segmentAvailableHoleXs(segment, occupiedBodyCells).map(x => {
          const nearestContact = contactXs.length
            ? Math.min(...contactXs.map(contactX => Math.abs(contactX - x)))
            : 0;
          // Prefer a free hole beside the pin/terminal it serves, while still
          // allowing the straightest and shortest practical jumper.
          return { x, penalty: Math.min(.8, nearestContact * .12) };
        });
      }

function endpointIsAccessible(segment, x, occupiedBodyCells) {
        if (x < segment.start || x > segment.end) return false;
        if (segment.contacts.some(contact => contact.x === x)) return false;
        return !occupiedBodyCells.has(`${x},${segment.row}`);
      }

function routeIntervalsOverlap(aStart, aEnd, bStart, bEnd) {
        return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
      }

function routeNetIndex(routeOrNet) {
        if (!routeOrNet) return null;
        if (Number.isFinite(routeOrNet.schematicNetIndex)) return routeOrNet.schematicNetIndex;
        if (Number.isFinite(routeOrNet.net?.index)) return routeOrNet.net.index;
        if (Number.isFinite(routeOrNet.index)) return routeOrNet.index;
        return null;
      }

function endpointUseEntries(useMap, key) {
        const value = useMap.get(key);
        return Array.isArray(value) ? value : [];
      }

function canUseLinkEndpoint(useMap, point, otherPoint, netIndex) {
        const key = `${point.x},${point.y}`;
        const entries = endpointUseEntries(useMap, key);
        if (!entries.length) return true;
        if (state.boardSettings.allowDoubleLinks === false || entries.length >= 2) return false;
        const existing = entries[0];
        if (existing.netIndex !== netIndex) return false;
        const oldDirection = Math.sign(existing.otherY - point.y);
        const newDirection = Math.sign(otherPoint.y - point.y);
        return oldDirection !== 0 && newDirection !== 0 && oldDirection !== newDirection;
      }

function addLinkEndpointUse(useMap, point, otherPoint, netIndex, routeIndex = null) {
        const key = `${point.x},${point.y}`;
        const entries = endpointUseEntries(useMap, key).slice();
        entries.push({ netIndex, otherY: otherPoint.y, routeIndex });
        useMap.set(key, entries);
      }

function removeLinkEndpointUse(useMap, point, routeIndex = null) {
        const key = `${point.x},${point.y}`;
        const entries = endpointUseEntries(useMap, key).slice();
        let index = routeIndex === null ? entries.length - 1 : entries.findIndex(entry => entry.routeIndex === routeIndex);
        if (index < 0) index = entries.length - 1;
        if (index >= 0) entries.splice(index, 1);
        if (entries.length) useMap.set(key, entries);
        else useMap.delete(key);
      }

function computeDoubleLinkHoles(routes = []) {
        const endpoints = new Map();
        routes.forEach((route, routeIndex) => {
          const points = route.points || [];
          if (points.length < 2) return;
          const netIndex = routeNetIndex(route);
          const first = points[0];
          const last = points[points.length - 1];
          [[first, last], [last, first]].forEach(([point, other]) => {
            const key = `${point.x},${point.y}`;
            if (!endpoints.has(key)) endpoints.set(key, []);
            endpoints.get(key).push({ routeIndex, netIndex, otherY: other.y, x: point.x, y: point.y });
          });
        });
        const result = [];
        for (const entries of endpoints.values()) {
          if (entries.length !== 2) continue;
          const [a, b] = entries;
          if (a.netIndex === null || a.netIndex !== b.netIndex) continue;
          const aDirection = Math.sign(a.otherY - a.y);
          const bDirection = Math.sign(b.otherY - b.y);
          if (!aDirection || !bDirection || aDirection === bDirection) continue;
          result.push({ x: a.x, y: a.y, netIndex: a.netIndex, routeIndexes: [a.routeIndex, b.routeIndex] });
        }
        return result.sort((a, b) => a.y - b.y || a.x - b.x);
      }

function edgeTerminalRowsByColumn(terminals = [], columns = 0) {
        const rowsByColumn = new Map();
        if (!Number.isFinite(columns) || columns < 1) return rowsByColumn;
        for (const terminal of terminals || []) {
          const x = terminal.side === "right" ? columns - 1 : 0;
          if (!rowsByColumn.has(x)) rowsByColumn.set(x, new Set());
          rowsByColumn.get(x).add(Number(terminal.row));
        }
        return rowsByColumn;
      }

function routeOverlapsEdgeTerminal(start, end, edgeTerminalRows, columns) {
        if (!start || !end || start.x !== end.x || !edgeTerminalRows?.size) return false;
        const x = start.x;
        if (x !== 0 && x !== columns - 1) return false;
        const terminalRows = edgeTerminalRows.get(x);
        if (!terminalRows?.size) return false;
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        for (const row of terminalRows) {
          if (row >= minY && row <= maxY) return true;
        }
        return false;
      }

function routeOverlapsLayoutEdgeTerminal(route, terminals, columns) {
        const points = route?.points || [];
        if (points.length < 2) return false;
        return routeOverlapsEdgeTerminal(
          points[0],
          points[points.length - 1],
          edgeTerminalRowsByColumn(terminals, columns),
          columns
        );
      }

function bestSegmentLink(
        segmentA,
        segmentB,
        occupiedBodyCells,
        endpointUse,
        linkObstacleCells = occupiedBodyCells,
        edgeTerminalRows = null,
        boardColumns = null
      ) {
        // Stripboard link wires remain vertical. When enabled, two links on the
        // same schematic net may share one endpoint hole only when they leave
        // that hole in opposite directions. This is the standard double-link
        // technique and never permits wires to overlap along their length.
        const candidatesA = new Map(segmentEndpointCandidates(segmentA, occupiedBodyCells).map(candidate => [candidate.x, candidate]));
        const candidatesB = new Map(segmentEndpointCandidates(segmentB, occupiedBodyCells).map(candidate => [candidate.x, candidate]));
        const netIndex = routeNetIndex(segmentA.net || segmentB.net);
        let best = null;

        for (const [x, candidateA] of candidatesA.entries()) {
          const candidateB = candidatesB.get(x);
          if (!candidateB) continue;
          const start = { x, y: segmentA.row };
          const end = { x, y: segmentB.row };
          if (Number.isFinite(boardColumns) && routeOverlapsEdgeTerminal(start, end, edgeTerminalRows, boardColumns)) continue;
          if (!canUseLinkEndpoint(endpointUse, start, end, netIndex)) continue;
          if (!canUseLinkEndpoint(endpointUse, end, start, netIndex)) continue;

          const obstacleCount = lineObstacleCount(start, end, linkObstacleCells);
          if (obstacleCount > 0) continue;
          const reusedEnds = (endpointUseEntries(endpointUse, `${start.x},${start.y}`).length ? 1 : 0) +
            (endpointUseEntries(endpointUse, `${end.x},${end.y}`).length ? 1 : 0);
          // Edge columns are reserved primarily for off-board connections.
          // They remain available only when the route does not cross an edge
          // terminal and no better interior landing column exists.
          const edgePenalty = Number.isFinite(boardColumns) && (x === 0 || x === boardColumns - 1) ? 40 : 0;
          const score = Math.abs(segmentA.row - segmentB.row) + candidateA.penalty + candidateB.penalty + edgePenalty - reusedEnds * 1.35;
          if (!best || score < best.score) best = { score, xA: x, xB: x };
        }
        return best;
      }

function assignNonOverlappingLinkColumns(
        routes,
        segments,
        occupiedBodyCells,
        linkObstacleCells = occupiedBodyCells,
        edgeTerminalRows = null,
        boardColumns = null
      ) {
        if (!routes.length) return true;
        const segmentById = new Map(segments.map(segment => [segment.id, segment]));
        const routeInfos = [];
        for (let index = 0; index < routes.length; index += 1) {
          const route = routes[index];
          const fromSegment = segmentById.get(route.fromSegment);
          const toSegment = segmentById.get(route.toSegment);
          if (!fromSegment || !toSegment || fromSegment.row === toSegment.row) return false;
          const startX = Math.max(fromSegment.start, toSegment.start);
          const endX = Math.min(fromSegment.end, toSegment.end);
          const currentX = route.points?.[0]?.x ?? startX;
          const minY = Math.min(fromSegment.row, toSegment.row);
          const maxY = Math.max(fromSegment.row, toSegment.row);
          const candidates = [];
          for (let x = startX; x <= endX; x += 1) {
            if (!endpointIsAccessible(fromSegment, x, occupiedBodyCells)) continue;
            if (!endpointIsAccessible(toSegment, x, occupiedBodyCells)) continue;
            const start = { x, y: fromSegment.row };
            const end = { x, y: toSegment.row };
            if (Number.isFinite(boardColumns) && routeOverlapsEdgeTerminal(start, end, edgeTerminalRows, boardColumns)) continue;
            const obstacleCount = lineObstacleCount({ x, y: minY }, { x, y: maxY }, linkObstacleCells);
            if (obstacleCount > 0) continue;
            const edgePenalty = Number.isFinite(boardColumns) && (x === 0 || x === boardColumns - 1) ? 40 : 0;
            candidates.push({ x, score: Math.abs(x - currentX) * .08 + edgePenalty });
          }
          if (!candidates.length) return false;
          candidates.sort((a, b) => a.score - b.score || a.x - b.x);
          routeInfos.push({ index, route, netIndex: routeNetIndex(route), fromSegment, toSegment, minY, maxY, candidates });
        }
        routeInfos.sort((a, b) => a.candidates.length - b.candidates.length || (b.maxY - b.minY) - (a.maxY - a.minY) || a.index - b.index);
        const endpointUse = new Map();
        const intervalsByColumn = new Map();
        const assignments = new Map();
        let explored = 0;
        const limit = state.boardSettings.allowDoubleLinks === false ? 45000 : 70000;
        const search = position => {
          if (position >= routeInfos.length) return true;
          if (++explored > limit) return false;
          const info = routeInfos[position];
          const orderedCandidates = info.candidates.map(candidate => {
            const start = { x: candidate.x, y: info.fromSegment.row };
            const end = { x: candidate.x, y: info.toSegment.row };
            const reuse = endpointUseEntries(endpointUse, `${start.x},${start.y}`).length + endpointUseEntries(endpointUse, `${end.x},${end.y}`).length;
            return { ...candidate, dynamicScore: candidate.score - reuse * 1.5 };
          }).sort((a, b) => a.dynamicScore - b.dynamicScore || a.x - b.x);

          for (const candidate of orderedCandidates) {
            const x = candidate.x;
            const start = { x, y: info.fromSegment.row };
            const end = { x, y: info.toSegment.row };
            if (!canUseLinkEndpoint(endpointUse, start, end, info.netIndex)) continue;
            if (!canUseLinkEndpoint(endpointUse, end, start, info.netIndex)) continue;
            const intervals = intervalsByColumn.get(x) || [];
            if (intervals.some(item => routeIntervalsOverlap(info.minY, info.maxY, item.minY, item.maxY))) continue;

            addLinkEndpointUse(endpointUse, start, end, info.netIndex, info.index);
            addLinkEndpointUse(endpointUse, end, start, info.netIndex, info.index);
            intervals.push({ minY: info.minY, maxY: info.maxY, routeIndex: info.index });
            intervalsByColumn.set(x, intervals);
            assignments.set(info.index, x);
            if (search(position + 1)) return true;
            assignments.delete(info.index);
            intervals.pop();
            if (!intervals.length) intervalsByColumn.delete(x);
            removeLinkEndpointUse(endpointUse, start, info.index);
            removeLinkEndpointUse(endpointUse, end, info.index);
          }
          return false;
        };
        if (!search(0)) return false;
        for (const info of routeInfos) {
          const x = assignments.get(info.index);
          info.route.points = [{ x, y: info.fromSegment.row }, { x, y: info.toSegment.row }];
          info.route.schematicNetIndex = info.netIndex;
        }
        return true;
      }

function findLinkRepairBoundary(routes, segments, occupiedBodyCells, placements, columns) {
        const segmentById = new Map(segments.map(segment => [segment.id, segment]));
        const involved = new Set();
        for (let i = 0; i < routes.length; i += 1) {
          const a = routes[i].points;
          if (!a?.length || a[0].x !== a[a.length - 1].x) continue;
          const aMin = Math.min(a[0].y, a[a.length - 1].y);
          const aMax = Math.max(a[0].y, a[a.length - 1].y);
          for (let j = i + 1; j < routes.length; j += 1) {
            const b = routes[j].points;
            if (!b?.length || b[0].x !== b[b.length - 1].x || a[0].x !== b[0].x) continue;
            const bMin = Math.min(b[0].y, b[b.length - 1].y);
            const bMax = Math.max(b[0].y, b[b.length - 1].y);
            if (routeIntervalsOverlap(aMin, aMax, bMin, bMax)) { involved.add(i); involved.add(j); }
          }
        }
        const routeIndexes = involved.size ? [...involved] : routes.map((_, index) => index);
        const options = [];
        for (const routeIndex of routeIndexes) {
          const route = routes[routeIndex];
          const fromSegment = segmentById.get(route.fromSegment);
          const toSegment = segmentById.get(route.toSegment);
          if (!fromSegment || !toSegment) continue;
          const sharedStart = Math.max(fromSegment.start, toSegment.start);
          const sharedEnd = Math.min(fromSegment.end, toSegment.end);
          let sharedAvailable = 0;
          for (let x = sharedStart; x <= sharedEnd; x += 1) {
            if (endpointIsAccessible(fromSegment, x, occupiedBodyCells) && endpointIsAccessible(toSegment, x, occupiedBodyCells)) sharedAvailable += 1;
          }
          for (const segment of [fromSegment, toSegment]) {
            for (const candidate of routingColumnCandidates(segment, placements, columns).slice(0, 8)) {
              const newHoleX = candidate.boundary + 1;
              if (newHoleX < segment.start || newHoleX > segment.end + 1) continue;
              options.push({ boundary: candidate.boundary, score: sharedAvailable * 50 + candidate.score + (segment.end - segment.start) * .15 });
            }
          }
        }
        options.sort((a, b) => a.score - b.score || a.boundary - b.boundary);
        return options[0]?.boundary ?? null;
      }

const LINK_AVOIDANCE_COMPONENT_TYPES = new Set([
        "resistor",
        "capacitor",
        "capacitorPolarized",
        "diode",
        "led",
        "potentiometer",
        "transistor",
        "voltageRegulator"
      ]);

function linkAvoidanceAppliesTo(component) {
        return Boolean(component && LINK_AVOIDANCE_COMPONENT_TYPES.has(component.type));
      }

function lineObstacleCount(a, b, occupiedBodyCells) {
        let count = 0;
        if (a.x === b.x) {
          const start = Math.min(a.y, b.y);
          const end = Math.max(a.y, b.y);
          for (let y = start + 1; y < end; y += 1) if (occupiedBodyCells.has(`${a.x},${y}`)) count += 1;
        } else if (a.y === b.y) {
          const start = Math.min(a.x, b.x);
          const end = Math.max(a.x, b.x);
          for (let x = start + 1; x < end; x += 1) if (occupiedBodyCells.has(`${x},${a.y}`)) count += 1;
        }
        return count;
      }

function buildCopperTopology(contacts, columns) {
        for (const contact of contacts) contact.segmentId = null;

        const contactsByRow = new Map();
        for (const contact of contacts) {
          if (!contactsByRow.has(contact.y)) contactsByRow.set(contact.y, []);
          contactsByRow.get(contact.y).push(contact);
        }

        const cuts = [];
        const cutKeys = new Set();
        const rowCutHoles = new Map();
        for (const [row, rowContactsUnsorted] of contactsByRow.entries()) {
          const rowContacts = rowContactsUnsorted.slice().sort((a, b) => a.x - b.x || a.netKey.localeCompare(b.netKey));
          const cutHoles = [];
          for (let index = 0; index < rowContacts.length - 1; index += 1) {
            const left = rowContacts[index];
            const right = rowContacts[index + 1];
            if (left.x === right.x) return null;
            if (left.netKey === right.netKey) continue;

            // A Vero cut is drilled through an unused hole, not drawn between
            // holes. Different nets therefore require at least one complete
            // empty hole between their nearest contacts.
            const firstCuttableHole = left.x + 1;
            const lastCuttableHole = right.x - 1;
            if (firstCuttableHole > lastCuttableHole) return null;
            const cutX = clamp(Math.floor((left.x + right.x) / 2), firstCuttableHole, lastCuttableHole);
            if (!cutHoles.includes(cutX)) cutHoles.push(cutX);
          }
          cutHoles.sort((a, b) => a - b);
          rowCutHoles.set(row, cutHoles);
          for (const cutX of cutHoles) {
            const key = `${cutX},${row}`;
            if (cutKeys.has(key)) continue;
            cutKeys.add(key);
            cuts.push({ x: cutX, y: row, hole: cutX });
          }
        }

        const segments = [];
        const segmentsByNet = new Map();
        for (const [row, rowContactsUnsorted] of contactsByRow.entries()) {
          const rowContacts = rowContactsUnsorted.slice().sort((a, b) => a.x - b.x);
          const cutHoles = rowCutHoles.get(row) || [];
          const starts = [0, ...cutHoles.map(cutX => cutX + 1)];
          const ends = [...cutHoles.map(cutX => cutX - 1), columns - 1];
          for (let index = 0; index < starts.length; index += 1) {
            const start = starts[index];
            const end = ends[index];
            if (start > end) continue;
            const segmentContacts = rowContacts.filter(contact => contact.x >= start && contact.x <= end);
            if (!segmentContacts.length) continue;
            const keys = new Set(segmentContacts.map(contact => contact.netKey));
            if (keys.size !== 1) return null;
            const net = segmentContacts[0].net;
            const segment = {
              id: `S${segments.length + 1}`,
              row,
              start,
              end,
              net,
              netKey: segmentContacts[0].netKey,
              contacts: segmentContacts
            };
            segments.push(segment);
            for (const contact of segmentContacts) contact.segmentId = segment.id;
            if (net) {
              if (!segmentsByNet.has(net.index)) segmentsByNet.set(net.index, []);
              segmentsByNet.get(net.index).push(segment);
            }
          }
        }

        return { contactsByRow, cuts, rowCutHoles, rowBoundaries: rowCutHoles, segments, segmentsByNet };
      }

function terminalPreferredSide(netName) {
        const upperName = normalizeNetLabel(netName);
        if (upperName.includes('OUTPUT') || upperName === 'OUT') return 'right';
        if (/^(GND|GROUND|0V|VSS|VEE|VCC|VDD|V\+|V−|V-|POWER|[+−-]?\d+(?:\.\d+)?V)$/.test(upperName)) return 'left';
        return null;
      }

function segmentCanHostDedicatedTerminal(segment, columns, occupiedBodyCells, preferredSide) {
        const sides = preferredSide ? [preferredSide] : ['left', 'right'];
        for (const side of sides) {
          const x = side === 'right' ? columns - 1 : 0;
          if (x < segment.start || x > segment.end) continue;
          if (segment.contacts.some(contact => contact.x === x)) continue;
          if (occupiedBodyCells.has(`${x},${segment.row}`)) continue;
          return true;
        }
        return false;
      }

function requiredLandingDefects(topology, occupiedBodyCells, externalTerminals, columns) {
        const terminalsByNet = new Map();
        for (const entry of externalTerminals) {
          if (!terminalsByNet.has(entry.net.index)) terminalsByNet.set(entry.net.index, []);
          terminalsByNet.get(entry.net.index).push(entry);
        }
        const defects = [];
        for (const [netIndex, segments] of topology.segmentsByNet.entries()) {
          const terminals = terminalsByNet.get(netIndex) || [];
          for (const segment of segments) {
            const needsInterSegmentLink = segments.length > 1;
            const canTakeAnyTerminalDirectly = terminals.some(terminal =>
              segmentCanHostDedicatedTerminal(
                segment,
                columns,
                occupiedBodyCells,
                terminal.preferredSide || terminalPreferredSide(terminal.net.name)
              )
            );
            const needsTerminalLink = terminals.length > 0 && !canTakeAnyTerminalDirectly;
            if (!needsInterSegmentLink && !needsTerminalLink) continue;
            if (segmentAvailableHoleXs(segment, occupiedBodyCells).length > 0) continue;
            defects.push({ segment, net: segment.net, needsInterSegmentLink, needsTerminalLink });
          }
        }
        return defects;
      }

function routingColumnCandidates(segment, placements, columns) {
        const boundaries = new Set([
          segment.start - 1,
          segment.start,
          segment.end - 1,
          segment.end
        ]);
        for (const contact of segment.contacts) {
          boundaries.add(contact.x - 1);
          boundaries.add(contact.x);
        }
        for (const placement of placements) {
          const left = placement.x;
          const right = placement.x + placement.footprint.width - 1;
          if (right < segment.start - 1 || left > segment.end + 1) continue;
          boundaries.add(left - 1);
          boundaries.add(right);
        }

        const contacts = segment.contacts.map(contact => contact.x);
        const center = contacts.length
          ? contacts.reduce((sum, x) => sum + x, 0) / contacts.length
          : (segment.start + segment.end) / 2;
        const candidates = [];
        for (const boundary of boundaries) {
          if (boundary < -1 || boundary >= columns) continue;
          const splitsComponent = placements.some(placement =>
            placement.x <= boundary && boundary < placement.x + placement.footprint.width - 1
          );
          if (splitsComponent) continue;
          const newHoleX = boundary + 1;
          const outsideDistance = newHoleX < segment.start
            ? segment.start - newHoleX
            : newHoleX > segment.end + 1
              ? newHoleX - (segment.end + 1)
              : 0;
          const contactsOnLeft = contacts.some(x => x <= boundary);
          const contactsOnRight = contacts.some(x => x > boundary);
          const betweenContactsBonus = contactsOnLeft && contactsOnRight ? -2.5 : 0;
          const edgePenalty = boundary === -1 || boundary === columns - 1 ? .5 : 0;
          const score = outsideDistance * 20 + Math.abs(newHoleX - center) + betweenContactsBonus + edgePenalty;
          candidates.push({ boundary, score });
        }
        candidates.sort((a, b) => a.score - b.score || a.boundary - b.boundary);
        return candidates;
      }

function insertRoutingColumn(placements, boundary) {
        return placements.map(placement => ({
          ...placement,
          x: placement.x > boundary ? placement.x + 1 : placement.x
        }));
      }

function selectEdgeTerminalPads(baseContacts, topology, columns, rows, externalTerminals, occupiedBodyCells) {
        if (!externalTerminals.length) return { contacts: baseContacts.slice(), terminals: [] };

        const contactByCoordinate = new Map(baseContacts.map(contact => [`${contact.x},${contact.y}`, contact]));
        const edgeSegmentBySlot = new Map();
        for (const segment of topology.segments) {
          if (segment.start === 0) edgeSegmentBySlot.set(`left:${segment.row}`, segment);
          if (segment.end === columns - 1) edgeSegmentBySlot.set(`right:${segment.row}`, segment);
        }

        const prepared = [];
        for (const entry of externalTerminals) {
          const preferredSide = entry.preferredSide || terminalPreferredSide(entry.net.name);
          const sameNetContacts = baseContacts.filter(contact => contact.net?.index === entry.net.index);
          const options = [];

          for (let row = 0; row < rows; row += 1) {
            for (const side of ['left', 'right']) {
              if (preferredSide && side !== preferredSide && !entry.allowAlternateSide) continue;
              const x = side === 'right' ? columns - 1 : 0;
              const coordinateKey = `${x},${row}`;
              const existingContact = contactByCoordinate.get(coordinateKey) || null;
              // An outside-board connection receives its own edge hole and may
              // never share a component pin hole.
              if (existingContact) continue;
              if (occupiedBodyCells.has(coordinateKey)) continue;

              const edgeSegment = edgeSegmentBySlot.get(`${side}:${row}`) || null;
              const directCopper = Boolean(edgeSegment?.net?.index === entry.net.index);

              // Simulate this terminal pad before accepting it. When its net
              // still has other copper segments to join, the terminal's segment
              // must retain at least one separate hole for an internal jumper.
              const candidateContact = {
                x,
                y: row,
                node: `EDGE-CANDIDATE:${entry.key || entry.component.id}`,
                logical: entry.pinName || '1',
                physical: 'EDGE',
                componentId: entry.component.id,
                net: entry.net,
                netKey: `NET:${entry.net.index}`,
                segmentId: null,
                isExternalTerminal: true
              };
              const simulatedContacts = baseContacts.map(contact => ({ ...contact }));
              simulatedContacts.push(candidateContact);
              const simulatedTopology = buildCopperTopology(simulatedContacts, columns);
              if (!simulatedTopology) continue;
              const simulatedSegment = simulatedTopology.segments.find(segment =>
                segment.row === row && x >= segment.start && x <= segment.end && segment.net?.index === entry.net.index
              );
              if (!simulatedSegment) continue;
              const simulatedNetSegments = simulatedTopology.segmentsByNet.get(entry.net.index) || [];
              const landingCapacity = segmentAvailableHoleXs(simulatedSegment, occupiedBodyCells).length;
              if (simulatedNetSegments.length > 1 && landingCapacity < 1) continue;

              const nearestDistance = sameNetContacts.length
                ? Math.min(...sameNetContacts.map(contact => Math.abs(contact.x - x) + Math.abs(contact.y - row)))
                : columns + rows;
              const sameRowDistance = sameNetContacts
                .filter(contact => contact.y === row)
                .reduce((nearest, contact) => Math.min(nearest, Math.abs(contact.x - x)), Infinity);

              let score = directCopper
                ? -18 - (edgeSegment?.contacts.length || 0) * .45 + nearestDistance * .03
                : 82 + nearestDistance * 1.75;
              if (preferredSide && side !== preferredSide) score += entry.isOffboardControl ? 14 : 40;

              if (!directCopper && Number.isFinite(sameRowDistance)) score -= Math.max(0, 12 - sameRowDistance * 1.5);
              if (edgeSegment && edgeSegment.net?.index !== entry.net.index) score += 7;
              if (edgeSegment && !edgeSegment.net) score += 10;
              if (!edgeSegment) score += 2.5;
              score -= Math.min(landingCapacity, 5) * .35;
              score += row * .015;

              options.push({
                side,
                row,
                x,
                score,
                slotKey: `${side}:${row}`,
                existingContact: null,
                directCopper,
                landingCapacity,
                preferredSide
              });
            }
          }

          options.sort((a, b) =>
            a.score - b.score ||
            Number(b.directCopper) - Number(a.directCopper) ||
            a.row - b.row ||
            a.side.localeCompare(b.side)
          );
          if (!options.length) return null;
          prepared.push({
            ...entry,
            preferredSide,
            allowAlternateSide: Boolean(entry.allowAlternateSide),
            options,
            directOptionCount: options.filter(option => option.directCopper).length
          });
        }

        prepared.sort((a, b) =>
          Number(Boolean(b.preferredSide)) - Number(Boolean(a.preferredSide)) ||
          a.directOptionCount - b.directOptionCount ||
          a.options[0].score - b.options[0].score ||
          a.net.name.localeCompare(b.net.name)
        );

        const usedSlots = new Set();
        const selected = [];
        for (const entry of prepared) {
          const choice = entry.options.find(option => !usedSlots.has(option.slotKey));
          if (!choice) return null;
          usedSlots.add(choice.slotKey);
          selected.push({
            component: entry.component,
            net: entry.net,
            key: entry.key || entry.component.id,
            label: entry.label || entry.net.name,
            pinName: entry.pinName || '1',
            pinNames: Array.isArray(entry.pinNames) && entry.pinNames.length ? [...entry.pinNames] : [entry.pinName || '1'],
            controlName: entry.controlName || '',
            isGroupedPotentiometerPins: Boolean(entry.isGroupedPotentiometerPins),
            isOffboardControl: Boolean(entry.isOffboardControl),
            side: choice.side,
            row: choice.row,
            x: choice.x,
            labelOffset: 0,
            existingContact: choice.existingContact,
            directCopper: choice.directCopper,
            segmentId: null
          });
        }

        const contacts = baseContacts.slice();
        for (const terminal of selected) {
          if (terminal.existingContact) continue;
          contacts.push({
            x: terminal.x,
            y: terminal.row,
            node: `EDGE:${terminal.key || terminal.component.id}`,
            logical: terminal.pinName || '1',
            physical: 'EDGE',
            componentId: terminal.component.id,
            net: terminal.net,
            netKey: `NET:${terminal.net.index}`,
            segmentId: null,
            isExternalTerminal: true
          });
        }

        return { contacts, terminals: selected };
      }

function normalizeMaximumRows(value) {
        if (value === undefined || value === null || String(value).trim() === "") return 18;
        const number = Number(value);
        return Number.isFinite(number) ? clamp(Math.floor(number), 4, 160) : 18;
      }

function evaluateCompactPlacement(
        rawPlacements,
        netData,
        activeNets,
        linkRepairDepth = 0,
        columnLimit = state.boardSettings.maxColumns,
        initialColumnsHint = null
      ) {
        if (!rawPlacements?.length) return null;

        const activeNetIndexes = new Set(activeNets.map(net => net.index));
        const externalTerminals = [];
        const seenTerminalNets = new Set();
        for (const component of state.components.filter(item => item.type === 'terminal' && terminalScopeOf(item) === 'offboard')) {
          const net = netData.pinToNet.get(pinKey(component.id, '1'));
          if (!net || !activeNetIndexes.has(net.index) || seenTerminalNets.has(net.index)) continue;
          seenTerminalNets.add(net.index);
          externalTerminals.push({
            component,
            net,
            key: component.id,
            pinName: '1',
            label: net.name,
            preferredSide: terminalPreferredSide(net.name),
            isOffboardControl: false
          });
        }
        const offboardRoutingPlan = buildOffboardControlRoutingPlan(netData, activeNetIndexes);
        externalTerminals.push(...offboardRoutingPlan.externalControlTerminals);
        const autoDescriptionLines = offboardRoutingPlan.autoDescriptionLines;

        const minX = Math.min(...rawPlacements.map(placement => placement.x));
        const minY = Math.min(...rawPlacements.map(placement => placement.y));
        const maxX = Math.max(...rawPlacements.map(placement => placement.x + placement.footprint.width - 1));
        const maxY = Math.max(...rawPlacements.map(placement => placement.y + placement.footprint.height - 1));
        const usedWidth = maxX - minX + 1;
        const usedHeight = maxY - minY + 1;
        const maximumColumns = clamp(Number(columnLimit) || 20, 8, 80);
        const maximumRows = state.boardSettings.busSpacing === 3 ? 160 : normalizeMaximumRows(state.boardSettings.maxRows);
        // Maximum board columns is a hard ceiling, never a starting width.
        // Begin with the smallest practical width for this placement and add
        // routing lanes only while the board remains within the ceiling.
        if (usedWidth > maximumColumns || usedHeight + state.boardSettings.spareRows > maximumRows) return null;
        const hintedColumns = Number.isFinite(initialColumnsHint) ? Math.round(initialColumnsHint) : usedWidth + 1;
        let columns = clamp(Math.max(usedWidth, hintedColumns), 4, maximumColumns);
        let rows = clamp(usedHeight + state.boardSettings.spareRows, 4, 160);
        // Distribute unused board columns around the placement. Keeping all
        // spare holes on the right left only one landing lane beside a lone
        // DIP package, which could force several links into the same column.
        const leftMargin = Math.max(0, Math.floor((columns - usedWidth) / 2));
        const shiftX = leftMargin - minX;
        // Use row A as real board space. The previous +1 offset reserved an
        // unnecessary empty row above every generated layout.
        const shiftY = -minY;

        let placements = rawPlacements.map(placement => ({
          component: placement.component,
          footprint: placement.footprint,
          x: placement.x + shiftX,
          y: placement.y + shiftY
        }));

        const buildPhysicalModel = () => {
          const baseContacts = [];
          const contactCoordinates = new Set();
          // Endpoint occupancy and route-crossing obstacles are intentionally
          // separate. Link endpoints must not land beneath ordinary component
          // bodies, but links may always pass beneath DIP ICs and op-amps. The
          // user-facing avoidance option applies only to resistors, capacitors,
          // diodes, and onboard LEDs.
          const occupiedBodyCells = new Set();
          const linkObstacleCells = new Set();
          for (const placement of placements) {
            const type = placement.component.type;
            const linksAlwaysAllowedUnderBody = type === "opamp" || type === "otherIC";
            const avoidThisBody = state.boardSettings.avoidLinksOverComponents !== false && linkAvoidanceAppliesTo(placement.component);
            for (let y = placement.y; y < placement.y + placement.footprint.height; y += 1) {
              for (let x = placement.x; x < placement.x + placement.footprint.width; x += 1) {
                const key = `${x},${y}`;
                if (!linksAlwaysAllowedUnderBody) occupiedBodyCells.add(key);
                if (avoidThisBody) linkObstacleCells.add(key);
              }
            }

            for (const pin of placement.footprint.pins) {
              const x = placement.x + pin.x;
              const y = placement.y + pin.y;
              const coordinateKey = `${x},${y}`;
              if (contactCoordinates.has(coordinateKey)) return null;
              contactCoordinates.add(coordinateKey);
              // Every physical lead hole is a hard link-path obstacle, including
              // op-amp and IC pins. Links may pass beneath the package body only
              // through genuinely unused interior holes.
              linkObstacleCells.add(coordinateKey);

              const syntheticSources = pin.logical && placement.component.boardPinSources
                ? (placement.component.boardPinSources[pin.logical] || [])
                : null;
              const node = pin.logical
                ? (syntheticSources?.[0] || pinKey(placement.component.id, pin.logical))
                : `${placement.component.id}:physical-${pin.physical}`;
              const candidateNets = pin.logical
                ? (syntheticSources ? syntheticSources.map(sourceNode => netData.pinToNet.get(sourceNode)).filter(Boolean) : [netData.pinToNet.get(node)].filter(Boolean))
                : [];
              const candidateNet = candidateNets.find(item => activeNetIndexes.has(item.index)) || null;
              const net = candidateNet && activeNetIndexes.has(candidateNet.index) ? candidateNet : null;
              baseContacts.push({
                x,
                y,
                node,
                logical: pin.logical,
                physical: pin.physical,
                componentId: placement.component.id,
                net,
                netKey: net ? `NET:${net.index}` : `NC:${node}:${pin.physical}`,
                segmentId: null
              });
            }
          }
          return { baseContacts, occupiedBodyCells, linkObstacleCells };
        };

        let baseContacts = null;
        let occupiedBodyCells = null;
        let linkObstacleCells = null;
        let preliminaryTopology = null;
        const maximumLandingRepairs = Math.min(48, Math.max(6, activeNets.length * 2, Math.ceil(rawPlacements.length * 1.5)));
        for (let repair = 0; repair <= maximumLandingRepairs; repair += 1) {
          const physicalModel = buildPhysicalModel();
          if (!physicalModel) return null;
          baseContacts = physicalModel.baseContacts;
          occupiedBodyCells = physicalModel.occupiedBodyCells;
          linkObstacleCells = physicalModel.linkObstacleCells;
          preliminaryTopology = buildCopperTopology(baseContacts, columns);
          if (!preliminaryTopology) return null;

          const defects = requiredLandingDefects(preliminaryTopology, occupiedBodyCells, externalTerminals, columns);
          if (!defects.length) break;
          if (repair === maximumLandingRepairs || columns >= maximumColumns) return null;

          const candidates = routingColumnCandidates(defects[0].segment, placements, columns);
          if (!candidates.length) return null;
          placements = insertRoutingColumn(placements, candidates[0].boundary);
          columns += 1;
        }

        let terminalSelection = null;
        for (let attempt = 0; attempt <= Math.max(4, externalTerminals.length + 1); attempt += 1) {
          terminalSelection = selectEdgeTerminalPads(
            baseContacts,
            preliminaryTopology,
            columns,
            rows,
            externalTerminals,
            occupiedBodyCells
          );
          if (terminalSelection) break;
          if (rows >= maximumRows) break;
          rows += 1;
        }
        if (!terminalSelection) return null;

        // External pads occupy the first or last board column. A vertical
        // internal link may use an edge column only when its complete span is
        // clear of every off-board pad on that edge. This prevents links from
        // running through INPUT, OUTPUT, power, ground, pot, or switch leads.
        const edgeTerminalRows = edgeTerminalRowsByColumn(terminalSelection.terminals, columns);

        const topology = buildCopperTopology(terminalSelection.contacts, columns);
        if (!topology) return null;
        const { cuts, segments, segmentsByNet } = topology;

        const routes = [];
        const endpointUse = new Map();
        let totalLinkLength = 0;
        const occupiedRows = new Set([...occupiedBodyCells].map(key => Number(key.slice(key.lastIndexOf(",") + 1))));
        const routingBusRows = new Set();

        const reserveRouteEndpoints = (useMap, start, end, net, routeIndex = null) => {
          const netIndex = routeNetIndex(net);
          addLinkEndpointUse(useMap, start, end, netIndex, routeIndex);
          addLinkEndpointUse(useMap, end, start, netIndex, routeIndex);
        };

        const appendVerticalRoute = (net, fromSegment, toSegment, link, isRoutingBusLink = false) => {
          const start = { x: link.xA, y: fromSegment.row };
          const end = { x: link.xB, y: toSegment.row };
          const routeIndex = routes.length;
          routes.push({
            node: `${net.name} link ${routeIndex + 1}`,
            net,
            schematicNetIndex: net.index,
            fromSegment: fromSegment.id,
            toSegment: toSegment.id,
            points: [start, end],
            isRoutingBusLink
          });
          totalLinkLength += Math.abs(start.y - end.y);
          reserveRouteEndpoints(endpointUse, start, end, net, routeIndex);
        };

        const allocateRoutingBusRow = () => {
          for (let row = 0; row < rows; row += 1) {
            const rowAlreadyHasCopperNet = segments.some(segment => segment.row === row);
            if (!rowAlreadyHasCopperNet && !occupiedRows.has(row) && !routingBusRows.has(row)) {
              routingBusRows.add(row);
              return row;
            }
          }
          if (rows >= maximumRows) return null;
          const row = rows;
          rows += 1;
          routingBusRows.add(row);
          return row;
        };

        for (const net of activeNets) {
          const netSegments = (segmentsByNet.get(net.index) || []).slice();
          if (netSegments.length <= 1) continue;

          const landingCapacity = netSegments.map(segment => segmentAvailableHoleXs(segment, occupiedBodyCells).length);
          if (landingCapacity.some(capacity => capacity < 1)) return null;

          // Start with the segment that has the most spare holes. Direct links
          // are used only when two copper segments share a free column.
          let rootIndex = 0;
          for (let index = 1; index < landingCapacity.length; index += 1) {
            if (landingCapacity[index] > landingCapacity[rootIndex]) rootIndex = index;
          }
          const connected = new Set([rootIndex]);
          const remaining = new Set(netSegments.map((_, index) => index).filter(index => index !== rootIndex));

          while (remaining.size) {
            const capacityLevels = [...new Set([...remaining].map(index => landingCapacity[index]))].sort((a, b) => a - b);
            let best = null;
            for (const capacity of capacityLevels) {
              for (const toIndex of remaining) {
                if (landingCapacity[toIndex] !== capacity) continue;
                for (const fromIndex of connected) {
                  const link = bestSegmentLink(
                    netSegments[fromIndex],
                    netSegments[toIndex],
                    occupiedBodyCells,
                    new Map(),
                    linkObstacleCells,
                    edgeTerminalRows,
                    columns
                  );
                  if (!link) continue;
                  if (!best || link.score < best.link.score) best = { fromIndex, toIndex, link };
                }
              }
              if (best) break;
            }

            if (best) {
              const fromSegment = netSegments[best.fromIndex];
              const toSegment = netSegments[best.toIndex];
              appendVerticalRoute(net, fromSegment, toSegment, best.link, false);
              connected.add(best.toIndex);
              remaining.delete(best.toIndex);
              continue;
            }

            // The remaining copper pieces do not overlap in a usable column.
            // Add a dedicated horizontal copper routing strip and reach it only
            // with vertical links. No horizontal jumper wire is introduced.
            const busRow = allocateRoutingBusRow();
            if (busRow === null) return null;
            const busSegment = {
              id: `S${segments.length + 1}`,
              row: busRow,
              start: 0,
              end: columns - 1,
              net,
              netKey: `NET:${net.index}`,
              contacts: [],
              isRoutingBus: true
            };

            const groups = [
              [...connected],
              ...[...remaining].map(index => [index])
            ];
            const plannedUse = new Map();
            const plannedLinks = [];
            let busPlanValid = true;
            let failedBusGroup = null;

            for (const group of groups) {
              let groupBest = null;
              for (const segmentIndex of group) {
                const link = bestSegmentLink(
                  netSegments[segmentIndex],
                  busSegment,
                  occupiedBodyCells,
                  new Map(),
                  linkObstacleCells,
                  edgeTerminalRows,
                  columns
                );
                if (!link) continue;
                if (!groupBest || link.score < groupBest.link.score) groupBest = { segmentIndex, link };
              }
              if (!groupBest) {
                busPlanValid = false;
                failedBusGroup = group;
                break;
              }
              const sourceSegment = netSegments[groupBest.segmentIndex];
              const start = { x: groupBest.link.xA, y: sourceSegment.row };
              const end = { x: groupBest.link.xB, y: busSegment.row };
              reserveRouteEndpoints(plannedUse, start, end, net, routes.length + plannedLinks.length);
              plannedLinks.push({ sourceSegment, link: groupBest.link });
            }

            if (!busPlanValid) {
              // A compact placement can have the correct row topology but no
              // unobstructed vertical landing lane for one bus connection.
              // Add one clean routing column beside the blocked segment and
              // retry the complete physical evaluation. This is preferable to
              // discarding an otherwise dense component arrangement.
              if (linkRepairDepth >= 10 || columns >= maximumColumns || !failedBusGroup?.length) return null;
              let repairCandidates = [];
              for (const segmentIndex of failedBusGroup) {
                repairCandidates.push(...routingColumnCandidates(netSegments[segmentIndex], placements, columns));
              }
              repairCandidates.sort((a, b) => a.score - b.score || a.boundary - b.boundary);
              const repair = repairCandidates[0];
              if (!repair) return null;
              return evaluateCompactPlacement(
                insertRoutingColumn(placements, repair.boundary),
                netData,
                activeNets,
                linkRepairDepth + 1,
                maximumColumns,
                Math.min(maximumColumns, columns + 1)
              );
            }
            segments.push(busSegment);
            if (!segmentsByNet.has(net.index)) segmentsByNet.set(net.index, []);
            segmentsByNet.get(net.index).push(busSegment);
            endpointUse.clear();
            for (const [key, value] of plannedUse.entries()) endpointUse.set(key, value);

            for (const planned of plannedLinks) {
              const start = { x: planned.link.xA, y: planned.sourceSegment.row };
              const end = { x: planned.link.xB, y: busSegment.row };
              routes.push({
                node: `${net.name} link ${routes.length + 1}`,
                net,
                schematicNetIndex: net.index,
                fromSegment: planned.sourceSegment.id,
                toSegment: busSegment.id,
                points: [start, end],
                isRoutingBusLink: true
              });
              totalLinkLength += Math.abs(start.y - end.y);
            }

            connected.clear();
            for (let index = 0; index < netSegments.length; index += 1) connected.add(index);
            remaining.clear();
          }
        }

        if (!assignNonOverlappingLinkColumns(
          routes,
          segments,
          occupiedBodyCells,
          linkObstacleCells,
          edgeTerminalRows,
          columns
        )) {
          if (linkRepairDepth >= 10 || columns >= maximumColumns) return null;
          const boundary = findLinkRepairBoundary(routes, segments, occupiedBodyCells, placements, columns);
          if (boundary === null) return null;
          return evaluateCompactPlacement(
            insertRoutingColumn(placements, boundary),
            netData,
            activeNets,
            linkRepairDepth + 1,
            maximumColumns,
            Math.min(maximumColumns, columns + 1)
          );
        }

        // Final hard guarantees. Generated links may never cross protected
        // discrete packages, and edge-column links may never pass through an
        // off-board connection pad. These checks run after global link-column
        // assignment so no later routing step can reintroduce either fault.
        if (state.boardSettings.avoidLinksOverComponents !== false &&
            routes.some(route => placements.some(placement => routeCrossesAvoidedComponent(route, placement, true)))) {
          return null;
        }
        if (routes.some(route => routeCrossesAnyComponentPin(route, placements, true))) {
          return null;
        }
        if (routes.some(route => routeOverlapsLayoutEdgeTerminal(route, terminalSelection.terminals, columns))) {
          return null;
        }

        const doubleLinks = computeDoubleLinkHoles(routes);

        const terminals = terminalSelection.terminals.map(terminal => {
          const segment = segments.find(candidate =>
            candidate.row === terminal.row &&
            terminal.x >= candidate.start &&
            terminal.x <= candidate.end &&
            candidate.net?.index === terminal.net.index
          );
          if (!segment) return null;
          const { existingContact, ...terminalData } = terminal;
          return { ...terminalData, segmentId: segment.id };
        });
        if (terminals.some(terminal => !terminal)) return null;

        const busRows = new Map();
        for (const net of activeNets) {
          const candidates = segmentsByNet.get(net.index) || [];
          if (!candidates.length) continue;
          const primary = candidates.slice().sort((a, b) => b.contacts.length - a.contacts.length || (b.end - b.start) - (a.end - a.start) || a.row - b.row)[0];
          busRows.set(net.name, primary.row);
        }

        const realSegments = segments.filter(segment => segment.net);
        const area = columns * rows;
        // Board area is the dominant objective. Track cuts are intentionally cheap:
        // on stripboard they are the normal way to reuse a row and are preferable
        // to buying four or five extra columns merely to avoid a cut. Links and
        // link length remain secondary tie-breakers so equally small boards stay
        // practical to assemble.
        const longestSide = Math.max(columns, rows);
        const perimeter = columns + rows;
        const fragmentation = Math.max(0, realSegments.length - activeNets.length);
        const passiveMetrics = layoutPassiveMetrics({ placements });
        const cost = area * 8 + routes.length * 12 + passiveMetrics.horizontalResistors * 26 +
          passiveMetrics.horizontalCapacitors * 2 + longestSide * .12 + perimeter * .035 +
          totalLinkLength * .08 + cuts.length * .08 + fragmentation * .12;

        return {
          error: null,
          columns,
          rows,
          activeNets,
          busRows,
          placements,
          routes,
          doubleLinks,
          cuts,
          terminals,
          segments,
          netData,
          autoDescriptionLines,
          totalLinkLength,
          cost,
          sourcePlacements: placements.map(placement => ({
            component: placement.component,
            footprint: placement.footprint,
            x: placement.x - shiftX,
            y: placement.y - shiftY
          }))
        };
      }

function rawPlacementContacts(placements, metadataById) {
        const contactsByNet = new Map();
        for (const placement of placements) {
          const meta = metadataById.get(placement.component.id);
          if (!meta) continue;
          for (const pin of placement.footprint.pins) {
            if (!pin.logical) continue;
            const net = meta.pinNets.get(pin.logical);
            if (!net) continue;
            if (!contactsByNet.has(net.index)) contactsByNet.set(net.index, []);
            contactsByNet.get(net.index).push({ x: placement.x + pin.x, y: placement.y + pin.y, componentId: placement.component.id });
          }
        }
        return contactsByNet;
      }

function layoutPassiveMetrics(layout) {
        let horizontalResistors = 0;
        let horizontalCapacitors = 0;
        let stretchedVerticalPassives = 0;
        for (const placement of layout?.placements || []) {
          const type = placement.component?.type;
          const orientation = String(placement.footprint?.orientation || "");
          const span = passiveFootprintSpan(placement.footprint);
          if (type === "resistor") {
            if (orientation.startsWith("horizontal")) horizontalResistors += 1;
            else if (orientation.startsWith("vertical") && span > 3) stretchedVerticalPassives += 1;
          } else if (type === "capacitor" || type === "capacitorPolarized") {
            if (orientation.startsWith("horizontal")) horizontalCapacitors += 1;
            else if (orientation.startsWith("vertical") && span > 1) stretchedVerticalPassives += 1;
          }
        }
        return { horizontalResistors, horizontalCapacitors, stretchedVerticalPassives };
      }

function layoutQualityTuple(layout) {
        if (!layout || layout.error) return [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];
        const area = layout.columns * layout.rows;
        const longestSide = Math.max(layout.columns, layout.rows);
        const perimeter = layout.columns + layout.rows;
        const links = layout.routes?.length || 0;
        const linkLength = layout.totalLinkLength || 0;
        const cuts = layout.cuts?.length || 0;
        const realSegments = layout.segments?.filter(segment => segment.net).length || 0;
        const fragmentation = Math.max(0, realSegments - (layout.activeNets?.length || 0));
        const passive = layoutPassiveMetrics(layout);
        // A link consumes two landing holes and adds assembly work, while a
        // horizontal resistor is usually a missed opportunity to bridge rows.
        // Treat those as a small amount of effective board area. This allows a
        // layout to grow by only a couple of holes when that removes a complete
        // jumper, while still keeping physical board area dominant.
        const effectiveArea = area + links * 1.5 + passive.horizontalResistors * 3.5 + passive.horizontalCapacitors * .25;
        return [effectiveArea, area, links, passive.horizontalResistors, longestSide, perimeter, linkLength, passive.horizontalCapacitors, cuts, fragmentation];
      }

function compareLayoutQuality(candidate, incumbent) {
        if (!incumbent) return -1;
        const a = layoutQualityTuple(candidate);
        const b = layoutQualityTuple(incumbent);
        for (let index = 0; index < a.length; index += 1) {
          if (Math.abs(a[index] - b[index]) < 1e-9) continue;
          return a[index] < b[index] ? -1 : 1;
        }
        return (candidate?.cost || Infinity) - (incumbent?.cost || Infinity);
      }

function isLayoutBetter(candidate, incumbent) {
        return compareLayoutQuality(candidate, incumbent) < 0;
      }

function rawPlacementBounds(placements) {
        const minX = Math.min(...placements.map(placement => placement.x));
        const minY = Math.min(...placements.map(placement => placement.y));
        const maxX = Math.max(...placements.map(placement => placement.x + placement.footprint.width - 1));
        const maxY = Math.max(...placements.map(placement => placement.y + placement.footprint.height - 1));
        return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
      }

function normalizeRawPlacements(placements) {
        const bounds = rawPlacementBounds(placements);
        return placements.map(placement => ({
          ...placement,
          x: placement.x - bounds.minX,
          y: placement.y - bounds.minY
        }));
      }

function rawPlacementsOverlap(placements, clearance) {
        for (let a = 0; a < placements.length; a += 1) {
          const first = placements[a];
          const firstRect = { x: first.x, y: first.y, width: first.footprint.width, height: first.footprint.height };
          for (let b = a + 1; b < placements.length; b += 1) {
            const second = placements[b];
            if (rectanglesOverlap(firstRect, {
              x: second.x,
              y: second.y,
              width: second.footprint.width,
              height: second.footprint.height
            }, clearance)) return true;
          }
        }
        return false;
      }

function quickRelocationScore(candidate, others, meta, contactsByNet, contactsByRow) {
        const combined = [...others, candidate];
        const bounds = rawPlacementBounds(combined);
        let score = bounds.width * bounds.height * 42 + Math.max(bounds.width, bounds.height) * 1.4 + (bounds.width + bounds.height) * .32;

        for (const pin of candidate.footprint.pins) {
          if (!pin.logical) continue;
          const net = meta.pinNets.get(pin.logical);
          if (!net) continue;
          const x = candidate.x + pin.x;
          const y = candidate.y + pin.y;
          const targets = contactsByNet.get(net.index) || [];
          if (targets.length) {
            const sameRowDistance = targets.filter(target => target.y === y).reduce((nearest, target) => Math.min(nearest, Math.abs(target.x - x)), Infinity);
            const sameColumnDistance = targets.filter(target => target.x === x).reduce((nearest, target) => Math.min(nearest, Math.abs(target.y - y)), Infinity);
            const manhattan = targets.reduce((nearest, target) => Math.min(nearest, Math.abs(target.x - x) + Math.abs(target.y - y)), Infinity);
            if (Number.isFinite(sameRowDistance)) score -= 17 - Math.min(12, sameRowDistance) * .18;
            else if (Number.isFinite(sameColumnDistance)) score -= 5.2 - Math.min(12, sameColumnDistance) * .12;
            else score += manhattan * .18;
          }

          const rowContacts = contactsByRow.get(y) || [];
          const nearestDifferent = rowContacts
            .filter(contact => contact.netIndex !== net.index)
            .reduce((nearest, contact) => Math.min(nearest, Math.abs(contact.x - x)), Infinity);
          if (nearestDifferent <= 1) return Infinity;
          if (nearestDifferent === 2) score -= .9;
        }

        // Make bridge-capable vertical passives survive the relocation
        // shortlist. The larger scale is appropriate here because this score
        // contains a 42-point cost per bounding-box cell.
        score += passiveOrientationBias(candidate.component, candidate.footprint, 4.8);
        score += passiveBridgeAlignmentBonus(candidate.component, candidate.footprint, candidate.x, candidate.y, meta, contactsByNet, 5.2);

        // Small deterministic tie-breakers keep the result stable and gently
        // pull parts toward the top-left without overriding electrical packing.
        score += candidate.x * .018 + candidate.y * .024 + candidate.footprint.width * .006 + candidate.footprint.height * .008;
        return score;
      }

function compactPlacementSweeps(initialLayout, metadata, netData, activeNets, clearance) {
        if (!initialLayout?.sourcePlacements?.length) return initialLayout;
        const metadataById = new Map(metadata.map(meta => [meta.component.id, meta]));
        let currentLayout = initialLayout;
        let currentPlacements = normalizeRawPlacements(initialLayout.sourcePlacements.map(placement => ({ ...placement })));
        const passes = 1;
        const fullCandidatesPerPart = metadata.length <= 14 ? 8 : 8;

        for (let pass = 0; pass < passes; pass += 1) {
          let changed = false;
          const order = currentPlacements.map((placement, index) => ({ placement, index })).sort((a, b) => {
            if (pass % 2 === 0) {
              const rightA = a.placement.x + a.placement.footprint.width;
              const rightB = b.placement.x + b.placement.footprint.width;
              return rightB - rightA || b.placement.footprint.width * b.placement.footprint.height - a.placement.footprint.width * a.placement.footprint.height;
            }
            return b.placement.footprint.width * b.placement.footprint.height - a.placement.footprint.width * a.placement.footprint.height || b.placement.y - a.placement.y;
          });

          for (const orderedItem of order) {
            const index = orderedItem.index;
            const original = currentPlacements[index];
            const meta = metadataById.get(original.component.id);
            if (!meta) continue;
            const others = currentPlacements.filter((_, placementIndex) => placementIndex !== index);
            const bounds = rawPlacementBounds(currentPlacements);
            const searchWidth = Math.min(Math.max(1, state.boardSettings.maxColumns - 1), bounds.width + 1);
            const searchHeight = bounds.height + (pass === 0 ? 0 : 1);
            const contactsByNet = rawPlacementContacts(others, metadataById);
            const contactsByRow = new Map();
            for (const [netIndex, contacts] of contactsByNet.entries()) {
              for (const contact of contacts) {
                if (!contactsByRow.has(contact.y)) contactsByRow.set(contact.y, []);
                contactsByRow.get(contact.y).push({ ...contact, netIndex });
              }
            }

            const ranked = [];
            const seen = new Set();
            for (const footprint of meta.variants) {
              if (footprint.width > searchWidth || footprint.height > searchHeight) continue;
              const maxX = searchWidth - footprint.width;
              const maxY = searchHeight - footprint.height;
              for (let y = 0; y <= maxY; y += 1) {
                for (let x = 0; x <= maxX; x += 1) {
                  const key = `${footprint.key}:${x}:${y}`;
                  if (seen.has(key)) continue;
                  seen.add(key);
                  const rectangle = { x, y, width: footprint.width, height: footprint.height };
                  if (others.some(placement => rectanglesOverlap(rectangle, {
                    x: placement.x,
                    y: placement.y,
                    width: placement.footprint.width,
                    height: placement.footprint.height
                  }, clearance))) continue;
                  const candidate = { component: original.component, footprint, x, y };
                  const score = quickRelocationScore(candidate, others, meta, contactsByNet, contactsByRow);
                  if (!Number.isFinite(score)) continue;
                  ranked.push({ candidate, score });
                }
              }
            }

            ranked.sort((a, b) => a.score - b.score || a.candidate.y - b.candidate.y || a.candidate.x - b.candidate.x || a.candidate.footprint.key.localeCompare(b.candidate.footprint.key));
            const passiveCandidateLimit = ["resistor", "capacitor", "capacitorPolarized"].includes(original.component.type)
              ? Math.max(fullCandidatesPerPart, metadata.length <= 20 ? 14 : 12)
              : fullCandidatesPerPart;
            const shortlist = ranked.slice(0, passiveCandidateLimit);
            if (!shortlist.some(entry => entry.candidate.x === original.x && entry.candidate.y === original.y && entry.candidate.footprint.key === original.footprint.key)) {
              shortlist.push({ candidate: original, score: -Infinity });
            }

            let partBestLayout = currentLayout;
            let partBestPlacements = currentPlacements;
            for (const entry of shortlist) {
              const candidatePlacements = currentPlacements.slice();
              candidatePlacements[index] = entry.candidate;
              if (rawPlacementsOverlap(candidatePlacements, clearance)) continue;
              const candidateLayout = evaluateCompactPlacement(candidatePlacements, netData, activeNets, 0, state.boardSettings.maxColumns, currentLayout.columns);
              if (!candidateLayout) continue;
              if (isLayoutBetter(candidateLayout, partBestLayout)) {
                partBestLayout = candidateLayout;
                partBestPlacements = normalizeRawPlacements(candidateLayout.sourcePlacements.map(placement => ({ ...placement })));
              }
            }

            if (partBestLayout !== currentLayout) {
              currentLayout = partBestLayout;
              currentPlacements = partBestPlacements;
              changed = true;
            }
          }

          // Remove whole-column and whole-row gaps by shifting every component
          // beyond a boundary one pitch inward. This coordinated move is what a
          // human does when squeezing an already valid layout, and single-part
          // random moves frequently miss it.
          for (const axis of ["x", "y"]) {
            let squeezed = true;
            while (squeezed) {
              squeezed = false;
              const bounds = rawPlacementBounds(currentPlacements);
              const maximum = axis === "x" ? bounds.maxX : bounds.maxY;
              for (let boundary = 0; boundary < maximum; boundary += 1) {
                const moved = currentPlacements.map(placement => {
                  const start = placement[axis];
                  const extent = axis === "x" ? placement.footprint.width : placement.footprint.height;
                  const endsBeforeBoundary = start + extent - 1 <= boundary;
                  const beginsAfterBoundary = start > boundary;
                  if (!beginsAfterBoundary || endsBeforeBoundary) return { ...placement };
                  return { ...placement, [axis]: start - 1 };
                });
                if (rawPlacementsOverlap(moved, clearance)) continue;
                const candidateLayout = evaluateCompactPlacement(moved, netData, activeNets, 0, state.boardSettings.maxColumns, currentLayout.columns);
                if (!candidateLayout || !isLayoutBetter(candidateLayout, currentLayout)) continue;
                currentLayout = candidateLayout;
                currentPlacements = normalizeRawPlacements(candidateLayout.sourcePlacements.map(placement => ({ ...placement })));
                changed = true;
                squeezed = true;
                break;
              }
            }
          }

          if (!changed) break;
        }

        return currentLayout;
      }

function refineCompactPlacement(initialLayout, metadata, netData, activeNets, clearance, seed) {
        if (!initialLayout?.sourcePlacements?.length) return initialLayout;
        const metadataById = new Map(metadata.map(meta => [meta.component.id, meta]));
        let currentPlacements = initialLayout.sourcePlacements.map(placement => ({ ...placement }));
        let currentLayout = initialLayout;
        let bestLayout = initialLayout;
        const random = seededRandom(seed ^ 0x9E3779B9);
        const iterations = metadata.length <= 12 ? 120 : metadata.length <= 25 ? 200 : 100;
        const maxSearchWidth = Math.max(8, state.boardSettings.maxColumns - 1);

        for (let iteration = 0; iteration < iterations; iteration += 1) {
          const index = Math.floor(random() * currentPlacements.length);
          const original = currentPlacements[index];
          const meta = metadataById.get(original.component.id);
          if (!meta) continue;
          const footprint = meta.variants[Math.floor(random() * meta.variants.length)];

          const maxCurrentX = Math.max(...currentPlacements.map(placement => placement.x + placement.footprint.width));
          const maxCurrentY = Math.max(...currentPlacements.map(placement => placement.y + placement.footprint.height));
          const searchWidth = clamp(Math.max(8, maxCurrentX + 3), footprint.width, maxSearchWidth);
          const searchHeight = clamp(Math.max(8, maxCurrentY + 3), footprint.height, 80);
          let x = Math.floor(random() * Math.max(1, searchWidth - footprint.width + 1));
          let y = Math.floor(random() * Math.max(1, searchHeight - footprint.height + 1));

          const contactsByNet = rawPlacementContacts(currentPlacements.filter((_, placementIndex) => placementIndex !== index), metadataById);
          const logicalPins = footprint.pins.filter(pin => pin.logical && meta.pinNets.get(pin.logical));
          if (logicalPins.length && random() < .72) {
            const pin = logicalPins[Math.floor(random() * logicalPins.length)];
            const net = meta.pinNets.get(pin.logical);
            const targets = contactsByNet.get(net.index) || [];
            if (targets.length) {
              const target = targets[Math.floor(random() * targets.length)];
              if (random() < .78) y = target.y - pin.y;
              else x = target.x - pin.x;
            }
          }

          x = clamp(x, 0, Math.max(0, searchWidth - footprint.width));
          y = clamp(y, 0, Math.max(0, searchHeight - footprint.height));
          const rectangle = { x, y, width: footprint.width, height: footprint.height };
          const overlaps = currentPlacements.some((placement, placementIndex) => {
            if (placementIndex === index) return false;
            return rectanglesOverlap(rectangle, {
              x: placement.x,
              y: placement.y,
              width: placement.footprint.width,
              height: placement.footprint.height
            }, clearance);
          });
          if (overlaps) continue;

          const candidatePlacements = currentPlacements.slice();
          candidatePlacements[index] = { component: original.component, footprint, x, y };
          const candidateLayout = evaluateCompactPlacement(candidatePlacements, netData, activeNets, 0, state.boardSettings.maxColumns, currentLayout.columns);
          if (!candidateLayout) continue;

          const progress = iteration / Math.max(1, iterations - 1);
          const temperature = 28 * (1 - progress) + .28;
          const delta = candidateLayout.cost - currentLayout.cost;
          if (delta <= 0 || random() < Math.exp(-delta / temperature)) {
            currentPlacements = candidatePlacements;
            currentLayout = candidateLayout;
          }
          if (isLayoutBetter(candidateLayout, bestLayout)) bestLayout = candidateLayout;
        }

        return bestLayout;
      }

async function compactPlacementColumns(initialLayout, metadata, netData, activeNets, clearance) {
        if (!initialLayout?.sourcePlacements?.length) return initialLayout;
        let currentLayout = initialLayout;
        let currentPlacements = initialLayout.sourcePlacements.map(placement => ({ ...placement }));
        const partCount = currentPlacements.length;
        const passes = partCount <= 12 ? 1 : partCount <= 42 ? 2 : 1;
        let evaluations = 0;

        for (let pass = 0; pass < passes; pass += 1) {
          let changed = false;
          const order = currentPlacements.map((placement, index) => ({ placement, index })).sort((a, b) => {
            const rightA = a.placement.x + a.placement.footprint.width;
            const rightB = b.placement.x + b.placement.footprint.width;
            return rightB - rightA || b.placement.footprint.height - a.placement.footprint.height;
          });

          for (const item of order) {
            const index = item.index;
            const original = currentPlacements[index];
            const searchColumns = Math.max(4, currentLayout.columns - 1);
            const maxX = Math.max(0, searchColumns - original.footprint.width);
            let partBestLayout = currentLayout;
            let partBestPlacements = currentPlacements;

            let xCandidates;
            if (partCount <= 30) {
              xCandidates = Array.from({ length: maxX + 1 }, (_, x) => x);
            } else {
              const values = new Set([0, maxX, original.x - 3, original.x - 2, original.x - 1, original.x + 1, original.x + 2]);
              xCandidates = [...values].map(x => clamp(x, 0, maxX)).sort((a, b) => a - b);
            }

            for (const x of xCandidates) {
              if (x === original.x) continue;
              const candidatePlacements = currentPlacements.map((placement, placementIndex) =>
                placementIndex === index ? { ...placement, x } : { ...placement }
              );
              if (rawPlacementsOverlap(candidatePlacements, clearance)) continue;
              const candidateLayout = evaluateCompactPlacement(
                candidatePlacements,
                netData,
                activeNets,
                0,
                state.boardSettings.maxColumns,
                searchColumns
              );
              evaluations += 1;
              if (candidateLayout && isLayoutBetter(candidateLayout, partBestLayout)) {
                partBestLayout = candidateLayout;
                partBestPlacements = candidateLayout.sourcePlacements.map(placement => ({ ...placement }));
              }
              if (evaluations % 80 === 0) await yieldToBrowser();
            }

            if (partBestLayout !== currentLayout) {
              currentLayout = partBestLayout;
              currentPlacements = partBestPlacements;
              changed = true;
            }
          }
          if (!changed) break;
        }
        return currentLayout;
      }

function removeCompletelyUnusedBoardLines(layout) {
        if (!layout || layout.error) return layout;
        const usedColumns = new Set();
        const usedRows = new Set();

        const markCell = (x, y) => {
          if (Number.isInteger(x) && x >= 0 && x < layout.columns) usedColumns.add(x);
          if (Number.isInteger(y) && y >= 0 && y < layout.rows) usedRows.add(y);
        };

        for (const placement of layout.placements || []) {
          for (let y = placement.y; y < placement.y + placement.footprint.height; y += 1) {
            for (let x = placement.x; x < placement.x + placement.footprint.width; x += 1) markCell(x, y);
          }
        }
        for (const route of layout.routes || []) {
          const a = route.points?.[0];
          const b = route.points?.[route.points.length - 1];
          if (!a || !b) continue;
          markCell(a.x, a.y);
          markCell(b.x, b.y);
          if (a.x === b.x) {
            for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y += 1) markCell(a.x, y);
          }
        }
        for (const cut of layout.cuts || []) markCell(cut.x, cut.y);
        for (const terminal of layout.terminals || []) {
          const x = terminal.side === "right" ? layout.columns - 1 : 0;
          markCell(x, terminal.row);
        }
        // Preserve rows the user explicitly requested through the Spare rows
        // setting. All other unexplained empty lines are removed.
        const requestedSpareRows = clamp(Number(state.boardSettings.spareRows) || 0, 0, 12);
        for (let row = Math.max(0, layout.rows - requestedSpareRows); row < layout.rows; row += 1) usedRows.add(row);

        // A 4 × 4 board is the editor's physical minimum. For normal circuits
        // every retained line carries a part, a link, a cut, or an edge pad.
        const fillToMinimum = (set, size, minimum) => {
          if (!set.size && size) set.add(0);
          while (set.size < Math.min(minimum, size)) {
            let best = null;
            for (let candidate = 0; candidate < size; candidate += 1) {
              if (set.has(candidate)) continue;
              const distance = Math.min(...[...set].map(value => Math.abs(value - candidate)));
              if (!best || distance < best.distance || (distance === best.distance && candidate < best.candidate)) best = { candidate, distance };
            }
            if (!best) break;
            set.add(best.candidate);
          }
        };
        fillToMinimum(usedColumns, layout.columns, 4);
        fillToMinimum(usedRows, layout.rows, 4);

        const keptColumns = [...usedColumns].sort((a, b) => a - b);
        const keptRows = [...usedRows].sort((a, b) => a - b);
        if (keptColumns.length === layout.columns && keptRows.length === layout.rows) return layout;

        const columnMap = new Map(keptColumns.map((value, index) => [value, index]));
        const rowMap = new Map(keptRows.map((value, index) => [value, index]));
        const mapX = x => columnMap.get(x);
        const mapY = y => rowMap.get(y);

        for (const placement of layout.placements || []) {
          placement.x = mapX(placement.x);
          placement.y = mapY(placement.y);
        }
        for (const route of layout.routes || []) {
          route.points = (route.points || []).map(point => ({ x: mapX(point.x), y: mapY(point.y) }));
        }
        layout.cuts = (layout.cuts || []).map(cut => ({ x: mapX(cut.x), y: mapY(cut.y), hole: mapX(cut.x) }));
        for (const terminal of layout.terminals || []) terminal.row = mapY(terminal.row);
        layout.columns = keptColumns.length;
        layout.rows = keptRows.length;
        layout.sourcePlacements = (layout.placements || []).map(placement => ({
          component: placement.component,
          footprint: placement.footprint,
          x: placement.x,
          y: placement.y
        }));

        refreshManualLayoutConnectivity(layout);
        const busRows = new Map();
        for (const net of layout.activeNets || []) {
          const candidates = (layout.segments || []).filter(segment => segment.net?.index === net.index);
          if (!candidates.length) continue;
          const primary = candidates.slice().sort((a, b) => b.contacts.length - a.contacts.length || (b.end - b.start) - (a.end - a.start) || a.row - b.row)[0];
          busRows.set(net.name, primary.row);
        }
        layout.busRows = busRows;
        const realSegments = (layout.segments || []).filter(segment => segment.net);
        const fragmentation = Math.max(0, realSegments.length - (layout.activeNets?.length || 0));
        const area = layout.columns * layout.rows;
        const passiveMetrics = layoutPassiveMetrics(layout);
        layout.cost = area * 8 + (layout.routes?.length || 0) * 12 + passiveMetrics.horizontalResistors * 26 +
          passiveMetrics.horizontalCapacitors * 2 + Math.max(layout.columns, layout.rows) * .12 +
          (layout.columns + layout.rows) * .035 + (layout.totalLinkLength || 0) * .08 +
          (layout.cuts?.length || 0) * .08 + fragmentation * .12;
        return layout;
      }

function trackPassiveModeCost(type, distance) {
        if (type === "resistor") {
          if (distance >= 3 && distance <= 9) return 0;
          if (state.boardSettings.standingResistors === true && (distance === 1 || distance === 2)) return 0;
          if (distance === 0) return 24;
          if (distance === 1) return 90;
          if (distance === 2) return 65;
          return 95 + Math.max(0, distance - 9) * 18;
        }
        if (type === "capacitor" || type === "capacitorPolarized") {
          if (distance >= 1 && distance <= 9) return 0;
          if (distance === 0) return 6;
          return 75 + Math.max(0, distance - 9) * 12;
        }
        if (type === "diode" || type === "led") {
          if (distance === 2 || distance === 3) return 0;
          if (distance === 0) return 12;
          if (distance === 1) return 45;
          return 85 + Math.max(0, distance - 3) * 18;
        }
        return distance ? 0 : 3;
      }

function trackTwoPinMetadata(meta) {
        const pins = [];
        for (const pin of meta.variants[0]?.pins || []) {
          if (!pin.logical) continue;
          const net = meta.pinNets.get(pin.logical);
          if (net) pins.push({ logical: pin.logical, net });
        }
        const unique = [];
        const seen = new Set();
        for (const pin of pins) {
          if (seen.has(pin.logical)) continue;
          seen.add(pin.logical);
          unique.push(pin);
        }
        return unique.length === 2 ? unique : null;
      }

function buildTrackTerminalDemands(netData, activeNetIndexes) {
        const demands = [];
        const seenRegular = new Set();
        for (const component of state.components.filter(item => item.type === "terminal" && terminalScopeOf(item) === "offboard")) {
          const net = netData.pinToNet.get(pinKey(component.id, "1"));
          if (!net || !activeNetIndexes.has(net.index) || seenRegular.has(net.index)) continue;
          seenRegular.add(net.index);
          demands.push({ net, side: terminalPreferredSide(net.name), alternate: false, label: net.name });
        }
        for (const component of state.components.filter(isOffboardComponent)) {
          const side = Number(component.x) < SCHEMATIC_WIDTH / 2 ? "left" : "right";
          for (const pin of componentDef(component).pins) {
            const net = netData.pinToNet.get(pinKey(component.id, pin.name));
            if (!net || !activeNetIndexes.has(net.index) || net.nodes.length < 2) continue;
            demands.push({ net, side, alternate: true, label: `${externalControlName(component)} ${pin.name}` });
          }
        }
        return demands;
      }

function buildTrackRowAssignment(metadata, activeNets, height, random, variantSeed = 0) {
        const netByIndex = new Map(activeNets.map(net => [net.index, net]));
        const degree = new Map(activeNets.map(net => [net.index, 0]));
        const edges = [];
        const anchors = metadata.filter(meta => meta.component.type === "opamp" || meta.component.type === "otherIC")
          .slice().sort((a, b) => b.maxPins - a.maxPins || a.component.id.localeCompare(b.component.id));
        for (const meta of metadata) {
          const pair = trackTwoPinMetadata(meta);
          if (!pair) continue;
          const a = pair[0].net.index;
          const b = pair[1].net.index;
          if (a === b) continue;
          edges.push({ meta, type: meta.component.type, a, b });
          degree.set(a, (degree.get(a) || 0) + 1);
          degree.set(b, (degree.get(b) || 0) + 1);
        }

        const denseCompact = state.boardSettings.busSpacing !== 3 && metadata.length > 26;
        const multiPin = denseCompact ? metadata.filter(meta => !anchors.includes(meta) && meta.maxPins > 2 && meta.realNets.length > 1) : [];
        // Cache each small package's row cost. Most annealing steps change
        // a net unrelated to it; rescanning all footprint variants was wasteful.
        const multiCostCaches = new Map(multiPin.map(meta => [meta, new Map()]));
        const fixedRows = new Map();
        const anchorPlacements = [];
        let anchorCursor = 0;
        anchors.forEach((meta, anchorIndex) => {
          const footprint = meta.variants.slice().sort((a, b) => b.height - a.height || b.width - a.width)[0];
          let y;
          if (anchors.length === 1) y = clamp(Math.round((height - footprint.height) / 2), 0, Math.max(0, height - footprint.height));
          else {
            const available = Math.max(0, height - footprint.height);
            y = clamp(Math.round((anchorIndex / Math.max(1, anchors.length - 1)) * available), 0, available);
          }
          if (denseCompact && anchors.length > 1 && variantSeed % 3 === 1) {
            y = Math.floor((height - footprint.height) / 2);
            if (anchorPlacements.length) {
              let bestScore = Infinity;
              for (let trialY = 0; trialY + footprint.height <= height; trialY++) {
                let cost = Math.abs(trialY-y)*.05;
                for (const pin of footprint.pins) {
                  const net = meta.pinNets.get(pin.logical), values = net && fixedRows.get(net.index);
                  if (values?.size) cost += Math.min(...[...values].map(r=>Math.abs(r-trialY-pin.y))) * 30;
                }
                if (cost < bestScore) { bestScore=cost; y=trialY; }
              }
            }
          } else if (denseCompact && anchors.length > 1 && variantSeed % 3 === 2) {
            const step = Math.max(1, Math.floor((height - footprint.height) / (anchors.length + 1)));
            y = Math.min(height - footprint.height, step * anchorIndex + 2);
          }
          anchorPlacements.push({ meta, footprint, y });
          for (const pin of footprint.pins) {
            if (!pin.logical) continue;
            const net = meta.pinNets.get(pin.logical);
            if (!net) continue;
            if (!fixedRows.has(net.index)) fixedRows.set(net.index, new Set());
            fixedRows.get(net.index).add(y + pin.y);
          }
          anchorCursor = Math.max(anchorCursor, y + footprint.height);
        });

        const movable = activeNets.map(net => net.index).filter(index => !fixedRows.has(index));
        const row = new Map();
        for (const net of activeNets) {
          const fixed = fixedRows.get(net.index);
          row.set(net.index, fixed?.size ? [...fixed][0] : Math.floor(random() * height));
        }

        const rowSetFor = index => fixedRows.get(index) || new Set([row.get(index)]);
        const assignmentCost = () => {
          let score = denseCompact ? [...fixedRows.values()].reduce((s,rs)=>s+Math.max(0,rs.size-1)*120,0) : 0;
          const crossing = Array(Math.max(0, height - 1)).fill(0);
          const contactLoad = Array(height).fill(0);
          const netLoad = Array(height).fill(0);
          for (const net of activeNets) {
            const rows = rowSetFor(net.index);
            for (const r of rows) if (r >= 0 && r < height) netLoad[r] += 1;
          }
          for (const edge of edges) {
            const rowsA = [...rowSetFor(edge.a)];
            const rowsB = [...rowSetFor(edge.b)];
            let bestDistance = Infinity;
            let bestPair = null;
            for (const ra of rowsA) for (const rb of rowsB) {
              const d = Math.abs(ra - rb);
              if (trackPassiveModeCost(edge.type, d) < trackPassiveModeCost(edge.type, bestDistance) ||
                  (trackPassiveModeCost(edge.type, d) === trackPassiveModeCost(edge.type, bestDistance) && d < bestDistance)) {
                bestDistance = d;
                bestPair = [ra, rb];
              }
            }
            score += trackPassiveModeCost(edge.type, bestDistance) + (denseCompact ? bestDistance * .45 : 0);
            if (bestPair && bestDistance > 0 && trackPassiveModeCost(edge.type, bestDistance) < 60) {
              const lo = Math.min(...bestPair);
              const hi = Math.max(...bestPair);
              for (let boundary = lo; boundary < hi && boundary < crossing.length; boundary += 1) crossing[boundary] += 1;
            }
            for (const r of rowsA) if (r >= 0 && r < height) contactLoad[r] += .5;
            for (const r of rowsB) if (r >= 0 && r < height) contactLoad[r] += .5;
          }
          for (const meta of multiPin) {
            const key = [...meta.realNets].map(net => [...rowSetFor(net.index)].join(',')).join('|');
            const cache = multiCostCaches.get(meta);
            if (cache.has(key)) { score += cache.get(key); continue; }
            let best = Infinity;
            for (const fp of meta.variants) {
              const pins = fp.pins.filter(p => meta.pinNets.get(p.logical));
              for (const aligned of pins) for (const target of rowSetFor(meta.pinNets.get(aligned.logical).index)) {
                const y = target - aligned.y;
                if (y < 0 || y + fp.height > height) continue;
                let cost = 0;
                for (const pin of pins) {
                  let d = height;
                  for (const r of rowSetFor(meta.pinNets.get(pin.logical).index)) d = Math.min(d, Math.abs(r-y-pin.y));
                  cost += d * 38 + (d ? 20 : 0);
                }
                best = Math.min(best, cost);
              }
            }
            cache.set(key, best);
            score += best;
          }
          for (let i = 0; i < crossing.length; i += 1) {
            const pressure = Math.max(0, crossing[i] - 10);
            score += pressure * pressure * 14 + crossing[i] * .16;
          }
          for (let i = 0; i < height; i += 1) {
            score += Math.max(0, contactLoad[i] - 14) ** 2 * 2;
            score += Math.max(0, netLoad[i] - 5) ** 2 * 3;
            if(denseCompact)score += Math.max(0,netLoad[i]-1)**2*12;
          }
          const usedRows = new Set();
          for (const net of activeNets) for (const r of rowSetFor(net.index)) usedRows.add(r);
          score += Math.max(0, height - usedRows.size) * .8;
          return score;
        };

        let currentCost = assignmentCost();
        let bestCost = currentCost;
        let bestRows = new Map(row);
        const steps = Math.max(1400, movable.length * 180);
        for (let step = 0; step < steps; step += 1) {
          if (!movable.length) break;
          const temperature = 18 * (1 - step / steps) + .04;
          const netIndex = movable[Math.floor(random() * movable.length)];
          const old = row.get(netIndex);
          const delta = random() < .76 ? [ -3, -2, -1, 1, 2, 3 ][Math.floor(random() * 6)] : Math.floor(random() * height) - old;
          const next = clamp(old + delta, 0, height - 1);
          if (next === old) continue;
          row.set(netIndex, next);
          const nextCost = assignmentCost();
          if (nextCost <= currentCost || random() < Math.exp((currentCost - nextCost) / temperature)) {
            currentCost = nextCost;
            if (nextCost < bestCost) { bestCost = nextCost; bestRows = new Map(row); }
          } else row.set(netIndex, old);
        }
        for (const [index, value] of bestRows) row.set(index, value);
        const targetRows = new Map();
        for (const net of activeNets) {
          const values = new Set(fixedRows.get(net.index) || []);
          values.add(row.get(net.index));
          targetRows.set(net.index, values);
        }
        return { targetRows, fixedRows, anchorPlacements, cost: bestCost, height };
      }

function buildTrackComponentOptions(meta, rowAssignment) {
        const height = rowAssignment.height;
        const targetRows = rowAssignment.targetRows;
        const component = meta.component;
        const isAnchor = component.type === "opamp" || component.type === "otherIC";
        if (isAnchor) {
          const anchor = rowAssignment.anchorPlacements.find(item => item.meta.component.id === component.id);
          return anchor ? [{ footprint: anchor.footprint, y: anchor.y, penalty: -180, mismatch: 0 }] : [];
        }

        const options = [];
        for (const footprint of meta.variants) {
          if (footprint.height > height) continue;
          const connectedPins = footprint.pins.filter(pin => pin.logical && meta.pinNets.get(pin.logical));
          if (!connectedPins.length) continue;
          const yCandidates = new Set();
          for (const pin of connectedPins) {
            const net = meta.pinNets.get(pin.logical);
            for (const target of targetRows.get(net.index) || []) yCandidates.add(target - pin.y);
          }
          if (!yCandidates.size) for (let y = 0; y <= height - footprint.height; y += 1) yCandidates.add(y);
          for (const y of yCandidates) {
            if (y < 0 || y + footprint.height > height) continue;
            let mismatch = 0;
            let exact = 0;
            for (const pin of connectedPins) {
              const net = meta.pinNets.get(pin.logical);
              const actual = y + pin.y;
              const targets = [...(targetRows.get(net.index) || [actual])];
              const distance = Math.min(...targets.map(target => Math.abs(target - actual)));
              mismatch += distance;
              if (distance === 0) exact += 1;
            }
            let penalty = mismatch * 38 + Math.max(0, connectedPins.length - exact) * 15;
            const orientation = String(footprint.orientation || "");
            if (orientation.startsWith("vertical")) penalty -= 12;
            if (component.type === "resistor" && orientation.startsWith("horizontal")) penalty += 115;
            else if ((component.type === "capacitor" || component.type === "capacitorPolarized") && orientation.startsWith("horizontal")) penalty += 12;
            else if ((component.type === "diode" || component.type === "led") && orientation.startsWith("horizontal")) penalty += 24;
            if (exact === connectedPins.length) penalty -= 100;
            options.push({ footprint, y, penalty, mismatch });
          }
        }
        const dedup = new Map();
        for (const option of options) {
          const key = `${option.footprint.key}:${option.y}`;
          if (!dedup.has(key) || option.penalty < dedup.get(key).penalty) dedup.set(key, option);
        }
        return [...dedup.values()].sort((a, b) => a.penalty - b.penalty || a.footprint.width * a.footprint.height - b.footprint.width * b.footprint.height).slice(0, 42);
      }

function trackRectanglesOverlap(a, b, clearance = 0) {
        return !(a.x + a.width + clearance <= b.x || b.x + b.width + clearance <= a.x ||
          a.y + a.height + clearance <= b.y || b.y + b.height + clearance <= a.y);
      }

function constructTrackPlacement(metadata, rowAssignment, width, clearance, random, terminalDemandByNet) {
        const denseCompact = state.boardSettings.busSpacing !== 3 && metadata.length > 26;
        const records = metadata.map(meta => ({ meta, options: buildTrackComponentOptions(meta, rowAssignment) }));
        if (records.some(record => !record.options.length)) return null;
        records.sort((a, b) => {
          const anchorA = a.meta.component.type === "opamp" || a.meta.component.type === "otherIC" ? 1 : 0;
          const anchorB = b.meta.component.type === "opamp" || b.meta.component.type === "otherIC" ? 1 : 0;
          return anchorB - anchorA || a.options.length - b.options.length || b.meta.realNets.length - a.meta.realNets.length || a.meta.component.id.localeCompare(b.meta.component.id);
        });

        const placements = [];
        const rectangles = [];
        const contacts = [];
        const coordinateSet = new Set();
        for (const record of records) {
          const candidates = [];
          for (let optionIndex = 0; optionIndex < record.options.length; optionIndex += 1) {
            const option = record.options[optionIndex];
            const footprint = option.footprint;
            if (footprint.width > width) continue;
            for (let x = 0; x <= width - footprint.width; x += 1) {
              const rectangle = { x, y: option.y, width: footprint.width, height: footprint.height };
              if (rectangles.some(other => trackRectanglesOverlap(rectangle, other, clearance))) continue;
              const pinContacts = [];
              let invalid = false;
              for (const pin of footprint.pins) {
                const px = x + pin.x;
                const py = option.y + pin.y;
                const key = `${px},${py}`;
                if (coordinateSet.has(key)) { invalid = true; break; }
                const net = pin.logical ? record.meta.pinNets.get(pin.logical) : null;
                pinContacts.push({ x: px, y: py, net, logical: pin.logical, physical: pin.physical });
              }
              if (invalid) continue;
              for (const contact of pinContacts.filter(item => item.net)) {
                const rowContacts = contacts.filter(item => item.y === contact.y).concat(pinContacts.filter(item => item.y === contact.y && item !== contact));
                for (const other of rowContacts) {
                  if (!other.net || other.net.index === contact.net.index) continue;
                  if (Math.abs(other.x - contact.x) < 2) { invalid = true; break; }
                }
                if (invalid) break;
              }
              if (invalid) continue;

              let score = option.penalty;
              const isAnchor = record.meta.component.type === "opamp" || record.meta.component.type === "otherIC";
              if (isAnchor) score += Math.abs((x + footprint.width / 2) - width / 2) * 5;
              score += (x + footprint.width) * .025;
              for (const contact of pinContacts) {
                if (!contact.net) continue;
                const sameNet = contacts.filter(item => item.net?.index === contact.net.index);
                const sameRow = sameNet.filter(item => item.y === contact.y);
                if (sameRow.length) {
                  const nearest = Math.min(...sameRow.map(item => Math.abs(item.x - contact.x)));
                  const continuous = !denseCompact || sameRow.some(other => !contacts.some(blocker => blocker.y === contact.y && blocker.net?.index !== contact.net.index && blocker.x > Math.min(contact.x, other.x) && blocker.x < Math.max(contact.x, other.x)));
                  score += continuous ? -58 / (1 + nearest * .16) : 90;
                  if (denseCompact) {
                    const left = contacts.filter(c=>c.y===contact.y&&c.x<contact.x).sort((a,b)=>b.x-a.x)[0];
                    const right = contacts.filter(c=>c.y===contact.y&&c.x>contact.x).sort((a,b)=>a.x-b.x)[0];
                    if (left?.net && right?.net && left.net.index===right.net.index && left.net.index!==contact.net.index) score += 160;
                  }
                } else if (sameNet.length) score += 16;
                if (denseCompact) {
                  let left=null,right=null;
                  for(const other of contacts)if(other.y===contact.y){
                    if(other.x<contact.x&&(!left||other.x>left.x))left=other;
                    if(other.x>contact.x&&(!right||other.x<right.x))right=other;
                  }
                  if(left?.net && right?.net && left.net.index===right.net.index && left.net.index!==contact.net.index)score+=240;
                  if(left?.net?.index!==contact.net.index && left && contact.x-left.x===2)score+=40;
                  if(right?.net?.index!==contact.net.index && right && right.x-contact.x===2)score+=40;
                }
                const demand = terminalDemandByNet.get(contact.net.index);
                if (demand) {
                  if (demand.left) score += contact.x * Math.min(2.4, .8 + demand.left * .45);
                  if (demand.right) score += (width - 1 - contact.x) * Math.min(2.4, .8 + demand.right * .45);
                }
              }
              score += random() * 8;
              candidates.push({ score, option, x, rectangle, pinContacts });
            }
          }
          if (!candidates.length) return null;
          candidates.sort((a, b) => a.score - b.score || a.x - b.x);
          const pool = Math.min(candidates.length, 7);
          const chosen = candidates[Math.min(pool - 1, Math.floor((random() ** 2.8) * pool))];
          const placement = { component: record.meta.component, footprint: chosen.option.footprint, x: chosen.x, y: chosen.option.y };
          placements.push(placement);
          rectangles.push(chosen.rectangle);
          for (const contact of chosen.pinContacts) {
            coordinateSet.add(`${contact.x},${contact.y}`);
            contacts.push({ ...contact, componentId: record.meta.component.id });
          }
        }
        return placements;
      }

function scoreTrackPlacementFast(placements, metadataById, activeNets, demands, width, height) {
        const denseCompact = state.boardSettings.busSpacing !== 3 && placements.length > 26;
        const activeIndexes = new Set(activeNets.map(net => net.index));
        const contacts = [];
        const bodyCells = new Set();
        const obstacleCells = new Set();
        const coordinateSet = new Set();
        const rectangles = [];
        let horizontalResistors = 0;
        let horizontalCapacitors = 0;
        for (const placement of placements) {
          const meta = metadataById.get(placement.component.id);
          if (!meta) return null;
          const rectangle = { x: placement.x, y: placement.y, width: placement.footprint.width, height: placement.footprint.height };
          if (placement.x < 0 || placement.y < 0 || placement.x + placement.footprint.width > width || placement.y + placement.footprint.height > height) return null;
          if (rectangles.some(other => trackRectanglesOverlap(rectangle, other, 0))) return null;
          rectangles.push(rectangle);
          const type = placement.component.type;
          if (type === "resistor" && String(placement.footprint.orientation).startsWith("horizontal")) horizontalResistors += 1;
          if ((type === "capacitor" || type === "capacitorPolarized") && String(placement.footprint.orientation).startsWith("horizontal")) horizontalCapacitors += 1;
          const underIc = type === "opamp" || type === "otherIC";
          const avoidBody = state.boardSettings.avoidLinksOverComponents !== false && linkAvoidanceAppliesTo(placement.component);
          for (let y = placement.y; y < placement.y + placement.footprint.height; y += 1) for (let x = placement.x; x < placement.x + placement.footprint.width; x += 1) {
            if (!underIc) bodyCells.add(`${x},${y}`);
            if (avoidBody) obstacleCells.add(`${x},${y}`);
          }
          for (const pin of placement.footprint.pins) {
            const x = placement.x + pin.x;
            const y = placement.y + pin.y;
            const coordinate = `${x},${y}`;
            if (coordinateSet.has(coordinate)) return null;
            coordinateSet.add(coordinate);
            if (denseCompact) obstacleCells.add(coordinate);
            const net = pin.logical ? meta.pinNets.get(pin.logical) : null;
            contacts.push({ x, y, net, netKey: net ? `NET:${net.index}` : `NC:${placement.component.id}:${pin.physical}`, componentId: placement.component.id, physical: pin.physical });
          }
        }
        const topology = buildCopperTopology(contacts, width);
        if (!topology) return null;
        let linkEstimate = 0;
        let busEstimate = 0;
        let defects = 0;
        for (const net of activeNets) {
          const segments = topology.segmentsByNet.get(net.index) || [];
          if (segments.length <= 1) continue;
          if (segments.some(segment => !segmentAvailableHoleXs(segment, bodyCells).length)) { defects += 1; continue; }
          const parent = segments.map((_, index) => index);
          const find = index => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
          for (let a = 0; a < segments.length; a += 1) for (let b = a + 1; b < segments.length; b += 1) {
            const segmentA = segments[a];
            const segmentB = segments[b];
            if (segmentA.row === segmentB.row) continue;
            const start = Math.max(segmentA.start, segmentB.start);
            const end = Math.min(segmentA.end, segmentB.end);
            let connects = false;
            for (let x = start; x <= end; x += 1) {
              if (!endpointIsAccessible(segmentA, x, bodyCells) || !endpointIsAccessible(segmentB, x, bodyCells)) continue;
              if (lineObstacleCount({ x, y: segmentA.row }, { x, y: segmentB.row }, obstacleCells)) continue;
              connects = true; break;
            }
            if (connects) { const ra = find(a); const rb = find(b); if (ra !== rb) parent[rb] = ra; }
          }
          const components = new Set(segments.map((_, index) => find(index))).size;
          linkEstimate += segments.length - 1 + Math.max(0, components - 1);
          busEstimate += Math.max(0, components - 1);
        }

        const availableEdgeSlots = new Map();
        for (const segment of topology.segments.filter(segment => segment.net)) {
          const keyBase = segment.net.index;
          const slots = availableEdgeSlots.get(keyBase) || { left: [], right: [] };
          if (segment.start === 0 && endpointIsAccessible(segment, 0, bodyCells)) slots.left.push(segment.row);
          if (segment.end === width - 1 && endpointIsAccessible(segment, width - 1, bodyCells)) slots.right.push(segment.row);
          availableEdgeSlots.set(keyBase, slots);
        }
        const slotUse = new Set();
        let missingTerminals = 0;
        const orderedDemands = demands.slice().sort((a, b) => Number(!a.alternate) - Number(!b.alternate));
        for (const demand of orderedDemands) {
          const slots = availableEdgeSlots.get(demand.net.index) || { left: [], right: [] };
          const sides = demand.side ? [demand.side, ...(demand.alternate ? [demand.side === "left" ? "right" : "left"] : [])] : ["left", "right"];
          let found = null;
          for (const side of sides) {
            for (const row of slots[side]) {
              const key = `${side}:${row}`;
              if (!slotUse.has(key)) { found = key; break; }
            }
            if (found) break;
          }
          if (found) slotUse.add(found); else missingTerminals += 1;
        }
        const cuts = topology.cuts.length;
        const realSegments = topology.segments.filter(segment => segment.net).length;
        const fragmentation = Math.max(0, realSegments - activeNets.length);
        const score = width * height * 2.6 + linkEstimate * 170 + busEstimate * 45 + missingTerminals * 420 +
          defects * 5200 + horizontalResistors * 115 + horizontalCapacitors * 8 + cuts * 1.1 + fragmentation * 2;
        return { score, linkEstimate, missingTerminals, defects, cuts, fragmentation, horizontalResistors, horizontalCapacitors };
      }

function refineTrackCandidate(candidate, metadata, metadataById, activeNets, demands, random, steps = 5000) {
        const optionById = new Map(metadata.map(meta => [meta.component.id, buildTrackComponentOptions(meta, candidate.assignment)]));
        const clonePlacements = placements => placements.map(placement => ({ ...placement }));
        let current = clonePlacements(candidate.placements);
        let currentFast = scoreTrackPlacementFast(current, metadataById, activeNets, demands, candidate.width, candidate.height);
        if (!currentFast) return candidate;
        let best = clonePlacements(current);
        let bestFast = currentFast;
        for (let step = 0; step < steps; step += 1) {
          const next = clonePlacements(current);
          const temperature = 52 * (1 - step / steps) + .03;
          const mode = random();
          if (mode < .12 && next.length > 2) {
            const a = Math.floor(random() * next.length);
            let b = Math.floor(random() * next.length);
            if (b === a) b = (b + 1) % next.length;
            const x = next[a].x;
            next[a].x = next[b].x;
            next[b].x = x;
          } else {
            const index = Math.floor(random() * next.length);
            const placement = next[index];
            const type = placement.component.type;
            if (mode < .73 || type === "opamp" || type === "otherIC") {
              const delta = [ -5, -4, -3, -2, -1, 1, 2, 3, 4, 5 ][Math.floor(random() * 10)];
              placement.x = clamp(placement.x + delta, 0, candidate.width - placement.footprint.width);
            } else {
              const options = optionById.get(placement.component.id) || [];
              if (!options.length) continue;
              const option = options[Math.min(options.length - 1, Math.floor((random() ** 2.2) * Math.min(options.length, 28)))];
              placement.footprint = option.footprint;
              placement.y = option.y;
              placement.x = clamp(placement.x + [ -2, -1, 0, 0, 1, 2 ][Math.floor(random() * 6)], 0, candidate.width - option.footprint.width);
            }
          }
          const nextFast = scoreTrackPlacementFast(next, metadataById, activeNets, demands, candidate.width, candidate.height);
          if (!nextFast) continue;
          if (nextFast.score <= currentFast.score || random() < Math.exp((currentFast.score - nextFast.score) / temperature)) {
            current = next;
            currentFast = nextFast;
            if (nextFast.score < bestFast.score) {
              best = clonePlacements(next);
              bestFast = nextFast;
              if (!bestFast.defects && bestFast.missingTerminals <= 1 && bestFast.linkEstimate <= 5) break;
            }
          }
        }
        return { ...candidate, placements: best, fast: bestFast };
      }

async function buildTrackCentricLayout(metadata, netData, activeNets, maximumColumns, clearance, baseSeed) {
        const activeIndexes = new Set(activeNets.map(net => net.index));
        const demands = buildTrackTerminalDemands(netData, activeIndexes);
        const demandByNet = new Map();
        for (const demand of demands) {
          const entry = demandByNet.get(demand.net.index) || { left: 0, right: 0 };
          if (demand.side === "left") entry.left += 1;
          else if (demand.side === "right") entry.right += 1;
          else { entry.left += .5; entry.right += .5; }
          demandByNet.set(demand.net.index, entry);
        }
        const metadataById = new Map(metadata.map(meta => [meta.component.id, meta]));
        const largestMinimumHeight = Math.max(...metadata.map(meta => Math.min(...meta.variants.map(variant => variant.height))));
        const anchorMinimumHeight = Math.max(1, ...metadata.filter(meta => meta.component.type === "opamp" || meta.component.type === "otherIC").map(meta => Math.min(...meta.variants.map(variant => variant.height))));
        const maxRawWidth = Math.max(4, maximumColumns - 2);
        const minimumRawWidth = Math.max(...metadata.map(meta => Math.min(...meta.variants.map(variant => variant.width))));
        const estimatedRawWidth = clamp(Math.ceil(Math.sqrt(metadata.reduce((sum, meta) => sum + meta.minArea, 0) * 1.35)), minimumRawWidth, maxRawWidth);
        const hasTallFixedAnchor = anchorMinimumHeight > 18;
        // The original track-centric search intentionally capped candidate
        // height at 18 rows because every supported DIP previously fit inside
        // that envelope. Daisy is a fixed 20-row package, so the old cap left
        // the track solver with zero candidate heights and forced the weaker
        // generic fallback. Keep the released search unchanged for normal
        // circuits, while giving tall fixed packages a small bounded envelope.
        const heightStart = hasTallFixedAnchor
          ? Math.max(largestMinimumHeight, anchorMinimumHeight, 8)
          : Math.max(largestMinimumHeight, anchorMinimumHeight + 4, 8);
        const maximumPlacementRows = normalizeMaximumRows(state.boardSettings.maxRows) - state.boardSettings.spareRows;
        const denseCompact = metadata.length > 26;
        const heightEnd = Math.min(maximumPlacementRows, hasTallFixedAnchor
          ? Math.max(heightStart + 4, Math.ceil(metadata.length * .34) + anchorMinimumHeight)
          : Math.max(heightStart + 5, Math.ceil(metadata.length * (denseCompact ? .52 : .42)) + anchorMinimumHeight, denseCompact ? Math.ceil(metadata.reduce((sum, meta) => sum + meta.minArea, 0) * 2.4 / maxRawWidth) + 2 : 0));
        const heights = [];
        for (let height = heightStart; height <= heightEnd; height += 1) heights.push(height);
        const widths = [];
        if (hasTallFixedAnchor) {
          // Do not scan every width up to an 80-column user limit for a tall
          // package. The useful region is around the area estimate; wider
          // checkpoints remain available as deterministic escape routes.
          const denseEnd = Math.min(maxRawWidth, Math.max(minimumRawWidth, estimatedRawWidth + 14));
          for (let width = minimumRawWidth; width <= denseEnd; width += 1) widths.push(width);
          for (const width of [estimatedRawWidth + 18, estimatedRawWidth + 26, estimatedRawWidth + 36, maxRawWidth]) {
            const candidate = clamp(width, minimumRawWidth, maxRawWidth);
            if (!widths.includes(candidate)) widths.push(candidate);
          }
        } else {
          const denseWidth = denseCompact ? Math.min(maxRawWidth, Math.max(estimatedRawWidth + 18, Math.ceil(metadata.reduce((sum, meta) => sum + meta.minArea, 0) * 2.4 / Math.max(4, heightEnd)))) : maxRawWidth;
          for (let width = minimumRawWidth; width <= denseWidth; width += denseCompact ? 2 : 1) widths.push(width);
          if (denseWidth < maxRawWidth) for (const width of [denseWidth + 6, denseWidth + 12, maxRawWidth]) {
            const candidate = Math.min(width, maxRawWidth);
            if (!widths.includes(candidate)) widths.push(candidate);
          }
        }
        widths.sort((a, b) => Math.abs(a - estimatedRawWidth) - Math.abs(b - estimatedRawWidth) || a - b);

        const assignments = [];
        for (let heightIndex = 0; heightIndex < heights.length; heightIndex += 1) {
          const height = heights[heightIndex];
          let best = null;
          const restarts = hasTallFixedAnchor ? 2 : (metadata.length <= 26 ? 5 : 3);
          for (let restart = 0; restart < restarts; restart += 1) {
            const random = seededRandom(baseSeed ^ Math.imul(height + 31, 2654435761) ^ Math.imul(restart + 1, 1597334677));
            const assignment = buildTrackRowAssignment(metadata, activeNets, height, random, restart);
            if (!best || assignment.cost < best.cost) best = assignment;
          }
          if (best) assignments.push(best);
          if ((heightIndex + 1) % 2 === 0) await yieldToBrowser();
        }
        assignments.sort((a, b) => a.cost - b.cost || a.height - b.height);

        const fastCandidates = [];
        const bestByWidth = new Map();
        const keepFast = hasTallFixedAnchor ? 12 : (metadata.length <= 12 ? 20 : metadata.length <= 26 ? 28 : 30);
        let trialCounter = 0;
        const assignmentLimit = hasTallFixedAnchor ? 3 : (metadata.length <= 12 ? 4 : 7);
        for (const assignment of assignments.slice(0, Math.min(assignments.length, assignmentLimit))) {
          for (const width of widths) {
            const narrowBoost = width <= Math.min(maxRawWidth, estimatedRawWidth + 1) ? 1.8 : 1;
            const baseTrialCount = hasTallFixedAnchor ? 5 : (metadata.length <= 12 ? 9 : metadata.length <= 26 ? 18 : 4);
            const trialCount = Math.round(baseTrialCount * narrowBoost);
            for (let trial = 0; trial < trialCount; trial += 1) {
              const random = seededRandom(baseSeed ^ Math.imul(assignment.height + 71, 2246822519) ^ Math.imul(width + 13, 3266489917) ^ Math.imul(trial + 1, 668265263));
              if (denseCompact && trial % 6 === 0) await yieldToBrowser();
              const placements = constructTrackPlacement(metadata, assignment, width, clearance, random, demandByNet);
              if (!placements) continue;
              const fast = scoreTrackPlacementFast(placements, metadataById, activeNets, demands, width, assignment.height);
              if (!fast) continue;
              const candidate = { placements, fast, width, height: assignment.height, assignment };
              const widthBest = bestByWidth.get(width);
              if (!widthBest || candidate.fast.score < widthBest.fast.score) bestByWidth.set(width, candidate);
              fastCandidates.push(candidate);
              fastCandidates.sort((a, b) => a.fast.score - b.fast.score);
              if (fastCandidates.length > keepFast) fastCandidates.length = keepFast;
              trialCounter += 1;
              if (trialCounter % 24 === 0) await yieldToBrowser();
            }
          }
        }

        const refinedCandidates = [];
        const seedMap = new Map();
        for (const candidate of fastCandidates.slice(0, metadata.length <= 12 ? 8 : 16)) seedMap.set(`${candidate.width}:${candidate.height}:${candidate.fast.score}`, candidate);
        for (const candidate of bestByWidth.values()) seedMap.set(`${candidate.width}:${candidate.height}:${candidate.fast.score}`, candidate);
        const refinementLimit = hasTallFixedAnchor ? 7 : (metadata.length <= 12 ? 12 : metadata.length <= 26 ? 22 : 12);
        const refinementSeeds = [...seedMap.values()].sort((a, b) => a.fast.score - b.fast.score || a.width - b.width).slice(0, refinementLimit);
        const refinementCount = refinementSeeds.length;
        for (let index = 0; index < refinementCount; index += 1) {
          if (els.generationProgressText) els.generationProgressText.textContent = `Refining copper-row placement… ${index + 1}/${refinementCount}`;
          const random = seededRandom(baseSeed ^ Math.imul(index + 91, 374761393));
          const refinementSteps = hasTallFixedAnchor ? 900 : (metadata.length <= 12 ? 2200 : metadata.length <= 26 ? 5600 : 2200);
          const refined = refineTrackCandidate(refinementSeeds[index], metadata, metadataById, activeNets, demands, random, refinementSteps);
          refinedCandidates.push(refined);
          if ((index + 1) % 2 === 0) await yieldToBrowser();
        }
        fastCandidates.push(...refinedCandidates);
        fastCandidates.sort((a, b) => a.fast.score - b.fast.score);
        const finalCandidateLimit = hasTallFixedAnchor ? 16 : (metadata.length <= 12 ? 20 : 36);
        if (fastCandidates.length > finalCandidateLimit) fastCandidates.length = finalCandidateLimit;
        
        let bestLayout = null;
        let evaluated = 0;
        for (const candidate of fastCandidates) {
          if (els.generationProgressText) els.generationProgressText.textContent = `Evaluating track-centric layouts… ${evaluated + 1}/${fastCandidates.length}`;
          const layout = evaluateCompactPlacement(candidate.placements, netData, activeNets, 0, maximumColumns, Math.min(maximumColumns, candidate.width));
          if (layout && layout.columns <= maximumColumns && (!bestLayout || isLayoutBetter(layout, bestLayout))) bestLayout = layout;
          evaluated += 1;
          if (evaluated % 3 === 0) await yieldToBrowser();
        }
        if (denseCompact) {
          const recovered = await recoverCompactRouting(fastCandidates, metadata, netData, activeNets, maximumColumns,
            normalizeMaximumRows(state.boardSettings.maxRows), baseSeed, bestLayout);
          if (recovered && (!bestLayout || isLayoutBetter(recovered, bestLayout))) bestLayout = recovered;
        }
        return bestLayout;
      }

async function refineCompactRoutingSeed(seed, metadata, netData, activeNets, columns, rows, randomSeed, steps = 32000, session = null) {
        const byId = new Map(metadata.map(m => [m.component.id,m]));
        const demands = buildTrackTerminalDemands(netData,new Set(activeNets.map(n=>n.index)));
        const random = seededRandom(randomSeed);
        const placementRows = rows - (state.boardSettings.spareRows || 0);
        const bounds = rawPlacementBounds(seed.placements);
        const margin = Math.min(2, Math.floor((columns-bounds.width)/2));
        if(margin<1||bounds.height>placementRows)return null;
        const left = Math.floor((columns-bounds.width)/2),top = Math.floor((placementRows-bounds.height)/2);
        let current=seed.placements.map(p=>({...p,component:byId.get(p.component.id).component,x:p.x-bounds.minX+left,y:p.y-bounds.minY+top}));
        const score = p => {
          const s=scoreTrackPlacementFast(p,byId,activeNets,demands,columns,rows);
          if(!s)return null;
          return { ...s, score: s.defects*5200 + s.fragmentation*260 + Math.max(0,s.linkEstimate-s.fragmentation)*50 + s.missingTerminals*160 + s.horizontalResistors*85 + s.horizontalCapacitors*6 + s.cuts*2 };
        };
        let currentScore=score(current);
        if(!currentScore)return null;
        let bestScore=currentScore,best=current.map(p=>({...p})),bestLayout=null;
        let lastRoutedScore=Infinity;
        const routeBest=async attempt=>{
          if(bestScore.defects||bestScore.score>=lastRoutedScore)return;
          lastRoutedScore=bestScore.score;
          for(let r=0;r<2;r++) {
            const l=await completeCompactCopper(best,byId,netData,activeNets,columns,rows,attempt+r,Infinity,null,40,session);
            if(l&&verifyRoutedConnectivity(l)&&(!bestLayout||isLayoutBetter(l,bestLayout)))bestLayout=l;
          }
        };
        await routeBest(0);
        for(let step=0;step<steps;step++) {
          if(session && step%128===0)await session.yield();
          const i=Math.floor(random()*current.length),original=current[i],meta=byId.get(original.component.id);
          let p={...original};const mode=random();
          if(mode<.38)p.x += Math.floor(random()*9)-4;
          else if(mode<.52)p.y += Math.floor(random()*7)-3;
          else {
            const targets=new Map();
            for(let j=0;j<current.length;j++)if(j!==i){
              const other=current[j],otherMeta=byId.get(other.component.id);
              for(const pin of other.footprint.pins){
                const net=otherMeta.pinNets.get(pin.logical);
                if(!net)continue;
                if(!targets.has(net.index))targets.set(net.index,[]);
                targets.get(net.index).push({x:other.x+pin.x,y:other.y+pin.y});
              }
            }
            const pair=trackTwoPinMetadata(meta);
            let aligned=false;
            if(pair && random()<.7){
              const aa=targets.get(pair[0].net.index)||[],bb=targets.get(pair[1].net.index)||[];
              if(aa.length&&bb.length){
                const a=aa[Math.floor(random()*aa.length)],b=bb[Math.floor(random()*bb.length)];
                const options=meta.variants.filter(fp=>fp.width===1 && fp.pins.find(q=>q.logical===pair[1].logical).y-fp.pins.find(q=>q.logical===pair[0].logical).y===b.y-a.y);
                if(options.length){
                  p.footprint=options[Math.floor(random()*options.length)];
                  p.y=a.y-p.footprint.pins.find(q=>q.logical===pair[0].logical).y;
                  p.x=random()<.6?original.x+Math.floor(random()*9)-4:Math.round((a.x+b.x)/2)+Math.floor(random()*7)-3;
                  aligned=true;
                }
              }
            }
            if(!aligned){
              p.footprint=meta.variants[Math.floor(random()*meta.variants.length)];
              const pins=p.footprint.pins.filter(q=>meta.pinNets.get(q.logical));
              const pin=pins[Math.floor(random()*pins.length)];
              const options=pin?(targets.get(meta.pinNets.get(pin.logical).index)||[]):[];
              if(options.length){const q=options[Math.floor(random()*options.length)];p.y=q.y-pin.y;if(random()<.6)p.x=q.x+[-4,-3,-2,2,3,4][Math.floor(random()*6)]-pin.x;}
              else p.y+=Math.floor(random()*9)-4;
            }
          }
          p.x=clamp(p.x,margin,columns-margin-p.footprint.width);
          p.y=clamp(p.y,0,placementRows-p.footprint.height);
          if(p.x===original.x&&p.y===original.y&&p.footprint===original.footprint)continue;
          current[i]=p;
          const next=score(current),temperature=650*Math.pow(1-step/steps,2)+.3;
          if(next&&(next.score<=currentScore.score||random()<Math.exp((currentScore.score-next.score)/temperature))){
            currentScore=next;
            if(next.score<bestScore.score){bestScore=next;best=current.map(p=>({...p}));}
          } else current[i]=original;
          if(step%8000===7999){
            await routeBest(Math.floor(step/8000));

          }
        }
        await routeBest(4);
        if (!bestLayout) {
          bestLayout = await repairCompactRoutingSeed(best, metadata, netData, activeNets, columns, rows, randomSeed & 3, session);
        }
        return { layout: bestLayout, placements: best, fast: bestScore };
      }

async function repairCompactRoutingSeed(seed, metadata, netData, activeNets, columns, rows, serial=0, session=null) {
        const by=new Map(metadata.map(m=>[m.component.id,m]));
        const demands=buildTrackTerminalDemands(netData,new Set(activeNets.map(n=>n.index)));
        const b=rawPlacementBounds(seed),margin=1, spare=state.boardSettings.spareRows||0;
        let current=seed.map(p=>({...p,x:p.x-b.minX+Math.floor((columns-b.width)/2),y:p.y-b.minY+Math.floor((rows-spare-b.height)/2)}));
        let feedback={},layout=null;
        const route=async(p,fb,passes=24)=>completeCompactCopper(p,by,netData,activeNets,columns,rows,serial,Infinity,fb,passes,session);
        layout=await route(current,feedback,64);if(layout)return layout;
        let previousScore=scoreTrackPlacementFast(current,by,activeNets,demands,columns,rows),currentCost=feedback.conflicts??1e6;
        if(!previousScore)return null;
        const tried=new Set();
        for(let round=0;round<3;round++){
          if(!feedback.hot?.length)break;
          const nearest=current.map((p,i)=>({i,d:Math.min(...feedback.hot.map(q=>Math.max(0,p.x-q.x,q.x-p.x-p.footprint.width+1)+Math.max(0,p.y-q.y,q.y-p.y-p.footprint.height+1)))})).sort((a,b)=>a.d-b.d).slice(0,14);
          const options=[];
          for(const {i} of nearest) for(const [dx,dy] of [[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,1],[0,-2],[0,2],[-3,0],[3,0]]) {
            const p=current[i],q={...p,x:p.x+dx,y:p.y+dy};
            if(q.x<margin||q.x+q.footprint.width>columns-margin||q.y<0||q.y+q.footprint.height>rows-spare)continue;
            const next=current.slice();next[i]=q;
            const key=next.map(p=>`${p.x},${p.y},${p.footprint.key}`).join(';');if(tried.has(key))continue;
            const fast=scoreTrackPlacementFast(next,by,activeNets,demands,columns,rows);
            if(!fast||fast.defects||fast.fragmentation>previousScore.fragmentation+3)continue;
            options.push({next,fast,key});
          }
          options.sort((a,b)=>a.fast.score-b.fast.score);
          let chosen=null;
          for(const option of options.slice(0,14)) {
            const fb={};tried.add(option.key);const l=await route(option.next,fb);
            if(l){return l;}
            const cost=fb.conflicts??1e6;
            if(cost<=currentCost&&(!chosen||cost<chosen.cost||cost===chosen.cost&&option.fast.score<chosen.fast.score))chosen={...option,cost,fb};
            if(session)await session.yield();
          }
          if(!chosen)break;
          current=chosen.next;feedback=chosen.fb;currentCost=chosen.cost;previousScore=chosen.fast;
          if(currentCost<=2){const l=await route(current,feedback,100);if(l)return l;}
        }
        return null;
      }

async function completeCompactCopper(rawPlacements, metadataById, netData, activeNets, columns, rows, attempt = 0, deadline = Infinity, feedback = null, maxPasses = 60, session = null) {
        if (!rawPlacements?.length || performance.now() >= deadline) return null;
        const totalRows = rows;
        rows -= Math.max(0, Number(state.boardSettings.spareRows) || 0);
        const bounds = rawPlacementBounds(rawPlacements);
        if (bounds.width > columns || bounds.height > rows) return null;
        const shiftX = Math.floor((columns - bounds.width) / 2) - bounds.minX;
        const shiftY = Math.floor((rows - bounds.height) / 2) - bounds.minY;
        const placements = rawPlacements.map(p => ({ ...p, x: p.x + shiftX, y: p.y + shiftY }));
        const count = columns * rows;
        const blocked = new Uint8Array(count);
        const noLanding = new Uint8Array(count);
        const bodies = new Set();
        const contacts = [];
        const coord = new Set();
        const activeIndexes = new Set(activeNets.map(n => n.index));
        for (const p of placements) {
          const meta = metadataById.get(p.component.id);
          if (!meta) return null;
          const underIc = p.component.type === 'opamp' || p.component.type === 'otherIC';
          const avoid = state.boardSettings.avoidLinksOverComponents !== false && linkAvoidanceAppliesTo(p.component);
          for (let y = p.y; y < p.y + p.footprint.height; y++) for (let x = p.x; x < p.x + p.footprint.width; x++) {
            if (x < 0 || x >= columns || y < 0 || y >= rows) return null;
            const i = y * columns + x;
            if (!underIc) { noLanding[i] = 1; bodies.add(`${x},${y}`); }
            if (avoid) blocked[i] = 1;
          }
          for (const pin of p.footprint.pins) {
            const x = p.x + pin.x, y = p.y + pin.y, i = y * columns + x;
            if (coord.has(i)) return null;
            coord.add(i); noLanding[i] = 1; blocked[i] = 1;
            const net = pin.logical ? meta.pinNets.get(pin.logical) || null : null;
            const sources = pin.logical && p.component.boardPinSources?.[pin.logical];
            const node = sources?.[0] || (pin.logical ? pinKey(p.component.id, pin.logical) : `${p.component.id}:physical-${pin.physical}`);
            contacts.push({ x,y,node,logical:pin.logical,physical:pin.physical,componentId:p.component.id,net,
              netKey:net ? `NET:${net.index}` : `NC:${node}:${pin.physical}`,segmentId:null });
          }
        }
        let topology = buildCopperTopology(contacts, columns);
        if (!topology) return null;
        const seen = new Set(), external = [];
        for (const component of state.components.filter(c => c.type === 'terminal' && terminalScopeOf(c) === 'offboard')) {
          const net = netData.pinToNet.get(pinKey(component.id,'1'));
          if (!net || !activeIndexes.has(net.index) || seen.has(net.index)) continue;
          seen.add(net.index);
          external.push({ component,net,key:component.id,pinName:'1',label:net.name,preferredSide:terminalPreferredSide(net.name),isOffboardControl:false });
        }
        const offboard = buildOffboardControlRoutingPlan(netData,activeIndexes);
        external.push(...offboard.externalControlTerminals);
        const selected = selectEdgeTerminalPads(contacts,topology,columns,rows,external,bodies);
        if (!selected) return null;
        const baseContacts = selected.contacts;
        for (const t of selected.terminals) { const i=t.row*columns+t.x;blocked[i]=1;noLanding[i]=1; }
        topology = buildCopperTopology(baseContacts,columns);
        if (!topology) return null;

        const fixedOwner = new Int32Array(count).fill(-1);
        const localNet = new Map(activeNets.map((n,i)=>[n.index,i]));
        const targets = activeNets.map(()=>[]);
        const fixedCells = activeNets.map(()=>[]);
        let nc = activeNets.length;
        for (const seg of topology.segments) {
          const id = seg.net ? localNet.get(seg.net.index) : nc++;
          for(const contact of seg.contacts) { const at=seg.row*columns+contact.x;fixedOwner[at]=id;if(seg.net)fixedCells[id].push(at); }
          if (seg.net) for (const c of seg.contacts) targets[id].push(c.y*columns+c.x);
        }
        const random = seededRandom((attempt+1)*2654435761);
        const routeOrder = activeNets.map((net,id)=>{
          const ss = topology.segmentsByNet.get(net.index)||[];
          const capacity = ss.reduce((sum,s)=>sum+segmentAvailableHoleXs(s,bodies).length,0);
          return {net,id,segments:ss.length,capacity,jitter:random()};
        });
        if(attempt%4===0) routeOrder.sort((a,b)=>b.segments-a.segments||a.capacity-b.capacity);
        else if(attempt%4===1) routeOrder.sort((a,b)=>a.capacity/Math.max(1,a.segments)-b.capacity/Math.max(1,b.segments));
        else if(attempt%4===2) routeOrder.sort((a,b)=>a.segments-b.segments||a.jitter-b.jitter);
        else routeOrder.sort((a,b)=>a.jitter-b.jitter);
        const canCopper=(i,id)=>{
          if(fixedOwner[i]>=0 && fixedOwner[i]!==id)return false;
          const x=i%columns;
          if(x && fixedOwner[i-1]>=0 && fixedOwner[i-1]!==id)return false;
          if(x+1<columns && fixedOwner[i+1]>=0 && fixedOwner[i+1]!==id)return false;
          return true;
        };
        const dist=new Float64Array(count*3),prev=new Int32Array(count*3);
        let heap=[];
        const push=(s,c)=>{
          let i=heap.length;heap.push([s,c]);
          while(i){let p=(i-1)>>1;if(heap[p][1]<=c)break;heap[i]=heap[p];i=p;}heap[i]=[s,c];
        };
        const pop=()=>{
          const out=heap[0],last=heap.pop();
          if(heap.length){let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=last[1])break;heap[i]=heap[c];i=c;}heap[i]=last;}return out;
        };
        // Negotiated congestion is temporary search state, not a relaxation
        // of the finished board rules. Present cost discourages contention;
        // historical cost discourages repeatedly choosing the same bottleneck.
        // Rip up each net's previous tree before rerouting it against its peers.
        const cuse=new Uint16Array(count),vuse=new Uint16Array(count);
        const chistory=new Float64Array(count),vhistory=new Float64Array(count);
        const solutions=new Map();
        let routes=null;
        for(let pass=0;pass<maxPasses;pass++){
          if(session)await session.yield();
          if(performance.now()>=deadline)return null;
          const present=4+pass*2.5;
          const cprice=new Float64Array(count),vprice=new Float64Array(count);
          let failed=null;
          for(const info of routeOrder){
            if(session)await session.yield();
            if(performance.now()>=deadline)return null;
            const id=info.id,net=info.net,pins=targets[id];
            if(!pins.length)continue;
            const previous=solutions.get(id);
            if(previous){for(const i of previous.copper)cuse[i]--;for(const i of previous.vertical)vuse[i]--;solutions.delete(id);}
            const copper=new Uint8Array(count),wire=new Uint8Array(count),endDirection=new Int8Array(count);
            for(const i of fixedCells[id])copper[i]=1;
            const wireEdges=new Map(),netRoutes=[];
            const addEdge=(a,b)=>{if(!wireEdges.has(a))wireEdges.set(a,[]);wireEdges.get(a).push(b);};
            const reachable=(start)=>{
              const reached=new Uint8Array(count),queue=[start];reached[start]=1;
              for(let q=0;q<queue.length;q++){
                const i=queue[q],x=i%columns;
                if(x&&!reached[i-1]&&copper[i-1]){reached[i-1]=1;queue.push(i-1);}
                if(x+1<columns&&!reached[i+1]&&copper[i+1]){reached[i+1]=1;queue.push(i+1);}
                for(const j of wireEdges.get(i)||[])if(!reached[j]){reached[j]=1;queue.push(j);}
              }
              return{reached,queue};
            };
            for(let i=0;i<count;i++){
              const x=i%columns;
              cprice[i]=.25+present*(cuse[i]+(x?cuse[i-1]:0)+(x+1<columns?cuse[i+1]:0))+chistory[i];
              vprice[i]=1+present*vuse[i]+vhistory[i];
            }
            const root=pins[(attempt+Math.floor(pass/6))%pins.length];
            for(let joined=0;joined<pins.length;joined++){
              if(session)await session.yield();
              if(performance.now()>=deadline)return null;
              const tree=reachable(root);
              if(pins.every(i=>tree.reached[i]))break;
              dist.fill(Infinity);prev.fill(-1);heap=[];
              for(const i of tree.queue){dist[i]=0;push(i,0);}
              const relax=(s,from,c)=>{if(c<dist[s]){dist[s]=c;prev[s]=from;push(s,c);}};
              let goal=-1,explored=0;
              while(heap.length){
                const[s,c]=pop();if(c!==dist[s])continue;
                if((++explored&511)===0&&performance.now()>=deadline)return null;
                const layer=Math.floor(s/count),i=s%count,x=i%columns,y=Math.floor(i/columns);
                if(layer===0){
                  if(copper[i]&&!tree.reached[i]){goal=s;break;}
                  if(x&&canCopper(i-1,id))relax(i-1,s,c+(copper[i-1]?.04:cprice[i-1]));
                  if(x+1<columns&&canCopper(i+1,id))relax(i+1,s,c+(copper[i+1]?.04:cprice[i+1]));
                  if(!noLanding[i]){
                    const up=!wire[i]||(state.boardSettings.allowDoubleLinks!==false&&endDirection[i]===1);
                    const down=!wire[i]||(state.boardSettings.allowDoubleLinks!==false&&endDirection[i]===-1);
                    if(up&&y>0&&!blocked[i-columns]&&!wire[i-columns])relax(count+i-columns,s,c+6+vprice[i]+vprice[i-columns]);
                    if(down&&y+1<rows&&!blocked[i+columns]&&!wire[i+columns])relax(2*count+i+columns,s,c+6+vprice[i]+vprice[i+columns]);
                  }
                }else{
                  if(!noLanding[i]&&!wire[i]&&canCopper(i,id))relax(i,s,c+5.5+(copper[i]?0:cprice[i]));
                  const j=layer===1?i-columns:i+columns;
                  if(j>=0&&j<count&&!blocked[j]&&!wire[j])relax(layer*count+j,s,c+vprice[j]);
                }
              }
              if(goal<0){failed=net.name;break;}
              const path=[];for(let s=goal;s>=0;s=prev[s])path.push(s);path.reverse();
              let start=null,last=null;
              for(const s of path){
                const layer=Math.floor(s/count),i=s%count;
                if(layer===0){
                  copper[i]=1;
                  if(start!==null){
                    const a=start,b=i,ay=Math.floor(a/columns),by=Math.floor(b/columns),direction=Math.sign(by-ay);
                    for(let yy=Math.min(ay,by);yy<=Math.max(ay,by);yy++){
                      const at=yy*columns+a%columns;
                      if(wire[at]&&!(at===a&&state.boardSettings.allowDoubleLinks!==false&&endDirection[a]===-direction)){failed=net.name;break;}
                      wire[at]=1;
                    }
                    if(failed)break;
                    endDirection[a]=endDirection[a]?2:direction;endDirection[b]=-direction;
                    netRoutes.push({node:`${net.name} link ${netRoutes.length+1}`,net,schematicNetIndex:net.index,points:[{x:a%columns,y:ay},{x:b%columns,y:by}],isRoutingBusLink:false});
                    addEdge(a,b);addEdge(b,a);start=null;
                  }
                  last=i;
                }else if(start===null)start=last;
              }
              if(failed)break;
            }
            if(failed)break;
            const connected=reachable(root);
            if(!pins.every(i=>connected.reached[i])){failed=net.name;break;}
            const cc=[],vv=[];
            for(let i=0;i<count;i++){if(copper[i]){cc.push(i);cuse[i]++;}if(wire[i]){vv.push(i);vuse[i]++;}}
            solutions.set(id,{copper:cc,vertical:vv,routes:netRoutes});
          }
          if(failed){ return null; }
          const cid=new Int32Array(count).fill(-1);
          for(const[id,sol]of solutions)for(const i of sol.copper)cid[i]=cid[i]===-1?id:-2;
          let conflicts=0; const hot=[];
          for(let i=0;i<count;i++){
            if(cuse[i]>1){conflicts+=cuse[i]-1;chistory[i]+=1.5;hot.push(i);}
            if(vuse[i]>1){conflicts+=vuse[i]-1;vhistory[i]+=1.5;hot.push(i);}
            if(i%columns+1<columns&&cid[i]!==-1&&cid[i+1]!==-1&&(cid[i]!==cid[i+1]||cid[i]===-2)){
              conflicts++;chistory[i]+=.75;chistory[i+1]+=.75;hot.push(i,i+1);
            }
          }
          if(feedback&&(!Number.isFinite(feedback.conflicts)||conflicts<feedback.conflicts)){feedback.conflicts=conflicts;feedback.hot=[...new Set(hot)].map(i=>({x:i%columns-shiftX,y:Math.floor(i/columns)-shiftY}));feedback.links=[...solutions.values()].reduce((s,x)=>s+x.routes.length,0);}
          
          if(!conflicts){routes=[...solutions.values()].flatMap(s=>s.routes);break;}
          if(pass%4===3){for(const i of routeOrder)i.jitter=random();routeOrder.sort((a,b)=>a.jitter-b.jitter);}
        }
        if(!routes)return null;
        // Only zero-contention trees reach this point. Rebuild actual copper
        // segments and cuts from physical contacts, then validate the board.
        const allContacts=baseContacts.map(c=>({...c})); const addedContacts=new Set(allContacts.map(c=>`${c.x},${c.y}`));
        for(let r=0;r<routes.length;r++)for(let p=0;p<2;p++){
          const route=routes[r],point=route.points[p]; const key=`${point.x},${point.y}`; if(addedContacts.has(key))continue;addedContacts.add(key);
          allContacts.push({...point,node:`LINK:${r}:${p}`,logical:null,physical:'LINK',componentId:'LINK',net:route.net,netKey:`NET:${route.net.index}`,segmentId:null,isRoutingContact:true});
        }
        const finalTopology=buildCopperTopology(allContacts,columns);
        if(!finalTopology){return null;}
        const segmentAt=new Map();for(const s of finalTopology.segments)for(let x=s.start;x<=s.end;x++)segmentAt.set(s.row*columns+x,s);
        for(const r of routes){r.fromSegment=segmentAt.get(r.points[0].y*columns+r.points[0].x)?.id;r.toSegment=segmentAt.get(r.points[1].y*columns+r.points[1].x)?.id;}
        const terminals=selected.terminals.map(t=>({...t,segmentId:segmentAt.get(t.row*columns+t.x)?.id}));
        const busRows=new Map();for(const n of activeNets){const s=(finalTopology.segmentsByNet.get(n.index)||[]).sort((a,b)=>b.contacts.length-a.contacts.length)[0];if(s)busRows.set(n.name,s.row);}
        const totalLinkLength=routes.reduce((s,r)=>s+Math.abs(r.points[0].y-r.points[1].y),0);
        const layout={error:null,columns,rows:totalRows,activeNets,busRows,placements,routes,doubleLinks:computeDoubleLinkHoles(routes),cuts:finalTopology.cuts,terminals,segments:finalTopology.segments,netData,autoDescriptionLines:offboard.autoDescriptionLines,totalLinkLength,cost:columns*rows*8+routes.length*12+totalLinkLength*.08,sourcePlacements:placements.map(p=>({...p}))};
        const checked=validateManualVeroLayout(layout);if(!checked.ok){return null;}
        return layout;
      }

async function compactRoutedCopper(layout, metadata, netData, activeNets, session = null) {
        const byId = new Map(metadata.map(m => [m.component.id, m]));
        const demands = buildTrackTerminalDemands(netData, new Set(activeNets.map(n => n.index)));
        let best = layout;
        for (let pass = 0; pass < 5; pass++) {
          const options = [];
          for (const axis of ['x', 'y']) {
            const size = axis === 'x' ? best.columns : best.rows;
            const footprintSize = axis === 'x' ? 'width' : 'height';
            if (size <= 4) continue;
            for (let line = 0; line < size; line++) {
              // Remove routing-only space, never shorten a component footprint.
              if (best.placements.some(p => p[axis] <= line && p[axis] + p.footprint[footprintSize] > line)) continue;
              if (axis === 'y' && line >= size - (state.boardSettings.spareRows || 0)) continue;
              const placements = best.placements.map(p => ({...p, [axis]: p[axis] > line ? p[axis] - 1 : p[axis]}));
              const columns = best.columns - (axis === 'x' ? 1 : 0), rows = best.rows - (axis === 'y' ? 1 : 0);
              const fast = scoreTrackPlacementFast(placements, byId, activeNets, demands, columns, rows);
              if (fast && !fast.defects) options.push({placements, columns, rows, fast});
            }
          }
          options.sort((a,b) => a.columns*a.rows-b.columns*b.rows || a.fast.score-b.fast.score);
          let next = best;
          for (const option of options.slice(0, 7)) {
            for (let attempt = 0; attempt < 2; attempt++) {
              const candidate = await completeCompactCopper(option.placements, byId, netData, activeNets,
                option.columns, option.rows, attempt, Infinity, null, 48, session);
              if (candidate && verifyRoutedConnectivity(candidate) && isLayoutBetter(candidate, next)) next = candidate;
            }
            if (session) await session.yield();
          }
          if (next === best) break;
          best = next;
        }
        return best;
      }

async function recoverCompactRouting(candidates, metadata, netData, activeNets, maximumColumns, maximumRows, baseSeed, incumbent = null) {
        if (!candidates.length) return incumbent;
        const input = () => JSON.stringify({components:state.components,wires:state.wires,settings:state.boardSettings});
        const originalInput = input();
        let lastYield = performance.now();
        const session = { yield: async () => {
          if (performance.now()-lastYield < 25) return;
          if (input() !== originalInput) throw new Error("The schematic or routing settings changed during generation. Generate again to use the updated project.");
          await yieldToBrowser(); lastYield = performance.now();
        }};
        const byId = new Map(metadata.map(m=>[m.component.id,m]));
        const spare = state.boardSettings.spareRows || 0;
        const area = metadata.reduce((sum,m)=>sum+m.minArea,0);
        const targetWidth = Math.ceil(Math.sqrt(area)*2.35);
        const targetHeight = Math.ceil(Math.sqrt(area)*2);
        const selected=[],keys=new Set();
        // Preserve alternatives instead of retaining only near-identical narrow
        // candidates which all compete for the same unavailable landing lanes.
        for(const c of candidates) {
          const bounds=rawPlacementBounds(c.placements);
          const key=`${bounds.width}:${bounds.height}`;
          if(keys.has(key))continue;
          keys.add(key);selected.push(c);
          if(selected.length>=5)break;
        }
        let best=incumbent;
        const keep=layout=>{
          if(!layout||layout.error||layout.columns>maximumColumns||layout.rows>maximumRows||!verifyRoutedConnectivity(layout))return;
          const copy={...layout,placements:layout.placements.map(p=>({...p})),routes:layout.routes.map(r=>({...r,points:r.points.map(p=>({...p}))})),cuts:layout.cuts.map(c=>({...c})),terminals:layout.terminals.map(t=>({...t}))};
          removeCompletelyUnusedBoardLines(copy);
          if(verifyRoutedConnectivity(copy)&&isLayoutBetter(copy,layout))layout=copy;
          if(!best||isLayoutBetter(layout,best))best=layout;
        };
        for(let index=0;index<selected.length;index++) {
          if(els.generationProgressText)els.generationProgressText.textContent=`Optimizing component placement… ${index+1}/${selected.length}`;
          const seed=selected[index],bounds=rawPlacementBounds(seed.placements);
          const columns=Math.min(maximumColumns,Math.max(bounds.width+4,targetWidth));
          const rows=Math.min(maximumRows,Math.max(bounds.height+4+spare,targetHeight+spare));
          const result=await refineCompactRoutingSeed(seed,metadata,netData,activeNets,columns,rows,
            baseSeed^Math.imul(index+137,668265263),48000,session);
          if(!result)continue;
          keep(result.layout);
          if(!result.layout && !result.fast.defects) {
            // Bounded escape lanes, not expansion straight to the user's cap.
            const w=Math.min(maximumColumns,columns+2),h=Math.min(maximumRows,rows+2);
            for(let attempt=0;attempt<4;attempt++) {
              keep(await completeCompactCopper(result.placements,byId,netData,activeNets,w,h,attempt,Infinity,null,64,session));
            }
          }
          if(best&&index>=1&&best.routes.length<=Math.ceil(metadata.length*.68))break;
          await session.yield();
        }
        if (best) {
          if (els.generationProgressText) els.generationProgressText.textContent = "Removing unused board space…";
          best = await compactRoutedCopper(best, metadata, netData, activeNets, session);
        }
        if(input()!==originalInput)throw new Error("The schematic or routing settings changed during generation. Generate again to use the updated project.");
        return best;
      }

function verifyRoutedConnectivity(layout) {
        if (!layout || !validateManualVeroLayout(layout).ok) return false;
        const contacts = manualLayoutContacts(layout);
        const { segments, segmentAt } = buildManualSegments(layout, contacts);
        const union = new UnionFind(segments.map(segment => segment.id));
        for (const route of layout.routes) {
          const a = route.points[0];
          const b = route.points[route.points.length - 1];
          const from = segmentAt.get(`${a.x},${a.y}`);
          const to = segmentAt.get(`${b.x},${b.y}`);
          if (!from || !to) return false;
          union.union(from.id, to.id);
        }
        const netRoots = new Map();
        const rootNets = new Map();
        for (const contact of contacts) {
          const segment = segmentAt.get(`${contact.x},${contact.y}`);
          if (!segment) return false;
          const root = union.find(segment.id);
          const netIndex = contact.net?.index ?? `NC:${contact.componentId}:${contact.physical}:${contact.logical}`;
          if (netRoots.has(netIndex) && netRoots.get(netIndex) !== root) return false;
          if (rootNets.has(root) && rootNets.get(root) !== netIndex) return false;
          netRoots.set(netIndex, root);
          rootNets.set(root, netIndex);
        }
        for (const route of layout.routes) {
          const point = route.points[0];
          const segment = segmentAt.get(`${point.x},${point.y}`);
          if (rootNets.get(union.find(segment.id)) !== routeNetIndex(route)) return false;
        }
        return layout.activeNets.every(net => netRoots.has(net.index));
      }

async function buildCompactXYLayout() {
        const netData = deriveNets();
        const activeNets = netData.nets.filter(netRequiresVeroRepresentation);
        if (!activeNets.length) return { error: "No connected component nets are available to route." };

        const electricalComponents = buildBoardElectricalComponents();
        if (!electricalComponents.length) return { error: "Place at least one electrical component before generating a board." };

        const maximumColumns = clamp(Number(state.boardSettings.maxColumns) || 20, 8, 80);
        const activeNetIndexes = new Set(activeNets.map(net => net.index));
        const metadata = electricalComponents.map(component => componentPlacementMetadata(component, netData, activeNetIndexes));
        const conflictingPhysicalPins = metadata.filter(meta => meta.physicalPinConflicts.length);
        if (conflictingPhysicalPins.length) {
          return { error: `Conflicting nets share a physical IC pin: ${conflictingPhysicalPins.map(meta => `${meta.component.id} ${meta.physicalPinConflicts.join(", ")}`).join("; ")}.` };
        }

        const totalArea = metadata.reduce((sum, meta) => sum + meta.minArea, 0);
        const largestMinimumWidth = Math.max(...metadata.map(meta => Math.min(...meta.variants.map(variant => variant.width))));
        const maximumPlacementWidth = maximumColumns - 1;
        if (largestMinimumWidth > maximumPlacementWidth) {
          return { error: `The widest package needs more than the ${maximumColumns}-column maximum. Increase Maximum board columns.` };
        }

        const estimatedWidth = clamp(Math.ceil(Math.sqrt(totalArea * 1.55)), largestMinimumWidth, maximumPlacementWidth);
        const hasDaisyPackage = electricalComponents.some(component => component.type === "otherIC" && otherIcModelOf(component) === "Daisy");
        const widthCandidates = new Set([largestMinimumWidth, estimatedWidth, maximumPlacementWidth]);
        if (hasDaisyPackage) {
          const denseEnd = Math.min(maximumPlacementWidth, Math.max(largestMinimumWidth, estimatedWidth + 16));
          for (let width = largestMinimumWidth; width <= denseEnd; width += (denseEnd > 36 ? 2 : 1)) widthCandidates.add(width);
          for (const width of [estimatedWidth + 20, estimatedWidth + 30, estimatedWidth + 42]) {
            widthCandidates.add(clamp(width, largestMinimumWidth, maximumPlacementWidth));
          }
        } else {
          const widthStep = maximumPlacementWidth <= 30 ? 1 : 2;
          for (let width = largestMinimumWidth; width <= maximumPlacementWidth; width += widthStep) widthCandidates.add(width);
        }
        widthCandidates.add(maximumPlacementWidth);
        const widths = [...widthCandidates]
          .filter(width => width >= largestMinimumWidth && width <= maximumPlacementWidth)
          .sort((a, b) => Math.abs(a - estimatedWidth) - Math.abs(b - estimatedWidth) || a - b);

        const clearance = state.boardSettings.busSpacing === 2 ? 1 : 0;
        // Potentiometers historically used POT1/POT2 IDs. They are now shown
        // as VR1/VR2, but canonicalizing only the routing seed preserves the
        // proven placement search for existing projects without exposing the
        // old prefix anywhere in the UI or saved project.
        const routerSeedEndpoint = endpoint => String(endpoint || "").replace(/^VR(\d+):/i, "POT$1:");
        // Auto-describe changes labels and notes only. Exclude it from the
        // placement seed so enabling the feature cannot alter an otherwise
        // identical Vero layout.
        const {
          maxRows: _ignoredMaximumRows,
          autoDescribe: _ignoredAutoDescribe,
          standingResistors: _ignoredStandingResistors,
          ...routerBoardSettings
        } = state.boardSettings;
        // Preserve the released router seed exactly while this optional mode
        // is off. Enabled mode legitimately changes the available footprints.
        if (state.boardSettings.standingResistors === true) routerBoardSettings.standingResistors = true;
        const baseSeed = hashString(JSON.stringify({
          components: electricalComponents.map(component => ({
            id: component.id, type: component.type,
            transistorKind: component.type === "transistor" ? transistorKindOf(component) : undefined,
            transistorLeadOrder: component.type === "transistor" ? transistorLeadOrder(component) : undefined,
            otherIcModel: component.type === "otherIC" ? otherIcModelOf(component) : undefined,
            value: component.value
          })),
          wires: state.wires.map(wire => [routerSeedEndpoint(wire.a), routerSeedEndpoint(wire.b)]).sort(),
          settings: { ...routerBoardSettings, maxColumns: maximumColumns }
        }));

        const compactInput = () => JSON.stringify({ components: state.components, wires: state.wires,
          columns: state.boardSettings.maxColumns, rows: state.boardSettings.maxRows, mode: state.boardSettings.busSpacing,
          spareRows: state.boardSettings.spareRows, avoid: state.boardSettings.avoidLinksOverComponents,
          doubleLinks: state.boardSettings.allowDoubleLinks, standing: state.boardSettings.standingResistors,
          autoDescribe: state.boardSettings.autoDescribe });
        const originalCompactInput = compactInput();
        const maximumRows = normalizeMaximumRows(state.boardSettings.maxRows);
        const placementRowLimit = maximumRows - state.boardSettings.spareRows;
        const minimumHeight = Math.max(...metadata.map(meta => Math.min(...meta.variants.map(variant => variant.height))));
        if (placementRowLimit < minimumHeight || totalArea > maximumColumns * placementRowLimit) {
          return { error: `The components cannot fit within ${maximumColumns} columns × ${maximumRows} rows, including spare rows. Increase Maximum board rows or Maximum board columns.` };
        }
        if (els.generationProgressText) els.generationProgressText.textContent = "Assigning nets to copper strips…";
        await yieldToBrowser();
        let bestLayout = await buildTrackCentricLayout(metadata, netData, activeNets, maximumColumns, clearance, baseSeed);
        if (compactInput() !== originalCompactInput) throw new Error("The schematic or routing settings changed during generation. Generate again to use the updated project.");
        // Daisy is a 20-row fixed package. Once the track-centric solver has
        // produced a fully routed and validated candidate, the generic local
        // refinement stages add very little value but can spend minutes
        // repeatedly rerouting forty physical pins. Finalize that valid
        // track-centric result directly. Every non-Daisy circuit continues
        // through the released autorouter path unchanged.
        if ((hasDaisyPackage || metadata.length > 26) && bestLayout) {
          if (els.generationProgressText) els.generationProgressText.textContent = hasDaisyPackage ? "Finalizing Daisy layout…" : "Finalizing compact layout…";
          await yieldToBrowser();
          bestLayout = removeCompletelyUnusedBoardLines(bestLayout);
          if (!bestLayout || bestLayout.columns > maximumColumns || bestLayout.rows > maximumRows) {
            return { error: `The autorouter could not keep the layout within the ${maximumColumns}-column maximum.` };
          }
          return bestLayout;
        }
        if (metadata.length > 26 && !bestLayout) {
          return { error: `Compact could not finish a valid layout within ${maximumColumns} columns × ${maximumRows} rows. Increase Maximum board rows or Maximum board columns and generate again.` };
        }
        const targetLayoutCount = bestLayout
          ? (metadata.length <= 12 ? 18 : metadata.length <= 25 ? 32 : 22)
          : (hasDaisyPackage ? 48 : (metadata.length <= 12 ? 180 : metadata.length <= 25 ? 110 : 56));
        const trialsPerWidth = Math.max(bestLayout ? 1 : 2, Math.floor(targetLayoutCount / Math.max(1, widths.length)));
        let completedWidths = 0;

        for (const width of widths) {
          if (els.generationProgressText) els.generationProgressText.textContent = `Testing compact board widths… ${completedWidths + 1}/${widths.length}`;
          const largestHeight = Math.max(...metadata.flatMap(meta => meta.variants.map(variant => variant.height)));
          const heightLimit = clamp(
            Math.max(largestHeight + 3, Math.ceil(totalArea / Math.max(1, width)) * (clearance ? 3 : 2) + 7, Math.ceil(activeNets.length * .65) + 5),
            Math.min(largestHeight, placementRowLimit), placementRowLimit
          );
          for (let trial = 0; trial < trialsPerWidth; trial += 1) {
            const random = seededRandom(baseSeed ^ Math.imul(width + 17, 2654435761) ^ Math.imul(trial + 1, 2246822519));
            const placements = buildGreedyPlacement(metadata, width, heightLimit, clearance, random, trial);
            if (!placements) {
              if ((trial + 1) % 4 === 0) await yieldToBrowser();
              continue;
            }
            const layout = evaluateCompactPlacement(placements, netData, activeNets, 0, maximumColumns, Math.min(maximumColumns, Math.max(8, width + 1)));
            if (layout && layout.columns <= maximumColumns && (!bestLayout || isLayoutBetter(layout, bestLayout))) bestLayout = layout;
            if ((trial + 1) % 4 === 0) await yieldToBrowser();
          }
          completedWidths += 1;
          await yieldToBrowser();
        }

        if (!bestLayout) {
          const fallbackTrials = Math.max(3, Math.floor((metadata.length <= 12 ? 120 : 60) / Math.max(1, widths.length)));
          let fallbackWidthIndex = 0;
          for (const width of widths) {
            if (els.generationProgressText) els.generationProgressText.textContent = `Trying alternate placements… ${fallbackWidthIndex + 1}/${widths.length}`;
            const largestHeight = Math.max(...metadata.flatMap(meta => meta.variants.map(variant => variant.height)));
            const heightLimit = clamp(Math.max(largestHeight + 3, Math.ceil(totalArea / Math.max(1, width)) * (clearance ? 3 : 2) + 7), Math.min(largestHeight, placementRowLimit), placementRowLimit);
            for (let trial = 0; trial < fallbackTrials; trial += 1) {
              const random = seededRandom(baseSeed ^ Math.imul(width + 17, 2654435761) ^ Math.imul(trial + 1, 2246822519));
              const placements = buildGreedyPlacement(metadata, width, heightLimit, clearance, random, trial, true);
              if (!placements) {
                if ((trial + 1) % 4 === 0) await yieldToBrowser();
                continue;
              }
              const layout = evaluateCompactPlacement(placements, netData, activeNets, 0, maximumColumns, Math.min(maximumColumns, Math.max(8, width + 1)));
              if (layout && layout.columns <= maximumColumns && (!bestLayout || isLayoutBetter(layout, bestLayout))) bestLayout = layout;
              if ((trial + 1) % 4 === 0) await yieldToBrowser();
            }
            fallbackWidthIndex += 1;
            await yieldToBrowser();
          }
        }

        if (!bestLayout) {
          return { error: `The autorouter could not produce a valid layout within ${maximumColumns} columns × ${maximumRows} rows. Increase Maximum board rows or Maximum board columns, or review the physical constraints.` };
        }
        if (els.generationProgressText) els.generationProgressText.textContent = "Optimizing component placement…";
        await yieldToBrowser();
        bestLayout = refineCompactPlacement(bestLayout, metadata, netData, activeNets, clearance, baseSeed);
        if (!bestLayout || bestLayout.columns > maximumColumns || bestLayout.rows > maximumRows) return { error: `The autorouter could not keep the optimized layout within the ${maximumColumns}-column maximum.` };
        if (els.generationProgressText) els.generationProgressText.textContent = "Removing unused board space…";
        await yieldToBrowser();
        bestLayout = compactPlacementSweeps(bestLayout, metadata, netData, activeNets, clearance);
        if (!bestLayout || bestLayout.columns > maximumColumns || bestLayout.rows > maximumRows) return { error: `The autorouter could not keep the compacted layout within the ${maximumColumns}-column maximum.` };
        if (els.generationProgressText) els.generationProgressText.textContent = "Squeezing component columns…";
        await yieldToBrowser();
        bestLayout = await compactPlacementColumns(bestLayout, metadata, netData, activeNets, clearance);
        if (!bestLayout || bestLayout.columns > maximumColumns || bestLayout.rows > maximumRows) return { error: `The autorouter could not keep the column-compacted layout within the ${maximumColumns}-column maximum.` };
        bestLayout = removeCompletelyUnusedBoardLines(bestLayout);
        if (!bestLayout || bestLayout.columns > maximumColumns || bestLayout.rows > maximumRows) return { error: `The autorouter could not keep the final layout within the ${maximumColumns}-column maximum.` };
        return bestLayout;
      }

function isPerfLayout(layout = state.veroLayout) { return layout?.boardType === "perf"; }

function perfPathCells(points) {
        if (!Array.isArray(points) || points.length < 2) return null;
        const cells = [];
        for (let k = 0; k < points.length - 1; k++) {
          const a = points[k], b = points[k + 1];
          if (![a?.x,a?.y,b?.x,b?.y].every(v=>Number.isFinite(v)&&Number.isInteger(v)) || (a.x !== b.x && a.y !== b.y && Math.abs(b.x-a.x) !== Math.abs(b.y-a.y))) return null;
          if (a.x !== b.x && a.y !== b.y && ![a.x,a.y,b.x,b.y].every(Number.isInteger)) return null;
          const length = Math.max(Math.abs(b.x-a.x), Math.abs(b.y-a.y));
          if (length > 800) return null;
          const dx = Math.sign(b.x-a.x), dy = Math.sign(b.y-a.y);
          if (!cells.length) cells.push({x:a.x,y:a.y});
          for (let n=1;n<=length;n++) cells.push({x:a.x+dx*n,y:a.y+dy*n});
        }
        return cells.length > 1 ? cells : null;
      }

function perfSerializedTraces(layout) {
        return (layout?.perfTraces || []).map(trace=>({node:trace.node || "", points:trace.points.map(p=>({...p})),
          ...(trace.omittedEditPoints?.length ? {omittedEditPoints: trace.omittedEditPoints.map(p=>({x:p.x,y:p.y}))} : {}),
          schematicNetIndex:trace.schematicNetIndex ?? trace.net?.index,
          schematicNetIdentity:trace.schematicNetIdentity || trace.net?.stableIdentity || ""}));
      }

function buildPerfPadSegments(layout, contacts) {
        // One vertex per physical isolated pad, with no between-pad lanes.
        const segments=[],segmentAt=new Map();
        for(let y=0;y<layout.rows;y++) for(let x=0;x<layout.columns;x++) {
          const segment={id:`P${x},${y}`,row:y,start:x,end:x,contacts:[],net:null,conflict:false,conflictNets:[]};
          segments.push(segment);segmentAt.set(`${x},${y}`,segment);
        }
        for(const c of contacts) segmentAt.get(`${c.x},${c.y}`)?.contacts.push(c);
        return {segments,segmentAt};
      }

function refreshPerfLayoutConnectivity(layout, updateUi = true) {
        const contacts=manualLayoutContacts(layout);
        const {segments,segmentAt}=buildPerfPadSegments(layout,contacts);
        const union=new UnionFind(segments.map(s=>s.id));
        const at=p=>p && segmentAt.get(`${p.x},${p.y}`);
        let invalid=(layout.routes||[]).length; const diagonals=new Map();
        for(const trace of layout.perfTraces||[]) {
          const cells=perfPathCells(trace.points);
          trace.invalid=!cells || cells.some(p=>!at(p));
          if(trace.invalid){invalid++;continue;}
          for(let i=1;i<cells.length;i++) {
            const a=cells[i-1],b=cells[i];union.union(at(a).id,at(b).id);
            if(a.x!==b.x && a.y!==b.y){
              const square=`${Math.min(a.x,b.x)},${Math.min(a.y,b.y)}`;
              const prior=diagonals.get(square);if(prior)union.union(prior,at(a).id);else diagonals.set(square,at(a).id);
            }
          }
        }
        for(const route of layout.routes||[]) {
          const a=at(route.points?.[0]),b=at(route.points?.at(-1));
          route.fromSegment=a?.id || null;route.toSegment=b?.id || null;
          route.invalid=true; // Earlier beta jumpers need regeneration, not reinterpretation.
        }
        const groups=new Map(),netRoots=new Map(),hints=new Map();
        for(const c of contacts) {
          const s=at(c);if(!s){invalid++;continue;}
          const root=union.find(s.id);
          // Unused IC pins also remain electrically isolated: connecting an NC
          // pin to a signal is a warning, not a silently accepted connection.
          const key=c.net?.index ?? `NC:${c.componentId}:${c.physical}`;
          if(!groups.has(root))groups.set(root,new Map());
          groups.get(root).set(key,c.net || {index:key,name:`${c.componentId} pin ${c.physical} (unconnected)`});
          if(c.net){if(!netRoots.has(key))netRoots.set(key,new Set());netRoots.get(key).add(root);}
        }
        for(const item of [...(layout.perfTraces||[]),...(layout.routes||[])]) {
          const first=at(item.points?.[0]);if(!first)continue;
          const root=union.find(first.id);
          const net=(layout.netData?.nets||[]).find(n=>n.index===item.schematicNetIndex) || item.net;
          if(net){if(!hints.has(root))hints.set(root,new Map());hints.get(root).set(net.index,net);}
        }
        const displays=new Map();let shorts=0;
        for(const segment of segments) {
          const root=union.find(segment.id);
          if(!displays.has(root)) {
            const explicit=[...(groups.get(root)?.values()||[])],suggested=[...(hints.get(root)?.values()||[])];
            if(explicit.length>1)displays.set(root,{index:-1000-shorts++,name:`SHORT: ${explicit.map(n=>n.name).join(" / ")}`,conflict:true,members:explicit});
            else displays.set(root,explicit[0] || (suggested.length===1?suggested[0]:null));
          }
          const display=displays.get(root);
          segment.net=display && typeof display.index === "number" ? display : null;
          segment.conflict=!!display?.conflict;segment.conflictNets=display?.members||[];
        }
        for(const item of [...(layout.perfTraces||[]),...(layout.routes||[])]) {
          const s=at(item.points?.[0]);item.displayNet=s?displays.get(union.find(s.id))||item.net:item.net;
          item.conflict=!!item.displayNet?.conflict;
        }
        for(const t of layout.terminals||[]) t.segmentId=at({x:t.side==="right"?layout.columns-1:0,y:t.row})?.id||null;
        layout.segments=segments;layout.manualContacts=contacts;layout.manualShortCount=shorts;
        layout.manualDisconnectedNets=[...netRoots].filter(([,roots])=>roots.size>1).map(([id,roots])=>({net:(layout.netData?.nets||[]).find(n=>n.index===id),groups:roots.size}));
        for(const net of layout.activeNets||[])if(!netRoots.has(net.index))layout.manualDisconnectedNets.push({net,groups:0});
        layout.perfInvalidPaths=invalid;layout.manualEdited=state.veroManualEdited;
        layout.totalLinkLength=(layout.routes||[]).reduce((sum,r)=>sum+((perfPathCells(r.points)?.length||1)-1)/2,0);
        layout.doubleLinks=computeDoubleLinkHoles(layout.routes||[]);
        if(updateUi)updateVeroEditUi();
        return {ok:shorts===0 && invalid===0 && layout.manualDisconnectedNets.length===0,shorts,disconnected:layout.manualDisconnectedNets.length,invalid};
      }

function validatePerfLayout(layout) {
        if(!layout || layout.error)return {ok:false,message:"No layout is available."};
        const bad=message=>({ok:false,message});
        if(!Number.isInteger(layout.columns)||!Number.isInteger(layout.rows)||layout.columns<4||layout.columns>220||layout.rows<4||layout.rows>160)return bad("Keep the board between 4 × 4 and 220 × 160 holes.");
        const inside=p=>p && Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<=layout.columns-1&&p.y>=0&&p.y<=layout.rows-1;
        const occupied=new Set(),pins=new Set();
        for(const p of layout.placements||[]) {
          if(!inside({x:p.x,y:p.y}) || p.x+p.footprint.width>layout.columns || p.y+p.footprint.height>layout.rows)return bad(`${p.component.id} would be outside the board.`);
          for(let y=p.y;y<p.y+p.footprint.height;y++)for(let x=p.x;x<p.x+p.footprint.width;x++){
            const k=`${x},${y}`;if(occupied.has(k))return bad(`${p.component.id} would overlap another component.`);occupied.add(k);
          }
          for(const pin of p.footprint.pins){const at={x:p.x+pin.x,y:p.y+pin.y},k=`${at.x},${at.y}`;
            if(!inside(at)||pins.has(k))return bad("Component pins must occupy separate on-board holes.");pins.add(k);}
        }
        const terminals=new Set();
        for(const t of layout.terminals||[]) {
          const p={x:t.side==="right"?layout.columns-1:0,y:t.row},k=`${p.x},${p.y}`;
          if(!["left","right"].includes(t.side)||!inside(p)||pins.has(k)||terminals.has(k))return bad("Each edge connection needs its own on-board hole.");
          terminals.add(k);
        }
        if(layout.cuts?.length)return bad("Perfboard pads are isolated; use solder connections rather than strip cuts.");
        for(const t of layout.perfTraces||[]) {const cells=perfPathCells(t.points);if(!cells || cells.some(p=>!inside(p)))return bad("Solder runs must follow the hole grid and remain on the board.");}
        if (layout.routes?.length) return bad("Earlier Perf beta wiring: regenerate for single-side, on-hole connections.");
        return {ok:true,message:""};
      }

function electrolyticRadiusOf(placement) {
        const value=Number(placement?.electrolyticRadius);
        return Number.isFinite(value)&&value>0?clamp(value,8,72):14;
      }

function cloneVeroFootprint(footprint) {
        return {
          ...footprint,
          pins: Array.isArray(footprint?.pins) ? footprint.pins.map(pin => ({ ...pin })) : []
        };
      }

function placementPinNet(layout, placement, pin) {
        if (!pin?.logical) return null;
        const component = placement.component;
        const sourceNodes = component.boardPinSources
          ? (component.boardPinSources[pin.logical] || [])
          : [pinKey(component.id, pin.logical)];
        const candidates = sourceNodes
          .map(sourceNode => layout.netData?.pinToNet?.get(sourceNode))
          .filter(Boolean);
        const activeIndexes = new Set((layout.activeNets || []).map(net => net.index));
        return candidates.find(net => activeIndexes.has(net.index)) || candidates[0] || null;
      }

function manualLayoutContacts(layout) {
        const contacts = [];
        for (let placementIndex = 0; placementIndex < layout.placements.length; placementIndex += 1) {
          const placement = layout.placements[placementIndex];
          for (let pinIndex = 0; pinIndex < placement.footprint.pins.length; pinIndex += 1) {
            const pin = placement.footprint.pins[pinIndex];
            const net = placementPinNet(layout, placement, pin);
            contacts.push({
              x: placement.x + pin.x,
              y: placement.y + pin.y,
              placementIndex,
              pinIndex,
              componentId: placement.component.id,
              physical: pin.physical,
              logical: pin.logical,
              net,
              isExternalTerminal: false
            });
          }
        }
        for (let terminalIndex = 0; terminalIndex < (layout.terminals || []).length; terminalIndex += 1) {
          const terminal = layout.terminals[terminalIndex];
          const x = terminal.side === "right" ? layout.columns - 1 : 0;
          contacts.push({
            x,
            y: terminal.row,
            terminalIndex,
            componentId: terminal.component?.id || `EDGE-${terminalIndex}`,
            physical: "EDGE",
            logical: terminal.pinName || "1",
            net: terminal.net || null,
            isExternalTerminal: true
          });
        }
        return contacts;
      }

function buildManualSegments(layout, contacts) {
        if (isPerfLayout(layout)) return buildPerfPadSegments(layout, contacts);
        const cutsByRow = new Map();
        for (const cut of layout.cuts || []) {
          if (!cutsByRow.has(cut.y)) cutsByRow.set(cut.y, []);
          cutsByRow.get(cut.y).push(cut.x);
        }
        for (const list of cutsByRow.values()) list.sort((a, b) => a - b);

        const contactsByRow = new Map();
        for (const contact of contacts) {
          if (!contactsByRow.has(contact.y)) contactsByRow.set(contact.y, []);
          contactsByRow.get(contact.y).push(contact);
        }

        const segments = [];
        const segmentAt = new Map();
        for (let row = 0; row < layout.rows; row += 1) {
          const cutXs = [...new Set((cutsByRow.get(row) || []).filter(x => x >= 0 && x < layout.columns))];
          const starts = [0, ...cutXs.map(x => x + 1)];
          const ends = [...cutXs.map(x => x - 1), layout.columns - 1];
          for (let part = 0; part < starts.length; part += 1) {
            const start = starts[part];
            const end = ends[part];
            if (start > end) continue;
            const segment = {
              id: `M${segments.length + 1}`,
              row,
              start,
              end,
              contacts: (contactsByRow.get(row) || []).filter(contact => contact.x >= start && contact.x <= end),
              net: null,
              conflict: false,
              conflictNets: []
            };
            segments.push(segment);
            for (let x = start; x <= end; x += 1) segmentAt.set(`${x},${row}`, segment);
          }
        }
        return { segments, segmentAt };
      }

function refreshManualLayoutConnectivity(layout = state.veroLayout) {
        if (!layout || layout.error) return;
        if (isPerfLayout(layout)) return refreshPerfLayoutConnectivity(layout);
        for (const route of layout.routes || []) {
          if (!Number.isFinite(route.schematicNetIndex)) route.schematicNetIndex = route.net?.index;
        }
        const contacts = manualLayoutContacts(layout);
        const { segments, segmentAt } = buildManualSegments(layout, contacts);
        const union = new UnionFind(segments.map(segment => segment.id));

        for (const route of layout.routes || []) {
          const first = route.points?.[0];
          const last = route.points?.[route.points.length - 1];
          const from = first ? segmentAt.get(`${first.x},${first.y}`) : null;
          const to = last ? segmentAt.get(`${last.x},${last.y}`) : null;
          route.fromSegment = from?.id || null;
          route.toSegment = to?.id || null;
          route.invalid = !from || !to;
          if (from && to) union.union(from.id, to.id);
        }

        const groupNets = new Map();
        const groupHints = new Map();
        for (const segment of segments) {
          const root = union.find(segment.id);
          if (!groupNets.has(root)) groupNets.set(root, new Map());
          for (const contact of segment.contacts) {
            if (contact.net) groupNets.get(root).set(contact.net.index, contact.net);
          }
        }
        for (const route of layout.routes || []) {
          if (route.invalid) continue;
          const from = segments.find(segment => segment.id === route.fromSegment);
          const root = from ? union.find(from.id) : null;
          if (!root) continue;
          if (!groupHints.has(root)) groupHints.set(root, new Map());
          const hinted = (layout.netData?.nets || []).find(net => net.index === route.schematicNetIndex) || route.net;
          if (hinted) groupHints.get(root).set(hinted.index, hinted);
        }

        const displayByRoot = new Map();
        let conflictIndex = -1000;
        let shortCount = 0;
        for (const segment of segments) {
          const root = union.find(segment.id);
          if (displayByRoot.has(root)) continue;
          const explicitNets = [...(groupNets.get(root)?.values() || [])];
          const hints = [...(groupHints.get(root)?.values() || [])];
          if (explicitNets.length > 1) {
            shortCount += 1;
            displayByRoot.set(root, {
              name: `SHORT: ${explicitNets.map(net => net.name).join(" / ")}`,
              index: conflictIndex--,
              conflict: true,
              members: explicitNets
            });
          } else if (explicitNets.length === 1) {
            displayByRoot.set(root, explicitNets[0]);
          } else if (hints.length === 1) {
            displayByRoot.set(root, hints[0]);
          } else {
            displayByRoot.set(root, null);
          }
        }

        for (const segment of segments) {
          const root = union.find(segment.id);
          const display = displayByRoot.get(root) || null;
          segment.net = display;
          segment.conflict = Boolean(display?.conflict);
          segment.conflictNets = display?.members || [];
        }
        for (const route of layout.routes || []) {
          const from = segments.find(segment => segment.id === route.fromSegment);
          const root = from ? union.find(from.id) : null;
          route.displayNet = root ? displayByRoot.get(root) || route.net : route.net;
          route.conflict = Boolean(route.displayNet?.conflict);
        }
        for (const terminal of layout.terminals || []) {
          const x = terminal.side === "right" ? layout.columns - 1 : 0;
          terminal.segmentId = segmentAt.get(`${x},${terminal.row}`)?.id || null;
        }

        const groupsPerNet = new Map();
        for (const segment of segments) {
          for (const contact of segment.contacts) {
            if (!contact.net) continue;
            if (!groupsPerNet.has(contact.net.index)) groupsPerNet.set(contact.net.index, new Set());
            groupsPerNet.get(contact.net.index).add(union.find(segment.id));
          }
        }
        layout.manualDisconnectedNets = [...groupsPerNet.entries()]
          .filter(([, groups]) => groups.size > 1)
          .map(([netIndex, groups]) => ({
            net: (layout.netData?.nets || []).find(net => net.index === netIndex),
            groups: groups.size
          }));
        layout.manualShortCount = shortCount;
        layout.segments = segments;
        layout.manualContacts = contacts;
        layout.manualEdited = state.veroManualEdited;
        layout.totalLinkLength = (layout.routes || []).reduce((sum, route) => {
          const a = route.points?.[0];
          const b = route.points?.[route.points.length - 1];
          return sum + (a && b ? Math.abs(a.y - b.y) : 0);
        }, 0);
        layout.doubleLinks = computeDoubleLinkHoles(layout.routes || []);
        updateVeroEditUi();
      }

function manualTerminalHoleSet(layout) {
        return new Set((layout.terminals || []).map(terminal => `${terminal.side === "right" ? layout.columns - 1 : 0},${terminal.row}`));
      }

function validateManualVeroLayout(layout = state.veroLayout) {
        if (!layout || layout.error) return { ok: false, message: "No layout is available." };
        if (isPerfLayout(layout)) return validatePerfLayout(layout);
        if (!Number.isInteger(layout.columns) || !Number.isInteger(layout.rows) || layout.columns < 4 || layout.rows < 4 || layout.columns > 220 || layout.rows > 160) {
          return { ok: false, message: "The board size must remain between 4 × 4 and 220 × 160 holes." };
        }
        for (const terminal of layout.terminals || []) {
          if (terminal.row < 0 || terminal.row >= layout.rows) return { ok: false, message: `${terminal.net?.name || "An external connection"} would be outside the resized board.` };
        }
        const pinHoles = new Map();
        const terminalHoles = manualTerminalHoleSet(layout);
        const cutHoles = new Set();
        const routeEndpointUse = new Map();

        for (let i = 0; i < layout.placements.length; i += 1) {
          const placement = layout.placements[i];
          if (placement.x < 0 || placement.y < 0 || placement.x + placement.footprint.width > layout.columns || placement.y + placement.footprint.height > layout.rows) {
            return { ok: false, message: `${placement.component.id} would be outside the board.` };
          }
          for (let j = i + 1; j < layout.placements.length; j += 1) {
            const other = layout.placements[j];
            if (rectanglesOverlap(
              { x: placement.x, y: placement.y, width: placement.footprint.width, height: placement.footprint.height },
              { x: other.x, y: other.y, width: other.footprint.width, height: other.footprint.height },
              0
            )) return { ok: false, message: `${placement.component.id} would overlap ${other.component.id}.` };
          }
          for (const pin of placement.footprint.pins) {
            const x = placement.x + pin.x;
            const y = placement.y + pin.y;
            const key = `${x},${y}`;
            if (x < 0 || x >= layout.columns || y < 0 || y >= layout.rows) return { ok: false, message: `${placement.component.id} has a pin outside the board.` };
            if (pinHoles.has(key)) return { ok: false, message: `${placement.component.id} would share a hole with ${pinHoles.get(key)}.` };
            if (terminalHoles.has(key)) return { ok: false, message: `${placement.component.id} would occupy an external connection hole.` };
            pinHoles.set(key, placement.component.id);
          }
        }

        for (const cut of layout.cuts || []) {
          const key = `${cut.x},${cut.y}`;
          if (cut.x < 0 || cut.x >= layout.columns || cut.y < 0 || cut.y >= layout.rows) return { ok: false, message: "A track cut would be outside the board." };
          if (cutHoles.has(key)) return { ok: false, message: "Two track cuts cannot occupy the same hole." };
          if (pinHoles.has(key)) return { ok: false, message: `A track cut cannot occupy ${pinHoles.get(key)}'s pin hole.` };
          if (terminalHoles.has(key)) return { ok: false, message: "A track cut cannot occupy an external connection hole." };
          cutHoles.add(key);
        }

        const intervalsByColumn = new Map();
        for (let routeIndex = 0; routeIndex < (layout.routes || []).length; routeIndex += 1) {
          const route = layout.routes[routeIndex];
          const a = route.points?.[0];
          const b = route.points?.[route.points.length - 1];
          if (!a || !b || a.x !== b.x || a.y === b.y) return { ok: false, message: "Internal links must remain vertical and connect two different rows." };
          if ([a, b].some(point => point.x < 0 || point.x >= layout.columns || point.y < 0 || point.y >= layout.rows)) return { ok: false, message: "A link endpoint would be outside the board." };
          const netIndex = routeNetIndex(route);
          for (const [point, otherPoint] of [[a, b], [b, a]]) {
            const key = `${point.x},${point.y}`;
            if (pinHoles.has(key)) return { ok: false, message: `A link endpoint cannot share ${pinHoles.get(key)}'s pin hole.` };
            if (cutHoles.has(key)) return { ok: false, message: "A link endpoint cannot occupy a cut hole." };
            if (terminalHoles.has(key)) return { ok: false, message: "A link endpoint cannot occupy an external connection hole." };
            if (!canUseLinkEndpoint(routeEndpointUse, point, otherPoint, netIndex)) {
              return { ok: false, message: state.boardSettings.allowDoubleLinks === false
                ? "Two link endpoints cannot share a hole while double links are disabled."
                : "A shared link hole must join exactly two links from the same net in opposite directions." };
            }
            addLinkEndpointUse(routeEndpointUse, point, otherPoint, netIndex, routeIndex);
          }
          const minY = Math.min(a.y, b.y);
          const maxY = Math.max(a.y, b.y);
          for (let y = minY + 1; y < maxY; y += 1) {
            if (pinHoles.has(`${a.x},${y}`)) {
              return { ok: false, message: `An internal link cannot pass through ${pinHoles.get(`${a.x},${y}`)}'s pin hole.` };
            }
          }
          const manualEdgeTerminalRows = edgeTerminalRowsByColumn(layout.terminals || [], layout.columns);
          if (routeOverlapsEdgeTerminal(a, b, manualEdgeTerminalRows, layout.columns)) {
            return { ok: false, message: "An internal link cannot pass through an off-board connection on an edge column." };
          }
          if (state.boardSettings.avoidLinksOverComponents !== false) {
            const crossesBody = (layout.placements || []).some(placement => routeCrossesAvoidedComponent(route, placement, true));
            if (crossesBody) return { ok: false, message: "Internal links are set to avoid discrete components, including regulators and transistors." };
          }
          const intervals = intervalsByColumn.get(a.x) || [];
          if (intervals.some(interval => routeIntervalsOverlap(minY, maxY, interval.minY, interval.maxY))) {
            return { ok: false, message: "Internal links cannot run on top of one another." };
          }
          intervals.push({ minY, maxY, routeIndex });
          intervalsByColumn.set(a.x, intervals);
        }
        return { ok: true, message: "" };
      }

function cleanLayoutAnnotations(items) {
        if (!Array.isArray(items)) return [];
        const seen = new Set();
        return items.filter(item => item && ["text", "image"].includes(item.kind)
          && [item.x, item.y, item.width, item.height].every(Number.isFinite)
          && item.width > 0 && item.height > 0 && Math.max(item.width, item.height) <= 10000
          && Math.max(Math.abs(item.x), Math.abs(item.y)) <= 100000
          && (item.kind !== "image" || /^data:image\/(?:png|jpeg|webp|gif|bmp);base64,[a-z0-9+/=\s]+$/i.test(item.src || "")))
          .map(item => {
            let id = String(item.id || uid("NOTE"));
            if (seen.has(id)) id = uid("NOTE"); seen.add(id);
            return item.kind === "text"
              ? { id, kind: "text", x: item.x, y: item.y, width: item.width, height: item.height,
                  text: String(item.text || "").slice(0, 4000), fontSize: clamp(Number(item.fontSize) || 20, 8, 180),
                  ...(parseHexColor(item.color) ? { color: parseHexColor(item.color) } : {}) }
              : { id, kind: "image", x: item.x, y: item.y, width: item.width, height: item.height, src: item.src };
          });
      }

function routeCrossesPlacementPin(route, placement, includeEndpoints = true) {
        if (!route || !placement) return false;
        const a = route.points?.[0];
        const b = route.points?.[route.points.length - 1];
        if (!a || !b || a.x !== b.x) return false;
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        const routeStart = includeEndpoints ? minY : minY + 1;
        const routeEnd = includeEndpoints ? maxY : maxY - 1;
        if (routeStart > routeEnd) return false;
        return (placement.footprint?.pins || []).some(pin => {
          const pinX = placement.x + pin.x;
          const pinY = placement.y + pin.y;
          return pinX === a.x && pinY >= routeStart && pinY <= routeEnd;
        });
      }

function routeCrossesAnyComponentPin(route, placements, includeEndpoints = true) {
        return (placements || []).some(placement => routeCrossesPlacementPin(route, placement, includeEndpoints));
      }

function routeCrossesAvoidedComponent(route, placement, includeEndpoints = true) {
        if (!route || !placement || !linkAvoidanceAppliesTo(placement.component)) return false;
        const a = route.points?.[0];
        const b = route.points?.[route.points.length - 1];
        if (!a || !b || a.x !== b.x) return false;
        const x = a.x;
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        if (x < placement.x || x >= placement.x + placement.footprint.width) return false;
        const bodyStart = placement.y;
        const bodyEnd = placement.y + placement.footprint.height - 1;
        const routeStart = includeEndpoints ? minY : minY + 1;
        const routeEnd = includeEndpoints ? maxY : maxY - 1;
        return routeStart <= bodyEnd && routeEnd >= bodyStart;
      }

function detachGeneratedLayoutFromSchematic(layout) {
        if (!layout || layout.error) return layout;
        const componentCopies = new Map();
        const copyComponent = component => {
          if (!component) return component;
          const key = component.id || JSON.stringify(component);
          if (!componentCopies.has(key)) componentCopies.set(key, JSON.parse(JSON.stringify(component)));
          return componentCopies.get(key);
        };
        layout.placements = (layout.placements || []).map(placement => ({
          ...placement,
          component: copyComponent(placement.component),
          footprint: cloneVeroFootprint(placement.footprint)
        }));
        layout.sourcePlacements = (layout.sourcePlacements || []).map(placement => ({
          ...placement,
          component: copyComponent(placement.component),
          footprint: cloneVeroFootprint(placement.footprint)
        }));
        layout.terminals = (layout.terminals || []).map(terminal => ({
          ...terminal,
          component: copyComponent(terminal.component)
        }));
        return layout;
      }

function netRequiresVeroRepresentation(net) {
        if (!net || (net.nodes.length <= 1 && !net.labels.length)) return false;
        for (const node of net.nodes || []) {
          const component = getComponent(splitPinKey(node).componentId);
          if (isBoardPhysicalComponent(component)) return true;
        }
        // Nets made exclusively from off-board controls are wired directly
        // between those controls. Auto-describe records the wiring instruction,
        // so no Vero copper strip or edge landing is required.
        return false;
      }

function componentDef(componentOrType) {
  return env.partOverrides?.definition?.(componentOrType) ?? componentDef__vero(componentOrType);
}

function boardFootprintVariants(component) {
  return env.partOverrides?.footprints?.(component) ?? boardFootprintVariants__vero(component);
}

  return { buildCompactXYLayout, deriveNets, attachStableNetIdentities, detachGeneratedLayoutFromSchematic, refreshManualLayoutConnectivity, validateManualVeroLayout, serializeVeroLayoutForProject, transistorLeadOrder, GENERIC_IC_PIN_COUNTS, componentDef, normalizeComponentRecord, canonicalGenericIcPinCount, uid, SCHEMATIC_WIDTH };
}
