# Compose Toolbar + Undo/Redo Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo/redo capability and a sticky header toolbar to the compose editor, moving element controls from the sidebar to the toolbar.

**Architecture:** Canvas JSON snapshots (toJSON/loadFromJSON) with a 50-entry history stack. New `ComposeToolbar` component renders undo/redo buttons, context-sensitive element controls, and download button in a sticky header. Sidebar retains only TemplatePicker (scrollable) and LayerPanel (sticky bottom, max 200px).

**Tech Stack:** Fabric.js v7, React, shadcn/ui (Separator, Button, Slider, Input), Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-18-compose-toolbar-undo-redo-design.md`

---

## Chunk 1: Foundation — Serialization + History Engine

### Task 1: Add SerializedObjectProps augmentation to layer-types.ts

**Files:**
- Modify: `apps/app/src/app/lib/layer-types.ts`

- [ ] **Step 1: Add SerializedObjectProps to the existing module augmentation**

In the existing `declare module 'fabric'` block, add a second interface augmentation below `FabricObject`:

```ts
  interface SerializedObjectProps {
    layerId?: string
    layerType?: LayerType
    layerName?: string
  }
```

The full augmentation block becomes:
```ts
declare module 'fabric' {
  interface FabricObject {
    layerId?: string
    layerType?: LayerType
    layerName?: string
  }
  interface SerializedObjectProps {
    layerId?: string
    layerType?: LayerType
    layerName?: string
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit -p apps/app/tsconfig.app.json`
Expected: no errors

---

### Task 2: Add history stack + undo/redo engine to canvas-editor.tsx

This is the core task. It adds the snapshot/restore machinery, keyboard shortcuts, and handle extensions.

**Files:**
- Modify: `apps/app/src/app/components/compose/canvas-editor.tsx`

- [ ] **Step 1: Add FabricObject.customProperties and imports**

At the top of the file, after existing imports, add:
```ts
import { FabricObject } from 'fabric'
```

Right after the imports (before the `CanvasEditorHandle` interface), add:
```ts
FabricObject.customProperties = ['layerId', 'layerType', 'layerName']
```

Note: `FabricObject` may already be imported via the existing `fabric` import. If so, just add it to the destructured import:
```ts
import { Canvas, Rect, FabricImage, Gradient, Textbox, FabricObject } from 'fabric'
```

- [ ] **Step 2: Add extractGradientState helper**

Below the existing `applyGradient` function, add:
```ts
function extractGradientState(gradient: Gradient<'linear' | 'radial'>): GradientState {
  const colors = (gradient.colorStops ?? [])
    .sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
    .map((s) => s.color)

  if (gradient.type === 'radial') {
    return { type: 'radial', angle: 0, colors }
  }

  // Compute angle from coords
  const coords = gradient.coords as { x1: number; y1: number; x2: number; y2: number }
  const dx = (coords.x2 ?? 0.5) - (coords.x1 ?? 0.5)
  const dy = (coords.y2 ?? 0.5) - (coords.y1 ?? 0.5)
  const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI)

