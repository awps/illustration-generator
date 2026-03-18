# Save Compose Templates Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users save, load, rename, and delete compose templates via a DB-backed API, with saved templates appearing in the template picker alongside built-in presets.

**Architecture:** New `compose_templates` Drizzle table with JSON `layers` column. Hono CRUD routes following existing projects pattern. Frontend `TemplatePicker` extended with saved templates section, fetched via `apiFetch`. New `getTemplateConfig()` canvas-editor handle method to capture current layout.

**Tech Stack:** Drizzle ORM (SQLite/D1), Hono, React, Fabric.js, Tailwind CSS

---

## Chunk 1: Backend (Schema + API)

### Task 1: Add `composeTemplates` table to Drizzle schema

**Files:**
- Modify: `packages/db/src/platform-schema.ts`

- [ ] **Step 1: Add the table definition**

Add after the `generations` table block:

```typescript
// =====================
// Compose Templates
// =====================

export const composeTemplates = sqliteTable('compose_templates', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: text('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  layers: text('layers').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_compose_templates_user_id').on(table.userId),
  index('idx_compose_templates_project_id').on(table.projectId),
])
```

- [ ] **Step 2: Generate migration**

Run from `packages/db/`:
```bash
npx drizzle-kit generate
```
Expected: New migration file in `packages/db/drizzle/platform/` creating `compose_templates` table with 2 indexes.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/platform-schema.ts packages/db/drizzle/
git commit -m "feat: add compose_templates table to schema"
```

---

### Task 2: Create compose-templates API route

**Files:**
- Create: `apps/api/src/routes/compose-templates.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create the route file**

Create `apps/api/src/routes/compose-templates.ts`:

```typescript
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, or, isNull } from 'drizzle-orm'
import { composeTemplates, projects } from '@illustragen/db/platform'
import type { Env } from '../types'

const composeTemplatesRouter = new Hono<Env>()

// List templates (project-scoped + globals for this user)
composeTemplatesRouter.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userId = c.get('userId')
  const projectId = c.req.query('projectId')

  const where = projectId
    ? and(eq(composeTemplates.userId, userId), or(eq(composeTemplates.projectId, projectId), isNull(composeTemplates.projectId)))
    : and(eq(composeTemplates.userId, userId), isNull(composeTemplates.projectId))

  const rows = await db.select().from(composeTemplates).where(where)

  const templates = rows.map((r) => ({
    ...r,
    layers: JSON.parse(r.layers),
    createdAt: r.createdAt?.toISOString() ?? null,
    updatedAt: r.updatedAt?.toISOString() ?? null,
  }))

  return c.json({ templates })
})

// Create template
composeTemplatesRouter.post('/', async (c) => {
  const body = await c.req.json()
  const { name, width, height, layers, projectId } = body
  const userId = c.get('userId')

  if (!name || typeof name !== 'string')
    return c.json({ error: 'validation', message: 'name is required' }, 400)
  if (typeof width !== 'number' || width <= 0)
    return c.json({ error: 'validation', message: 'width must be a positive number' }, 400)
  if (typeof height !== 'number' || height <= 0)
    return c.json({ error: 'validation', message: 'height must be a positive number' }, 400)
  if (!Array.isArray(layers))
    return c.json({ error: 'validation', message: 'layers must be an array' }, 400)

  const db = drizzle(c.env.PLATFORM_DB)

  // Verify project ownership if projectId provided
  if (projectId) {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)
    if (!project)
      return c.json({ error: 'not_found', message: 'Project not found' }, 404)
  }

  const [template] = await db
    .insert(composeTemplates)
    .values({ userId, projectId: projectId ?? null, name, width, height, layers: JSON.stringify(layers) })
    .returning()

  if (!template) return c.json({ error: 'internal', message: 'Failed to create template' }, 500)

  return c.json({
    template: {
      ...template,
      layers: JSON.parse(template.layers),
      createdAt: template.createdAt?.toISOString() ?? null,
      updatedAt: template.updatedAt?.toISOString() ?? null,
    },
  }, 201)
})

// Update template
composeTemplatesRouter.patch('/:id', async (c) => {
  const body = await c.req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.name === 'string') allowed.name = body.name
  if (typeof body.width === 'number' && body.width > 0) allowed.width = body.width
  if (typeof body.height === 'number' && body.height > 0) allowed.height = body.height
  if (Array.isArray(body.layers)) allowed.layers = JSON.stringify(body.layers)

  const db = drizzle(c.env.PLATFORM_DB)
  const [template] = await db
    .update(composeTemplates)
    .set({ ...allowed, updatedAt: new Date() })
    .where(and(eq(composeTemplates.id, c.req.param('id')), eq(composeTemplates.userId, c.get('userId'))))
    .returning()

  if (!template) return c.json({ error: 'not_found', message: 'Template not found' }, 404)

  return c.json({
    template: {
      ...template,
      layers: JSON.parse(template.layers),
      createdAt: template.createdAt?.toISOString() ?? null,
      updatedAt: template.updatedAt?.toISOString() ?? null,
    },
  })
})

// Delete template
composeTemplatesRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [template] = await db
    .select()
    .from(composeTemplates)
    .where(and(eq(composeTemplates.id, c.req.param('id')), eq(composeTemplates.userId, c.get('userId'))))
    .limit(1)

  if (!template) return c.json({ error: 'not_found', message: 'Template not found' }, 404)

  await db.delete(composeTemplates).where(eq(composeTemplates.id, c.req.param('id')))
  return c.json({ ok: true })
})

export { composeTemplatesRouter }
```

