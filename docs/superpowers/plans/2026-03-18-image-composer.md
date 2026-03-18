# Image Composer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side image composition editor where users place illustrations on gradient backgrounds with text overlays and export as PNG.

**Architecture:** FabricJS canvas managed via React ref. The compose page has its own sidebar with template/gradient/text controls. Canvas state is local — no server persistence. Export uses FabricJS `toDataURL()`.

**Tech Stack:** React 19, FabricJS v6, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-18-image-composer-design.md`

---

## Chunk 1: Foundation — dependency, templates, routing

### Task 1: Install FabricJS and create template definitions

**Files:**
- Modify: `apps/app/package.json`
- Create: `apps/app/src/app/lib/compose-templates.ts`

- [ ] **Step 1: Install fabric**

```bash
npm install fabric -w @illustragen/app
```

- [ ] **Step 2: Create template definitions and gradient presets**

```ts
// apps/app/src/app/lib/compose-templates.ts

export interface Template {
  id: string
  name: string
  width: number
  height: number
}

export const TEMPLATES: Template[] = [
  { id: 'blog-header', name: 'Blog Header', width: 1200, height: 630 },
  { id: 'social-square', name: 'Social Square', width: 1080, height: 1080 },
  { id: 'feature', name: 'Feature Image', width: 800, height: 450 },
  { id: 'thumbnail', name: 'Thumbnail', width: 512, height: 512 },
]

export interface GradientPreset {
  id: string
  name: string
  type: 'linear' | 'radial'
  angle: number
  colors: string[]
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'sunset', name: 'Sunset', type: 'linear', angle: 135, colors: ['#f97316', '#ec4899'] },
  { id: 'ocean', name: 'Ocean', type: 'linear', angle: 180, colors: ['#06b6d4', '#3b82f6'] },
  { id: 'forest', name: 'Forest', type: 'linear', angle: 160, colors: ['#10b981', '#064e3b'] },
  { id: 'purple-haze', name: 'Purple Haze', type: 'linear', angle: 135, colors: ['#8b5cf6', '#ec4899'] },
  { id: 'midnight', name: 'Midnight', type: 'linear', angle: 180, colors: ['#1e1b4b', '#312e81'] },
  { id: 'warm-sand', name: 'Warm Sand', type: 'linear', angle: 135, colors: ['#f59e0b', '#d97706'] },
  { id: 'mint', name: 'Mint', type: 'radial', angle: 0, colors: ['#d1fae5', '#6ee7b7'] },
  { id: 'slate', name: 'Slate', type: 'linear', angle: 180, colors: ['#334155', '#0f172a'] },
]

export const FONT_FAMILIES = [
  { id: 'inter', name: 'Inter', value: 'Inter Variable, sans-serif' },
  { id: 'system', name: 'System', value: 'system-ui, sans-serif' },
  { id: 'georgia', name: 'Georgia', value: 'Georgia, serif' },
  { id: 'mono', name: 'Monospace', value: 'ui-monospace, monospace' },
]
```

- [ ] **Step 3: Commit**

```bash
git add apps/app/
git commit -m "feat: install fabric, add compose template definitions and gradient presets"
```

---

### Task 2: Add compose route and make grid cards clickable

**Files:**
- Modify: `apps/app/src/app/App.tsx`
- Modify: `apps/app/src/app/pages/project-dashboard.tsx`
- Create: `apps/app/src/app/pages/compose.tsx` (placeholder)

- [ ] **Step 1: Create placeholder compose page**

```tsx
// apps/app/src/app/pages/compose.tsx
import { useParams, Link } from 'react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ComposePage() {
  const { projectId, generationId } = useParams()

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projects/${projectId}`}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Compose — {generationId?.slice(0, 8)}</span>
      </header>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Canvas editor placeholder
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

In the `ProjectLayout` return, add the compose route. Change the Routes structure to handle both the dashboard and compose within the project layout. Replace the current `ProjectLayout` render with nested routes:

In `App.tsx`, add import:
```tsx
import { ComposePage } from '@/pages/compose'
```

Change the route from:
```tsx
<Route path="/projects/:projectId/*" element={
  <ProjectLayout user={user} projects={projects} onProjectCreated={loadProjects} />
} />
```
to:
```tsx
<Route path="/projects/:projectId" element={
  <ProjectLayout user={user} projects={projects} onProjectCreated={loadProjects} />
} />
<Route path="/projects/:projectId/generations/:generationId/compose" element={
  <ComposePage />
} />
```

- [ ] **Step 3: Make grid cards clickable**

In `project-dashboard.tsx`, wrap each generation card in a `Link`:

Add import:
```tsx
import { Link } from 'react-router'
```

Replace the card `<div key={gen.id} className="group relative ...">` with:
```tsx
<Link to={`/projects/${projectId}/generations/${gen.id}/compose`} key={gen.id} className="group relative overflow-hidden rounded-lg border bg-card">
```

And change the closing `</div>` to `</Link>`. Move the delete button outside the Link or use `onClick` with `e.preventDefault()` + `e.stopPropagation()`:

```tsx
<Button
  variant="ghost"
  size="icon-xs"
  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
  onClick={(e) => {
    e.preventDefault()
    e.stopPropagation()
    deleteGeneration(gen.id)
  }}