  return { type: 'linear', angle: ((angle % 360) + 360) % 360, colors }
}
```

- [ ] **Step 3: Add onHistoryChange to CanvasEditorProps**

```ts
interface CanvasEditorProps {
  imageUrl: string
  initialWidth: number
  initialHeight: number
  onSelectionChange?: (type: 'text' | 'image' | null, object: any, layerId?: string) => void
  onLayersChange?: (layers: Layer[]) => void
  onGradientApplied?: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  onHistoryChange?: () => void  // NEW
}
```

Destructure it in the component:
```ts
({ imageUrl, initialWidth, initialHeight, onSelectionChange, onLayersChange, onGradientApplied, onHistoryChange }, ref) => {
```

- [ ] **Step 4: Add history stack refs**

After `pendingTitleConfig` ref, add:
```ts
    const undoStackRef = useRef<string[]>([])
    const redoStackRef = useRef<string[]>([])
    const isRestoringRef = useRef(false)
```

- [ ] **Step 5: Add takeSnapshot and restore functions**

After the `positionTitle` callback, add:

```ts
    const takeSnapshot = useCallback(() => {
      const canvas = fabricRef.current
      if (!canvas || isRestoringRef.current) return
      const json = JSON.stringify(canvas.toJSON())
      undoStackRef.current.push(json)
      if (undoStackRef.current.length > 50) undoStackRef.current.shift()
      redoStackRef.current = []
      onHistoryChange?.()
    }, [onHistoryChange])

    const restore = useCallback(async (snapshot: string) => {
      const canvas = fabricRef.current
      if (!canvas) return
      isRestoringRef.current = true
      canvas.discardActiveObject()
      await canvas.loadFromJSON(snapshot)

      // Re-link refs
      bgRef.current = null
      imgRef.current = null
      titleRef.current = null
      for (const obj of canvas.getObjects()) {
        if (obj.layerType === 'background') bgRef.current = obj as Rect
        if (obj.layerType === 'illustration') imgRef.current = obj as FabricImage
        if (obj.layerType === 'title') titleRef.current = obj as Textbox
      }

      // Restore out-of-band state
      const bg = bgRef.current
      if (bg) {
        sizeRef.current = { width: bg.width ?? initialWidth, height: bg.height ?? initialHeight }
        const fill = bg.fill
        if (fill instanceof Gradient) {
          gradientRef.current = extractGradientState(fill)
          onGradientApplied?.(gradientRef.current.type, gradientRef.current.angle, gradientRef.current.colors)
        }
      }
      textCountRef.current = canvas.getObjects().filter((o) => o.layerType === 'text').length

      fitToContainer(canvas, sizeRef.current.width, sizeRef.current.height)
      canvas.renderAll()
      fireLayers()
      onSelectionChange?.(null, null, undefined)
      isRestoringRef.current = false
      onHistoryChange?.()
    }, [initialWidth, initialHeight, fitToContainer, fireLayers, onSelectionChange, onGradientApplied, onHistoryChange])
```

- [ ] **Step 6: Add object:modified event listener for auto-snapshot**

In the existing `useEffect` (the canvas init block), after the `canvas.on('object:modified', ...)` line (line ~241), add a new listener:
```ts
      canvas.on('object:modified', () => {
        takeSnapshot()
      })
```

Wait — there's already an `object:modified` handler. Fabric allows multiple listeners. Add this as a second one right after the existing one.

Also take an initial snapshot after the canvas is fully set up (after `fireLayers()` on line ~229):
```ts
      // Take initial snapshot for undo baseline
      setTimeout(() => takeSnapshot(), 0)
```

The `setTimeout` ensures it runs after the image loads asynchronously (if it loads fast) or at least captures the initial bg+title state.

- [ ] **Step 7: Add keyboard event listener**

In the same `useEffect`, before the `return` cleanup function, add:

```ts
      const handleKeyDown = (e: KeyboardEvent) => {
        // Skip when typing in inputs or editing text on canvas
        const tag = (document.activeElement?.tagName ?? '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        const textboxes = canvas.getObjects().filter((o): o is Textbox => o instanceof Textbox)
        if (textboxes.some((t) => t.isEditing)) return

        const mod = e.metaKey || e.ctrlKey

        if (mod && e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          // undo via handle — call it directly here
          const stack = undoStackRef.current
          if (stack.length === 0) return
          const current = JSON.stringify(canvas.toJSON())
          redoStackRef.current.push(current)
          const prev = stack.pop()!
          restore(prev)
        } else if (mod && e.key === 'z' && e.shiftKey) {
          e.preventDefault()
          // redo
          const stack = redoStackRef.current
          if (stack.length === 0) return
          const current = JSON.stringify(canvas.toJSON())
          undoStackRef.current.push(current)
          const next = stack.pop()!
          restore(next)
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          const active = canvas.getActiveObject()
          if (active && active.layerType === 'text') {
            e.preventDefault()
            canvas.discardActiveObject()
            canvas.remove(active)
            canvas.renderAll()
            fireLayers()
            onSelectionChange?.(null, null, undefined)
            takeSnapshot()
          }
        }
      }
      document.addEventListener('keydown', handleKeyDown)
```

In the cleanup function, add:
```ts
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('resize', handleResize)
        canvas.dispose()
        fabricRef.current = null
      }
```

- [ ] **Step 8: Add snapshot calls to existing handle methods**

In `useImperativeHandle`, add `takeSnapshot()` calls at the end of these methods (before any `return` statement):

- `setTemplate` — add `takeSnapshot()` after `canvas.renderAll()` (line ~292)
- `applyTemplate` — add `takeSnapshot()` after `fireLayers()` (line ~379)
- `setGradient` — add `takeSnapshot()` after `canvas.renderAll()` (line ~388)
- `addText` — add `takeSnapshot()` before `return layerId` (line ~413)
- `setLayerVisibility` — add `takeSnapshot()` after `fireLayers()` (line ~426)
- `setLayerLocked` — add `takeSnapshot()` after `fireLayers()` (line ~439)
- `moveLayer` — add `takeSnapshot()` after `fireLayers()` (line ~458)
- `removeLayer` — add `takeSnapshot()` after `fireLayers()` (line ~471)
- `renameLayer` — add `takeSnapshot()` after `fireLayers()` (line ~487)

- [ ] **Step 9: Extend CanvasEditorHandle with undo/redo/snapshot**

Add to the `CanvasEditorHandle` interface:
```ts
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  snapshot: () => void
```

Add implementations in `useImperativeHandle`:
```ts
      undo() {
        const canvas = fabricRef.current
        if (!canvas) return
        const stack = undoStackRef.current
        if (stack.length === 0) return
        const current = JSON.stringify(canvas.toJSON())
        redoStackRef.current.push(current)
        const prev = stack.pop()!
        restore(prev)
      },

      redo() {
        const canvas = fabricRef.current
        if (!canvas) return
        const stack = redoStackRef.current
        if (stack.length === 0) return
        const current = JSON.stringify(canvas.toJSON())
        undoStackRef.current.push(current)
        const next = stack.pop()!
        restore(next)
      },

      canUndo() {
        return undoStackRef.current.length > 0
      },

      canRedo() {
        return redoStackRef.current.length > 0
      },

      snapshot() {
        takeSnapshot()
      },
```

- [ ] **Step 10: Verify types compile**

Run: `npx tsc --noEmit -p apps/app/tsconfig.app.json`
Expected: no errors (compose.tsx may have errors since it doesn't wire `onHistoryChange` yet — that's OK, we'll fix it in Task 6)

- [ ] **Step 11: Commit**

```bash
git add apps/app/src/app/lib/layer-types.ts apps/app/src/app/components/compose/canvas-editor.tsx
git commit -m "feat: add undo/redo history engine with keyboard shortcuts to canvas editor"
```

---

## Chunk 2: Toolbar UI Components

### Task 3: Refactor GradientControls to horizontal toolbar layout

**Files:**
- Modify: `apps/app/src/app/components/compose/gradient-controls.tsx`

- [ ] **Step 1: Rewrite GradientControls as a horizontal toolbar**

Replace the entire file with a horizontal layout version. Same props, same behavior, but laid out as a single row with sections:

```tsx
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { GRADIENT_PRESETS } from '@/lib/compose-templates'

export function GradientControls({
  onChange,
  initialType = 'linear',
  initialAngle = 135,
  initialColors = ['#334155', '#0f172a'],
}: {
  onChange: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  initialType?: 'linear' | 'radial'
  initialAngle?: number
  initialColors?: string[]
}) {
  const [type, setType] = useState<'linear' | 'radial'>(initialType)
  const [angle, setAngle] = useState(initialAngle)
  const [color1, setColor1] = useState(initialColors[0] ?? '#334155')
  const [color2, setColor2] = useState(initialColors[1] ?? '#0f172a')

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onChange(type, angle, [color1, color2])
  }, [type, angle, color1, color2]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (preset: typeof GRADIENT_PRESETS[number]) => {
    setType(preset.type)
    setAngle(preset.angle)
    setColor1(preset.colors[0]!)
    setColor2(preset.colors[1]!)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Presets */}
      <div className="flex items-center gap-1">
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className="h-6 w-6 shrink-0 rounded border border-border transition-colors hover:border-primary/50"
            title={p.name}
            style={{
              background: p.type === 'linear'
                ? `linear-gradient(${p.angle}deg, ${p.colors.join(', ')})`
                : `radial-gradient(circle, ${p.colors.join(', ')})`,
            }}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Type toggle */}
      <div className="flex items-center gap-0.5">
        {(['linear', 'radial'] as const).map((t) => (
          <Button
            key={t}
            size="xs"
            variant={type === t ? 'default' : 'outline'}
            onClick={() => setType(t)}
            className="h-6 px-2 text-[10px]"
          >
            {t}
          </Button>
        ))}
      </div>

