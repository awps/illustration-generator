# Generator Form Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the right sidebar generator form with style parameter selection, prompt input, and optimistic generation with 30s progress bar placeholders in the grid.

**Architecture:** Style options hardcoded in a shared file. `GeneratorForm` component with collapsible style sections renders in the right sidebar. On generate, parent manages pending state — placeholder cards in the grid with a progress bar, replaced by real results when the API responds.

**Tech Stack:** React 19, shadcn/ui (collapsible, button, textarea, label), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-16-generator-form-design.md`

---

## Chunk 1: Style options + reusable components

### Task 1: Create style options data file

**Files:**
- Create: `apps/app/src/app/lib/style-options.ts`

- [ ] **Step 1: Create the file with all keyword lists**

```ts
export const STYLE_OPTIONS = {
  renderings: ['flat', 'bold', 'geometric', 'lineart', 'clay', '3d', 'handdrawn', 'isometric', 'gradient', 'watercolor', 'pixel', 'cubist', 'risograph', 'doodle'] as const,
  elements: ['cards', 'character', 'object', 'icons', 'browser', 'badges', 'cursors', 'arrows', 'pills', 'charts', 'tables'] as const,
  compositions: ['flow', 'orbit', 'showcase', 'abstract', 'collection', 'diagram', 'split', 'editorial'] as const,
  moods: ['professional', 'playful', 'techy', 'friendly', 'polished', 'corporate', 'clean', 'authoritative', 'energetic', 'fun', 'lively', 'approachable', 'technical', 'modern', 'precise', 'warm', 'inviting'] as const,
  complexities: ['single', 'few', 'several', 'many', 'spacious', 'balanced', 'dense', 'simple', 'refined', 'intricate', 'sparse', 'informative', 'decorated', 'bare'] as const,
  layouts: ['centered', 'offset', 'left', 'right', 'horizontal', 'vertical', 'diagonal', 'stacked', 'grouped', 'grid', 'symmetric', 'asymmetric', 'overlapping', 'spread', 'tight', 'layered'] as const,
  subjects: ['dashboard', 'form', 'email', 'analytics', 'settings', 'integration', 'security', 'payment', 'editor', 'chat', 'website', 'mobile', 'wordpress', 'management'] as const,
  iconStyles: ['outlined', 'filled', 'minimal', 'rounded', 'sharp', 'thin', 'bold', 'duotone'] as const,
  placements: ['hero', 'feature', 'section', 'blog', 'header', 'card', 'thumbnail', 'onboarding', 'empty', 'state'] as const,
} as const

export type StyleCategory = keyof typeof STYLE_OPTIONS

export const STYLE_LABELS: Record<StyleCategory, string> = {
  renderings: 'Renderings',
  elements: 'Elements',
  compositions: 'Compositions',
  moods: 'Moods',
  complexities: 'Complexities',
  layouts: 'Layouts',
  subjects: 'Subjects',
  iconStyles: 'Icon Styles',
  placements: 'Placements',
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/lib/style-options.ts
git commit -m "feat: add style options data for generator form"
```

---

### Task 2: Create StyleSection reusable component

**Files:**
- Create: `apps/app/src/app/components/style-section.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronRightIcon } from 'lucide-react'

