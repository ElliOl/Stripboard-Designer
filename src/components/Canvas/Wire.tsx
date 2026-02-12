import { Line, Circle, Group } from 'react-konva';
import type { Wire as WireType } from '@/lib/types';
import { useStripboardStore } from '@/store/stripboard';

const GRID_PITCH = 25.4;

interface WireProps {
  wire: WireType;
  detectedNetId: string | null;
  hasError: boolean;
  highlightedNetId?: string | null;
}

export const Wire = ({ wire, detectedNetId, hasError, highlightedNetId }: WireProps) => {
  const { selectedItems, setHoveredItem, nets } =
    useStripboardStore();
  const isSelected = selectedItems.includes(wire.id);

  const flatPoints = wire.points.flatMap((p) => [
    p.col * GRID_PITCH,
    p.row * GRID_PITCH,
  ]);

  // Determine the effective net this wire belongs to
  const effectiveNetId = detectedNetId || wire.netId || null;

  // Determine wire color:
  // 1. If error: use red
  // 2. If detectedNetId exists: use that net's color
  // 3. If wire has explicit color: use it
  // 4. Default: teal
  let wireColor = '#2dd4bf'; // default
  
  if (hasError) {
    wireColor = '#ef4444'; // red stroke for errors
  } else if (detectedNetId) {
    const net = nets.find((n) => n.id === detectedNetId);
    if (net) wireColor = net.color;
  } else if (wire.color) {
    wireColor = wire.color;
  }

  // Net highlighting
  const isNetHighlighted =
    !!highlightedNetId && effectiveNetId === highlightedNetId;
  const isDimmed = !!highlightedNetId && !isNetHighlighted;

  return (
    <Group
      name={`wire:${wire.id}`}
      onMouseEnter={() => setHoveredItem(wire.id)}
      onMouseLeave={() => setHoveredItem(null)}
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
};
