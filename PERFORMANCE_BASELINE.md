# Performance Optimization - Baseline Metrics

## How to Measure

1. Add `?perf` to the URL to enable FPS overlay: `http://localhost:5173/?perf`
2. Use Chrome DevTools Performance tab:
   - Record while performing test scenarios
   - Look for long tasks (>50ms) in Main thread
   - Check FPS stability during interactions

## Test Scenarios

### Scenario A: Pan/Zoom on Medium Board
- Board size: 30x50 (default)
- Action: Pan around the board, zoom in/out
- Metric: FPS during interaction

### Scenario B: Place Component
- Action: Drag a component from library onto board
- Metric: FPS during drag, time to render

### Scenario C: Drag Selection
- Action: Select multiple items and drag them
- Metric: FPS during drag, input latency

## Baseline Results (Before Optimization)

Record your baseline measurements here after testing with `?perf` flag.

### Phase 0 - Initial State
- Date: [Record date when you capture baseline]
- FPS during pan/zoom: [Record FPS]
- FPS during component drag: [Record FPS]
- FPS during selection drag: [Record FPS]
- Chrome DevTools notes: [Record any long tasks or bottlenecks]

---

## After Phase 1 - Store Selectors + Grid Batching
- Date: 
- FPS during pan/zoom: 
- FPS during component drag: 
- FPS during selection drag: 
- Improvement: 

---

## After Phase 2 - Viewport Culling + LOD
- Date: 
- FPS during pan/zoom: 
- FPS during component drag: 
- FPS during selection drag: 
- Improvement: 

---

## After Phase 3 - React.memo + Deferred Compute
- Date: 
- FPS during pan/zoom: 
- FPS during component drag: 
- FPS during selection drag: 
- Improvement: 

---

## After Phase 4 - Bundle Optimization
- Date: 
- Initial bundle size (gzipped): 
- Lighthouse Performance Score: 
- Time to Interactive: 

---

## After Phase 5 - Adaptive Quality
- Date: 
- Notes on adaptive quality behavior: 

---

## Final Results - Phase 6
- Date: 
- Overall FPS improvement: 
- Bundle size reduction: 
- User experience notes: 
