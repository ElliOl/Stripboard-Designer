# Stripboard Designer - Architecture Overview

## What You're Getting

A fully scaffolded React + TypeScript + Vite project ready for development in Cursor.

```
┌─────────────────────────────────────────────────────────┐
│                    STRIPBOARD DESIGNER                  │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐    │
│  │              Toolbar (Built ✅)                │    │
│  │  [Select] [Pan] [Strip] [Wire] ... [Export]   │    │
│  └────────────────────────────────────────────────┘    │
│  ┌──────────────────────┬──────────────────────────┐   │
│  │                      │                          │   │
│  │   Canvas (Built ✅)  │  Sidebar (Built ✅)      │   │
│  │                      │                          │   │
│  │   • Grid rendered    │  Component Library       │   │
│  │   • Zoom/pan works   │  ┌────────────────────┐  │   │
│  │   • Strips render    │  │ ICs                │  │   │
│  │   • Components ok    │  │ • DIP-8            │  │   │
│  │                      │  │ • DIP-14           │  │   │
│  │   [Drag to pan]      │  │ • DIP-16           │  │   │
│  │   [Scroll to zoom]   │  │                    │  │   │
│  │                      │  │ Passives           │  │   │
│  │                      │  │ • Resistor         │  │   │
│  │                      │  │ • Capacitor        │  │   │
│  │                      │  └────────────────────┘  │   │
│  └──────────────────────┴──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

```
Frontend Framework
├── React 18 (UI library)
├── TypeScript (type safety)
└── Vite (build tool, dev server)

Canvas Rendering
├── Konva (2D canvas library)
└── React-Konva (React bindings)

State Management
└── Zustand (lightweight, simple)

Styling
├── Tailwind CSS (utility classes)
└── CSS Variables (design tokens)

Icons
└── Lucide React (beautiful icons)
```

## File Structure Explained

```
stripboard-designer/
│
├── 📁 src/
│   ├── 📁 components/
│   │   ├── 📁 Canvas/              ← Where the magic happens
│   │   │   ├── StripboardCanvas.tsx  Main canvas component
│   │   │   ├── Grid.tsx              Renders stripboard holes
│   │   │   ├── Strip.tsx             Renders copper strips
│   │   │   └── Component.tsx         Renders IC/resistor/etc
│   │   │
│   │   ├── 📁 Toolbar/             ← Tool selection
│   │   │   └── Toolbar.tsx           Tool buttons, zoom controls
│   │   │
│   │   └── 📁 Sidebar/             ← Component library
│   │       └── ComponentLibrary.tsx  Drag-and-drop parts
│   │
│   ├── 📁 lib/
│   │   └── types.ts               ← All TypeScript types
│   │
│   ├── 📁 store/
│   │   └── stripboard.ts          ← Zustand state management
│   │
│   ├── 📁 styles/
│   │   ├── tokens.css             ← Design tokens (colors, spacing)
│   │   └── globals.css            ← Global styles
│   │
│   ├── App.tsx                    ← Main app component
│   └── main.tsx                   ← Entry point
│
├── 📁 public/
│   └── 📁 components/
│       └── library.json           ← Component definitions (DIP-8, etc)
│
├── 📄 Configuration Files
│   ├── package.json               ← Dependencies
│   ├── tsconfig.json              ← TypeScript config
│   ├── vite.config.ts             ← Vite config
│   ├── tailwind.config.js         ← Tailwind config
│   └── postcss.config.js          ← PostCSS config
│
├── 📖 Documentation
│   ├── README.md                  ← Project overview
│   └── DEVELOPMENT.md             ← Development guide for Cursor
│
└── 🚀 setup.sh                    ← Quick start script
```

## Data Flow

```
User Interaction
      ↓
UI Component (React)
      ↓
Zustand Store Action
      ↓
State Update
      ↓
Re-render
      ↓
Konva Canvas Update
```

Example:
```
User clicks "Route Strip" tool
      ↓
Toolbar.tsx calls setActiveTool('routeStrip')
      ↓
Store updates activeTool state
      ↓
StripboardCanvas.tsx re-renders with new tool
      ↓
Canvas handles clicks differently based on tool
```

## Key Types (from types.ts)

```typescript
// Main entities
Component        - A placed IC, resistor, etc
Strip            - Horizontal copper trace
Wire             - Jumper wire connection
Net              - Electrical net (e.g., "VCC", "GND")
Pin              - Component pin with position

