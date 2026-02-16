import { useMemo, memo } from 'react';
import { Group, Rect, Circle, Text, Line, Arc } from 'react-konva';
import type { Component as ComponentType, ComponentDefinition } from '@/lib/types';
// Pin positions are now derived from actual component.pins (supports dragged/custom layouts)
import { posKey } from '@/lib/spatial-index';
import { resistorValueToBands, resolveLedColor } from '@/lib/resistor-colors';

const GP = 25.4; // grid pitch
const PIN_R = 4.5;

/** Darken a hex color by mixing toward black. factor 0 = original, 1 = black */
function darkenHex(hex: string, factor = 0.35): string {
  const c = hex.replace('#', '');
  const r = Math.round(parseInt(c.substring(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(c.substring(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(c.substring(4, 6), 16) * (1 - factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Get text color (dark or light) based on background luminance */
function getTextColor(bgHex: string): string {
  const c = bgHex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Relative luminance formula (https://www.w3.org/TR/WCAG20/)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 140 ? '#111' : '#e0e0e0';
}

interface ComponentProps {
  component: ComponentType;
  definition: ComponentDefinition;
  isSelected: boolean;
  showRefs?: boolean;
  showValues?: boolean;
  highlightedNetId?: string | null;
  hlNetColor?: string;
  connectedGroups?: Map<string, Array<Set<string>>>;
  zoom: number;
  opacity?: number;
  disableShadows?: boolean; // Performance optimization: disable shadows when opacity < 1.0
}

// ─── Helpers ─────────────────────────────────────────────────

/** Detect component sub-type from definition ID for visual differentiation. */
function getComponentSubtype(defId: string): string {
  if (defId.includes('resistor')) return 'resistor';
  if (defId === 'capacitor-rect') return 'capacitor-rect';
  if (defId.includes('electrolytic') || defId === 'capacitor' || defId === 'capacitor-wide') return 'electrolytic';
  if (defId.includes('inductor')) return 'inductor';
  if (defId.includes('diode') || defId === 'zener-diode') return 'diode';
  if (defId.includes('led-rgb')) return 'led-rgb';
  if (defId.includes('led-bicolor')) return 'led-bicolor';
  if (defId.includes('led')) return 'led';
  if (defId.includes('transistor') || defId.includes('jfet') || defId.includes('mosfet-to92') || defId.includes('shunt-regulator')) return 'to92';
  if (defId.includes('regulator') || defId.includes('mosfet-to220')) return 'to220';
  if (defId.includes('trimpot-top')) return 'trimpot-top';
  if (defId.includes('trimpot')) return 'trimpot';
  if (defId.includes('button-tact')) return 'tact-switch';
  if (defId.includes('encoder')) return 'encoder';
  if (defId.includes('mcu-')) return 'mcu';
  return '';
}

// ─── Component Props Comparison (for memo optimization) ───────
// Custom comparison function to prevent unnecessary re-renders
// Only re-render if this component is actually affected by the prop changes
const componentPropsAreEqual = (prevProps: ComponentProps, nextProps: ComponentProps): boolean => {
  // If component identity changed, always re-render
  if (prevProps.component.id !== nextProps.component.id) return false;
  
  // If component properties changed, re-render
  if (
    prevProps.component.position.row !== nextProps.component.position.row ||
    prevProps.component.position.col !== nextProps.component.position.col ||
    prevProps.component.rotation !== nextProps.component.rotation ||
    prevProps.component.reference !== nextProps.component.reference ||
    prevProps.component.value !== nextProps.component.value ||
    prevProps.component.color !== nextProps.component.color ||
    prevProps.component.ledColor !== nextProps.component.ledColor
  ) {
    return false;
  }
  
  // If selection changed, re-render
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  
  // If visibility settings changed, re-render
  if (
    prevProps.showRefs !== nextProps.showRefs ||
    prevProps.showValues !== nextProps.showValues ||
    prevProps.opacity !== nextProps.opacity
  ) {
    return false;
  }
  
  // If highlighting changed AND this component is affected, re-render
  if (prevProps.highlightedNetId !== nextProps.highlightedNetId) {
    const wasRelevant = prevProps.component.pins.some(p => p.netId === prevProps.highlightedNetId);
    const isRelevant = nextProps.component.pins.some(p => p.netId === nextProps.highlightedNetId);
    // Only re-render if this component is or was relevant to highlighting
    if (wasRelevant || isRelevant || !prevProps.highlightedNetId || !nextProps.highlightedNetId) {
      return false;
    }
  }
  
  // If connectedGroups changed (but only if we're in highlighting mode), re-render
  // This handles the case where connectivity recalculates during highlighting
  if (prevProps.connectedGroups !== nextProps.connectedGroups) {
    // Only care if we're in highlight mode
    if (prevProps.highlightedNetId || nextProps.highlightedNetId) {
      return false;
    }
  }
  
  // If zoom crosses LOD thresholds, re-render
  const prevShowPinNumbers = prevProps.zoom > 0.7;
  const nextShowPinNumbers = nextProps.zoom > 0.7;
  const prevShowLabels = prevProps.zoom > 0.5;
  const nextShowLabels = nextProps.zoom > 0.5;
  const prevShowShadows = prevProps.zoom > 0.4;
  const nextShowShadows = nextProps.zoom > 0.4;
  
  if (
    prevShowPinNumbers !== nextShowPinNumbers ||
    prevShowLabels !== nextShowLabels ||
    prevShowShadows !== nextShowShadows
  ) {
    return false;
  }
  
  // If pins changed (net assignments), re-render
  if (prevProps.component.pins.length !== nextProps.component.pins.length) {
    return false;
  }
  
  for (let i = 0; i < prevProps.component.pins.length; i++) {
    const prevPin = prevProps.component.pins[i];
    const nextPin = nextProps.component.pins[i];
    if (
      prevPin.netId !== nextPin.netId ||
      prevPin.number !== nextPin.number ||
      prevPin.position.row !== nextPin.position.row ||
      prevPin.position.col !== nextPin.position.col
    ) {
      return false;
    }
  }
  
  // Otherwise, skip re-render (return true means props are equal)
  return true;
};

const ComponentImpl = ({
  component,
  definition,
  isSelected,
  showRefs = true,
  showValues = false,
  highlightedNetId,
  hlNetColor,
  connectedGroups,
  zoom,
  opacity = 1.0,
  disableShadows = false,
}: ComponentProps) => {
  // ─── Early optimization: Check if this component is relevant to highlighting ───
  // Only do expensive highlight calculations if this component has pins on the highlighted net
  const hasRelevantPins = useMemo(() => {
    if (!highlightedNetId) return false;
    return component.pins.some(p => p.netId === highlightedNetId);
  }, [highlightedNetId, component.pins]);

  // ─── Net Highlighting (early calculation for LOD) ──────────────
  // Calculate dimmed state early so we can use it for LOD thresholds
  const highlightedPinNumbers = useMemo(() => {
    const result = new Set<string>();
    if (!highlightedNetId || !hasRelevantPins || !connectedGroups) return result;

    const myNetPins = component.pins.filter(p => p.netId === highlightedNetId);
    const groups = connectedGroups.get(highlightedNetId) || [];
    
    if (groups.length === 0) {
      myNetPins.forEach(p => result.add(p.number));
      return result;
    }

    for (const pin of myNetPins) {
      const pinKey = posKey(pin.position);
      for (const group of groups) {
        if (group.has(pinKey)) {
          result.add(pin.number);
          break;
        }
      }
    }

    return result;
  }, [highlightedNetId, hasRelevantPins, component.pins, connectedGroups]);

  // ─── Level of Detail Thresholds ───────────────────────────────
  const showPinNumbers = zoom > 0.7;
  const showLabels = zoom > 0.5;
  // CRITICAL PERFORMANCE: Disable shadows when opacity < 1.0 (dimmed state)
  const showShadows = zoom > 0.4 && !disableShadows;

  // ─── Actual pin positions (relative to component origin) ────
  // Use actual component pin positions so drag/custom layouts render correctly
  const rotatedPins = component.pins.map((p) => ({
    row: p.position.row - component.position.row,
    col: p.position.col - component.position.col,
  }));

  const rMinRow = Math.min(...rotatedPins.map((p) => p.row));
  const rMaxRow = Math.max(...rotatedPins.map((p) => p.row));
  const rMinCol = Math.min(...rotatedPins.map((p) => p.col));
  const rMaxCol = Math.max(...rotatedPins.map((p) => p.col));

  const fpType = definition.footprint.type;
  const isIC = fpType === 'DIP';
  const isAxial = fpType === 'Axial';
  const isRadial = fpType === 'Radial';
  const isSIP = fpType === 'SIP';
  const isCustom = fpType === 'Custom';
  const isTO92 = fpType === 'TO92';
  const isTO220 = fpType === 'TO220';
  const isTrimPot = fpType === 'TrimPot';
  const isTrimPotTop = fpType === 'TrimPotTop';
  const isTactSwitch = fpType === 'TactSwitch';

  const subtype = getComponentSubtype(definition.id);

  // User-customizable body color override
  const customColor = component.color || null;
  const customStroke = customColor ? darkenHex(customColor, 0.35) : null;

  // Body bounding box
  const pad = isIC ? GP * 0.35 : isTO220 ? GP * 0.45 : GP * 0.3;
  const bodyX = rMinCol * GP - pad;
  const bodyY = rMinRow * GP - pad;
  const bodyW = (rMaxCol - rMinCol) * GP + pad * 2;
  const bodyH = (rMaxRow - rMinRow) * GP + pad * 2;

  // Pin 1 rotated position (for the notch marker)
  const pin1 = rotatedPins[0];

  // Is component horizontal or diagonal?
  const isHoriz = rMinRow === rMaxRow;

  // Pin distance for 2-pin components (in grid units)
  const pinDist = definition.pins.length === 2
    ? Math.sqrt(
        Math.pow(rotatedPins[1].row - rotatedPins[0].row, 2) +
        Math.pow(rotatedPins[1].col - rotatedPins[0].col, 2)
      )
    : 0;

  // ─── Resistor color bands (computed from value) ────────────
  const resistorBands = useMemo(() => {
    if (subtype !== 'resistor') return null;
    return resistorValueToBands(component.value);
  }, [subtype, component.value]);

  // ─── LED color resolution ──────────────────────────────────
  const ledColor = useMemo(() => {
    if (subtype !== 'led' && subtype !== 'led-bicolor' && subtype !== 'led-rgb') return null;
    return resolveLedColor(component.ledColor);
  }, [subtype, component.ledColor]);

  // ─── Electrolytic "+" marker position (rotation-aware) ─────
  const capPlusPos = (() => {
    if (subtype !== 'electrolytic') return null;
    const p0Row = rotatedPins[0].row;
    const p0Col = rotatedPins[0].col;
    const cRow = (rMinRow + rMaxRow) / 2;
    const cCol = (rMinCol + rMaxCol) / 2;
    const dRow = p0Row - cRow;
    const dCol = p0Col - cCol;
    const dist = Math.sqrt(dRow * dRow + dCol * dCol) || 1;
    return {
      x: p0Col * GP + (dCol / dist) * GP * 0.4 - 3,
      y: p0Row * GP + (dRow / dist) * GP * 0.4 - 4,
    };
  })();

  const finalOpacity = opacity;
  // Adjacent pins (distance 1) auto-convert to upright resistor
  const isResistorUpright = subtype === 'resistor' && (
    definition.id === 'resistor-upright' || pinDist <= 1.01
  );

  // ─── Diode detection ──────────────────────────────────────
  const isDiode = subtype === 'diode';
  const isZener = definition.id === 'zener-diode' || definition.id === 'zener-diode-large';

  // Center coordinates
  const cX = ((rMinCol + rMaxCol) / 2) * GP;
  const cY = ((rMinRow + rMaxRow) / 2) * GP;

  // Radial body radius — circles should be large enough that pins are well inside
  const radialRadius = (() => {
    if (definition.id === 'electrolytic-large') return GP * 1.3;
    return GP * 0.7;
  })();

  return (
    <Group
      name={`component:${component.id}`}
      x={component.position.col * GP}
      y={component.position.row * GP}
      opacity={finalOpacity}
      perfectDrawEnabled={false} // Disable perfect drawing for better performance
    >
      {/* ═══════════════════════════════════════════════════════
          LAYER 1 — Bodies & decorative shapes
          ═══════════════════════════════════════════════════════ */}

      {/* ─── IC (DIP) Body ──────────────────────────────────── */}
      {isIC && subtype !== 'mcu' && (
        <>
          <Rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            fill={customColor || '#1a1a2e'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#2a2a4e'}
            strokeWidth={isSelected ? 2.5 : 1.5}
            cornerRadius={3}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 6 : 0}
            shadowOpacity={showShadows ? 0.4 : 0}
          />
          {/* Pin 1 notch */}
          <Circle
            x={pin1.col * GP - pad * 0.25}
            y={pin1.row * GP - pad * 0.25}
            radius={pad * 0.3}
            stroke={isSelected ? '#d4ff55' : '#4a4a6e'}
            strokeWidth={1.5}
            fill="transparent"
          />
          {/* Pin 1 stripe indicator (white dot + arc, offset into body) */}
          <Circle
            x={pin1.col * GP + (pin1.col === rMinCol ? pad * 2 : -pad * 2)}
            y={pin1.row * GP + (pin1.row === rMinRow ? pad * 0.1 : -pad * 0.1
              
            )}
            radius={pad * 0.35}
            fill="#888"
            listening={false}
          />
          <Arc
            x={pin1.col * GP + (pin1.col === rMinCol ? pad * 2 : -pad * 2)}
            y={pin1.row * GP + (pin1.row === rMinRow ? pad * 0.1 : -pad * 0.1)}
            innerRadius={pad * 0.25}
            outerRadius={pad * 0.4}
            angle={180}
            rotation={isHoriz ? (pin1.col === rMinCol ? 90 : 270) : (pin1.row === rMinRow ? 180 : 0)}
            fill="#aaa"
            listening={false}
          />
        </>
      )}

      {/* ─── MCU Board Bodies ─────────────────────────────────── */}
      {isIC && subtype === 'mcu' && (() => {
        const mcuId = definition.id;
        // Default PCB colors per board
        const defaultPcbColor =
          mcuId === 'mcu-arduino-nano' ? '#0a1a3a' :
          mcuId === 'mcu-bluepill' ? '#0D47A1' :
          mcuId === 'mcu-seeed-xiao' ? '#1a2a1a' :
          '#D4A020'; // Daisy Seed (yellow/orange)
        const defaultPcbStroke =
          mcuId === 'mcu-arduino-nano' ? '#061228' :
          mcuId === 'mcu-bluepill' ? '#082B6A' :
          mcuId === 'mcu-seeed-xiao' ? '#0a1a0a' :
          '#A07818';
        
        // Apply user override if set
        const pcbColor = customColor || defaultPcbColor;
        const pcbStroke = customStroke || defaultPcbStroke;
        
        // Determine text color based on pcb brightness
        const textColor = getTextColor(pcbColor);
        const chipColor = textColor === '#111' ? '#222' : '#111';

        // USB connector position: pin 1 end
        // Determine which edge of the body the USB is on
        const pin1Row = pin1.row;
        const pin1Col = pin1.col;
        const isPin1Left = pin1Col === rMinCol;
        const isPin1Top = pin1Row === rMinRow;
        // For horizontal MCU: USB is on left (col min) or right (col max)
        // For vertical MCU: USB is on top (row min) or bottom (row max)
        const usbOnMinCol = pin1Col <= (rMinCol + rMaxCol) / 2;
        const usbOnMinRow = pin1Row <= (rMinRow + rMaxRow) / 2;

        // Board is vertical (taller than wide) or square
        const isVert = bodyH >= bodyW;

        // USB connector (top-down view): nearly square, ~40% of board width
        const narrowSide = Math.min(bodyW, bodyH);
        const usbAcross = narrowSide * 0.4;          // width across the board edge
        const usbDepth = usbAcross * 0.75;           // depth ~75% of width (nearly square from top)
        const usbW = isVert ? usbAcross : usbDepth;
        const usbH = isVert ? usbDepth : usbAcross;
        let usbX: number, usbY: number;

        // USB always on pin-1 end, half embedded in board edge
        if (isVert) {
          usbX = cX - usbW / 2;
          usbY = usbOnMinRow ? bodyY - usbH * 0.5 : bodyY + bodyH - usbH * 0.5;
        } else {
          usbY = cY - usbH / 2;
          usbX = usbOnMinCol ? bodyX - usbW * 0.5 : bodyX + bodyW - usbW * 0.5;
        }

        // Processor chip: fills good portion of the board
        const isNano = mcuId === 'mcu-arduino-nano';
        // Nano chip is rotated 45deg so its diagonal must fit; others can be bigger
        const chipSize = isNano
          ? narrowSide * 0.35
          : narrowSide * 0.5;

        // Board label
        const boardLabel =
          mcuId === 'mcu-arduino-nano' ? 'NANO' :
          mcuId === 'mcu-bluepill' ? 'STM32' :
          mcuId === 'mcu-seeed-xiao' ? 'XIAO' :
          'DAISY';

        return (
          <>
            {/* PCB board */}
            <Rect
              x={bodyX}
              y={bodyY}
              width={bodyW}
              height={bodyH}
              fill={pcbColor}
              stroke={isSelected ? '#c8ff2e' : pcbStroke}
              strokeWidth={isSelected ? 2.5 : 1.5}
              cornerRadius={2}
              shadowColor={showShadows ? "#000" : undefined}
              shadowBlur={showShadows ? 6 : 0}
              shadowOpacity={showShadows ? 0.4 : 0}
            />

            {/* Processor chip (dark square in center, rotated 45deg for Nano) */}
            <Rect
              x={cX}
              y={cY}
              width={chipSize}
              height={chipSize}
              offsetX={chipSize / 2}
              offsetY={chipSize / 2}
              rotation={isNano ? 45 : 0}
              fill={chipColor}
              stroke={textColor === '#111' ? '#444' : '#333'}
              strokeWidth={1}
              cornerRadius={1}
              listening={false}
            />
            {/* Chip dot (pin 1 indicator) */}
            <Circle
              x={cX}
              y={cY - chipSize * (isNano ? 0.55 : 0.38)}
              radius={2}
              fill={textColor === '#111' ? '#555' : '#777'}
              listening={false}
            />

            {/* USB connector — silver shell */}
            <Rect
              x={usbX}
              y={usbY}
              width={usbW}
              height={usbH}
              fill="#999"
              stroke="#777"
              strokeWidth={1.5}
              cornerRadius={2}
              listening={false}
            />

            {/* Board name label (centered in chip) */}
            {showLabels && !isNano && (
              <Text
                x={cX - chipSize / 2}
                y={cY - 4}
                width={chipSize}
                text={boardLabel}
                fontSize={8}
                fontFamily="monospace"
                fill={textColor}
                align="center"
                fontStyle="bold"
                listening={false}
              />
            )}
            {/* Nano label centered in diamond chip */}
            {showLabels && isNano && (
              <Text
                x={cX - chipSize / 2}
                y={cY - 4}
                width={chipSize}
                text={boardLabel}
                fontSize={8}
                fontFamily="monospace"
                fill={textColor}
                align="center"
                fontStyle="bold"
                listening={false}
              />
            )}

            {/* Pin 1 marker */}
            <Circle
              x={pin1.col * GP + (isPin1Left ? -pad * 0.15 : pad * 0.15)}
              y={pin1.row * GP + (isPin1Top ? -pad * 0.15 : pad * 0.15)}
              radius={2.5}
              fill={textColor === '#111' ? '#999' : '#ccc'}
              listening={false}
            />
          </>
        );
      })()}

      {/* ─── Axial Body (Resistor) — unified for H/V/diagonal ─── */}
      {isAxial && !isResistorUpright && subtype === 'resistor' && (() => {
        const p1x = rotatedPins[0].col * GP;
        const p1y = rotatedPins[0].row * GP;
        const p2x = rotatedPins[1].col * GP;
        const p2y = rotatedPins[1].row * GP;
        const dxP = p2x - p1x;
        const dyP = p2y - p1y;
        const dist = Math.sqrt(dxP * dxP + dyP * dyP);
        const angle = Math.atan2(dyP, dxP) * 180 / Math.PI;
        const halfDist = dist / 2;
        // Fixed body size, legs extend to reach pins
        const bodyLen = Math.min(GP * 1.4, dist - GP * 0.2);
        const halfBody = bodyLen / 2;
        return (
          <Group x={(p1x + p2x) / 2} y={(p1y + p2y) / 2} rotation={angle}>
            {/* Lead wires from pins to body */}
            <Line points={[-halfDist, 0, -halfBody, 0]} stroke="#888" strokeWidth={1.5} listening={false} />
            <Line points={[halfBody, 0, halfDist, 0]} stroke="#888" strokeWidth={1.5} listening={false} />
            {/* Body */}
            <Rect
              x={-halfBody} y={-5} width={bodyLen} height={10}
              fill={customColor || '#2a4a7a'}
              stroke={isSelected ? '#c8ff2e' : customStroke || '#1a3a6a'}
              strokeWidth={isSelected ? 2 : 1}
              cornerRadius={2}
            />
            {/* 5-band color code */}
            {(resistorBands || ['#8B4513', '#000', '#000', '#000', '#8B4513']).map((color, bi) => {
              const bandPositions = [0.15, 0.3, 0.45, 0.65, 0.85];
              return (
                <Rect
                  key={`band-${bi}`}
                  x={-halfBody + bandPositions[bi] * bodyLen - 1}
                  y={-4} width={2} height={8}
                  fill={color} listening={false}
                />
              );
            })}
          </Group>
        );
      })()}

      {/* ─── Resistor Upright ──────────────────────────────────── */}
      {isAxial && isResistorUpright && (
        <>
          {/* Small cylindrical body between adjacent pins */}
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.3}
            fill={customColor || '#2a4a7a'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#1a3a6a'}
            strokeWidth={isSelected ? 2 : 1}
          />
          {/* Top ring (1st band color or brown) */}
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.22}
            fill="transparent"
            stroke={resistorBands ? resistorBands[0] : '#8B4513'}
            strokeWidth={2}
            listening={false}
          />
        </>
      )}

      {/* ─── Diode Body (Axial) — unified for H/V/diagonal ──── */}
      {isAxial && isDiode && (() => {
        const p1x = rotatedPins[0].col * GP;
        const p1y = rotatedPins[0].row * GP;
        const p2x = rotatedPins[1].col * GP;
        const p2y = rotatedPins[1].row * GP;
        const dxP = p2x - p1x;
        const dyP = p2y - p1y;
        const dist = Math.sqrt(dxP * dxP + dyP * dyP);
        const angle = Math.atan2(dyP, dxP) * 180 / Math.PI;
        const halfDist = dist / 2;
        const bodyLen = Math.min(GP * 1.3, dist - GP * 0.2);
        const halfBody = bodyLen / 2;
        return (
          <Group x={(p1x + p2x) / 2} y={(p1y + p2y) / 2} rotation={angle}>
            <Line points={[-halfDist, 0, -halfBody, 0]} stroke="#888" strokeWidth={1.5} listening={false} />
            <Line points={[halfBody, 0, halfDist, 0]} stroke="#888" strokeWidth={1.5} listening={false} />
            <Rect
              x={-halfBody} y={-5} width={bodyLen} height={10}
              fill={customColor || (isZener ? '#5a5a6a' : '#8a8a9a')}
              stroke={isSelected ? '#c8ff2e' : customStroke || '#6a6a7a'}
              strokeWidth={isSelected ? 2 : 1} cornerRadius={1}
            />
            {/* Cathode band at pin 2 end */}
            <Rect x={halfBody - 3} y={-5} width={3} height={10} fill={isZener ? '#808080' : '#333333'} listening={false} />
            {isZener && <Rect x={halfBody - 6} y={-5} width={2} height={10} fill="#808080" listening={false} />}
          </Group>
        );
      })()}

      {/* ─── Capacitor Rect (Film/Ceramic) — unified H/V/diagonal */}
      {isAxial && subtype === 'capacitor-rect' && (() => {
        const p1x = rotatedPins[0].col * GP;
        const p1y = rotatedPins[0].row * GP;
        const p2x = rotatedPins[1].col * GP;
        const p2y = rotatedPins[1].row * GP;
        const dxP = p2x - p1x;
        const dyP = p2y - p1y;
        const dist = Math.sqrt(dxP * dxP + dyP * dyP);
        const angle = Math.atan2(dyP, dxP) * 180 / Math.PI;
        const halfDist = dist / 2;
        const bodyLen = Math.min(GP * 0.9, dist - GP * 0.2);
        const halfBody = bodyLen / 2;
        return (
          <Group x={(p1x + p2x) / 2} y={(p1y + p2y) / 2} rotation={angle}>
            <Line points={[-halfDist, 0, -halfBody, 0]} stroke="#888" strokeWidth={1.5} listening={false} />
            <Line points={[halfBody, 0, halfDist, 0]} stroke="#888" strokeWidth={1.5} listening={false} />
            <Rect
              x={-halfBody} y={-7} width={bodyLen} height={14}
              fill="#b8860b"
              stroke={isSelected ? '#c8ff2e' : '#8B6914'}
              strokeWidth={isSelected ? 2 : 1} cornerRadius={1}
            />
            {showLabels && component.value && (
              <Text x={-halfBody} y={-4} width={bodyLen} text={component.value} fontSize={6} fontFamily="monospace" fill="#3a2a00" align="center" listening={false} />
            )}
          </Group>
        );
      })()}

      {/* ─── Radial Electrolytic Capacitor ─────────────────────── */}
      {isRadial && subtype === 'electrolytic' && (
        <>
          <Circle
            x={cX}
            y={cY}
            radius={radialRadius}
            fill={customColor || '#1e40af'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#1e3a8a'}
            strokeWidth={isSelected ? 2 : 1.5}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 4 : 0}
            shadowOpacity={showShadows ? 0.3 : 0}
          />
          {/* Stripe on negative side */}
          <Arc
            x={cX}
            y={cY}
            innerRadius={radialRadius - 3}
            outerRadius={radialRadius}
            angle={120}
            rotation={isHoriz ? 120 : 30}
            fill="#4a6aaa"
            listening={false}
          />
        </>
      )}

      {/* ─── LED (standard 2-pin) ──────────────────────────────── */}
      {isRadial && subtype === 'led' && ledColor && (
        <>
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.42}
            fill={ledColor.fill}
            stroke={isSelected ? '#c8ff2e' : darkenHex(ledColor.fill, 0.4)}
            strokeWidth={isSelected ? 2 : 1.5}
            shadowColor={showShadows ? ledColor.glow : undefined}
            shadowBlur={showShadows ? 6 : 0}
            shadowOpacity={showShadows ? 0.5 : 0}
          />
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.25}
            fill={ledColor.glow}
            opacity={0.4}
            listening={false}
          />
        </>
      )}

      {/* ─── LED Bi-Color (3-pin) ──────────────────────────────── */}
      {isRadial && subtype === 'led-bicolor' && (
        <>
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.48}
            fill="#333"
            stroke={isSelected ? '#c8ff2e' : '#555'}
            strokeWidth={isSelected ? 2 : 1.5}
          />
          {/* Two halves */}
          <Arc
            x={cX}
            y={cY}
            innerRadius={0}
            outerRadius={GP * 0.35}
            angle={180}
            rotation={isHoriz ? 0 : 270}
            fill="#dc2626"
            listening={false}
          />
          <Arc
            x={cX}
            y={cY}
            innerRadius={0}
            outerRadius={GP * 0.35}
            angle={180}
            rotation={isHoriz ? 180 : 90}
            fill="#16a34a"
            listening={false}
          />
        </>
      )}

      {/* ─── LED RGB (4-pin) ───────────────────────────────────── */}
      {isRadial && subtype === 'led-rgb' && (
        <>
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.55}
            fill="#222"
            stroke={isSelected ? '#c8ff2e' : '#555'}
            strokeWidth={isSelected ? 2 : 1.5}
          />
          {/* RGB segments */}
          <Arc
            x={cX}
            y={cY}
            innerRadius={0}
            outerRadius={GP * 0.38}
            angle={120}
            rotation={0}
            fill="#dc2626"
            opacity={0.7}
            listening={false}
          />
          <Arc
            x={cX}
            y={cY}
            innerRadius={0}
            outerRadius={GP * 0.38}
            angle={120}
            rotation={120}
            fill="#16a34a"
            opacity={0.7}
            listening={false}
          />
          <Arc
            x={cX}
            y={cY}
            innerRadius={0}
            outerRadius={GP * 0.38}
            angle={120}
            rotation={240}
            fill="#2563eb"
            opacity={0.7}
            listening={false}
          />
        </>
      )}

      {/* ─── Inductor (Radial) ─────────────────────────────────── */}
      {isRadial && subtype === 'inductor' && (
        <>
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.7}
            fill={customColor || '#2d4a2d'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#1a3a1a'}
            strokeWidth={isSelected ? 2 : 1.5}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 4 : 0}
            shadowOpacity={showShadows ? 0.3 : 0}
          />
          {/* Toroid-style inner ring */}
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.42}
            fill="transparent"
            stroke="#5a8a5a"
            strokeWidth={2}
            listening={false}
          />
          {/* Wire wrapping lines */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const r1 = GP * 0.35;
            const r2 = GP * 0.6;
            return (
              <Line
                key={`coil-${angle}`}
                points={[
                  cX + Math.cos(rad) * r1,
                  cY + Math.sin(rad) * r1,
                  cX + Math.cos(rad) * r2,
                  cY + Math.sin(rad) * r2,
                ]}
                stroke="#7aaa7a"
                strokeWidth={1}
                listening={false}
              />
            );
          })}
        </>
      )}

      {/* ─── TO-92 (D-shaped: Transistors, JFETs, MOSFETs) ──── */}
      {isTO92 && (() => {
        // Compact D-shape centered on middle pin, smaller than pin span
        const to92W = isHoriz ? GP * 1.3 : GP * 0.8;
        const to92H = isHoriz ? GP * 0.8 : GP * 1.3;
        const to92X = cX - to92W / 2;
        const to92Y = cY - to92H / 2;
        const flatR = 0;
        const roundR = isHoriz ? to92W * 0.45 : to92H * 0.45;
        return (
          <>
            {isHoriz ? (
              <>
                <Rect
                  x={to92X}
                  y={to92Y}
                  width={to92W}
                  height={to92H}
                  fill={customColor || '#2a2a2a'}
                  stroke={isSelected ? '#c8ff2e' : customStroke || '#5a5a5a'}
                  strokeWidth={isSelected ? 2 : 1.5}
                  cornerRadius={[flatR, flatR, roundR, roundR]}
                  shadowColor={showShadows ? "#000" : undefined}
                  shadowBlur={showShadows ? 4 : 0}
                  shadowOpacity={showShadows ? 0.3 : 0}
                />
                {/* Flat face indicator line */}
                <Line
                  points={[to92X, to92Y, to92X + to92W, to92Y]}
                  stroke={isSelected ? '#c8ff2e' : '#777'}
                  strokeWidth={2}
                  listening={false}
                />
              </>
            ) : (
              <>
                <Rect
                  x={to92X}
                  y={to92Y}
                  width={to92W}
                  height={to92H}
                  fill={customColor || '#2a2a2a'}
                  stroke={isSelected ? '#c8ff2e' : customStroke || '#5a5a5a'}
                  strokeWidth={isSelected ? 2 : 1.5}
                  cornerRadius={[flatR, roundR, roundR, flatR]}
                  shadowColor={showShadows ? "#000" : undefined}
                  shadowBlur={showShadows ? 4 : 0}
                  shadowOpacity={showShadows ? 0.3 : 0}
                />
                {/* Flat face indicator line */}
                <Line
                  points={[to92X, to92Y, to92X, to92Y + to92H]}
                  stroke={isSelected ? '#c8ff2e' : '#777'}
                  strokeWidth={2}
                  listening={false}
                />
              </>
            )}
          </>
        );
      })()}

      {/* ─── TO-220 (Regulator / Power MOSFET) ─────────────────── */}
      {isTO220 && (
        <>
          {isHoriz ? (
            <>
              {/* Main body */}
              <Rect
                x={bodyX}
                y={bodyY}
                width={bodyW}
                height={bodyH}
                fill={customColor || '#1a1a1a'}
                stroke={isSelected ? '#c8ff2e' : customStroke || '#4a4a4a'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                cornerRadius={2}
                shadowColor={showShadows ? "#000" : undefined}
                shadowBlur={showShadows ? 6 : 0}
                shadowOpacity={showShadows ? 0.4 : 0}
              />
              {/* Metal tab */}
              <Rect
                x={bodyX + 2}
                y={bodyY - 4}
                width={bodyW - 4}
                height={6}
                fill="#888"
                stroke="#666"
                strokeWidth={1}
                cornerRadius={[2, 2, 0, 0]}
                listening={false}
              />
              {/* Tab hole */}
              <Circle
                x={cX}
                y={bodyY - 1}
                radius={2}
                fill="#444"
                stroke="#666"
                strokeWidth={0.5}
                listening={false}
              />
            </>
          ) : (
            <>
              {/* Main body — vertical */}
              <Rect
                x={bodyX}
                y={bodyY}
                width={bodyW}
                height={bodyH}
                fill={customColor || '#1a1a1a'}
                stroke={isSelected ? '#c8ff2e' : customStroke || '#4a4a4a'}
                strokeWidth={isSelected ? 2.5 : 1.5}
                cornerRadius={2}
                shadowColor={showShadows ? "#000" : undefined}
                shadowBlur={showShadows ? 6 : 0}
                shadowOpacity={showShadows ? 0.4 : 0}
              />
              {/* Metal tab — left side */}
              <Rect
                x={bodyX - 4}
                y={bodyY + 2}
                width={6}
                height={bodyH - 4}
                fill="#888"
                stroke="#666"
                strokeWidth={1}
                cornerRadius={[2, 0, 0, 2]}
                listening={false}
              />
              <Circle
                x={bodyX - 1}
                y={cY}
                radius={2}
                fill="#444"
                stroke="#666"
                strokeWidth={0.5}
                listening={false}
              />
            </>
          )}
        </>
      )}

      {/* ─── TrimPot (Side Adjust — inline) ────────────────────── */}
      {isTrimPot && (
        <>
          <Rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            fill={customColor || '#1a3a6a'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#2a5a8a'}
            strokeWidth={isSelected ? 2 : 1.5}
            cornerRadius={2}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 4 : 0}
            shadowOpacity={showShadows ? 0.3 : 0}
          />
          {/* Brass screw head */}
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.25}
            fill="#b8860b"
            stroke="#8B6914"
            strokeWidth={1}
          />
          {/* Screw slot */}
          <Line
            points={[cX - GP * 0.15, cY, cX + GP * 0.15, cY]}
            stroke="#6B4914"
            strokeWidth={2}
            listening={false}
          />
        </>
      )}

      {/* ─── TrimPot Top (Top Adjust — triangular pins) ────────── */}
      {isTrimPotTop && (
        <>
          <Rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            fill={customColor || '#1a3a6a'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#2a5a8a'}
            strokeWidth={isSelected ? 2 : 1.5}
            cornerRadius={2}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 4 : 0}
            shadowOpacity={showShadows ? 0.3 : 0}
          />
          {/* Brass screw head (larger, centered) */}
          <Circle
            x={cX}
            y={cY}
            radius={GP * 0.35}
            fill="#b8860b"
            stroke="#8B6914"
            strokeWidth={1.5}
          />
          {/* Cross slot */}
          <Line
            points={[cX - GP * 0.2, cY, cX + GP * 0.2, cY]}
            stroke="#6B4914"
            strokeWidth={2}
            listening={false}
          />
          <Line
            points={[cX, cY - GP * 0.2, cX, cY + GP * 0.2]}
            stroke="#6B4914"
            strokeWidth={2}
            listening={false}
          />
        </>
      )}

      {/* ─── Tact Switch ───────────────────────────────────────── */}
      {isTactSwitch && (
        <>
          {/* Outer body */}
          <Rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            fill={customColor || '#1a1a1a'}
            stroke={isSelected ? '#c8ff2e' : customStroke || '#4a4a4a'}
            strokeWidth={isSelected ? 2 : 1.5}
            cornerRadius={2}
          />
          {/* Button circle */}
          <Circle
            x={cX}
            y={cY}
            radius={Math.min(bodyW, bodyH) * 0.28}
            fill="#555"
            stroke="#777"
            strokeWidth={1.5}
          />
          {/* Button highlight */}
          <Circle
            x={cX}
            y={cY}
            radius={Math.min(bodyW, bodyH) * 0.18}
            fill="#666"
            listening={false}
          />
        </>
      )}

      {/* ─── SIP (Header / Potentiometer / Switch / Encoder) ──── */}
      {isSIP && (
        <Rect
          x={bodyX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          fill={customColor || (
            subtype === 'encoder' ? '#1a2a3a'
            : definition.id.includes('switch') || definition.id.includes('button') ? '#1a1a2a'
            : '#2a2a2a'
          )}
          stroke={isSelected ? '#c8ff2e' : customStroke || '#555'}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={2}
        />
      )}

      {/* ─── Custom / Generic Body ───────────────────────────── */}
      {isCustom && (
        <>
          <Rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            fill="#1c1a2e"
            stroke={isSelected ? '#c8ff2e' : '#7c6faa'}
            strokeWidth={isSelected ? 2.5 : 1.5}
            cornerRadius={3}
            dash={[5, 3]}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 4 : 0}
            shadowOpacity={showShadows ? 0.3 : 0}
          />
          <Text
            x={bodyX + bodyW - 12}
            y={bodyY + 2}
            text="?"
            fontSize={9}
            fontFamily="monospace"
            fill="#7c6faa"
            fontStyle="bold"
            listening={false}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          LAYER 2 — Pin circles
          ═══════════════════════════════════════════════════════ */}
      {definition.pins.map((pinDef, i) => {
        const rp = rotatedPins[i];
        const isPinHighlighted = highlightedPinNumbers.has(pinDef.number);

        return (
          <Circle
            key={`pin-${pinDef.number}`}
            x={rp.col * GP}
            y={rp.row * GP}
            radius={isPinHighlighted ? PIN_R + 1.5 : PIN_R}
            fill={isPinHighlighted ? hlNetColor || '#fff' : '#d4a017'}
            stroke={
              isPinHighlighted
                ? '#fff'
                : isSelected
                  ? '#c8ff2e'
                  : '#b8860b'
            }
            strokeWidth={isPinHighlighted ? 2 : 1.5}
            shadowColor={isPinHighlighted ? hlNetColor || '#fff' : undefined}
            shadowBlur={isPinHighlighted ? 10 : 0}
            shadowOpacity={isPinHighlighted ? 0.9 : 0}
          />
        );
      })}

      {/* ═══════════════════════════════════════════════════════
          LAYER 3 — Text labels (always rendered on top)
          ═══════════════════════════════════════════════════════ */}

      {/* ─── IC / MCU text ───────────────────────────────────── */}
      {isIC && subtype !== 'mcu' && showRefs && showLabels && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 - (showValues && component.value ? 9 : 5)}
          width={bodyW}
          text={component.reference}
          fontSize={11}
          fontFamily="monospace"
          fill="#8888bb"
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}
      {isIC && subtype !== 'mcu' && showValues && showLabels && component.value && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 + (showRefs ? 3 : -5)}
          width={bodyW}
          text={component.value}
          fontSize={9}
          fontFamily="monospace"
          fill="#a78bfa"
          align="center"
          listening={false}
        />
      )}
      {/* MCU reference text (above the board) */}
      {isIC && subtype === 'mcu' && showRefs && showLabels && (
        <Text
          x={bodyX}
          y={bodyY - 12}
          width={bodyW}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill="#111"
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}

      {/* ─── Axial (Resistor / Diode / Capacitor) text ──────────────────── */}
      {isAxial && !isResistorUpright && showRefs && showLabels && (() => {
        // Position reference beside component for small components
        const isSmallComponent = subtype === 'resistor' || subtype === 'diode' || subtype === 'capacitor-rect';
        const offsetX = isSmallComponent ? (bodyW / 2 + 8) : 0;
        const offsetY = isSmallComponent ? -5 : -(showValues && component.value ? 17 : 13);
        
        return (
          <Text
            x={isSmallComponent ? bodyX + bodyW + 2 : cX - 20}
            y={isSmallComponent ? bodyY + bodyH / 2 + offsetY : cY + offsetY}
            width={isSmallComponent ? undefined : 40}
            text={component.reference}
            fontSize={9}
            fontFamily="monospace"
            fill="#ccc"
            align={isSmallComponent ? undefined : "center"}
            fontStyle="bold"
            listening={false}
          />
        );
      })()}
      {isAxial && !isResistorUpright && showValues && showLabels && component.value && subtype !== 'capacitor-rect' && (() => {
        // Position value beside component for small components
        const isSmallComponent = subtype === 'resistor' || subtype === 'diode';
        const offsetY = isSmallComponent ? (showRefs ? 3 : -5) : 10;
        
        return (
          <Text
            x={isSmallComponent ? bodyX + bodyW + 2 : cX - 20}
            y={isSmallComponent ? bodyY + bodyH / 2 + offsetY : cY + offsetY}
            width={isSmallComponent ? undefined : 40}
            text={component.value}
            fontSize={8}
            fontFamily="monospace"
            fill="#a78bfa"
            align={isSmallComponent ? undefined : "center"}
            listening={false}
          />
        );
      })()}

      {/* ─── Resistor upright text ───────────────────────────── */}
      {isResistorUpright && showRefs && showLabels && (
        <Text
          x={cX + GP * 0.35}
          y={cY - 5}
          text={component.reference}
          fontSize={8}
          fontFamily="monospace"
          fill="#ccc"
          fontStyle="bold"
          listening={false}
        />
      )}

      {/* ─── Electrolytic "+" marker ─────────────────────────── */}
      {capPlusPos && (
        <Text
          x={capPlusPos.x}
          y={capPlusPos.y}
          text="+"
          fontSize={9}
          fill="#60a5fa"
          fontStyle="bold"
          listening={false}
        />
      )}

      {/* ─── Radial text (beside body for electrolytics, centered for others) ────────────── */}
      {isRadial && showRefs && showLabels && (() => {
        // Position reference beside component for electrolytic capacitors
        const isBesidePosition = subtype === 'electrolytic';
        
        return (
          <Text
            x={isBesidePosition ? cX + radialRadius + 3 : cX - 20}
            y={isBesidePosition ? cY - (showValues && component.value ? 7 : 5) : cY - (showValues && component.value ? 7 : 5)}
            width={isBesidePosition ? undefined : 40}
            text={component.reference}
            fontSize={9}
            fontFamily="monospace"
            fill={customColor ? getTextColor(customColor) : '#e0e0e0'}
            align={isBesidePosition ? undefined : "center"}
            fontStyle="bold"
            listening={false}
          />
        );
      })()}
      {isRadial && showValues && showLabels && component.value && (() => {
        const isBesidePosition = subtype === 'electrolytic';
        
        return (
          <Text
            x={isBesidePosition ? cX + radialRadius + 3 : cX - 20}
            y={isBesidePosition ? cY + (showRefs ? 2 : -5) : cY + (showRefs ? 2 : -5)}
            width={isBesidePosition ? undefined : 40}
            text={component.value}
            fontSize={8}
            fontFamily="monospace"
            fill="#a78bfa"
            align={isBesidePosition ? undefined : "center"}
            listening={false}
          />
        );
      })()}

      {/* ─── TO-92 text ─────────────────────────────────────── */}
      {isTO92 && showRefs && showLabels && (
        <Text
          x={isHoriz ? cX - GP * 0.65 : cX + GP * 0.5}
          y={
            isHoriz
              ? cY - GP * 0.4 - (showValues && component.value ? 9 : 5)
              : cY - (showValues && component.value ? 9 : 4)
          }
          width={isHoriz ? GP * 1.3 : undefined}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill={customColor ? getTextColor(customColor) : '#ccc'}
          align={isHoriz ? 'center' : undefined}
          fontStyle="bold"
          listening={false}
        />
      )}
      {isTO92 && showValues && showLabels && component.value && (
        <Text
          x={isHoriz ? cX - GP * 0.65 : cX + GP * 0.5}
          y={
            isHoriz
              ? cY + GP * 0.4 + (showRefs ? 0 : -5)
              : cY + (showRefs ? 2 : -4)
          }
          width={isHoriz ? GP * 1.3 : undefined}
          text={component.value}
          fontSize={8}
          fontFamily="monospace"
          fill="#a78bfa"
          align={isHoriz ? 'center' : undefined}
          listening={false}
        />
      )}

      {/* ─── TO-220 text ────────────────────────────────────── */}
      {isTO220 && showRefs && showLabels && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 - (showValues && component.value ? 9 : 5)}
          width={bodyW}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill={customColor ? getTextColor(customColor) : '#aaa'}
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}
      {isTO220 && showValues && showLabels && component.value && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 + (showRefs ? 3 : -5)}
          width={bodyW}
          text={component.value}
          fontSize={8}
          fontFamily="monospace"
          fill="#a78bfa"
          align="center"
          listening={false}
        />
      )}

      {/* ─── TrimPot / TrimPotTop text ──────────────────────── */}
      {(isTrimPot || isTrimPotTop) && showRefs && showLabels && (
        <Text
          x={bodyX}
          y={bodyY - 12}
          width={bodyW}
          text={component.reference}
          fontSize={8}
          fontFamily="monospace"
          fill="#6aacff"
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}
      {(isTrimPot || isTrimPotTop) && showValues && showLabels && component.value && (
        <Text
          x={bodyX}
          y={bodyY + bodyH + 2}
          width={bodyW}
          text={component.value}
          fontSize={7}
          fontFamily="monospace"
          fill="#a78bfa"
          align="center"
          listening={false}
        />
      )}

      {/* ─── Tact Switch text ───────────────────────────────── */}
      {isTactSwitch && showRefs && showLabels && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 - 5}
          width={bodyW}
          text={component.reference}
          fontSize={8}
          fontFamily="monospace"
          fill="#999"
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}

      {/* ─── SIP text ───────────────────────────────────────── */}
      {isSIP && showRefs && showLabels && (
        <Text
          x={isHoriz ? bodyX : bodyX + bodyW + 3}
          y={
            isHoriz
              ? bodyY + bodyH / 2 - (showValues && component.value ? 9 : 5)
              : cY - (showValues && component.value ? 9 : 4)
          }
          width={isHoriz ? bodyW : undefined}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill={customColor ? getTextColor(customColor) : '#aaa'}
          align={isHoriz ? 'center' : undefined}
          fontStyle="bold"
          listening={false}
        />
      )}
      {isSIP && showValues && showLabels && component.value && (
        <Text
          x={isHoriz ? bodyX : bodyX + bodyW + 3}
          y={
            isHoriz
              ? bodyY + bodyH / 2 + (showRefs ? 3 : -5)
              : cY + (showRefs ? 2 : -4)
          }
          width={isHoriz ? bodyW : undefined}
          text={component.value}
          fontSize={8}
          fontFamily="monospace"
          fill="#a78bfa"
          align={isHoriz ? 'center' : undefined}
          listening={false}
        />
      )}

      {/* ─── Custom / Generic text ───────────────────────────── */}
      {isCustom && showRefs && showLabels && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 - (showValues && component.value ? 9 : 5)}
          width={bodyW}
          text={component.reference}
          fontSize={10}
          fontFamily="monospace"
          fill="#a78bfa"
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}
      {isCustom && showValues && showLabels && component.value && (
        <Text
          x={bodyX}
          y={bodyY + bodyH / 2 + (showRefs ? 2 : -5)}
          width={bodyW}
          text={component.value}
          fontSize={8}
          fontFamily="monospace"
          fill="#8b7dc8"
          align="center"
          listening={false}
        />
      )}

      {/* ─── Pin numbers & names (centered on pins) ──────────── */}
      {showPinNumbers && definition.pins.map((pinDef, i) => {
        const rp = rotatedPins[i];
        const isPinHighlighted = highlightedPinNumbers.has(pinDef.number);

        return (
          <Group key={`pin-text-${pinDef.number}`}>
            <Text
              x={rp.col * GP - PIN_R}
              y={rp.row * GP - 3.5}
              width={PIN_R * 2}
              text={pinDef.number}
              fontSize={6}
              fontFamily="monospace"
              fill={isPinHighlighted ? '#fff' : '#111'}
              fontStyle="bold"
              align="center"
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};

// Export memoized component with custom comparison
export const Component = memo(ComponentImpl, componentPropsAreEqual);

Component.displayName = 'Component';
