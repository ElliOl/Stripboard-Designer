# Stripboard Designer

Design stripboard (Veroboard) layouts from your KiCad schematics.

Import a KiCad netlist and every part arrives with its connections. Place the parts on the board, add wire links and track cuts, and the app shows you what is still unconnected and where you have made a short.

## Running it

Open `Stripboard-Designer.html` in any modern browser. That one file is the whole app: it works offline and needs no install. (Build it yourself with `npm run build:single`; it ends up in `dist-single/`.)

## How it works

1. **Import your circuit.** In KiCad, export a netlist (File > Export > Netlist), then click the netlist button in the toolbar and choose the `.net` file. Each part is added to the board with its nets, and power symbols become named nets.
2. **Place the parts.** Drag them onto the board and press R to rotate. Lead spacing on resistors, diodes and similar parts can be stretched by dragging a pin.
3. **Connect and cut.** Parts sitting on the same copper strip are connected. Draw wire links between strips (W), and break strips with drill cuts (X) or slice cuts between holes (S).
4. **Check your work.** Ratsnest lines show connections that still need making. Shorts between different nets are flagged in red. The Inspector lists unconnected nets; click one to jump to it.
5. **Save.** Projects save and open as `.json` files.

If the schematic changes, import the netlist again and choose **Update existing board**. Your placement is kept, and only values, footprints or nets are updated.

### Other features

- **Vero Designer projects:** open a project saved from Vero Designer and its generated layout is converted into an editable board. Off-board parts such as panel pots become labelled pads at the board edge.
- **Reference images:** place a photo, an image or a PDF page behind the board to trace an existing layout.
- **Group by Connectivity:** clusters freshly imported parts by the nets they share, so related parts start out close together.
- **Multiple boards:** split a design across several boards in one project.
- **Layers:** show or hide parts, wires, strips, net colours, cuts, labels and errors.

### Shortcuts

| Key | Action |
| --- | --- |
| V / W / X / S | Select, wire, drill cut, slice cut |
| R | Rotate selected |
| N | Toggle ratsnest |
| Delete | Delete selected |
| Cmd+Z / Cmd+Shift+Z | Undo / redo |
| Scroll | Zoom |
| Middle or right drag | Pan |
| H or ? | Show all shortcuts |

## Development

```bash
npm install
npm run dev            # dev server at http://localhost:5173
npm run build:single   # single offline HTML file in dist-single/
npm run build          # regular build for hosting
```

## Credits

The Vero Designer import (and the autorouter being added) uses work from [Vero Designer](https://github.com/blazethablunt/VeroDesigner) by blazethablunt, with permission.

## License

MIT