- [ ] **Step 2: Mount the route in index.ts**

In `apps/api/src/index.ts`, add import and mount:

```typescript
import { composeTemplatesRouter } from './routes/compose-templates'
```

Add after the existing `app.route` lines:
```typescript
app.route('/v1/compose-templates', composeTemplatesRouter)
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` from `apps/api/`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/compose-templates.ts apps/api/src/index.ts
git commit -m "feat: add compose-templates CRUD API"
```

---

## Chunk 2: Frontend Types + Canvas Method

### Task 3: Add `TemplateConfig` and `SavedTemplate` types

**Files:**
- Modify: `apps/app/src/app/lib/compose-templates.ts`

- [ ] **Step 1: Add types at end of file (before GRADIENT_PRESETS)**

Add after the `TEMPLATES` array, before the `GradientPreset` interface:

```typescript
// --- Types for saved templates ---

export type TemplateConfig = Omit<CompositeTemplate, 'id' | 'name'>

export interface SavedTemplate extends CompositeTemplate {
  projectId: string | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/lib/compose-templates.ts
git commit -m "feat: add TemplateConfig and SavedTemplate types"
```

---

### Task 4: Add `getTemplateConfig()` to canvas-editor handle

**Files:**
- Modify: `apps/app/src/app/components/compose/canvas-editor.tsx`

- [ ] **Step 1: Add import for `TemplateConfig`**

Update the import line:
```typescript
import type { CompositeTemplate, IllustrationLayerConfig, TitleLayerConfig, TextLayerConfig, TemplateConfig } from '@/lib/compose-templates'
```

- [ ] **Step 2: Add `getTemplateConfig` to the `CanvasEditorHandle` interface**

Add after `getLayers`:
```typescript
  getTemplateConfig: () => TemplateConfig
```

- [ ] **Step 3: Add the method implementation in `useImperativeHandle`**

Add before `exportPNG()`:

```typescript
      getTemplateConfig(): TemplateConfig {
        const { width, height } = sizeRef.current
        const layers: import('@/lib/compose-templates').LayerConfig[] = []

        // Background
        const g = gradientRef.current
        layers.push({ type: 'background', gradient: { type: g.type, angle: g.angle, colors: [...g.colors] } })

        // Illustration
        const img = imgRef.current
        if (img) {
          const fit = Math.max(
            (img.scaleX ?? 1) * img.getOriginalSize().width / width,
            (img.scaleY ?? 1) * img.getOriginalSize().height / height,
          )
          layers.push({
            type: 'illustration',
            left: (img.left ?? 0) / width,
            top: (img.top ?? 0) / height,
            originX: (img.originX as 'left' | 'center' | 'right') ?? 'center',
            originY: (img.originY as 'top' | 'center' | 'bottom') ?? 'center',
            fit,
          })
        }

        // Title
        const title = titleRef.current
        if (title) {
          layers.push({
            type: 'title',
            content: title.text ?? 'Your title here',
            left: (title.left ?? 0) / width,
            top: (title.top ?? 0) / height,
            width: (title.width ?? width * 0.4) / width,
            fontSize: title.fontSize ?? 48,
            fontFamily: title.fontFamily as string | undefined,
            fill: title.fill as string | undefined,
            fontWeight: title.fontWeight as string | undefined,
          })
        }

        // Text layers
        const canvas = fabricRef.current
        if (canvas) {
          for (const obj of canvas.getObjects()) {
            if (obj.layerType !== 'text') continue
            const tb = obj as import('fabric').Textbox
            layers.push({
              type: 'text',
              name: obj.layerName,
              content: tb.text ?? 'Your text here',
              left: (tb.left ?? 0) / width,
              top: (tb.top ?? 0) / height,
              width: (tb.width ?? width * 0.4) / width,
              fontSize: tb.fontSize ?? 48,
              fontFamily: tb.fontFamily as string | undefined,
              fill: tb.fill as string | undefined,
              fontWeight: tb.fontWeight as string | undefined,
            })
          }
        }

        return { width, height, layers }
      },
```

- [ ] **Step 4: Type-check**

Run: `cd /Users/am/Work/illustrations-generator && npx tsc --noEmit -p apps/app/tsconfig.app.json`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/app/components/compose/canvas-editor.tsx
git commit -m "feat: add getTemplateConfig() to canvas editor handle"
```

---

## Chunk 3: Frontend Template Picker + Wiring

### Task 5: Rewrite template-picker with saved templates support

**Files:**
- Modify: `apps/app/src/app/components/compose/template-picker.tsx`

- [ ] **Step 1: Full rewrite of template-picker.tsx**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TEMPLATES, type CompositeTemplate, type SavedTemplate, type TemplateConfig } from '@/lib/compose-templates'
import { apiFetch } from '@/lib/api'
import { SaveIcon, Trash2Icon, PencilIcon, CheckIcon, XIcon, MoreHorizontalIcon } from 'lucide-react'

