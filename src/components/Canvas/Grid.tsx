import { Shape, Rect, Text, Group } from 'react-konva';
import { useStripboardStore } from '@/store/stripboard';
import type { ViewportBounds } from '@/utils/viewport';

const GRID_PITCH = 25.4;
const HOLE_RADIUS = 3.5;

interface GridProps {
  viewportBounds?: ViewportBounds;
}

export const Grid = ({ viewportBounds }: GridProps) => {
  // Get all PCBs
  const pcbs = useStripboardStore((s) => s.pcbs);
  const zoom = useStripboardStore((s) => s.zoom);
  const showGridLabels = zoom > 0.3;

  const boardPadding = GRID_PITCH * 0.55;

  return (
    <>
      {pcbs.map((pcb) => {
        const boardWidth = (pcb.cols - 1) * GRID_PITCH + boardPadding * 2;
        const boardHeight = (pcb.rows - 1) * GRID_PITCH + boardPadding * 2;
        
        // Calculate board position in world coordinates
        const offsetX = pcb.position.col * GRID_PITCH;
        const offsetY = pcb.position.row * GRID_PITCH;

        // Determine visible range for holes (considering viewport and PCB bounds)
        const startRow = viewportBounds
          ? Math.max(0, viewportBounds.minRow - pcb.position.row)
          : 0;
        const endRow = viewportBounds
          ? Math.min(pcb.rows - 1, viewportBounds.maxRow - pcb.position.row)
          : pcb.rows - 1;
        const startCol = viewportBounds
          ? Math.max(0, viewportBounds.minCol - pcb.position.col)
          : 0;
        const endCol = viewportBounds
          ? Math.min(pcb.cols - 1, viewportBounds.maxCol - pcb.position.col)
          : pcb.cols - 1;

        // Labels every 5 positions
        const rowLabels = [];
        for (let row = 0; row < pcb.rows; row += 5) {
          rowLabels.push({ row, label: String(row + 1) });
        }
        const colLabels = [];
        for (let col = 0; col < pcb.cols; col += 5) {
          colLabels.push({ col, label: String(col + 1) });
        }

        return (
          <Group key={pcb.id} x={offsetX} y={offsetY}>
            {/* Board shadow */}
            <Rect
              x={-boardPadding + 3}
              y={-boardPadding + 3}
              width={boardWidth}
              height={boardHeight}
              fill="#000"
              opacity={0.4}
              cornerRadius={6}
              listening={false}
            />

            {/* Board background (dark grey) */}
            <Rect
              x={-boardPadding}
              y={-boardPadding}
              width={boardWidth}
              height={boardHeight}
              fill="#1a1a1e"
              stroke="#28282e"
              strokeWidth={1}
              cornerRadius={5}
              listening={false}
            />

            {/* Inner board texture */}
            <Rect
              x={-boardPadding + 3}
              y={-boardPadding + 3}
              width={boardWidth - 6}
              height={boardHeight - 6}
              fill="#1c1c20"
              cornerRadius={3}
              listening={false}
            />

            {/* PCB name label (only for non-main PCBs) */}
            {!pcb.isMain && (
              <Text
                x={-boardPadding}
                y={-boardPadding - 20}
                text={pcb.name}
                fontSize={10}
                fontFamily="sans-serif"
                fill="#a6a6b8"
                fontStyle="bold"
                listening={false}
              />
            )}

            {/* Holes - Single Shape using sceneFunc for performance */}
            <Shape
              sceneFunc={(ctx, _shape) => {
                ctx.fillStyle = '#0a0a0e';
                ctx.strokeStyle = '#28282e';
                ctx.lineWidth = 0.6;
                
                for (let row = startRow; row <= endRow; row++) {
                  for (let col = startCol; col <= endCol; col++) {
                    const x = col * GRID_PITCH;
                    const y = row * GRID_PITCH;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, HOLE_RADIUS, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                  }
                }
              }}
              listening={false}
            />

            {/* Row labels */}
            {showGridLabels && rowLabels.map(({ row, label }) => (
              <Text
                key={`rl-${pcb.id}-${row}`}
                x={-boardPadding - 16}
                y={row * GRID_PITCH - 4}
                text={label}
                fontSize={8}
                fontFamily="monospace"
                fill="#52525b"
                listening={false}
              />
            ))}

            {/* Column labels */}
            {showGridLabels && colLabels.map(({ col, label }) => (
              <Text
                key={`cl-${pcb.id}-${col}`}
                x={col * GRID_PITCH - (label.length > 1 ? 5 : 2)}
                y={-boardPadding - 13}
                text={label}
                fontSize={8}
                fontFamily="monospace"
                fill="#52525b"
                listening={false}
              />
            ))}
          </Group>
        );
      })}
    </>
  );
};
