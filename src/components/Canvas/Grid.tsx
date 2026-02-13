import { Shape, Rect, Text } from 'react-konva';
import { useStripboardStore } from '@/store/stripboard';
import type { ViewportBounds } from '@/utils/viewport';

const GRID_PITCH = 25.4;
const HOLE_RADIUS = 3.5;

interface GridProps {
  viewportBounds?: ViewportBounds;
}

export const Grid = ({ viewportBounds }: GridProps) => {
  // Individual selectors
  const rows = useStripboardStore((s) => s.rows);
  const cols = useStripboardStore((s) => s.cols);

  const boardPadding = GRID_PITCH * 0.55;
  const boardWidth = (cols - 1) * GRID_PITCH + boardPadding * 2;
  const boardHeight = (rows - 1) * GRID_PITCH + boardPadding * 2;

  // Determine visible range for holes
  const startRow = viewportBounds
    ? Math.max(0, viewportBounds.minRow)
    : 0;
  const endRow = viewportBounds
    ? Math.min(rows - 1, viewportBounds.maxRow)
    : rows - 1;
  const startCol = viewportBounds
    ? Math.max(0, viewportBounds.minCol)
    : 0;
  const endCol = viewportBounds
    ? Math.min(cols - 1, viewportBounds.maxCol)
    : cols - 1;

  // LOD: Get zoom from store for label visibility
  const zoom = useStripboardStore((s) => s.zoom);
  const showGridLabels = zoom > 0.3;

  // Labels every 5 positions
  const rowLabels = [];
  for (let row = 0; row < rows; row += 5) {
    rowLabels.push({ row, label: String(row + 1) });
  }
  const colLabels = [];
  for (let col = 0; col < cols; col += 5) {
    colLabels.push({ col, label: String(col + 1) });
  }

  return (
    <>
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
          key={`rl-${row}`}
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
          key={`cl-${col}`}
          x={col * GRID_PITCH - (label.length > 1 ? 5 : 2)}
          y={-boardPadding - 13}
          text={label}
          fontSize={8}
          fontFamily="monospace"
          fill="#52525b"
          listening={false}
        />
      ))}
    </>
  );
};
