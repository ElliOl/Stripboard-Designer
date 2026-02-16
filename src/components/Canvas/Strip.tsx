import { memo } from 'react';
import { Rect, Group, Shape } from 'react-konva';
import type { Strip as StripType, Component, Wire, NetHighlightMode, Cut } from '@/lib/types';
import { getConnectionRanges } from '@/lib/strip-ranges';

const GRID_PITCH = 25.4;
const STRIP_HEIGHT = 16;

/** Adjust hex color brightness by a factor (-1 to 1) */
function adjustBrightness(hex: string, factor: number): string {
  const c = hex.replace('#', '');
  const r = Math.round(parseInt(c.substring(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(c.substring(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(c.substring(4, 6), 16) * (1 - factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
  pcbPosition?: { row: number; col: number }; // PCB offset position
}

// Custom comparison for Strip to prevent unnecessary re-renders
const stripPropsAreEqual = (prevProps: StripProps, nextProps: StripProps): boolean => {
  // If strip identity changed, re-render
  if (prevProps.strip.id !== nextProps.strip.id) return false;
  
  // If strip properties changed, re-render
  if (
    prevProps.strip.row !== nextProps.strip.row ||
    prevProps.strip.startCol !== nextProps.strip.startCol ||
    prevProps.strip.endCol !== nextProps.strip.endCol ||
    prevProps.strip.breaks?.length !== nextProps.strip.breaks?.length ||
    prevProps.strip.cuts?.length !== nextProps.strip.cuts?.length ||
    (prevProps.strip.breaks && nextProps.strip.breaks && 
      !prevProps.strip.breaks.every((b, i) => b === nextProps.strip.breaks![i])) ||
    (prevProps.strip.cuts && nextProps.strip.cuts && 
      !prevProps.strip.cuts.every((c, i) => c.col === nextProps.strip.cuts![i].col && c.type === nextProps.strip.cuts![i].type))
  ) {
    return false;
  }
  
  // If visibility settings changed, re-render
  if (
    prevProps.showCuts !== nextProps.showCuts ||
    prevProps.showNetHighlight !== nextProps.showNetHighlight ||
    prevProps.stripColor !== nextProps.stripColor ||
    prevProps.netHighlightMode !== nextProps.netHighlightMode
  ) {
    return false;
  }
  
  // If highlighting changed AND this strip is affected, re-render
  if (prevProps.highlightedNetId !== nextProps.highlightedNetId) {
    // Check if any segment of this strip has the highlighted net
    const segments = getStripSegments(prevProps.strip);
    let wasRelevant = false;
    let isRelevant = false;
    
    for (let i = 0; i < segments.length; i++) {
      const segKey = `${prevProps.strip.id}:${i}`;
      const prevNetId = prevProps.segmentNets?.get(segKey);
      const nextNetId = nextProps.segmentNets?.get(segKey);
      
      if (prevNetId === prevProps.highlightedNetId) wasRelevant = true;
      if (nextNetId === nextProps.highlightedNetId) isRelevant = true;
    }
    
    // Only re-render if this strip is or was relevant to highlighting
    if (wasRelevant || isRelevant || !prevProps.highlightedNetId || !nextProps.highlightedNetId) {
      return false;
    }
  }
  
  // If segment nets or errors changed, re-render
  if (prevProps.segmentNets !== nextProps.segmentNets) return false;
  if (prevProps.segmentErrors !== nextProps.segmentErrors) return false;
  
  // Otherwise, props are equal
  return true;
};

function getStripSegments(strip: StripType): Array<{ startCol: number; endCol: number }> {
  // Merge cuts array with old breaks array using Map for deduplication
  const cutsArray = strip.cuts || [];
  const breaksArray = strip.breaks || [];
  
  const cutsByCol = new Map<number, Cut>();
  cutsArray.forEach(cut => {
    cutsByCol.set(cut.col, cut);
  });
  breaksArray.forEach(col => {
    if (!cutsByCol.has(col)) {
      cutsByCol.set(col, { col, type: 'drill' as const });
    }
  });
  
  const allCuts = Array.from(cutsByCol.values());
  
  if (allCuts.length === 0) {
    return [{ startCol: strip.startCol, endCol: strip.endCol }];
  }

  const segments: Array<{ startCol: number; endCol: number }> = [];
  
  // Separate drill and slice cuts - they break strips differently
  // Drill cuts: break at integer column (hole is destroyed, breaks before and after)
  // Slice cuts: break at half-integer column (between two holes, both holes remain)
  const drillCols = allCuts.filter(c => c.type === 'drill').map(c => c.col);
  const sliceCols = allCuts.filter(c => c.type === 'slice').map(c => c.col);
  
  // Create a set of all positions that are drilled (to skip them)
  const drilledPositions = new Set(drillCols);
  
  // For drill cuts at column N: segment ends at N-1, next starts at N+1 (skip N)
  // For slice cuts at column N.5: segment ends at N, next starts at N+1
  const allBreaks: Array<{ breakBefore: number; isDrill: boolean }> = [
    ...drillCols.map(col => ({ breakBefore: col, isDrill: true })), // drill at 5 → break before 5, skip to 6
    ...sliceCols.map(col => ({ breakBefore: Math.ceil(col), isDrill: false })) // slice at 5.5 → break before 6
  ].sort((a, b) => a.breakBefore - b.breakBefore);
  
  let start = strip.startCol;
  for (const { breakBefore, isDrill } of allBreaks) {
    if (breakBefore > start) {
      segments.push({ startCol: start, endCol: breakBefore - 1 });
    }
    // For drill cuts, skip the drilled column; for slice cuts, continue from the break
    start = isDrill ? breakBefore + 1 : breakBefore;
  }

  if (start <= strip.endCol) {
    segments.push({ startCol: start, endCol: strip.endCol });
  }

  return segments;
}

const StripImpl = ({
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
  pcbPosition = { row: 0, col: 0 },
}: StripProps) => {
  const y = strip.row * GRID_PITCH - STRIP_HEIGHT / 2;
  const segments = getStripSegments(strip);

  return (
    <Group x={pcbPosition.col * GRID_PITCH} y={pcbPosition.row * GRID_PITCH}>
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

        // CRITICAL PERFORMANCE OPTIMIZATION:
        // Skip rendering dimmed segments entirely to avoid GPU compositing cost
        if (isDimmed) {
          return null;
        }

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
                stroke={adjustBrightness(stripColor, 0.35)}
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
                    stroke={netColor || adjustBrightness(stripColor, 0.35)}
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
                : adjustBrightness(stripColor, 0.35);

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
              isSegHighlighted ? 1
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
            perfectDrawEnabled={false}
          />
        );
      })}

      {/* Holes punched in the strip - batched into single Shape */}
      {/* Skip holes that have drill cuts on them (drill cuts destroy the hole) */}
      <Shape
        sceneFunc={(ctx) => {
          // Merge cuts array with old breaks array using Map for deduplication
          const cutsArray = strip.cuts || [];
          const breaksArray = strip.breaks || [];
          
          const cutsByCol = new Map<number, Cut>();
          cutsArray.forEach(cut => {
            cutsByCol.set(cut.col, cut);
          });
          breaksArray.forEach(col => {
            if (!cutsByCol.has(col)) {
              cutsByCol.set(col, { col, type: 'drill' as const });
            }
          });
          
          const drillCutCols = new Set(
            Array.from(cutsByCol.values())
              .filter(c => c.type === 'drill')
              .map(c => c.col)
          );
          
          ctx.fillStyle = '#1c1c20';
          for (let col = strip.startCol; col <= strip.endCol; col++) {
            // Skip holes that have drill cuts (drill cuts destroy the hole)
            if (!drillCutCols.has(col)) {
              ctx.beginPath();
              ctx.arc(col * GRID_PITCH, strip.row * GRID_PITCH, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }}
        listening={false}
      />

      {/* Visual cut marks through the strip (non-interactive) */}
      {(() => {
        // Merge cuts array with old breaks array for backward compatibility
        // Old breaks (if not in cuts) should be treated as drill cuts
        const cutsArray = strip.cuts || [];
        const breaksArray = strip.breaks || [];
        
        // Create a map of all cuts by their column position for efficient lookup
        const cutsByCol = new Map<number, Cut>();
        cutsArray.forEach(cut => {
          cutsByCol.set(cut.col, cut);
        });
        
        // Add old breaks that aren't already in cuts array (treat as drill cuts)
        breaksArray.forEach(col => {
          if (!cutsByCol.has(col)) {
            cutsByCol.set(col, { col, type: 'drill' as const });
          }
        });
        
        // Convert back to array and sort
        const allCuts = Array.from(cutsByCol.values()).sort((a, b) => a.col - b.col);
        
        return allCuts.map((cut) => {
          const isDrill = cut.type === 'drill';
          const isSlice = cut.type === 'slice';
          
          // Validate: drill cuts should be at integer positions, slice cuts at half-integer
          if (isDrill && !Number.isInteger(cut.col)) {
            console.warn(`Invalid drill cut at fractional position ${cut.col}`);
            return null;
          }
          if (isSlice && Number.isInteger(cut.col)) {
            console.warn(`Invalid slice cut at integer position ${cut.col}`);
            return null;
          }
          
          return (
            <Group key={`brk-${cut.col}`}>
              {/* Cut through the strip - different widths and positions for drill vs slice */}
              {isDrill && (
                // Drill cut: wide cut centered on the hole
                <Rect
                  x={cut.col * GRID_PITCH - 4}
                  y={y - 1}
                  width={8}
                  height={STRIP_HEIGHT + 2}
                  fill="#1c1c20"
                  listening={false}
                />
              )}
              {isSlice && (
                // Slice cut: thin cut between holes
                <Rect
                  x={cut.col * GRID_PITCH - 1}
                  y={y - 1}
                  width={2}
                  height={STRIP_HEIGHT + 2}
                  fill="#1c1c20"
                  listening={false}
                />
              )}
            </Group>
          );
        }).filter(Boolean);
      })()}
    </Group>
  );
};

// Export memoized strip with custom comparison
export const Strip = memo(StripImpl, stripPropsAreEqual);

Strip.displayName = 'Strip';