// UI state
ToolType         - Current tool (select, pan, routeStrip, etc)
GridPosition     - Row/col on the stripboard grid
Point            - x/y screen coordinates
```

## What's Already Working

✅ **Canvas System**
   - Interactive Konva canvas
   - Zoom with mouse wheel
   - Pan by dragging
   - Grid of holes rendered

✅ **Component System**
   - Component library loaded from JSON
   - Component definitions (DIP-8, DIP-14, etc)
   - Visual rendering with pins
   - Sidebar with drag-ready components

✅ **Strip System**
   - Strip rendering with copper color
   - Selection highlighting
   - Break markers supported

✅ **State Management**
   - Zustand store configured
   - Actions for add/remove/update
   - Tool selection working

✅ **UI Foundation**
   - Toolbar with tool buttons
   - Component library sidebar
   - Responsive layout
   - Design token system

## What Needs Building

🚧 **Interactive Tools** (highest priority)
   - Component placement (drag from library → drop on canvas)
   - Strip drawing tool
   - Wire routing tool
   - Break strip tool

🚧 **Netlist Integration**
   - KiCad .net file parser
   - Import dialog
   - Ratsnest generation
   - Net connectivity tracking

🚧 **Export**
   - SVG export
   - PDF generation
   - Project save/load (JSON)

🚧 **Polish**
   - Undo/redo
   - Keyboard shortcuts
   - Layer visibility toggles
   - Properties panel

## How to Build with Cursor

### Example: Implementing Component Drag & Drop

1. **Ask Cursor:**
   ```
   "I need to implement drag-and-drop from ComponentLibrary to 
   StripboardCanvas. When a component is dropped, convert the 
   screen position to grid coordinates and create a Component 
   instance. The component should snap to the nearest grid hole."
   ```

2. **Cursor will suggest:**
   - Adding `onDragOver` and `onDrop` handlers to StripboardCanvas
   - Converting screen coordinates to grid position
   - Creating the component with proper pin positions
   - Calling `addComponent()` from the store

3. **You iterate:**
   - Test the feature
   - Ask Cursor to refine (e.g., "show a preview while dragging")
   - Commit when it works

### Example Prompts for Cursor

**For Strip Drawing:**
```
"When activeTool is 'routeStrip', let the user:
1. Click a grid hole to start
2. Drag horizontally to set strip length
3. Show a semi-transparent preview strip while dragging
4. On release, add the strip to the store
Only allow horizontal strips, snap to grid rows."
```

**For Netlist Import:**
```
"Create a function parseKiCadNetlist(xmlString) that:
1. Parses KiCad XML netlist format
2. Extracts components with their references and footprints
3. Extracts nets with their connections
4. Returns { components: Component[], nets: Net[] }
Match the types from lib/types.ts"
```

## Design Tokens (Customization)

All visual styling uses CSS variables in `src/styles/tokens.css`:

```css
/* Change these to customize appearance */
--color-strip: #c87533;      /* Copper color */
--color-wire: #3b82f6;       /* Wire color */
--color-component: #8b5cf6;  /* IC color */
--grid-pitch: 25.4px;        /* Hole spacing */
```

## Development Workflow

1. **Start dev server:** `npm run dev`
2. **Open in Cursor:** Work on a feature
3. **Save:** Hot reload shows changes instantly
4. **Test:** Interact with the canvas
5. **Iterate:** Refine with Cursor's help
6. **Commit:** Once feature works

## Deployment

When ready to deploy:

```bash
# Build for production
npm run build

# Deploy to Vercel (easiest)
npm install -g vercel
vercel

# Or deploy dist/ folder to:
# - Netlify
# - GitHub Pages
# - Any static host
```

## Resources

- **Konva Docs:** https://konvajs.org/docs/
- **React-Konva:** https://konvajs.org/docs/react/
- **Zustand:** https://github.com/pmndrs/zustand
- **Tailwind:** https://tailwindcss.com/docs

## Quick Reference

**Common Store Actions:**
```typescript
const {
  addComponent,
  removeComponent,
  addStrip,
  updateStrip,
  setActiveTool,
  selectItem,
} = useStripboardStore();
```

**Grid Math:**
```typescript
// Screen to grid
const col = Math.round((x - pan.x) / zoom / GRID_PITCH);
const row = Math.round((y - pan.y) / zoom / GRID_PITCH);
```

**Get component definition:**
```typescript
const definition = componentDefinitions.find(
  d => d.id === component.definitionId
);
```

---

**You're all set! Happy coding! 🚀**

Open the project in Cursor and start building features.
Check DEVELOPMENT.md for detailed guidance on implementing each tool.
