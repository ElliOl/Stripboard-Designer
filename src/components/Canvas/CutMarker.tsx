import { memo } from 'react';
import { Group, Circle, Line } from 'react-konva';
import type { Cut } from '@/lib/types';
import { useStripboardStore } from '@/store/stripboard';
import { scaleHitTolerance } from '@/lib/canvas-geometry';

const GRID_PITCH = 25.4;
const STRIP_HEIGHT = 16;
const CUT_CIRCLE_RADIUS = 5;

interface CutMarkerProps {
  cut: Cut;
  stripRow: number;
  cutId: string;
  isSelected: boolean;
  showCuts: boolean;
  pcbPosition: { row: number; col: number };
}

const CutMarkerImpl = ({
  cut,
  stripRow,
  cutId,
  isSelected,
  showCuts,
  pcbPosition,
}: CutMarkerProps) => {
  const zoom = useStripboardStore((s) => s.zoom);
  const hitRadius = scaleHitTolerance(10, zoom);
  const isDrill = cut.type === 'drill';
  const isSlice = cut.type === 'slice';
  const y = stripRow * GRID_PITCH - STRIP_HEIGHT / 2;

  return (
    <Group
      key={`cut-marker-${cutId}`}
      name={`cut:${cutId}`}
      x={pcbPosition.col * GRID_PITCH}
      y={pcbPosition.row * GRID_PITCH}
    >
      {/* Invisible hit area for easier click targeting */}
      <Circle
        x={cut.col * GRID_PITCH}
        y={stripRow * GRID_PITCH}
        radius={hitRadius}
        fill="transparent"
        hitStrokeWidth={hitRadius}
        listening={true}
      />
      {/* Circle cut indicator for drill cuts only */}
      {isDrill && (
        <Circle
          x={cut.col * GRID_PITCH}
          y={stripRow * GRID_PITCH}
          radius={isSelected ? CUT_CIRCLE_RADIUS + 1.5 : CUT_CIRCLE_RADIUS}
          stroke={
            isSelected
              ? '#c8ff2e'
              : showCuts
                ? '#ef4444'
                : '#38384a'
          }
          strokeWidth={isSelected ? 2.5 : showCuts ? 2 : 1}
          fill="transparent"
          opacity={isSelected ? 1 : showCuts ? 1 : 0.4}
          shadowColor={isSelected ? '#c8ff2e' : undefined}
          shadowBlur={isSelected ? 8 : 0}
          shadowOpacity={isSelected ? 0.6 : 0}
          listening={false}
        />
      )}
      {/* Line indicator for slice cuts only */}
      {isSlice && (
        <Line
          points={[
            cut.col * GRID_PITCH,
            y,
            cut.col * GRID_PITCH,
            y + STRIP_HEIGHT,
          ]}
          stroke={
            isSelected
              ? '#c8ff2e'
              : showCuts
                ? '#ef4444'
                : '#38384a'
          }
          strokeWidth={isSelected ? 2.5 : showCuts ? 2 : 1.5}
          opacity={isSelected ? 1 : showCuts ? 1 : 0.6}
          shadowColor={isSelected ? '#c8ff2e' : undefined}
          shadowBlur={isSelected ? 8 : 0}
          shadowOpacity={isSelected ? 0.6 : 0}
          listening={false}
        />
      )}
    </Group>
  );
};

export const CutMarker = memo(CutMarkerImpl);

CutMarker.displayName = 'CutMarker';
