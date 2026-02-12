# Development Guide for Cursor

This guide will help you continue building the stripboard designer using Cursor.

## Quick Start

1. **Open the project in Cursor:**
   ```bash
   cd stripboard-designer
   cursor .
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the dev server:**
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser

## Project Overview

### What's Already Built ✅

- **Canvas System**: Konva-powered interactive canvas with zoom/pan
- **Grid Rendering**: Stripboard holes displayed at 0.1" pitch
- **Component Library**: JSON-based library with DIP ICs and passives
- **State Management**: Zustand store for all app state
- **Basic UI**: Toolbar with tool buttons, component library sidebar
- **Type System**: Full TypeScript types for all entities
- **Design Tokens**: CSS variables for easy theming

### What Needs Building 🚧

#### High Priority

1. **Component Placement**
   - Enable drag-and-drop from library to canvas
   - Implement grid snapping
   - Show component preview while dragging
   - Generate pins with correct positions

2. **Strip Routing Tool**
   - Click to start strip on a row
   - Drag to set length
   - Show preview while drawing
   - Auto-assign to clicked pin's net

3. **Wire Routing Tool**
   - Click-to-place waypoint system
   - Manhattan (orthogonal) routing
   - Show wire preview

4. **Break Strip Tool**
   - Click strip hole to add break
   - Update strip's breaks array
   - Visual feedback

#### Medium Priority

5. **Netlist Import**
   - File picker for .net files
   - XML parser for KiCad format
   - Generate components and nets from netlist
   - Build ratsnest connections

6. **Export Functionality**
   - SVG export with proper sizing
   - PDF generation
   - JSON project save/load

7. **Ratsnest**
   - Calculate unconnected pins
   - Render thin lines between unconnected nets
   - Color-code by net
   - Toggle visibility

#### Nice to Have

8. **Undo/Redo**
9. **Keyboard Shortcuts**
10. **Layer Panel**
11. **Properties Panel** (show selected item details)
12. **DRC (Design Rule Check)**

## Key Files to Know

### State Management
- `src/store/stripboard.ts` - All app state and actions
- Use hooks like: `const { strips, addStrip } = useStripboardStore()`

### Types
- `src/lib/types.ts` - All TypeScript interfaces
- Modify these when adding new features

### Canvas Components
- `src/components/Canvas/StripboardCanvas.tsx` - Main canvas wrapper
- `src/components/Canvas/Grid.tsx` - Renders holes
- `src/components/Canvas/Strip.tsx` - Renders copper strips
- `src/components/Canvas/Component.tsx` - Renders components

### Design Tokens
- `src/styles/tokens.css` - All colors, spacing, sizes
- Change these to customize appearance

## Cursor Tips for This Project

### Use Cursor's AI Features

1. **Implementing Component Drag-and-Drop:**
   ```
   Prompt: "Implement drag and drop from ComponentLibrary to StripboardCanvas. 
   When user drops a component, create a new Component instance at the 
   nearest grid position. Use the componentDefinitions to get footprint info."
   ```

2. **Adding Strip Drawing:**
   ```
   Prompt: "Add a strip drawing tool. When activeTool is 'routeStrip', 
   let user click a row to start, then drag horizontally to set length. 
   Show a preview strip while dragging. On mouse up, add the strip to state."
   ```

3. **Building Netlist Parser:**
   ```
   Prompt: "Create a function to parse KiCad XML netlist format. 
   Extract components with their references and footprints, and nets 
   with their connections. Return structured data matching our types."
   ```

### Useful Cursor Commands

- **Cmd+K** (or Ctrl+K) - Inline AI edit
- **Cmd+L** (or Ctrl+L) - Chat with AI about code
- Select code + **Cmd+K** - Ask AI to modify selected code

### Development Workflow

1. **Start with types** - Update `types.ts` if adding new features
2. **Update store** - Add actions to `stripboard.ts`
3. **Build component** - Create UI component that uses store
4. **Test interactively** - Use hot reload to test immediately
5. **Iterate** - Refine based on how it feels

## Example: Adding a New Tool

Let's say you want to add the "Route Strip" tool:

1. **Tool is already in toolbar** ✅ (see `Toolbar.tsx`)

2. **Add strip drawing logic to canvas:**

```typescript
// In StripboardCanvas.tsx
const [drawingStrip, setDrawingStrip] = useState<{
  row: number;
  startCol: number;
  currentCol: number;
} | null>(null);

const handleCanvasClick = (e: KonvaEventObject<MouseEvent>) => {
  if (activeTool === 'routeStrip') {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    // Convert to grid coordinates
    const gridPos = {
      row: Math.round((pos.y - pan.y) / zoom / GRID_PITCH),
      col: Math.round((pos.x - pan.x) / zoom / GRID_PITCH),
    };
    
    if (!drawingStrip) {
      // Start drawing
      setDrawingStrip({
        row: gridPos.row,
        startCol: gridPos.col,
        currentCol: gridPos.col,
      });
    } else {
      // Finish drawing
      addStrip({
        id: `strip-${Date.now()}`,
        row: drawingStrip.row,
        startCol: Math.min(drawingStrip.startCol, drawingStrip.currentCol),
        endCol: Math.max(drawingStrip.startCol, drawingStrip.currentCol),
        breaks: [],
      });
      setDrawingStrip(null);
    }
  }
};

// Add preview strip to render
{drawingStrip && (
  <Strip
    strip={{
      id: 'preview',
      row: drawingStrip.row,
      startCol: Math.min(drawingStrip.startCol, drawingStrip.currentCol),
      endCol: Math.max(drawingStrip.startCol, drawingStrip.currentCol),
      breaks: [],
    }}
    opacity={0.5}
  />
)}
```

## Testing Ideas

- Create a simple test layout with 2-3 components
- Route strips to connect pins
- Add wire jumpers
- Break strips where needed
- Export to SVG to verify

## Common Patterns

### Grid Math
```typescript
// Screen to grid
const gridCol = Math.round((screenX - pan.x) / zoom / GRID_PITCH);
const gridRow = Math.round((screenY - pan.y) / zoom / GRID_PITCH);

// Grid to screen
const screenX = gridCol * GRID_PITCH * zoom + pan.x;
const screenY = gridRow * GRID_PITCH * zoom + pan.y;
```

### Adding to Store
```typescript
// Always use the store actions
const { addComponent, addStrip } = useStripboardStore();

addComponent({
  id: `comp-${Date.now()}`,
  reference: 'U1',
  definitionId: 'dip-8',
  position: { row: 10, col: 20 },
  rotation: 0,
  pins: [...],
});
```

### ID Generation
```typescript
// Simple unique IDs
const id = `${type}-${Date.now()}`;
// Or use a counter in the store
```

## Next Steps

I recommend building features in this order:

1. **Component Placement** (most important, unlocks everything else)
2. **Strip Drawing** (core functionality)
3. **Wire Routing** (completes manual routing)
4. **Break Strip** (finishing touch)
5. **Export SVG** (share your work)
6. **Netlist Import** (KiCad integration)

## Need Help?

Ask Cursor questions like:
- "How do I implement [feature] in this codebase?"
- "What's the best way to [do X] with Konva?"
- "Show me how to add [Y] to the state management"

The codebase is well-structured and typed, so Cursor should be able to help effectively!

Happy coding! 🚀