>
  <Trash2Icon className="size-3" />
</Button>
```

- [ ] **Step 4: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/app/
git commit -m "feat: add compose route, make generation cards clickable"
```

---

## Chunk 2: FabricJS canvas + illustration loading

### Task 3: Create the CanvasEditor component

**Files:**
- Create: `apps/app/src/app/components/compose/canvas-editor.tsx`

- [ ] **Step 1: Create the FabricJS canvas wrapper**

```tsx
// apps/app/src/app/components/compose/canvas-editor.tsx
import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, Rect, FabricImage, Gradient, IText } from 'fabric'

export interface CanvasEditorHandle {
  canvas: Canvas | null
  setTemplate: (width: number, height: number) => void
  setGradient: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  addText: () => void
  exportPNG: () => string | null
}

interface CanvasEditorProps {
  imageUrl: string
  initialWidth: number
  initialHeight: number
  onSelectionChange?: (type: 'text' | 'image' | null, object: any) => void
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  ({ imageUrl, initialWidth, initialHeight, onSelectionChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<Canvas | null>(null)
    const bgRef = useRef<Rect | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Initialize canvas
    useEffect(() => {
      if (!canvasRef.current) return

      const canvas = new Canvas(canvasRef.current, {
        width: initialWidth,
        height: initialHeight,
        backgroundColor: '#000000',
      })

      fabricRef.current = canvas

      // Background gradient rect
      const bg = new Rect({
        left: 0,
        top: 0,
        width: initialWidth,
        height: initialHeight,
        selectable: false,
        evented: false,
      })
      canvas.add(bg)
      canvas.sendObjectToBack(bg)
      bgRef.current = bg

      // Load illustration
      FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
        const scale = Math.min(
          (initialWidth * 0.7) / (img.width ?? 1),
          (initialHeight * 0.7) / (img.height ?? 1)
        )
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: initialWidth / 2,
          top: initialHeight / 2,
          originX: 'center',
          originY: 'center',
        })
        canvas.add(img)
        canvas.renderAll()
      })

      // Selection events
      canvas.on('selection:created', (e) => {
        const obj = e.selected?.[0]
        if (obj instanceof IText) onSelectionChange?.('text', obj)
        else onSelectionChange?.('image', obj)
      })
      canvas.on('selection:updated', (e) => {
        const obj = e.selected?.[0]
        if (obj instanceof IText) onSelectionChange?.('text', obj)
        else onSelectionChange?.('image', obj)
      })
      canvas.on('selection:cleared', () => {
        onSelectionChange?.(null, null)
      })

      // Fit to container
      fitToContainer(canvas, initialWidth, initialHeight)

      return () => {
        canvas.dispose()
        fabricRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const fitToContainer = (canvas: Canvas, w: number, h: number) => {
      const container = containerRef.current
      if (!container) return
      const containerW = container.clientWidth
      const containerH = container.clientHeight
      const scale = Math.min(containerW / w, containerH / h, 1)
      canvas.setZoom(scale)
      canvas.setDimensions({ width: w * scale, height: h * scale })
    }

    useImperativeHandle(ref, () => ({
      canvas: fabricRef.current,
      setTemplate(width: number, height: number) {
        const canvas = fabricRef.current
        const bg = bgRef.current
        if (!canvas || !bg) return
        bg.set({ width, height })
        canvas.setDimensions({ width, height })
        fitToContainer(canvas, width, height)
        canvas.renderAll()
      },
      setGradient(type: 'linear' | 'radial', angle: number, colors: string[]) {
        const bg = bgRef.current
        const canvas = fabricRef.current
        if (!bg || !canvas) return
        const w = bg.width ?? 1
        const h = bg.height ?? 1
        const rad = (angle * Math.PI) / 180

        if (type === 'linear') {
          bg.set('fill', new Gradient({
            type: 'linear',
            coords: {
              x1: w / 2 - Math.cos(rad) * w / 2,
              y1: h / 2 - Math.sin(rad) * h / 2,
              x2: w / 2 + Math.cos(rad) * w / 2,
              y2: h / 2 + Math.sin(rad) * h / 2,
            },
            colorStops: colors.map((c, i) => ({ offset: i / (colors.length - 1), color: c })),
          }))
        } else {
          bg.set('fill', new Gradient({
            type: 'radial',
            coords: { x1: w / 2, y1: h / 2, r1: 0, x2: w / 2, y2: h / 2, r2: Math.max(w, h) / 2 },
            colorStops: colors.map((c, i) => ({ offset: i / (colors.length - 1), color: c })),
          }))
        }
        canvas.renderAll()
      },
      addText() {
        const canvas = fabricRef.current
        if (!canvas) return
        const text = new IText('Your text here', {
          left: (canvas.width ?? 200) / 2 / canvas.getZoom(),
          top: (canvas.height ?? 200) / 2 / canvas.getZoom(),
          originX: 'center',
          originY: 'center',
          fontFamily: 'Inter Variable, sans-serif',
          fontSize: 48,
          fill: '#ffffff',
          fontWeight: 'bold',
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        canvas.renderAll()
      },
      exportPNG() {
        const canvas = fabricRef.current
        const bg = bgRef.current
        if (!canvas || !bg) return null
        const currentZoom = canvas.getZoom()
        canvas.setZoom(1)
        canvas.setDimensions({ width: bg.width ?? 0, height: bg.height ?? 0 })
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 })
        canvas.setZoom(currentZoom)
        fitToContainer(canvas, bg.width ?? 0, bg.height ?? 0)
        return dataUrl
      },
    }))

    return (
      <div ref={containerRef} className="flex flex-1 items-center justify-center bg-muted/30 overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
    )
  }
)
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/compose/
git commit -m "feat: create CanvasEditor FabricJS wrapper component"
```

