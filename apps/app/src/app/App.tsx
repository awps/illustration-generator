import { useState, useEffect, useCallback, useRef } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { SidebarLeft } from '@/components/sidebar-left'
import { ProjectDashboard } from '@/pages/project-dashboard'
import { ComposePage } from '@/pages/compose'
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
  const [generating, setGenerating] = useState(false)
  const refreshRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    setPendingGenerations([])
  }, [projectId])

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

      setPendingGenerations(prev => prev.filter(p => !pendingIds.includes(p.id)))
      await refreshRef.current()
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
        user={user}
        projects={projects}
        currentProjectId={projectId}
        onProjectCreated={onProjectCreated}
        onGenerate={onGenerate}
        generating={generating}
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
          onRefreshRef={refreshRef}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)

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
        return loadProjects()
      })
      .then(() => setLoaded(true))
  }, [loadProjects])

  if (!user || !loaded) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>

  if (projects.length === 0) {
    return <NoProject onProjectCreated={loadProjects} />
  }

  return (
    <Routes>
      <Route path="/projects/:projectId/generations/:generationId/compose" element={<ComposePage />} />
      <Route path="/projects/:projectId" element={
        <ProjectLayout user={user} projects={projects} onProjectCreated={loadProjects} />
      } />
      <Route path="*" element={<Navigate to={`/projects/${projects[0]!.id}`} replace />} />
    </Routes>
  )
}
