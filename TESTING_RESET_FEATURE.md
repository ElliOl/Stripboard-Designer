# Testing Reset to Default Feature

## Test Scenario: Invisible Component Body

### Problem
When a component has rendering issues (invisible body), users can only right-click on the pins, not the body.

### Expected Behavior
Right-clicking on **any pin** of a component should:
1. Detect the parent component
2. Show the context menu
3. Display "Reset to Default" option if applicable

### Why It Should Work

The pin `Circle` elements are rendered inside the component `Group`:

```tsx
<Group name={`component:${component.id}`}>
  {/* Body rendering (may be invisible due to bug) */}
  
  {/* Pins - these are always visible */}
  {definition.pins.map((pinDef, i) => (
    <Circle
      key={`pin-${pinDef.number}`}
      x={...}
      y={...}
      radius={...}
    />
  ))}
</Group>
```

The `getItemIdFromTarget()` function walks up the tree from the clicked element:
1. User clicks on pin Circle
2. Function checks Circle.name → no match
3. Function checks Circle.parent (Group) → name starts with `component:`
4. Returns component ID

### Test Steps

1. **Create a test component with invisible body:**
   - Place a film/ceramic capacitor
   - Move its pins in Edit Component dialog
   - Save and reload the file
   - Body should be invisible (if using old code)

2. **Test right-click on pin:**
   - Right-click on any pin of the invisible component
   - Context menu should appear
   - "Reset to Default" option should be visible

3. **Reset the component:**
   - Click "Reset to Default"
   - Component body should become visible again
   - Pins should return to original positions
   - Wires should remain connected

### If It Doesn't Work

Check browser console for errors and verify:
- Event propagation isn't stopped prematurely
- Pin circles don't have `listening={false}`
- Component Group has the correct `name` attribute
- `getItemIdFromTarget` is finding the parent Group

### Alternative Approach (if needed)

If the current implementation doesn't work, we could:
1. Add explicit `name` attributes to pin Circles
2. Modify `getItemIdFromTarget` to parse pin names like `pin:component-id:pin-number`
3. Extract component ID from pin name

But this shouldn't be necessary as the current tree-walking approach is correct.