---

## Chunk 3: Sidebar controls

### Task 4: Create TemplatePicker component

**Files:**
- Create: `apps/app/src/app/components/compose/template-picker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/app/components/compose/template-picker.tsx
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TEMPLATES, type Template } from '@/lib/compose-templates'

export function TemplatePicker({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (template: Template) => void
}) {
  const [customW, setCustomW] = useState('1200')
  const [customH, setCustomH] = useState('630')

  return (
    <div className="border-b border-sidebar-border p-4">
      <Label className="mb-2 text-xs font-medium">Template</Label>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              activeId === t.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            }`}
          >
            {t.name}
            <span className="ml-1 text-[10px] opacity-60">{t.width}×{t.height}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          className="h-7 w-20 text-xs"
          value={customW}
          onChange={(e) => setCustomW(e.target.value)}
          placeholder="W"
        />
        <span className="text-xs text-muted-foreground">×</span>
        <Input
          className="h-7 w-20 text-xs"
          value={customH}
          onChange={(e) => setCustomH(e.target.value)}
          placeholder="H"
        />
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            const w = Number(customW) || 1200
            const h = Number(customH) || 630
            onSelect({ id: 'custom', name: 'Custom', width: w, height: h })
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/compose/template-picker.tsx
git commit -m "feat: create TemplatePicker component"
```

---

### Task 5: Create GradientControls component

**Files:**
- Create: `apps/app/src/app/components/compose/gradient-controls.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/app/components/compose/gradient-controls.tsx
import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { GRADIENT_PRESETS } from '@/lib/compose-templates'

