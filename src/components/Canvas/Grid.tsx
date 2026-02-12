import { Circle, Rect, Text } from 'react-konva';
import { useStripboardStore } from '@/store/stripboard';

const GRID_PITCH = 25.4;
const HOLE_RADIUS = 3.5;

export const Grid = () => {
  const { rows, cols } = useStripboardStore();

  const boardPadding = GRID_PITCH * 0.55;
  const boardWidth = (cols - 1) * GRID_PITCH + boardPadding * 2;
  const boardHeight = (rows - 1) * GRID_PITCH + boardPadding * 2;

  const holes = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      holes.push({
        key: `${row}-${col}`,
        x: col * GRID_PITCH,
        y: row * GRID_PITCH,
      });
    }
  }

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

      {/* Holes */}
      {holes.map((hole) => (
        <Circle
          key={hole.key}
          x={hole.x}
          y={hole.y}
          radius={HOLE_RADIUS}
          fill="#0a0a0e"
          stroke="#28282e"
          strokeWidth={0.6}
          listening={false}
        />
      ))}

      {/* Row labels */}
      {rowLabels.map(({ row, label }) => (
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
      {colLabels.map(({ col, label }) => (
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