interface TemplatePickerProps {
  activeId: string
  projectId: string
  onSelect: (template: CompositeTemplate) => void
  onGetTemplateConfig: () => TemplateConfig
}

export function TemplatePicker({ activeId, projectId, onSelect, onGetTemplateConfig }: TemplatePickerProps) {
  const [customW, setCustomW] = useState('1200')
  const [customH, setCustomH] = useState('630')
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([])
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveGlobal, setSaveGlobal] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Load saved templates on mount
  useEffect(() => {
    if (!projectId) return
    apiFetch(`/v1/compose-templates?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setSavedTemplates(data.templates ?? []))
      .catch(() => {})
  }, [projectId])

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) return
    const config = onGetTemplateConfig()
    const res = await apiFetch('/v1/compose-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveName.trim(),
        width: config.width,
        height: config.height,
        layers: config.layers,
        projectId: saveGlobal ? undefined : projectId,
      }),
    })
    if (!res.ok) return
    const { template } = await res.json()
    setSavedTemplates((prev) => [...prev, template])
    setSaving(false)
    setSaveName('')
  }, [saveName, saveGlobal, projectId, onGetTemplateConfig])

  const handleDelete = useCallback(async (id: string) => {
    const res = await apiFetch(`/v1/compose-templates/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id))
    setMenuOpenId(null)
  }, [])

  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return
    const res = await apiFetch(`/v1/compose-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (!res.ok) return
    const { template } = await res.json()
    setSavedTemplates((prev) => prev.map((t) => (t.id === id ? template : t)))
    setEditingId(null)
  }, [editName])

  const templateBtn = (t: CompositeTemplate) => (
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
  )

  return (
    <div className="border-b border-sidebar-border p-4">
      <Label className="mb-2 text-xs font-medium">Template</Label>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map(templateBtn)}
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
            onSelect({ id: 'custom', name: 'Custom', width: w, height: h, layers: [] })
          }}
        >
          Apply
        </Button>
      </div>

      {/* Saved templates */}
      <div className="mt-3 border-t border-sidebar-border pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Saved</span>
          {!saving && (
            <Button size="icon-xs" variant="outline" onClick={() => setSaving(true)}>
              <SaveIcon className="size-3" />
            </Button>
          )}
        </div>

        {savedTemplates.length > 0 && (
          <div className="flex flex-col gap-1">
            {savedTemplates.map((t) => (
              <div key={t.id} className="group flex items-center gap-1">
                {editingId === t.id ? (
                  <form
                    className="flex flex-1 items-center gap-1"
                    onSubmit={(e) => { e.preventDefault(); handleRename(t.id) }}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 flex-1 px-1 text-xs"
                      autoFocus
                      onBlur={() => setEditingId(null)}
                    />
                    <Button type="submit" size="icon-xs" variant="ghost" className="size-5"
                      onMouseDown={(e) => e.preventDefault()}>
                      <CheckIcon className="size-3" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelect(t)}
                      className={`flex-1 truncate rounded-md border px-2 py-1 text-left text-xs transition-colors ${
                        activeId === t.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {t.name}
                      <span className="ml-1 text-[10px] opacity-60">{t.width}×{t.height}</span>
                      {t.projectId && <span className="ml-1 text-[10px] opacity-40">project</span>}
                    </button>
                    <div className="relative">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="size-5 opacity-0 group-hover:opacity-100"
                        onClick={() => setMenuOpenId(menuOpenId === t.id ? null : t.id)}
                      >
                        <MoreHorizontalIcon className="size-3" />
                      </Button>
                      {menuOpenId === t.id && (
                        <div className="absolute right-0 top-6 z-10 flex flex-col rounded-md border bg-popover p-1 shadow-md">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => {
                              setEditingId(t.id)
                              setEditName(t.name)
                              setMenuOpenId(null)
                            }}
                          >
                            <PencilIcon className="size-3" /> Rename
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-destructive hover:bg-muted"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2Icon className="size-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {savedTemplates.length === 0 && !saving && (
          <p className="text-[10px] text-muted-foreground">No saved templates yet.</p>
        )}

        {saving && (
          <div className="mt-1 flex flex-col gap-1.5">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Template name"
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') setSaving(false) }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSaveGlobal(true)}
                className={`rounded-md border px-2 py-0.5 text-[10px] ${saveGlobal ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setSaveGlobal(false)}
                className={`rounded-md border px-2 py-0.5 text-[10px] ${!saveGlobal ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
              >
                Project only
              </button>
            </div>
            <div className="flex gap-1">
              <Button size="xs" onClick={handleSave} disabled={!saveName.trim()} className="flex-1">
                Save
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSaving(false)}>
                <XIcon className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/am/Work/illustrations-generator && npx tsc --noEmit -p apps/app/tsconfig.app.json`
Expected: Errors in `compose.tsx` about missing props (expected — fixed in next task).

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/components/compose/template-picker.tsx
git commit -m "feat: template picker with saved templates UI"
```

---

### Task 6: Wire new props in compose.tsx

**Files:**
- Modify: `apps/app/src/app/pages/compose.tsx`

- [ ] **Step 1: Update TemplatePicker usage**

Replace the `<TemplatePicker>` JSX:

```tsx
<TemplatePicker
  activeId={activeTemplate}
  projectId={projectId ?? ''}
  onSelect={handleTemplateSelect}
  onGetTemplateConfig={() => editorRef.current!.getTemplateConfig()}
/>
```

- [ ] **Step 2: Type-check**

Run: `cd /Users/am/Work/illustrations-generator && npx tsc --noEmit -p apps/app/tsconfig.app.json`
Expected: No errors.

- [ ] **Step 3: Build**

Run: `cd apps/app && npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/app/pages/compose.tsx
git commit -m "feat: wire saved templates props in compose page"
```