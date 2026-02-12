# Stripboard Designer

An interactive web-based tool for designing stripboard layouts from KiCad netlists.

## Features

- 🎨 **Interactive Canvas** - Konva-powered visual editing with zoom and pan
- 🔧 **Component Library** - Pre-built footprints for ICs, resistors, capacitors, and more
- 📐 **Grid-based Layout** - Standard 0.1" (2.54mm) stripboard pitch
- 🎯 **Manual Routing** - Full control over strip and wire placement
- ⚡ **Ratsnest** - Visual connection guides
- 💾 **Import/Export** - KiCad netlist support (coming soon)
- 🎨 **Design Tokens** - Customizable theme using CSS variables

## Tech Stack

- **React 18** + **TypeScript** - Modern, type-safe UI
- **Vite** - Lightning-fast dev server and build tool
- **Konva** + **React-Konva** - High-performance 2D canvas rendering
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first styling with custom design tokens
- **Lucide Icons** - Beautiful, consistent icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The app will be available at `http://localhost:5173`

## Project Structure

```
stripboard-designer/
├── src/
│   ├── components/
│   │   ├── Canvas/          # Konva canvas components
│   │   │   ├── StripboardCanvas.tsx
│   │   │   ├── Grid.tsx
│   │   │   ├── Strip.tsx
│   │   │   └── Component.tsx
│   │   ├── Toolbar/         # Tool selection and controls
│   │   └── Sidebar/         # Component library panel
│   ├── lib/
│   │   └── types.ts         # TypeScript type definitions
│   ├── store/
│   │   └── stripboard.ts    # Zustand state management
│   ├── styles/
│   │   ├── tokens.css       # Design tokens (colors, spacing, etc.)
│   │   └── globals.css      # Global styles
│   └── App.tsx
├── public/
│   └── components/
│       └── library.json     # Component library definitions
└── package.json
```

## Current Features

### Canvas Controls
- **Scroll** to zoom in/out
- **Drag** to pan (in Select or Pan mode)
- **Click** components/strips to select
- **Wheel + Drag** for precision zooming

### Tools Available
- ✅ Select - Click to select items
- ✅ Pan - Drag to move viewport
- ⏳ Place Component (drag from library - coming soon)
- ⏳ Route Strip - Draw copper strips
- ⏳ Route Wire - Draw jumper wires
- ⏳ Break Strip - Cut copper traces

### Component Library
- DIP-8, DIP-14, DIP-16 ICs
- Axial resistors
- Radial capacitors
- More components coming soon!

## Roadmap

### Phase 1: Core Functionality ✅
- [x] Canvas with grid rendering
- [x] Zoom and pan controls
- [x] Component library system
- [x] Basic state management

### Phase 2: Interactive Tools (In Progress)
- [ ] Component placement via drag-and-drop
- [ ] Strip drawing tool
- [ ] Wire routing tool
- [ ] Strip break/link tools
- [ ] Component leg extension

### Phase 3: Netlist Integration
- [ ] KiCad netlist parser
- [ ] Automatic ratsnest generation
- [ ] Net highlighting
- [ ] Connection validation

### Phase 4: Export & Sharing
- [ ] SVG export
- [ ] PDF generation
- [ ] PNG/image export
- [ ] Project save/load (JSON)
- [ ] BOM generation

### Phase 5: Advanced Features
- [ ] Undo/redo
- [ ] Keyboard shortcuts
- [ ] Grid snapping options
- [ ] Layer visibility controls
- [ ] Design rule checking
- [ ] Cloud project storage

## Customization

### Design Tokens

Modify `src/styles/tokens.css` to customize colors, spacing, and other design aspects:

```css
:root {
  --color-strip: #c87533;    /* Copper strip color */
  --color-wire: #3b82f6;     /* Wire color */
  --grid-pitch: 25.4px;      /* Grid spacing */
  /* ... and more */
}
```

### Component Library

Add new components by editing `public/components/library.json`:

```json
{
  "id": "my-component",
  "name": "Custom Component",
  "category": "IC",
  "footprint": {
    "type": "DIP",
    "dimensions": { "rows": 2, "cols": 4 }
  },
  "pins": [...]
}
```

## Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

### Deploy to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Deploy to GitHub Pages

```bash
npm run build
# Configure base path in vite.config.ts
# Deploy dist/ folder
```

## Contributing

This is a personal project, but suggestions and bug reports are welcome! Feel free to open issues or submit PRs.

## License

MIT License - feel free to use this for your own projects!

## Acknowledgments

- Inspired by VeroRoute but designed to be simpler and more intuitive
- Built for the maker community who love stripboard prototyping
- Designed to work seamlessly with KiCad workflows

---

**Happy stripboard designing! 🔌✨**