export function GradientControls({
  onChange,
}: {
  onChange: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
}) {
  const [type, setType] = useState<'linear' | 'radial'>('linear')
  const [angle, setAngle] = useState(135)
  const [color1, setColor1] = useState('#334155')
  const [color2, setColor2] = useState('#0f172a')

  useEffect(() => {
    onChange(type, angle, [color1, color2])
  }, [type, angle, color1, color2]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (preset: typeof GRADIENT_PRESETS[number]) => {
    setType(preset.type)
    setAngle(preset.angle)
    setColor1(preset.colors[0]!)
    setColor2(preset.colors[1]!)
  }

  return (
    <div className="border-b border-sidebar-border p-4">
      <Label className="mb-2 text-xs font-medium">Background</Label>

      {/* Presets */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className="h-6 w-10 rounded border border-border transition-colors hover:border-primary/50"
            title={p.name}
            style={{
              background: p.type === 'linear'
                ? `linear-gradient(${p.angle}deg, ${p.colors.join(', ')})`
                : `radial-gradient(circle, ${p.colors.join(', ')})`,
            }}
          />
        ))}
      </div>

      {/* Type toggle */}
      <div className="mb-2 flex gap-1">
        {(['linear', 'radial'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md border px-2 py-0.5 text-xs ${
              type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Angle */}
      {type === 'linear' && (
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Angle</span>
            <span className="text-[10px] text-muted-foreground">{angle}°</span>
          </div>
          <Slider
            value={[angle]}
            onValueChange={([v]) => setAngle(v ?? 135)}
            min={0}
            max={360}
            step={5}
            className="mt-1"
          />
        </div>
      )}

      {/* Colors */}
      <div className="flex gap-2">
        <div className="flex-1">
          <span className="text-[10px] text-muted-foreground">Start</span>
          <Input
            type="color"
            value={color1}
            onChange={(e) => setColor1(e.target.value)}
            className="mt-0.5 h-7 w-full cursor-pointer p-0.5"
          />
        </div>
        <div className="flex-1">
          <span className="text-[10px] text-muted-foreground">End</span>
          <Input
            type="color"
            value={color2}
            onChange={(e) => setColor2(e.target.value)}
            className="mt-0.5 h-7 w-full cursor-pointer p-0.5"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/compose/gradient-controls.tsx
git commit -m "feat: create GradientControls with presets, type, angle, colors"
```

---

### Task 6: Create TextControls component

**Files:**
- Create: `apps/app/src/app/components/compose/text-controls.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/app/src/app/components/compose/text-controls.tsx
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { FONT_FAMILIES } from '@/lib/compose-templates'
import { PlusIcon, Trash2Icon, BoldIcon, ItalicIcon } from 'lucide-react'
import type { IText } from 'fabric'

export function TextControls({
  selectedText,
  onAddText,
  onUpdate,
  onDelete,
}: {
  selectedText: IText | null
  onAddText: () => void
  onUpdate: () => void
  onDelete: () => void
}) {
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]!.value)
  const [color, setColor] = useState('#ffffff')
  const [bold, setBold] = useState(true)
  const [italic, setItalic] = useState(false)

  // Sync state when a text object is selected
  useEffect(() => {
    if (!selectedText) return
    setFontSize(selectedText.fontSize ?? 48)
    setFontFamily(selectedText.fontFamily ?? FONT_FAMILIES[0]!.value)
    setColor((selectedText.fill as string) ?? '#ffffff')
    setBold(selectedText.fontWeight === 'bold')
    setItalic(selectedText.fontStyle === 'italic')
  }, [selectedText])

  const apply = (props: Record<string, any>) => {
    if (!selectedText) return
    selectedText.set(props)
    onUpdate()
  }

  return (
    <div className="border-b border-sidebar-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-medium">Text</Label>
        <Button size="icon-xs" variant="outline" onClick={onAddText}>
          <PlusIcon className="size-3" />
        </Button>
      </div>

      {selectedText ? (
        <div className="flex flex-col gap-2">
          {/* Font family */}
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value)
              apply({ fontFamily: e.target.value })
            }}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.id} value={f.value}>{f.name}</option>
            ))}
          </select>

          {/* Font size */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Size</span>
              <span className="text-[10px] text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={([v]) => {
                const size = v ?? 48
                setFontSize(size)
                apply({ fontSize: size })
              }}
              min={12}
              max={120}
              step={1}
              className="mt-1"
            />
          </div>

          {/* Color + Bold/Italic */}
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                apply({ fill: e.target.value })
              }}
              className="h-7 w-10 cursor-pointer p-0.5"
            />
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
            <Button size="icon-xs" variant="ghost" onClick={onDelete} className="ml-auto">
              <Trash2Icon className="size-3" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Click "+" to add text, then select it on canvas to edit.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/compose/text-controls.tsx
