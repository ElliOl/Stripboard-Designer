import { memo } from 'react';
import { Rect, Group, Circle, Shape } from 'react-konva';
import type { Strip as StripType, Component, Wire, NetHighlightMode } from '@/lib/types';
import { getConnectionRanges } from '@/lib/strip-ranges';

const GRID_PITCH = 25.4;
const STRIP_HEIGHT = 16;
const CUT_CIRCLE_RADIUS = 5;


/** Adjust hex color brightness by a factor (-1 to 1) */
function adjustBrightness(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) * (1 + factor)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) * (1 + factor)));
  const b = Math.max(0, Math.min(255, (num & 0xff) * (1 + factor)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

interface StripProps {
  strip: StripType;
  showCuts?: boolean;
  showNetHighlight?: boolean;
  /** Per-segment net map from connectivity: key = "stripId:segIdx" */
  segmentNets?: Map<string, string>;
  /** Per-segment error set from connectivity: key = "stripId:segIdx" */
  segmentErrors?: Set<string>;
  netColorMap?: Map<string, string>;
  highlightedNetId?: string | null;
  stripColor?: string; // Base color for strips (defaults to copper orange)
  netHighlightMode?: NetHighlightMode; // How to highlight nets on strips
  components?: Component[]; // Needed for connection mode
  wires?: Wire[]; // Needed for connection mode
  wireNets?: Map<string, string | null>; // Detected net for each wire
  selectedItems?: string[]; // Currently selected item IDs (for cut selection)
}

function getStripSegments(strip: StripType): Array<{ startCol: number; endCol: number }> {
  if (!strip.breaks || strip.breaks.length === 0) {
    return [{ startCol: strip.startCol, endCol: strip.endCol }];
  }

  const segments: Array<{ startCol: number; endCol: number }> = [];
  const sortedBreaks = [...strip.breaks].sort((a, b) => a - b);

  let start = strip.startCol;
  for (const breakCol of sortedBreaks) {
    if (breakCol > start) {
      segments.push({ startCol: start, endCol: breakCol - 1 });
    }
    start = breakCol + 1;
  }

  if (start <= strip.endCol) {
    segments.push({ startCol: start, endCol: strip.endCol });
  }

  return segments;
}

export const Strip = memo(({
  strip,
  showCuts = false,
  showNetHighlight = false,
  segmentNets,
  segmentErrors,
  netColorMap,
  highlightedNetId,
  stripColor = '#4a4a4a',
  netHighlightMode = 'full',
  components = [],
  wires = [],
  wireNets,
  selectedItems = [],
}: StripProps) => {
  const y = strip.row * GRID_PITCH - STRIP_HEIGHT / 2;
  const segments = getStripSegments(strip);

  return (
    <Group>
      {/* Render each segment as its own rect so cuts split net colours */}
      {segments.map((segment, segIdx) => {
        const segKey = `${strip.id}:${segIdx}`;
        // Each segment resolves its own net independently.
        // segmentNets only has an entry when exactly one net touches this segment.
        const segNetId = segmentNets?.get(segKey);
        const segHasError = segmentErrors?.has(segKey) ?? false;

        const isSegHighlighted =
          !!highlightedNetId && segNetId === highlightedNetId;
        const isDimmed = !!highlightedNetId && !isSegHighlighted;

        const hlColor =
          isSegHighlighted && netColorMap
            ? netColorMap.get(highlightedNetId!) || '#fff'
            : undefined;
        const netColor =
          showNetHighlight && segNetId && netColorMap
            ? netColorMap.get(segNetId)
            : undefined;

        // For connection mode, calculate which parts of the segment should be highlighted
        const connectionRanges =
          netHighlightMode === 'connections' && showNetHighlight && segNetId
            ? getConnectionRanges(strip, segment, components, wires, segNetId, wireNets)
            : [];

        // If in connection mode and we have ranges, render multiple rects
        if (netHighlightMode === 'connections' && connectionRanges.length > 0) {
          return (
            <Group key={`seg-${segIdx}`}>
              {/* Base segment (non-highlighted) */}
              <Rect
                x={(segment.startCol - 0.4) * GRID_PITCH}
                y={y}
                width={(segment.endCol - segment.startCol + 0.8) * GRID_PITCH}
                height={STRIP_HEIGHT}
                fill={stripColor}
                opacity={0.8}
                stroke={adjustBrightness(stripColor, -0.2)}
                strokeWidth={0.5}
                cornerRadius={1}
                shadowColor="#000"
                shadowBlur={3}
                shadowOpacity={0.2}
                listening={false}
              />
              {/* Highlighted connection ranges */}
              {connectionRanges.map((range, rangeIdx) => {
                const rangeX = (range.startCol - 0.4) * GRID_PITCH;
                const rangeW = (range.endCol - range.startCol + 0.8) * GRID_PITCH;
                return (
                  <Rect
                    key={`range-${rangeIdx}`}
                    x={rangeX}
                    y={y}
                    width={rangeW}
                    height={STRIP_HEIGHT}
                    fill={netColor || stripColor}
                    opacity={0.85}
                    stroke={netColor || adjustBrightness(stripColor, -0.2)}
                    strokeWidth={1.5}
                    cornerRadius={1}
                    shadowColor={netColor || '#000'}
                    shadowBlur={6}
                    shadowOpacity={0.5}
                    listening={false}
                  />
                );
              })}
            </Group>
          );
        }

        // Full mode or no highlighting - render single rect for the entire segment
        const fillColor = hlColor || netColor || stripColor;
        const strokeColor = isSegHighlighted
            ? hlColor || '#fff'
            : segHasError
              ? '#dc2626'
              : netColor
                ? netColor
                : adjustBrightness(stripColor, -0.2);

        const segX = (segment.startCol - 0.4) * GRID_PITCH;
        const segW = (segment.endCol - segment.startCol + 0.8) * GRID_PITCH;

        return (
          <Rect
            key={`seg-${segIdx}`}
            x={segX}
            y={y}
            width={segW}
            height={STRIP_HEIGHT}
            fill={fillColor}
            opacity={
              isDimmed ? 0.25
                : isSegHighlighted ? 1
                : netColor ? 0.85
                : 0.8
            }
            stroke={strokeColor}
            strokeWidth={
              isSegHighlighted ? 2.5
                : segHasError ? 2.5
                : netColor ? 1.5
                : 0.5
            }
            dash={segHasError ? [6, 4] : undefined}
            cornerRadius={1}
            shadowColor={
              isSegHighlighted ? hlColor || '#fff'
                : segHasError ? '#ef4444'
                : netColor || '#000'
            }
            shadowBlur={isSegHighlighted ? 12 : segHasError ? 8 : netColor ? 6 : 3}
            shadowOpacity={
              isSegHighlighted ? 0.8
                : segHasError ? 1
                : netColor ? 0.5
                : 0.2
            }
            listening={false}
          />
        );
      })}

      {/* Holes punched in the strip - batched into single Shape */}
      <Shape
        sceneFunc={(ctx) => {
          ctx.fillStyle = '#1c1c20';
          for (let col = strip.startCol; col <= strip.endCol; col++) {
            ctx.beginPath();
            ctx.arc(col * GRID_PITCH, strip.row * GRID_PITCH, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }}
        listening={false}
      />

      {/* Break markers */}
      {strip.breaks?.map((breakCol) => {
        const cutId = `cut-${strip.row}-${breakCol}`;
        const isCutSelected = selectedItems.includes(cutId);
        return (
          <Group key={`brk-${breakCol}`} name={`cut:${cutId}`}>
            {/* Cut through the strip (always visible) */}
            <Rect
              x={breakCol * GRID_PITCH - 4}
              y={y - 1}
              width={8}
              height={STRIP_HEIGHT + 2}
              fill="#1c1c20"
              listening={false}
            />
            {/* Invisible hit area for easier click targeting */}
            <Circle
              x={breakCol * GRID_PITCH}
              y={strip.row * GRID_PITCH}
              radius={10}
              fill="transparent"
              hitStrokeWidth={10}
            />
            {/* Circle cut indicator */}
            <Circle
              x={breakCol * GRID_PITCH}
              y={strip.row * GRID_PITCH}
              radius={isCutSelected ? CUT_CIRCLE_RADIUS + 1.5 : CUT_CIRCLE_RADIUS}
              stroke={
                isCutSelected
                  ? '#c8ff2e'
                  : showCuts
                    ? '#ef4444'
                    : '#38384a'
              }
              strokeWidth={isCutSelected ? 2.5 : showCuts ? 2 : 1}
              fill="transparent"
              opacity={isCutSelected ? 1 : showCuts ? 1 : 0.4}
              shadowColor={isCutSelected ? '#c8ff2e' : undefined}
              shadowBlur={isCutSelected ? 8 : 0}
              shadowOpacity={isCutSelected ? 0.6 : 0}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
});

Strip.displayName = 'Strip';
