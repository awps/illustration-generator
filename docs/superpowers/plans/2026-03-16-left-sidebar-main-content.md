# Left Sidebar + Main Content + Routing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the sidebar-15 layout to real API data with React Router — project switcher, generation grid, and URL-driven state.

**Architecture:** React Router v7 provides URL-based state (`/projects/:projectId`). App.tsx fetches user + projects on mount, passes them down. Each page component fetches its own data based on URL params. Sidebar components receive props instead of hard-coded data.

**Tech Stack:** React 19, React Router v7, shadcn/ui, Tailwind CSS, Hono (worker SSR)

**Spec:** `docs/superpowers/specs/2026-03-16-left-sidebar-main-content-design.md`

---

## Chunk 1: Setup + Routing

### Task 1: Install dependencies and add shadcn dialog

**Files:**
- Modify: `apps/app/package.json`

- [ ] **Step 1: Install react-router**

```bash
cd apps/app && npm install react-router
```

- [ ] **Step 2: Add shadcn dialog component**

```bash
cd apps/app && npx shadcn@latest add dialog
```

Fix any `src/app/` → `@/` imports if shadcn writes literal paths:

```bash
find src/app -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|from "src/app/|from "@/|g'
```

- [ ] **Step 3: Commit**

```bash
git add apps/app/
git commit -m "feat: add react-router and shadcn dialog dependencies"
```

---

### Task 2: Add shared API helper and types

**Files:**
- Create: `apps/app/src/app/lib/api.ts`

- [ ] **Step 1: Create the API helper and shared types**

```ts
const apiUrl = (window as any).__CONFIG__?.apiUrl ?? 'https://api-imagen.publingo.com'

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { credentials: 'include', ...init })
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  url: string | null
  createdAt: string
}

export interface Generation {
  id: string
  projectId: string
  prompt: string
  paletteId: string | null
  renderings: string | null
  elements: string | null
  compositions: string | null
  storagePath: string
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/lib/api.ts
git commit -m "feat: add shared API helper and types"
```

---

### Task 3: Set up React Router in main.tsx and App.tsx

**Files:**
- Modify: `apps/app/src/app/main.tsx`
- Modify: `apps/app/src/app/App.tsx`

- [ ] **Step 1: Add BrowserRouter to main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './index.css'
import { App } from './App'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
)
```

- [ ] **Step 2: Rewrite App.tsx with Routes**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { SidebarLeft } from '@/components/sidebar-left'
import { SidebarRight } from '@/components/sidebar-right'
import { ProjectDashboard } from '@/pages/project-dashboard'
import { NoProject } from '@/pages/no-project'
import { apiFetch, type User, type Project } from '@/lib/api'

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
        <ProjectDashboard />
      </SidebarInset>
      <SidebarRight user={user} />
    </SidebarProvider>
  )
}

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])

  const loadProjects = useCallback(async () => {
    const res = await apiFetch('/v1/projects')
    if (res.ok) {
      const data = await res.json()
      setProjects(data.projects)
    }
  }, [])

  useEffect(() => {
    apiFetch('/v1/user')
      .then((res) => res.json())
      .then((data: { user: User }) => {
        setUser(data.user)
        loadProjects()
      })
  }, [loadProjects])

  if (!user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>

  if (projects.length === 0) {
    return <NoProject onProjectCreated={loadProjects} />
  }

  return (
    <Routes>
      <Route path="/projects/:projectId/*" element={
        <ProjectLayout user={user} projects={projects} onProjectCreated={loadProjects} />
      } />
      <Route path="*" element={<Navigate to={`/projects/${projects[0]!.id}`} replace />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Create placeholder pages**

Create `apps/app/src/app/pages/project-dashboard.tsx`:

```tsx
import { useParams } from 'react-router'

export function ProjectDashboard() {
  const { projectId } = useParams()
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">Project: {projectId}</p>
    </div>
  )
}
```

Create `apps/app/src/app/pages/no-project.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { ImageIcon } from 'lucide-react'