git commit -m "feat: create TextControls with font, size, color, bold/italic"
```

---

## Chunk 4: Compose page assembly

### Task 7: Build the full compose page

**Files:**
- Modify: `apps/app/src/app/pages/compose.tsx`

- [ ] **Step 1: Implement the full compose page**

```tsx
// apps/app/src/app/pages/compose.tsx
import { useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { CanvasEditor, type CanvasEditorHandle } from '@/components/compose/canvas-editor'
import { TemplatePicker } from '@/components/compose/template-picker'
import { GradientControls } from '@/components/compose/gradient-controls'
import { TextControls } from '@/components/compose/text-controls'
import { TEMPLATES } from '@/lib/compose-templates'
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react'
import type { IText } from 'fabric'

const IMAGES_DOMAIN = (window as any).__CONFIG__?.imagesDomain ?? 'imagen.publingo.com'

export function ComposePage() {
  const { projectId, generationId } = useParams()
  const editorRef = useRef<CanvasEditorHandle>(null)
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]!.id)
  const [selectedText, setSelectedText] = useState<IText | null>(null)

  // We need the generation's storagePath — derive from URL params
  // The generation was loaded by the dashboard; we construct the image URL directly
  const imageUrl = `https://${IMAGES_DOMAIN}/generations/${projectId}/${generationId}/transparent.png`

  const handleTemplateSelect = useCallback((template: { id: string; width: number; height: number }) => {
    setActiveTemplate(template.id)
    editorRef.current?.setTemplate(template.width, template.height)
  }, [])

  const handleGradientChange = useCallback((type: 'linear' | 'radial', angle: number, colors: string[]) => {
    editorRef.current?.setGradient(type, angle, colors)
  }, [])

  const handleSelectionChange = useCallback((type: 'text' | 'image' | null, obj: any) => {
    setSelectedText(type === 'text' ? obj : null)
  }, [])

  const handleExport = () => {
    const dataUrl = editorRef.current?.exportPNG()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `illustration-${generationId?.slice(0, 8)}.png`
    link.href = dataUrl
    link.click()
  }

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

        <div className="flex-1 overflow-y-auto">
          <TemplatePicker activeId={activeTemplate} onSelect={handleTemplateSelect} />
          <GradientControls onChange={handleGradientChange} />
          <TextControls
            selectedText={selectedText}
            onAddText={() => editorRef.current?.addText()}
            onUpdate={() => editorRef.current?.canvas?.renderAll()}
            onDelete={() => {
              const canvas = editorRef.current?.canvas
              if (canvas && selectedText) {
                canvas.remove(selectedText)
                canvas.renderAll()
                setSelectedText(null)
              }
            }}
          />
        </div>

        <div className="shrink-0 border-t p-4">
          <Button onClick={handleExport} className="w-full">
            <DownloadIcon className="size-4" />
            Download PNG
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <CanvasEditor
        ref={editorRef}
        imageUrl={imageUrl}
        initialWidth={TEMPLATES[0]!.width}
        initialHeight={TEMPLATES[0]!.height}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/
git commit -m "feat: assemble compose page with canvas, sidebar controls, and export"
```

---

### Task 8: Test the full flow

- [ ] **Step 1: Rebuild and test**

```bash
npm run docker
```

- [ ] **Step 2: Test compose flow**

1. Navigate to a project with generations
2. Click a generation card — should navigate to `/projects/:id/generations/:genId/compose`
3. Canvas should show the illustration on a dark gradient background
4. Template picker should resize the canvas
5. Gradient presets should change the background
6. Color pickers + angle slider should update gradient in real-time
7. "Add Text" should create a draggable text block
8. Double-click text to edit inline
9. Text controls (font, size, color, bold, italic) should update the selected text
10. "Download PNG" should download the composed image
11. "Back" button should return to the project grid