export function StyleSection({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <Collapsible className="border-b border-sidebar-border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-muted/50">
        <ChevronRightIcon className="size-3.5 transition-transform [[data-state=open]_&]:rotate-90" />
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{selected.length}</span>
        )}
      </CollapsibleTrigger>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2 [[data-state=open]_&]:hidden">
          {selected.map((s) => (
            <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {s}
            </span>
          ))}
        </div>
      )}
      <CollapsibleContent>
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {options.map((option) => {
            const isSelected = selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/style-section.tsx
git commit -m "feat: create StyleSection reusable collapsible component"
```

---

### Task 3: Create GenerationPlaceholder component

**Files:**
- Create: `apps/app/src/app/components/generation-placeholder.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react'
import { LoaderIcon } from 'lucide-react'

const DURATION_MS = 30_000

export function GenerationPlaceholder({ prompt, error }: { prompt: string; error?: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (error) return
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(elapsed / DURATION_MS, 0.95))
    }, 200)
    return () => clearInterval(interval)
  }, [error])

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card">
      <div className="flex aspect-square items-center justify-center bg-muted/30">
        {error ? (
          <p className="px-4 text-center text-xs text-destructive">{error}</p>
        ) : (
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{prompt}</p>
      </div>
      {!error && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-200" style={{ width: `${progress * 100}%` }} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/generation-placeholder.tsx
git commit -m "feat: create GenerationPlaceholder with 30s progress bar"
```

---

## Chunk 2: Generator form + wiring

### Task 4: Create GeneratorForm component

**Files:**
- Create: `apps/app/src/app/components/generator-form.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { StyleSection } from '@/components/style-section'
import { STYLE_OPTIONS, STYLE_LABELS, type StyleCategory } from '@/lib/style-options'
import { SparklesIcon } from 'lucide-react'

export interface GenerateRequest {
  prompt: string
  palette?: string[]
  count: number
  renderings?: string[]
  elements?: string[]
  compositions?: string[]
  moods?: string[]
  complexities?: string[]
  layouts?: string[]
  subjects?: string[]
  iconStyles?: string[]
  placements?: string[]
}

export function GeneratorForm({
  onGenerate,
  generating,
}: {
  onGenerate: (request: GenerateRequest) => void
  generating: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(1)
  const [selections, setSelections] = useState<Record<StyleCategory, string[]>>({
    renderings: [],
    elements: [],
    compositions: [],
    moods: [],
    complexities: [],
    layouts: [],
    subjects: [],
    iconStyles: [],
    placements: [],
  })
  const [paletteColor, setPaletteColor] = useState('')
  const [paletteStyle, setPaletteStyle] = useState('')
  const [paletteTopic, setPaletteTopic] = useState('')

  const toggleOption = (category: StyleCategory, value: string) => {
    setSelections(prev => {
      const current = prev[category]
      return {
        ...prev,
        [category]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      }
    })
  }

  const handleGenerate = () => {
    if (!prompt.trim()) return

    const paletteFilters = [paletteColor, paletteStyle, paletteTopic].filter(Boolean)

    const request: GenerateRequest = {
      prompt: prompt.trim(),
      count,
      ...(paletteFilters.length > 0 && { palette: paletteFilters }),
    }

    for (const [key, values] of Object.entries(selections)) {
      if (values.length > 0) {
        (request as any)[key] = values
      }
    }

    onGenerate(request)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Prompt */}
        <div className="border-b border-sidebar-border p-4">
          <Label htmlFor="prompt" className="mb-2 text-xs font-medium">Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="Describe your illustration..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            rows={3}
            className="resize-none text-sm"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{prompt.length}/500</p>
        </div>

        {/* Style sections */}
        {(Object.keys(STYLE_OPTIONS) as StyleCategory[]).map((category) => (
          <StyleSection
            key={category}
            label={STYLE_LABELS[category]}
            options={STYLE_OPTIONS[category]}
            selected={selections[category]}
            onToggle={(value) => toggleOption(category, value)}
          />
        ))}

        {/* Palette filters */}
        <div className="border-b border-sidebar-border p-4">
          <Label className="mb-2 text-xs font-medium">Palette (optional)</Label>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Color (e.g. blue)"
              value={paletteColor}
              onChange={(e) => setPaletteColor(e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Style (e.g. pastel)"
              value={paletteStyle}
              onChange={(e) => setPaletteStyle(e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Topic (e.g. nature)"
              value={paletteTopic}
              onChange={(e) => setPaletteTopic(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Count */}
        <div className="p-4">
          <Label className="mb-2 text-xs font-medium">Count</Label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate button — sticky bottom */}
      <div className="border-t border-sidebar-border p-4">
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="w-full"
        >
          <SparklesIcon data-icon="inline-start" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/generator-form.tsx
git commit -m "feat: create GeneratorForm with style sections, palette, and count"
```

---

### Task 5: Wire sidebar-right to use GeneratorForm

**Files:**
- Modify: `apps/app/src/app/components/sidebar-right.tsx`

- [ ] **Step 1: Replace placeholder with GeneratorForm**

```tsx
import * as React from 'react'
import { NavUser } from '@/components/nav-user'
import { GeneratorForm, type GenerateRequest } from '@/components/generator-form'
import {
  Sidebar,
  SidebarHeader,
} from '@/components/ui/sidebar'
import type { User } from '@/lib/api'

export function SidebarRight({
  user,
  onGenerate,
  generating,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User
  onGenerate: (request: GenerateRequest) => void
  generating: boolean
}) {
  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <NavUser user={{ ...user, avatar: '' }} />
      </SidebarHeader>
      <GeneratorForm onGenerate={onGenerate} generating={generating} />
    </Sidebar>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`
(Will have errors for App.tsx not passing new props yet — expected.)

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/components/sidebar-right.tsx
git commit -m "feat: wire sidebar-right to GeneratorForm"
```

---

### Task 6: Wire App.tsx with pending generations state

**Files:**
- Modify: `apps/app/src/app/App.tsx`

- [ ] **Step 1: Add pending state and onGenerate handler to ProjectLayout**

Update imports and add the generate handler. The key changes:
- Add `PendingGeneration` type and `pendingGenerations` state
- Add `onGenerate` that creates placeholders, fires API, replaces on success
- Pass `onGenerate`, `generating`, `pendingGenerations` down to sidebar and dashboard
- Refresh generations list after success

Replace the `ProjectLayout` function entirely:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { SidebarLeft } from '@/components/sidebar-left'
import { SidebarRight } from '@/components/sidebar-right'
import { ProjectDashboard } from '@/pages/project-dashboard'
import { NoProject } from '@/pages/no-project'
import { apiFetch, type User, type Project, type Generation } from '@/lib/api'
import type { GenerateRequest } from '@/components/generator-form'

export interface PendingGeneration {
  id: string
  prompt: string
  error?: string
}

function ProjectLayout({
  user,
  projects,
  onProjectCreated,
}: {
  user: User
  projects: Project[]
  onProjectCreated: () => Promise<void>
}) {
  const { projectId } = useParams()
  const currentProject = projects.find(p => p.id === projectId)
  const [pendingGenerations, setPendingGenerations] = useState<PendingGeneration[]>([])
  const [completedGenerations, setCompletedGenerations] = useState<Generation[]>([])
  const [generating, setGenerating] = useState(false)
  const refreshRef = useRef<() => void>(() => {})

  const onGenerate = async (request: GenerateRequest) => {
    if (!projectId) return
    setGenerating(true)

    const pendingIds = Array.from({ length: request.count }, (_, i) => `pending-${Date.now()}-${i}`)
    const pending: PendingGeneration[] = pendingIds.map(id => ({ id, prompt: request.prompt }))
    setPendingGenerations(prev => [...pending, ...prev])

    try {
      const res = await apiFetch(`/v1/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!res.ok) {
        const data = await res.json()
        const errMsg = data.error ?? 'Generation failed'
        setPendingGenerations(prev =>
          prev.map(p => pendingIds.includes(p.id) ? { ...p, error: errMsg } : p)
        )
        return
      }

      const data = await res.json()
      const newGenerations = data.images as Generation[]

      // Remove pending, add completed
      setPendingGenerations(prev => prev.filter(p => !pendingIds.includes(p.id)))
      setCompletedGenerations(prev => [...newGenerations, ...prev])

      // Refresh sidebar recent generations
      refreshRef.current()
    } catch {
      setPendingGenerations(prev =>
        prev.map(p => pendingIds.includes(p.id) ? { ...p, error: 'Network error' } : p)
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <SidebarProvider>
      <SidebarLeft
        projects={projects}
        currentProjectId={projectId}
        onProjectCreated={onProjectCreated}
      />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    {currentProject?.name ?? 'Project'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <ProjectDashboard
          pendingGenerations={pendingGenerations}
          completedGenerations={completedGenerations}
          onRefreshRef={refreshRef}
        />
      </SidebarInset>
      <SidebarRight user={user} onGenerate={onGenerate} generating={generating} />
    </SidebarProvider>
  )
}
```

Keep the `App` function unchanged.

- [ ] **Step 2: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`
(Will have errors for ProjectDashboard props — fixed next.)

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/App.tsx
git commit -m "feat: add pending generations state and onGenerate handler"
```

---

### Task 7: Update ProjectDashboard to show placeholders

**Files:**
- Modify: `apps/app/src/app/pages/project-dashboard.tsx`

- [ ] **Step 1: Update to accept pending/completed props**

```tsx
import { useEffect, useState, useCallback, type MutableRefObject } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Trash2Icon, ImageIcon } from 'lucide-react'
import { apiFetch, type Generation } from '@/lib/api'
import { GenerationPlaceholder } from '@/components/generation-placeholder'
import type { PendingGeneration } from '@/App'

const IMAGES_DOMAIN = (window as any).__CONFIG__?.imagesDomain ?? 'imagen.publingo.com'

export function ProjectDashboard({
  pendingGenerations,
  completedGenerations,
  onRefreshRef,
}: {
  pendingGenerations: PendingGeneration[]
  completedGenerations: Generation[]
  onRefreshRef: MutableRefObject<() => void>
}) {
  const { projectId } = useParams()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  const loadGenerations = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/v1/projects/${projectId}/generations`)
      if (res.ok) {
        const data = await res.json()
        setGenerations(data.generations)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadGenerations()
  }, [loadGenerations])

  // Expose refresh to parent
  useEffect(() => {
    onRefreshRef.current = loadGenerations
  }, [loadGenerations, onRefreshRef])

  const deleteGeneration = async (id: string) => {
    const res = await apiFetch(`/v1/generations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGenerations(prev => prev.filter(g => g.id !== id))
    }
  }

  // Merge completed (from generate) with loaded (from API), deduplicate by id
  const allGenerations = [...completedGenerations, ...generations]
  const seen = new Set<string>()
  const uniqueGenerations = allGenerations.filter(g => {
    if (seen.has(g.id)) return false
    seen.add(g.id)
    return true
  })

  const hasPending = pendingGenerations.length > 0
  const hasGenerations = uniqueGenerations.length > 0
  const isEmpty = !hasPending && !hasGenerations && !loading

  if (loading && !hasPending && !hasGenerations) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
          <ImageIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No generations yet. Use the generator on the right to create your first illustration.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
      {/* Pending placeholders */}
      {pendingGenerations.map((p) => (
        <GenerationPlaceholder key={p.id} prompt={p.prompt} error={p.error} />
      ))}

      {/* Real generations */}
      {uniqueGenerations.map((gen) => {
        const renderings = gen.renderings ? JSON.parse(gen.renderings) as string[] : []
        const imgUrl = `https://${IMAGES_DOMAIN}/${gen.storagePath}transparent.png`
        return (
          <div key={gen.id} className="group relative overflow-hidden rounded-lg border bg-card">
            <div className="aspect-square bg-muted/30">
              <img
                src={imgUrl}
                alt={gen.prompt}
                className="size-full object-contain p-2"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium">{gen.prompt}</p>
              <div className="mt-1 flex items-center gap-1">
                {renderings.map((r) => (
                  <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteGeneration(gen.id)}
            >
              <Trash2Icon className="size-3" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/app/src/app/
git commit -m "feat: wire generator form with optimistic generation placeholders"
```

---

### Task 8: Test the full flow

- [ ] **Step 1: Rebuild docker**

```bash
npm run docker
```

- [ ] **Step 2: Test the generator form**

1. Open `https://igen.publingo.kom` and navigate to a project
2. Right sidebar should show the generator form with prompt, style sections, palette, count
3. Type a prompt, optionally select some styles
4. Click Generate — placeholder cards should appear with progress bars
5. After ~30s, real images should replace the placeholders
6. Left sidebar recent generations should update