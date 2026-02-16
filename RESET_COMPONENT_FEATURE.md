# Reset Component to Default Feature

## Overview
This feature allows users to reset components back to their original library definitions. This is useful for:
- Fixing components from old saves that may have rendering issues
- Reverting custom pin modifications
- Recovering from the film/ceramic capacitor bug (now fixed)
- Resetting any component that might be corrupted or broken

## How to Use

1. **Right-click** on any component (on the body OR on any pin)
2. Look for the **"Reset to Default"** option in the context menu
3. Click it to restore the component to its original library definition

## What Gets Reset

When you reset a component:
- ✅ Pin positions are restored to the original library layout
- ✅ Component definition is changed back to the base definition
- ✅ Net connections are **preserved** (wires stay connected)
- ✅ Component position and rotation are **preserved**
- ✅ Component reference (e.g., C1, R5) is **preserved**
- ✅ Component value is **preserved**

## When the Option Appears

The "Reset to Default" option appears for **ALL library components**, including:

- ✅ Resistors, capacitors, diodes, LEDs
- ✅ ICs, transistors, regulators
- ✅ Switches, potentiometers, encoders
- ✅ Any component from the component library

The option is **NOT** shown for:
- ❌ User-created generic components (starting with `generic-`)
- ❌ User-created custom components (starting with `custom-`)

This ensures you can reset any library component that might be broken from old saves, regardless of whether it has custom pin modifications or matches a specific type.

## Technical Details

### Custom Variant Detection
Components get custom variant IDs when:
- Pins are manually moved/dragged in the Edit Component dialog
- The system creates a variant like `capacitor-rect-custom-abc123`

### Affected Types
The following component types always show the reset option because they were affected by the subtype detection bug:
- Film/ceramic capacitors (`capacitor-rect`)
- Standard capacitors (`capacitor`)
- Wide capacitors (`capacitor-wide`)
- Zener diodes (`zener-diode`, `zener`)

### Base Definition Resolution
The system finds the base definition by:
1. Removing `-custom-...` suffix from the definition ID
2. If no suffix exists, uses the definition ID as-is
3. Looking up the original definition in the library
4. Rebuilding the component with the original pin layout

### Example Transformations
```
Before: capacitor-rect-custom-xyz789  →  After: capacitor-rect
Before: capacitor-rect                 →  After: capacitor-rect (rebuilt)
Before: zener-diode-custom-abc123     →  After: zener-diode
```

## Related Bug Fix

This feature was implemented alongside a fix for a bug where film/ceramic capacitors (and some other components) would lose their body rendering after:
1. Moving pins
2. Saving the file
3. Reloading the file

The bug was caused by exact string matching (`===`) instead of substring matching (`.includes()`) in the component subtype detection function.
