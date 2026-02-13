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

export const Wire = memo(({ 
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
  const isDimmed = !!highlightedNetId && !isNetHighlighted;

  return (
    <Group
      name={`wire:${wire.id}`}
      opacity={isDimmed ? 0.2 : 1}
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
});

Wire.displayName = 'Wire';
