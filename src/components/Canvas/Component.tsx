import { useMemo } from 'react';
import { Group, Rect, Circle, Text, Line } from 'react-konva';
import type { Component as ComponentType } from '@/lib/types';
import { useStripboardStore } from '@/store/stripboard';
import { getRotatedPinPositions } from '@/lib/rotation';
import { arePinsConnectedEnhanced } from '@/lib/connectivity';

const GP = 25.4; // grid pitch
const PIN_R = 4.5;

interface ComponentProps {
  component: ComponentType;
  showRefs?: boolean;
  showValues?: boolean;
  highlightedNetId?: string | null;
}

export const Component = ({
  component,
  showRefs = true,
  showValues = false,
  highlightedNetId,
}: ComponentProps) => {
  const {
    selectedItems,
    setHoveredItem,
    componentDefinitions,
    nets,
    strips,
    wires,
    components: allComponents,
  } = useStripboardStore();

  const definition = componentDefinitions.find(
    (d) => d.id === component.definitionId
  );
  if (!definition) return null;

  const isSelected = selectedItems.includes(component.id);

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

  // ─── Net Highlighting (respects strip cuts) ────────────────
  // A pin highlights if it belongs to the highlighted net AND sits
  // on a strip segment that still carries that net (i.e. it wasn't
  // cut off from the rest of the net).  Pins not on any strip still
  // highlight normally (they're just unrouted pads).
  const highlightedPinNumbers = useMemo(() => {
    const result = new Set<string>();
    if (!highlightedNetId) return result;

    const myNetPins = component.pins.filter(p => p.netId === highlightedNetId);
    if (myNetPins.length === 0) return result;

    // Gather all net-pin positions from every component on the board
    const allNetPositions = allComponents.flatMap(c =>
      c.pins
        .filter(p => p.netId === highlightedNetId)
        .map(p => p.position)
    );

    for (const pin of myNetPins) {
      // Find the strip segment this pin sits on (if any)
      const stripAtPin = strips.find(
        s => s.row === pin.position.row &&
          pin.position.col >= s.startCol &&
          pin.position.col <= s.endCol
      );

      if (!stripAtPin) {
        // Pin is not on any strip -- still belongs to the net, highlight it
        result.add(pin.number);
        continue;
      }

      // Pin is on a strip -- check if it is connected to at least one
      // other pin in the same net (respecting cuts)
      const isConnected = allNetPositions.some(otherPos => {
        if (otherPos.row === pin.position.row && otherPos.col === pin.position.col) return false;
        return arePinsConnectedEnhanced(
          pin.position, otherPos, strips, wires, highlightedNetId, allComponents
        );
      });

      if (isConnected) {
        result.add(pin.number);
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedNetId, component.pins, strips, wires, allComponents]);

  const hasHighlightedPin = highlightedPinNumbers.size > 0;
  const isDimmed = !!highlightedNetId && !hasHighlightedPin;
  const hlNetColor = highlightedNetId
    ? nets.find((n) => n.id === highlightedNetId)?.color
    : undefined;

  return (
    <Group
      name={`component:${component.id}`}
      x={component.position.col * GP}
      y={component.position.row * GP}
      opacity={isDimmed ? 0.2 : 1}
      onMouseEnter={() => setHoveredItem(component.id)}
      onMouseLeave={() => setHoveredItem(null)}
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
            shadowColor="#000"
            shadowBlur={6}
            shadowOpacity={0.4}
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
            shadowColor="#000"
            shadowBlur={4}
            shadowOpacity={0.3}
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
      {isIC && showRefs && (
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
      {isIC && showValues && component.value && (
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
      {isAxial && showRefs && (
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
      {isAxial && showValues && component.value && (
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
      {isRadial && showRefs && (
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
      {isRadial && showValues && component.value && (
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
      {isSIP && showRefs && (
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
      {isSIP && showValues && component.value && (
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

      {/* ─── Pin numbers & names (centered on pins) ──────────── */}
      {definition.pins.map((pinDef, i) => {
        const rp = rotatedPins[i];
        const isPinHighlighted = highlightedPinNumbers.has(pinDef.number);

        return (
          <Group key={`pin-text-${pinDef.number}`}>
            {showRefs && isIC && (
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
};
