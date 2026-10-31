# Stripboard Designer: rules for agents

Stripboard Designer is a browser app for laying out stripboard (Veroboard) circuits from KiCad netlists. It is React + TypeScript + Vite, renders with Konva, and keeps all state in one Zustand store. The autorouter and the Vero project import come from Vero Designer (blazethablunt/VeroDesigner), used with the author's permission. Stripboard Designer is the owner's own app and is not derived from VeroRoute.

## Roles

**Orchestrator** (the main session). Plans the work and splits it into pieces that touch different files. Briefs subagents, checks their results, runs the auditor before pushing, and commits. It does not do large multi-file implementation itself.

**Fixer** (`.claude/agents/fixer.md`). Fixes one scoped defect. Edits only the files it was given. Adds or updates tests for what it changes. Does not commit, push or change git state, because other fixers may be working in the same checkout at the same time.

**Builder** (`.claude/agents/builder.md`). Builds a new feature end to end, such as the autorouter. Plans first, keeps logic in testable `src/lib/` modules and heavy work in a Web Worker, adds tests, and checks the feature in the browser. Same git rules as a fixer.

**Auditor** (`.claude/agents/auditor.md`). Audits and checks the app before any push. Runs every check, reviews the diff, and exercises the app. Reports findings ranked by severity. It reports and does not fix.

**Models.** Subagents run on Sonnet. Use Opus only when a task genuinely needs it, and ask the owner first.

## Done criteria

A change is done when all of these pass:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build:single
```

For anything touching Vero import, also run `npm run check:vero -- fixtures/vero-booster.json` (and `vero-example.json`). It must report `OK`.

## Conventions

- **Coordinates:** strips run horizontally. `row` is the strip and `col` is the hole along it. `Component.pins[].position` is absolute and is what gets rendered. `Component.position` plus `rotation` and the definition are used when re-deriving pins (rotate, reset, pin drag).
- **Pin numbering follows KiCad:** diode and LED cathode is pin 1, electrolytic + is pin 1, and DIP packages number counter-clockwise seen from above.
- **Body type** is chosen from the definition id (`getComponentSubtype` in `Component.tsx`). Derived definitions must keep the original id as a prefix, for example `capacitor-rect-custom-…`.
- **Strip segments:** always use `getStripSegments` from `src/lib/strip-segments.ts`. Never re-implement cut handling. Drill cuts are also mirrored into the legacy `breaks` list.
- **Undoable edits** call `saveToHistory()` before changing state.
- **Saved projects** must reopen with exactly the same board. Anything stored in state that the user created belongs in `exportProject` and `importProject`.
- **Keep the single-file build working:** no runtime `fetch` of local files and no assets outside the bundle.
- **Code style:** match the surrounding code's comment density, naming and idiom.

## Writing

READMEs and user-facing text are short and plain. Say what the app does and how to use it, with no emojis.

## Git

Work on a branch, never directly on `main`. Only the orchestrator commits, and only after the done criteria pass. Pushes happen only after an auditor pass and with the owner's go-ahead.
