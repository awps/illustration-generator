# Compose Toolbar + Undo/Redo

## Problem

The compose editor has no undo/redo capability — mistakes are irreversible. Element controls (gradient, text) live in the sidebar, which gets long. There's no sticky toolbar for quick access to common actions.

## Design

### Header Bar (sticky, always visible)

A horizontal toolbar above the canvas area. Three zones:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Undo][Redo]  │  [context-sensitive element controls]  │  [⬇ JPG]  │
│    left       │              center                    │   right    │
└──────────────────────────────────────────────────────────────────────┘
```

- **Left:** Undo and Redo icon buttons. Disabled when stack is empty.
- **Center:** Context-sensitive controls based on active layer type:
  - **Background selected:** Gradient presets (small swatches), linear/radial toggle, angle slider (compact), two color pickers — all horizontal.
  - **Title/Text selected:** Font family dropdown, font size (number input, not slider), color picker, bold/italic toggles, align left/center/right buttons — all horizontal.
  - **Nothing or illustration selected:** Empty.
- **Right:** Download JPG button (moved from sidebar footer).

Separated by `Separator` (vertical orientation) between zones.

### Sidebar Layout Change

- **Top (scrollable):** TemplatePicker (always visible)
- **Bottom (sticky, max-h-[200px]):** LayerPanel with "+" dropdown, internal overflow-y-auto

The download button and element controls (GradientControls, TextControls) are removed from the sidebar entirely.

### Undo/Redo — Canvas JSON Snapshots

Fabric.js v7 has no built-in undo/redo. We implement it with canvas state snapshots.

**Custom properties setup (Fabric.js v7):**

Fabric v7 requires setting `FabricObject.customProperties` at module level for custom properties to survive serialization:

```ts
import { FabricObject } from 'fabric'
FabricObject.customProperties = ['layerId', 'layerType', 'layerName']
```

Also extend `SerializedObjectProps` in `layer-types.ts`:
```ts
declare module 'fabric' {
  interface SerializedObjectProps {
    layerId?: string
    layerType?: LayerType
    layerName?: string
  }
}
```

This ensures `canvas.toJSON()` includes layer metadata and `loadFromJSON()` restores it on each object.

**History stack:**
- `undoStack: string[]` — serialized canvas states (via `canvas.toJSON()`)
- `redoStack: string[]` — states popped by undo
- Max 50 entries. When exceeded, oldest entry is dropped.

**When to snapshot:**
- `object:modified` — fires on mouse-up after drag/resize/rotate
- After programmatic changes: `addText()`, `removeLayer()`, `moveLayer()`, `renameLayer()`, `setLayerVisibility()`, `setLayerLocked()`, `applyTemplate()`, `setGradient()`, text property changes via `snapshot()` handle method
- Gradient control changes — **debounced at 300ms** to avoid stack pollution from slider drags
- NOT during continuous drag (object:moving/scaling) — only the final state
- Always call `canvas.discardActiveObject()` before taking a snapshot to avoid serializing editing state

**Clear redo:** Any new change clears the redo stack (standard behavior).

**Undo/Redo restore flow (async):**

`loadFromJSON()` is async — images are re-fetched from their stored `src`. The full restore flow:

```ts
async function restore(snapshot: string) {
  const canvas = fabricRef.current
  if (!canvas) return
  canvas.discardActiveObject()
  await canvas.loadFromJSON(snapshot)

  // Re-link refs by matching layerId on deserialized objects
  bgRef.current = null
  imgRef.current = null
  titleRef.current = null
  for (const obj of canvas.getObjects()) {
    if (obj.layerType === 'background') bgRef.current = obj as Rect
    if (obj.layerType === 'illustration') imgRef.current = obj as FabricImage
    if (obj.layerType === 'title') titleRef.current = obj as Textbox
  }

  // Restore out-of-band state from canvas
  const bg = bgRef.current
  if (bg) {
    sizeRef.current = { width: bg.width ?? DEFAULT_WIDTH, height: bg.height ?? DEFAULT_HEIGHT }
    // Extract gradient params from deserialized Rect fill
    const fill = bg.fill
    if (fill instanceof Gradient) {
      gradientRef.current = extractGradientState(fill)
      onGradientApplied?.(gradientRef.current.type, gradientRef.current.angle, gradientRef.current.colors)
    }
  }

  // Restore text count
  textCountRef.current = canvas.getObjects().filter(o => o.layerType === 'text').length

  // Fit to container and notify
  fitToContainer(canvas, sizeRef.current.width, sizeRef.current.height)
  canvas.renderAll()
  fireLayers()
  onSelectionChange?.(null, null, undefined)
  onHistoryChange?.()
}
```

A small `extractGradientState(fill: Gradient): GradientState` helper parses `type`, `coords` (to compute angle), and `colorStops` (to extract colors) back from the deserialized Gradient object.

**Image re-fetching:** The illustration `src` is the proxied same-origin URL (`/images/generations/...`), so browser caching handles repeated loads. There may be a brief flicker — acceptable for now.

### Keyboard Shortcuts

- **Cmd/Ctrl+Z** — undo
- **Cmd/Ctrl+Shift+Z** — redo
- **Delete / Backspace** — delete selected element (text layers only, not background/illustration/title)

Listener: single `keydown` handler on `document`, added in a `useEffect` in `canvas-editor.tsx` with proper cleanup in the return function. Suppressed when:
- `document.activeElement` is an `input`, `textarea`, or `select`
- Any Textbox on canvas has `isEditing === true`

### CanvasEditorHandle Extensions

```ts
undo: () => void
redo: () => void
canUndo: () => boolean
canRedo: () => boolean
snapshot: () => void  // manually trigger a snapshot (for external changes like text prop edits)
```

### CanvasEditorProps Extensions

```ts
onHistoryChange?: () => void  // fired after undo/redo/snapshot — page updates canUndo/canRedo state
```

The page stores `canUndo`/`canRedo` as React state, updated inside the `onHistoryChange` callback by calling the handle's `canUndo()`/`canRedo()` methods.

## Files

### New
- `apps/app/src/app/components/compose/compose-toolbar.tsx` — The sticky header bar. Receives undo/redo handlers + disabled state, selected layer type, and renders the appropriate center controls inline. Download handler.

### Modify
- `apps/app/src/app/lib/layer-types.ts` — Add `SerializedObjectProps` module augmentation for layerId/layerType/layerName.
- `apps/app/src/app/components/compose/canvas-editor.tsx` — Set `FabricObject.customProperties`. Add history stack (undoStack, redoStack refs), snapshot logic, async undo/redo with ref re-linking and out-of-band state restore, `extractGradientState` helper, keyboard event listener with cleanup, `onHistoryChange` prop, extend handle with undo/redo/canUndo/canRedo/snapshot.
- `apps/app/src/app/components/compose/gradient-controls.tsx` — Refactor to horizontal toolbar layout. Preset swatches in a compact row, inline type toggle, compact angle slider, color pickers side by side. Same props.
- `apps/app/src/app/components/compose/text-controls.tsx` — Refactor to horizontal toolbar layout. Font dropdown, compact size input, color picker, bold/italic/alignment all inline. Same props.
- `apps/app/src/app/pages/compose.tsx` — Remove controls from sidebar scrollable area. Add `ComposeToolbar` above canvas. Sidebar footer becomes sticky LayerPanel (max-h-[200px]) instead of download button. Track `canUndo`/`canRedo` state via `onHistoryChange`. Call `editorRef.current?.snapshot()` after gradient/text property changes. Wire keyboard shortcuts.

## Verification

1. Make a change (move object, change gradient, edit text) → undo reverts it → redo re-applies
2. Cmd+Z / Cmd+Shift+Z work from anywhere except when typing in inputs or editing text on canvas
3. Delete key removes selected text layer, does nothing for background/illustration/title
4. Header bar shows correct controls when switching between layers
5. Header bar stays visible when sidebar scrolls
6. LayerPanel is sticky at sidebar bottom, scrollable within 200px
7. Undo across template changes works (reverts to previous template state)
8. History caps at 50 — no memory leak
9. After undo/redo, gradient controls reflect restored gradient state
10. After undo/redo, selection is cleared and layer panel updates correctly
11. Undo after rename/visibility/lock change reverts that change
12. Rapid gradient slider drags produce at most one snapshot (debounced)
