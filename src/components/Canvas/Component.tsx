import { useMemo, memo } from 'react';
import { Group, Rect, Circle, Text, Line } from 'react-konva';
import type { Component as ComponentType, ComponentDefinition } from '@/lib/types';
import { getRotatedPinPositions } from '@/lib/rotation';
import { posKey } from '@/lib/spatial-index';

const GP = 25.4; // grid pitch
const PIN_R = 4.5;

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
}

export const Component = memo(({
  component,
  definition,
  isSelected,
  showRefs = true,
  showValues = false,
  highlightedNetId,
  hlNetColor,
  connectedGroups,
  zoom,
}: ComponentProps) => {
  // ─── Level of Detail Thresholds ───────────────────────────────
  const showPinNumbers = zoom > 0.7;
  const showLabels = zoom > 0.5;
  const showShadows = zoom > 0.4;

  // ─── Rotated positions (relative to component origin) ────
  const rotatedPins = getRotatedPinPositions(
    definition.pins,
    component.rotation
  );

  const rMinRow = Math.min(...rotatedPins.map((p) => p.row));
  const rMaxRow = Math.max(...rotatedPins.map((p) => p.row));
  const rMinCol = Math.min(...rotatedPins.map((p) => p.col));
  const rMaxCol = Math.max(...rotatedPins.map((p) => p.col));

  const isIC = definition.footprint.type === 'DIP';
  const isAxial = definition.footprint.type === 'Axial';
  const isRadial = definition.footprint.type === 'Radial';
  const isSIP = definition.footprint.type === 'SIP';
  const isCustom = definition.footprint.type === 'Custom';

  // Body bounding box
  const pad = isIC ? GP * 0.35 : GP * 0.3;
  const bodyX = rMinCol * GP - pad;
  const bodyY = rMinRow * GP - pad;
  const bodyW = (rMaxCol - rMinCol) * GP + pad * 2;
  const bodyH = (rMaxRow - rMinRow) * GP + pad * 2;

  // Pin 1 rotated position (for the notch marker)
  const pin1 = rotatedPins[0];

  // Is axial / SIP component horizontal or vertical?
  const isHoriz = rMinRow === rMaxRow;

  // ─── Capacitor "+" marker position (rotation-aware) ─────
  const capPlusPos = (() => {
    if (!isRadial || !definition.id.includes('capacitor')) return null;
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

  // ─── Net Highlighting (using pre-computed connectivity groups) ────────────────
  // A pin highlights if it belongs to the highlighted net AND is in a connected
  // group with other pins of the same net.
  const highlightedPinNumbers = useMemo(() => {
    const result = new Set<string>();
    if (!highlightedNetId || !connectedGroups) return result;

    const myNetPins = component.pins.filter(p => p.netId === highlightedNetId);
    if (myNetPins.length === 0) return result;

    // Get connected groups for this net
    const groups = connectedGroups.get(highlightedNetId) || [];
    if (groups.length === 0) {
      // No connectivity info - highlight all pins
      myNetPins.forEach(p => result.add(p.number));
      return result;
    }

    // For each pin, check if it's in any connected group
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
  }, [highlightedNetId, component.pins, connectedGroups]);

  const hasHighlightedPin = highlightedPinNumbers.size > 0;
  const isDimmed = !!highlightedNetId && !hasHighlightedPin;

  return (
    <Group
      name={`component:${component.id}`}
      x={component.position.col * GP}
      y={component.position.row * GP}
      opacity={isDimmed ? 0.2 : 1}
    >
      {/* ═══════════════════════════════════════════════════════
          LAYER 1 — Bodies & decorative shapes
          ═══════════════════════════════════════════════════════ */}

      {/* ─── IC (DIP) Body ──────────────────────────────────── */}
      {isIC && (
        <>
          <Rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            fill="#1a1a2e"
            stroke={isSelected ? '#c8ff2e' : '#2a2a4e'}
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
        </>
      )}

      {/* ─── Axial (Resistor) Body ──────────────────────────── */}
      {isAxial && (
        <>
          {isHoriz ? (
            <>
              {/* Horizontal legs */}
              <Line
                points={[
                  rMinCol * GP, rMinRow * GP,
                  (rMinCol + 0.6) * GP, rMinRow * GP,
                ]}
                stroke="#888"
                strokeWidth={1.5}
                listening={false}
              />
              <Line
                points={[
                  (rMaxCol - 0.6) * GP, rMinRow * GP,
                  rMaxCol * GP, rMinRow * GP,
                ]}
                stroke="#888"
                strokeWidth={1.5}
                listening={false}
              />
              {/* Horizontal body */}
              <Rect
                x={(rMinCol + 0.5) * GP}
                y={rMinRow * GP - 5}
                width={Math.max((rMaxCol - rMinCol - 1) * GP, GP * 0.3)}
                height={10}
                fill="#8B6914"
                stroke={isSelected ? '#c8ff2e' : '#6B4914'}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={2}
              />
              {/* Color bands — horizontal */}
              {[0.25, 0.4, 0.55, 0.75].map((t, i) => (
                <Rect
                  key={`band-${i}`}
                  x={
                    ((rMinCol + 0.5) + t * Math.max(rMaxCol - rMinCol - 1, 0.3)) * GP - 1
                  }
                  y={rMinRow * GP - 4}
                  width={2}
                  height={8}
                  fill={['#994400', '#000', '#ff0000', '#d4a017'][i]}
                  listening={false}
                />
              ))}
            </>
          ) : (
            <>
              {/* Vertical legs */}
              <Line
                points={[
                  rMinCol * GP, rMinRow * GP,
                  rMinCol * GP, (rMinRow + 0.6) * GP,
                ]}
                stroke="#888"
                strokeWidth={1.5}
                listening={false}
              />
              <Line
                points={[
                  rMinCol * GP, (rMaxRow - 0.6) * GP,
                  rMinCol * GP, rMaxRow * GP,
                ]}
                stroke="#888"
                strokeWidth={1.5}
                listening={false}
              />
              {/* Vertical body */}
              <Rect
                x={rMinCol * GP - 5}
                y={(rMinRow + 0.5) * GP}
                width={10}
                height={Math.max((rMaxRow - rMinRow - 1) * GP, GP * 0.3)}
                fill="#8B6914"
                stroke={isSelected ? '#c8ff2e' : '#6B4914'}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={2}
              />
              {/* Color bands — vertical */}
              {[0.25, 0.4, 0.55, 0.75].map((t, i) => (
                <Rect
                  key={`band-${i}`}
                  x={rMinCol * GP - 4}
                  y={
                    ((rMinRow + 0.5) + t * Math.max(rMaxRow - rMinRow - 1, 0.3)) * GP - 1
                  }
                  width={8}
                  height={2}
                  fill={['#994400', '#000', '#ff0000', '#d4a017'][i]}
                  listening={false}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* ─── Radial (Capacitor / LED) Body ──────────────────── */}
      {isRadial && (
        <>
          <Circle
            x={((rMinCol + rMaxCol) / 2) * GP}
            y={((rMinRow + rMaxRow) / 2) * GP}
            radius={GP * 0.42}
            fill={definition.id.includes('led') ? '#dc2626' : '#1e40af'}
            stroke={
              isSelected
                ? '#c8ff2e'
                : definition.id.includes('led')
                ? '#991b1b'
                : '#1e3a8a'
            }
            strokeWidth={isSelected ? 2 : 1.5}
            shadowColor={showShadows ? "#000" : undefined}
            shadowBlur={showShadows ? 4 : 0}
            shadowOpacity={showShadows ? 0.3 : 0}
          />
          {definition.id.includes('led') && (
            <Circle
              x={((rMinCol + rMaxCol) / 2) * GP}
              y={((rMinRow + rMaxRow) / 2) * GP}
              radius={GP * 0.25}
              fill="#ff6666"
              opacity={0.5}
              listening={false}
            />
          )}
        </>
      )}

      {/* ─── SIP (Header / Transistor) Body ─────────────────── */}
      {isSIP && (
        <Rect
          x={bodyX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          fill={definition.id.includes('transistor') ? '#333' : '#2a2a2a'}
          stroke={isSelected ? '#c8ff2e' : '#555'}
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
          {/* "?" indicator to show it's a generic/configurable component */}
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

      {/* ─── IC text ────────────────────────────────────────── */}
      {isIC && showRefs && showLabels && (
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
      {isIC && showValues && showLabels && component.value && (
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

      {/* ─── Axial (Resistor) text ──────────────────────────── */}
      {isAxial && showRefs && showLabels && (
        <Text
          x={isHoriz ? bodyX : rMinCol * GP + 9}
          y={
            isHoriz
              ? rMinRow * GP - 17
              : ((rMinRow + rMaxRow) / 2) * GP -
                (showValues && component.value ? 9 : 4)
          }
          width={isHoriz ? bodyW : undefined}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill="#ccc"
          align={isHoriz ? 'center' : undefined}
          fontStyle="bold"
          listening={false}
        />
      )}
      {isAxial && showValues && showLabels && component.value && (
        <Text
          x={isHoriz ? bodyX : rMinCol * GP + 9}
          y={
            isHoriz
              ? rMinRow * GP + 10
              : ((rMinRow + rMaxRow) / 2) * GP + (showRefs ? 2 : -4)
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

      {/* ─── Radial "+" marker ──────────────────────────────── */}
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

      {/* ─── Radial text (centered inside body) ────────────── */}
      {isRadial && showRefs && showLabels && (
        <Text
          x={((rMinCol + rMaxCol) / 2) * GP - 20}
          y={((rMinRow + rMaxRow) / 2) * GP - (showValues && component.value ? 7 : 5)}
          width={40}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill="#e0e0e0"
          align="center"
          fontStyle="bold"
          listening={false}
        />
      )}
      {isRadial && showValues && showLabels && component.value && (
        <Text
          x={((rMinCol + rMaxCol) / 2) * GP - 20}
          y={((rMinRow + rMaxRow) / 2) * GP + (showRefs ? 2 : -5)}
          width={40}
          text={component.value}
          fontSize={8}
          fontFamily="monospace"
          fill="#a78bfa"
          align="center"
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
              : ((rMinRow + rMaxRow) / 2) * GP -
                (showValues && component.value ? 9 : 4)
          }
          width={isHoriz ? bodyW : undefined}
          text={component.reference}
          fontSize={9}
          fontFamily="monospace"
          fill="#aaa"
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
              : ((rMinRow + rMaxRow) / 2) * GP + (showRefs ? 2 : -4)
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
            {showRefs && (isIC || isCustom) && (
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
            )}
            {showRefs && !isIC && pinDef.name && (
              <Text
                x={rp.col * GP - PIN_R}
                y={rp.row * GP - 3.5}
                width={PIN_R * 2}
                text={pinDef.name}
                fontSize={7}
                fontFamily="monospace"
                fill={isPinHighlighted ? '#fff' : '#111'}
                fontStyle="bold"
                align="center"
                listening={false}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
});

Component.displayName = 'Component';