export function NoProject({ onProjectCreated }: { onProjectCreated: () => Promise<void> }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Failed to create project')
        return
      }
      const { project } = await res.json()
      await onProjectCreated()
      navigate(`/projects/${project.id}`)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Welcome to Illustragen</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your first project to start generating illustrations.</p>
        </div>
        <form onSubmit={create} className="flex w-full gap-2">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`

(Will have errors for SidebarLeft/SidebarRight props changes — that's expected, fixed in next tasks.)

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/app/
git commit -m "feat: add React Router with project routes and placeholder pages"
```

---

## Chunk 2: Sidebar components

### Task 4: Create ProjectSwitcher (replaces TeamSwitcher)

**Files:**
- Create: `apps/app/src/app/components/project-switcher.tsx`

- [ ] **Step 1: Create the component**

```tsx
import * as React from 'react'
import { useNavigate } from 'react-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDownIcon, PlusIcon, FolderIcon, CheckIcon } from 'lucide-react'
import { apiFetch, type Project } from '@/lib/api'

export function ProjectSwitcher({
  projects,
  currentProjectId,
  onProjectCreated,
}: {
  projects: Project[]
  currentProjectId?: string
  onProjectCreated: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const activeProject = projects.find(p => p.id === currentProjectId)

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          url: url.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Failed to create project')
        return
      }
      const { project } = await res.json()
      setName('')
      setDescription('')
      setUrl('')
      setOpen(false)
      await onProjectCreated()
      navigate(`/projects/${project.id}`)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <FolderIcon className="size-3" />
              </div>
              <span className="truncate font-medium">
                {activeProject?.name ?? 'Select project'}
              </span>
              <ChevronDownIcon className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-lg" align="start" side="bottom" sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Projects
            </DropdownMenuLabel>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-xs border">
                  <FolderIcon className="size-3" />
                </div>
                <span className="truncate">{project.name}</span>
                {project.id === currentProjectId && (
                  <CheckIcon className="ml-auto size-4 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem className="gap-2 p-2" onSelect={(e) => e.preventDefault()}>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <PlusIcon className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">Add Project</div>
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={createProject} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project-name">Name *</Label>
                    <Input
                      id="project-name"
                      placeholder="My project"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project-description">Description</Label>
                    <Input
                      id="project-description"
                      placeholder="Optional description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project-url">URL</Label>
                    <Input
                      id="project-url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={loading || !name.trim()}>
                    {loading ? 'Creating...' : 'Create Project'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/project-switcher.tsx
git commit -m "feat: create ProjectSwitcher component with add project modal"
```

---

### Task 5: Create RecentGenerations (replaces NavFavorites)

**Files:**
- Create: `apps/app/src/app/components/recent-generations.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ImageIcon } from 'lucide-react'
import { apiFetch, type Generation } from '@/lib/api'

export function RecentGenerations({ projectId }: { projectId?: string }) {
  const [generations, setGenerations] = useState<Generation[]>([])

  useEffect(() => {
    if (!projectId) return
    apiFetch(`/v1/projects/${projectId}/generations`)
      .then(res => res.ok ? res.json() : { generations: [] })
      .then(data => setGenerations(data.generations.slice(0, 10)))
  }, [projectId])

  if (!projectId || generations.length === 0) return null

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Generations</SidebarGroupLabel>
      <SidebarMenu>
        {generations.map((gen) => {
          const renderings = gen.renderings ? JSON.parse(gen.renderings) : []
          return (
            <SidebarMenuItem key={gen.id}>
              <SidebarMenuButton asChild>
                <Link to={`/projects/${projectId}/generations/${gen.id}`} title={gen.prompt}>
                  <ImageIcon className="size-4" />
                  <span className="truncate">{gen.prompt}</span>
                  {renderings[0] && (
                    <span className="ml-auto text-[10px] text-muted-foreground">{renderings[0]}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/app/src/app/components/recent-generations.tsx
git commit -m "feat: create RecentGenerations sidebar component"
```

---

### Task 6: Rewrite SidebarLeft and SidebarRight