      {/* Angle (linear only) */}
      {type === 'linear' && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{angle}°</span>
            <Slider
              value={[angle]}
              onValueChange={([v]) => setAngle(v ?? 135)}
              min={0}
              max={360}
              step={5}
              className="w-20"
            />
          </div>
        </>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        <Input
          type="color"
          value={color1}
          onChange={(e) => setColor1(e.target.value)}
          className="h-6 w-8 cursor-pointer p-0.5"
        />
        <Input
          type="color"
          value={color2}
          onChange={(e) => setColor2(e.target.value)}
          className="h-6 w-8 cursor-pointer p-0.5"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit -p apps/app/tsconfig.app.json`

---

### Task 4: Refactor TextControls to horizontal toolbar layout

**Files:**
- Modify: `apps/app/src/app/components/compose/text-controls.tsx`

- [ ] **Step 1: Rewrite TextControls as a horizontal toolbar**

Replace the entire file. Same props (`selectedText`, `onUpdate`), same behavior, horizontal layout:

```tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FONT_FAMILIES } from '@/lib/compose-templates'
import { BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from 'lucide-react'
import type { Textbox as IText } from 'fabric'

export function TextControls({
  selectedText,
  onUpdate,
}: {
  selectedText: IText | null
  onUpdate: () => void
}) {
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]!.value)
  const [color, setColor] = useState('#ffffff')
  const [bold, setBold] = useState(true)
  const [italic, setItalic] = useState(false)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')

