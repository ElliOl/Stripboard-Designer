import { memo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import type { Wire as WireType } from '@/lib/types';

const GRID_PITCH = 25.4;

interface WireProps {
  wire: WireType;
  isSelected: boolean;
  wireColor: string;
  hasError: boolean;
  effectiveNetId: string | null;
  highlightedNetId?: string | null;
}

// Custom comparison for Wire to prevent unnecessary re-renders
const wirePropsAreEqual = (prevProps: WireProps, nextProps: WireProps): boolean => {
  // If wire identity changed, re-render
  if (prevProps.wire.id !== nextProps.wire.id) return false;
  
  // If selection changed, re-render
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  
  // If color or error state changed, re-render
  if (
    prevProps.wireColor !== nextProps.wireColor ||
    prevProps.hasError !== nextProps.hasError
  ) {
    return false;
  }
  
  // If highlighting changed AND this wire is affected, re-render
  if (prevProps.highlightedNetId !== nextProps.highlightedNetId) {
    const wasRelevant = prevProps.effectiveNetId === prevProps.highlightedNetId;
    const isRelevant = nextProps.effectiveNetId === nextProps.highlightedNetId;
    // Only re-render if this wire is or was relevant to highlighting
    if (wasRelevant || isRelevant || !prevProps.highlightedNetId || !nextProps.highlightedNetId) {
      return false;
    }
  }
  
  // If effective net changed, re-render
  if (prevProps.effectiveNetId !== nextProps.effectiveNetId) return false;
  
  // If wire points changed, re-render
  if (prevProps.wire.points.length !== nextProps.wire.points.length) return false;
  for (let i = 0; i < prevProps.wire.points.length; i++) {
    if (
      prevProps.wire.points[i].row !== nextProps.wire.points[i].row ||
      prevProps.wire.points[i].col !== nextProps.wire.points[i].col
    ) {
      return false;
    }
  }
  
  // Otherwise, props are equal
  return true;
};

const WireImpl = ({ 
  wire, 
  isSelected, 
  wireColor, 
  hasError, 
  effectiveNetId, 
  highlightedNetId 
}: WireProps) => {
  const flatPoints = wire.points.flatMap((p) => [
    p.col * GRID_PITCH,
    p.row * GRID_PITCH,
  ]);

  // Net highlighting
  const isNetHighlighted =
    !!highlightedNetId && effectiveNetId === highlightedNetId;

  return (
    <Group
      name={`wire:${wire.id}`}
      perfectDrawEnabled={false}
    >
      {/* Invisible wide line for easier click targeting */}
      <Line
        points={flatPoints}
        stroke="transparent"
        strokeWidth={14}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={14}
      />

      {/* Visible wire */}
      <Line
        points={flatPoints}
        stroke={isSelected ? '#c8ff2e' : wireColor}
        strokeWidth={isSelected ? 3.5 : isNetHighlighted ? 4 : hasError ? 3 : 2.5}
        lineCap="round"
        lineJoin="round"
        shadowColor={isNetHighlighted ? wireColor : hasError ? '#ef4444' : wireColor}
        shadowBlur={isNetHighlighted ? 14 : isSelected ? 6 : hasError ? 8 : 3}
        shadowOpacity={isNetHighlighted ? 0.9 : hasError ? 0.7 : 0.4}
        dash={hasError ? [4, 2] : undefined}
      />

      {/* Endpoints */}
      {wire.points.map((p, i) => (
        <Circle
          key={i}
          x={p.col * GRID_PITCH}
          y={p.row * GRID_PITCH}
          radius={isSelected ? 5 : isNetHighlighted ? 5.5 : hasError ? 5 : 4}
          fill={isSelected ? '#c8ff2e' : wireColor}
          stroke={isSelected ? '#fff' : isNetHighlighted ? '#fff' : hasError ? '#fff' : '#0f3d38'}
          strokeWidth={isNetHighlighted ? 2 : hasError ? 2 : 1}
        />
      ))}
    </Group>
  );
};

// Export memoized wire with custom comparison
export const Wire = memo(WireImpl, wirePropsAreEqual);

Wire.displayName = 'Wire';