**Files:**
- Modify: `apps/app/src/app/components/sidebar-left.tsx`
- Modify: `apps/app/src/app/components/sidebar-right.tsx`
- Delete: `apps/app/src/app/components/team-switcher.tsx`
- Delete: `apps/app/src/app/components/nav-favorites.tsx`
- Delete: `apps/app/src/app/components/nav-workspaces.tsx`
- Delete: `apps/app/src/app/components/nav-secondary.tsx`
- Delete: `apps/app/src/app/components/calendars.tsx`
- Delete: `apps/app/src/app/components/date-picker.tsx`

- [ ] **Step 1: Rewrite sidebar-left.tsx**

```tsx
import * as React from 'react'
import { ProjectSwitcher } from '@/components/project-switcher'
import { RecentGenerations } from '@/components/recent-generations'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { Project } from '@/lib/api'

export function SidebarLeft({
  projects,
  currentProjectId,
  onProjectCreated,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  projects: Project[]
  currentProjectId?: string
  onProjectCreated: () => Promise<void>
}) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <ProjectSwitcher
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectCreated={onProjectCreated}
        />
      </SidebarHeader>
      <SidebarContent>
        <RecentGenerations projectId={currentProjectId} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
```

- [ ] **Step 2: Rewrite sidebar-right.tsx**

```tsx
import * as React from 'react'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '@/components/ui/sidebar'
import type { User } from '@/lib/api'

export function SidebarRight({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User }) {
  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <NavUser user={{ ...user, avatar: '' }} />
      </SidebarHeader>
      <SidebarContent>
        <div className="p-4 text-sm text-muted-foreground">
          Generator form coming in next update.
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
```

- [ ] **Step 3: Delete unused components**

```bash
rm apps/app/src/app/components/team-switcher.tsx \
   apps/app/src/app/components/nav-favorites.tsx \
   apps/app/src/app/components/nav-workspaces.tsx \
   apps/app/src/app/components/nav-secondary.tsx \
   apps/app/src/app/components/calendars.tsx \
   apps/app/src/app/components/date-picker.tsx \
   apps/app/src/app/components/nav-main.tsx \
   apps/app/src/app/components/app-sidebar.tsx
```

- [ ] **Step 4: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/app/
git commit -m "feat: wire sidebars to real data, remove sample components"
```

---

## Chunk 3: Generation grid

### Task 7: Build the ProjectDashboard generation grid

**Files:**
- Modify: `apps/app/src/app/pages/project-dashboard.tsx`

- [ ] **Step 1: Implement the generation grid**

```tsx
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Trash2Icon, ImageIcon } from 'lucide-react'
import { apiFetch, type Generation } from '@/lib/api'

const IMAGES_DOMAIN = (window as any).__CONFIG__?.imagesDomain ?? 'imagen.publingo.com'

export function ProjectDashboard() {
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

  const deleteGeneration = async (id: string) => {
    const res = await apiFetch(`/v1/generations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGenerations(prev => prev.filter(g => g.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (generations.length === 0) {
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
      {generations.map((gen) => {
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

- [ ] **Step 2: Pass imagesDomain through shell template**

In `apps/app/src/worker/templates/shell.ts`, add `imagesDomain` to the config:

Update the script tag from:
```
window.__CONFIG__={apiUrl:"${apiUrl}"}
```
to:
```
window.__CONFIG__={apiUrl:"${apiUrl}",imagesDomain:"${imagesDomain}"}
```

And update the `shellPage` function signature to accept `imagesDomain`:

```ts
export function shellPage(apiUrl: string, imagesDomain: string): string {
```

Update the worker `index.ts` call to pass it:

```ts
return c.html(shellPage(c.env.API_URL, 'imagen.publingo.com'))
```

- [ ] **Step 3: Type-check**

Run: `cd apps/app && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/app/src/
git commit -m "feat: implement project dashboard with generation grid"
```

---

### Task 8: Rebuild docker and test

- [ ] **Step 1: Reset DB and rebuild**

```bash
npm run docker:reset-db
```

- [ ] **Step 2: Test the flow**

1. Open `https://imagen.publingo.kom` — should show "Welcome to Illustragen" with create project form
2. Create a project — should redirect to `/projects/:id` with empty grid
3. Project switcher dropdown should show the project
4. "Add Project" in dropdown should open dialog modal
5. Right sidebar should show user name + placeholder for generator