  useEffect(() => {
    if (!selectedText) return
    setFontSize(selectedText.fontSize ?? 48)
    setFontFamily(selectedText.fontFamily ?? FONT_FAMILIES[0]!.value)
    setColor((selectedText.fill as string) ?? '#ffffff')
    setBold(selectedText.fontWeight === 'bold')
    setItalic(selectedText.fontStyle === 'italic')
    setTextAlign((selectedText.textAlign as 'left' | 'center' | 'right') ?? 'left')
  }, [selectedText])

  const apply = (props: Record<string, any>) => {
    if (!selectedText) return
    selectedText.set(props)
    onUpdate()
  }

  if (!selectedText) return null

  return (
    <div className="flex items-center gap-2">
      {/* Font family */}
      <select
        value={fontFamily}
        onChange={(e) => {
          setFontFamily(e.target.value)
          apply({ fontFamily: e.target.value })
        }}
        className="h-7 w-28 rounded-md border border-input bg-background px-1.5 text-xs"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.id} value={f.value}>{f.name}</option>
        ))}
      </select>

      <Separator orientation="vertical" className="h-6" />

      {/* Font size */}
      <Input
        type="number"
        value={fontSize}
        onChange={(e) => {
          const size = Number(e.target.value) || 48
          setFontSize(size)
          apply({ fontSize: size })
        }}
        className="h-7 w-14 px-1.5 text-xs"
        min={8}
        max={200}
      />

      <Separator orientation="vertical" className="h-6" />

      {/* Color */}
      <Input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value)
          apply({ fill: e.target.value })
        }}
        className="h-7 w-8 cursor-pointer p-0.5"
      />

      <Separator orientation="vertical" className="h-6" />

      {/* Bold / Italic */}
      <div className="flex items-center gap-0.5">
        <Button
          size="icon-xs"
          variant={bold ? 'default' : 'outline'}
          onClick={() => {
            const next = !bold
            setBold(next)
            apply({ fontWeight: next ? 'bold' : 'normal' })
          }}
        >
          <BoldIcon className="size-3" />
        </Button>
        <Button
          size="icon-xs"
          variant={italic ? 'default' : 'outline'}
          onClick={() => {
            const next = !italic
            setItalic(next)
            apply({ fontStyle: next ? 'italic' : 'normal' })
          }}
        >
          <ItalicIcon className="size-3" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        {([['left', AlignLeftIcon], ['center', AlignCenterIcon], ['right', AlignRightIcon]] as const).map(([align, Icon]) => (
          <Button
            key={align}
            size="icon-xs"
            variant={textAlign === align ? 'default' : 'outline'}
            onClick={() => {
              setTextAlign(align)
              apply({ textAlign: align })
            }}
          >
            <Icon className="size-3" />
          </Button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit -p apps/app/tsconfig.app.json`

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/components/compose/gradient-controls.tsx apps/app/src/app/components/compose/text-controls.tsx
git commit -m "refactor: convert gradient and text controls to horizontal toolbar layout"
```

---

### Task 5: Create ComposeToolbar component

**Files:**
- Create: `apps/app/src/app/components/compose/compose-toolbar.tsx`

- [ ] **Step 1: Create the toolbar component**

```tsx
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { GradientControls } from '@/components/compose/gradient-controls'
import { TextControls } from '@/components/compose/text-controls'
import { Undo2Icon, Redo2Icon, DownloadIcon } from 'lucide-react'
import type { Textbox as IText } from 'fabric'
import type { LayerType } from '@/lib/layer-types'

interface ComposeToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  // Context-sensitive controls
  activeLayerType: LayerType | null
  // Gradient props
  gradientKey: number
  gradientInit: { type: 'linear' | 'radial'; angle: number; colors: string[] }
  onGradientChange: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  // Text props
  selectedText: IText | null
  onTextUpdate: () => void
}

export function ComposeToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  activeLayerType,
  gradientKey,
  gradientInit,
  onGradientChange,
  selectedText,
  onTextUpdate,
}: ComposeToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center border-b bg-background px-3">
      {/* Left: Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Button size="icon-xs" variant="ghost" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2Icon className="size-4" />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2Icon className="size-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Center: Context-sensitive controls */}
      <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
        {activeLayerType === 'background' && (
          <GradientControls
            key={gradientKey}
            onChange={onGradientChange}
            initialType={gradientInit.type}
            initialAngle={gradientInit.angle}
            initialColors={gradientInit.colors}
          />
        )}
        {(activeLayerType === 'title' || activeLayerType === 'text') && (
          <TextControls
            selectedText={selectedText}
            onUpdate={onTextUpdate}
          />
        )}
      </div>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Right: Download */}
      <Button size="sm" onClick={onExport}>
        <DownloadIcon className="size-4" />
        <span className="ml-1">JPG</span>
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit -p apps/app/tsconfig.app.json`

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/components/compose/compose-toolbar.tsx
git commit -m "feat: create ComposeToolbar header bar component"
```

---

## Chunk 3: Wire Everything Together

### Task 6: Rewire compose.tsx — new layout + undo/redo state

**Files:**
- Modify: `apps/app/src/app/pages/compose.tsx`

- [ ] **Step 1: Replace the entire compose.tsx file**

```tsx
import { useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { CanvasEditor, type CanvasEditorHandle } from '@/components/compose/canvas-editor'
import { TemplatePicker } from '@/components/compose/template-picker'
import { ComposeToolbar } from '@/components/compose/compose-toolbar'
import { LayerPanel } from '@/components/compose/layer-panel'
import type { CompositeTemplate } from '@/lib/compose-templates'
import { ArrowLeftIcon } from 'lucide-react'
import type { Textbox as IText } from 'fabric'
import type { Layer } from '@/lib/layer-types'

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630

export function ComposePage() {
  const { projectId, generationId } = useParams()
  const editorRef = useRef<CanvasEditorHandle>(null)
  const [activeTemplate, setActiveTemplate] = useState('default')
  const [selectedText, setSelectedText] = useState<IText | null>(null)
  const [layers, setLayers] = useState<Layer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [gradientKey, setGradientKey] = useState(0)
  const [gradientInit, setGradientInit] = useState<{ type: 'linear' | 'radial'; angle: number; colors: string[] }>({ type: 'linear', angle: 135, colors: ['#334155', '#0f172a'] })
  const [keepStyle, setKeepStyle] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const imageUrl = `/images/generations/${projectId}/${generationId}/transparent.png`

  // Derive active layer type for context-sensitive controls
  const activeLayer = layers.find((l) => l.id === activeLayerId)
  const activeLayerType = activeLayer?.type ?? null

  const handleTemplateSelect = useCallback((template: CompositeTemplate) => {
    setActiveTemplate(template.id)
    if (template.layers.length > 0) {
      editorRef.current?.applyTemplate(template, { keepGradient: keepStyle })
    } else {
      editorRef.current?.setTemplate(template.width, template.height)
    }
    setSelectedText(null)
    setActiveLayerId(null)
  }, [keepStyle])

  const handleGradientChange = useCallback((type: 'linear' | 'radial', angle: number, colors: string[]) => {
    editorRef.current?.setGradient(type, angle, colors)
  }, [])

  const handleSelectionChange = useCallback((type: 'text' | 'image' | null, obj: any, layerId?: string) => {
    setSelectedText(type === 'text' ? obj : null)
    setActiveLayerId(layerId ?? null)
  }, [])

  const handleLayersChange = useCallback((newLayers: Layer[]) => {
    setLayers(newLayers)
  }, [])

  const handleGradientApplied = useCallback((type: 'linear' | 'radial', angle: number, colors: string[]) => {
    setGradientInit({ type, angle, colors })
    setGradientKey((k) => k + 1)
  }, [])

  const handleHistoryChange = useCallback(() => {
    setCanUndo(editorRef.current?.canUndo() ?? false)
    setCanRedo(editorRef.current?.canRedo() ?? false)
  }, [])

  const handleExport = () => {
    const dataUrl = editorRef.current?.exportPNG()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `illustration-${generationId?.slice(0, 8)}.jpg`
    link.href = dataUrl
    link.click()
  }

  const handleTextUpdate = useCallback(() => {
    editorRef.current?.canvas?.renderAll()
    editorRef.current?.snapshot()
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex h-full w-72 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/projects/${projectId}`}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
        </div>

        {/* Scrollable: TemplatePicker */}
        <div className="flex-1 overflow-y-auto">
          <TemplatePicker
            activeId={activeTemplate}
            projectId={projectId ?? ''}
            keepStyle={keepStyle}
            onKeepStyleChange={setKeepStyle}
            onSelect={handleTemplateSelect}
            onGetTemplateConfig={() => editorRef.current!.getTemplateConfig()}
          />
        </div>

        {/* Sticky bottom: LayerPanel */}
        <div className="shrink-0 border-t" style={{ maxHeight: 200 }}>
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelect={(id) => {
                editorRef.current?.selectLayer(id)
                setActiveLayerId(id)
              }}
              onToggleVisibility={(id) => {
                const layer = layers.find((l) => l.id === id)
                if (layer) editorRef.current?.setLayerVisibility(id, !layer.visible)
              }}
              onToggleLock={(id) => {
                const layer = layers.find((l) => l.id === id)
                if (layer) editorRef.current?.setLayerLocked(id, !layer.locked)
              }}
              onMoveUp={(id) => editorRef.current?.moveLayer(id, 'up')}
              onMoveDown={(id) => editorRef.current?.moveLayer(id, 'down')}
              onDelete={(id) => {
                editorRef.current?.removeLayer(id)
                if (activeLayerId === id) {
                  setActiveLayerId(null)
                  setSelectedText(null)
                }
              }}
              onRename={(id, name) => editorRef.current?.renameLayer(id, name)}
              onAddElement={() => editorRef.current?.addText()}
            />
          </div>
        </div>
      </div>

      {/* Main content: Toolbar + Canvas */}
      <div className="flex flex-1 flex-col">
        <ComposeToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => editorRef.current?.undo()}
          onRedo={() => editorRef.current?.redo()}
          onExport={handleExport}
          activeLayerType={activeLayerType}
          gradientKey={gradientKey}
          gradientInit={gradientInit}
          onGradientChange={handleGradientChange}
          selectedText={selectedText}
          onTextUpdate={handleTextUpdate}
        />
        <CanvasEditor
          ref={editorRef}
          imageUrl={imageUrl}
          initialWidth={DEFAULT_WIDTH}
          initialHeight={DEFAULT_HEIGHT}
          onSelectionChange={handleSelectionChange}
          onLayersChange={handleLayersChange}
          onGradientApplied={handleGradientApplied}
          onHistoryChange={handleHistoryChange}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit -p apps/app/tsconfig.app.json`
Expected: no errors

- [ ] **Step 3: Verify in browser**

Run the dev server and test:
1. Open compose page — canvas renders with default layout
2. Undo/redo buttons visible in header, initially disabled
3. Move an object → undo button becomes enabled → click undo → object returns
4. Cmd+Z / Cmd+Shift+Z work
5. Select background → gradient controls appear in toolbar
6. Select text → text controls appear in toolbar
7. Delete key on selected text layer removes it
8. LayerPanel is sticky at sidebar bottom
9. Download JPG works from header

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/app/pages/compose.tsx
git commit -m "feat: wire compose toolbar with undo/redo, move controls from sidebar to header"
```

---

## Post-Implementation

After all tasks complete:
- Run full TypeScript check: `npx tsc --noEmit -p apps/app/tsconfig.app.json`
- Visual verification in browser using the checklist in Step 3 of Task 6
- Use superpowers:finishing-a-development-branch to complete the work
