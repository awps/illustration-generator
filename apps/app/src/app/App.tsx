import { useState, useEffect, useCallback } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { SidebarLeft } from "@/components/sidebar-left"
import { SidebarRight } from "@/components/sidebar-right"

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Project {
  id: string
  name: string
  description: string | null
  url: string | null
  createdAt: string
}

const apiUrl = (window as any).__CONFIG__?.apiUrl ?? 'https://api-imagen.publingo.com'

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { credentials: 'include', ...init })
}

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [newProjectName, setNewProjectName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setError('')
    setLoading(true)
    try {
      const res = await apiFetch('/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Failed to create project')
        return
      }
      setNewProjectName('')
      await loadProjects()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"?`)) return

    setError('')
    const res = await apiFetch(`/v1/projects/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.message ?? 'Failed to delete project')
      return
    }
    await loadProjects()
  }

  if (!user) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>

  return (
    <SidebarProvider>
      <SidebarLeft />
      <SidebarInset>
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    Project Management & Task Tracking
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="mx-auto h-24 w-full max-w-3xl rounded-xl bg-muted/50" />
          <div className="mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/50" />
        </div>
      </SidebarInset>
      <SidebarRight />
    </SidebarProvider>
    // <SidebarProvider>
    //   <AppSidebar user={user} />
    //   <SidebarInset>
    //     <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
    //       <SidebarTrigger className="-ml-1" />
    //       <Separator orientation="vertical" className="mr-2 h-4" />
    //       <Breadcrumb>
    //         <BreadcrumbList>
    //           <BreadcrumbItem>
    //             <BreadcrumbPage>Projects</BreadcrumbPage>
    //           </BreadcrumbItem>
    //         </BreadcrumbList>
    //       </Breadcrumb>
    //     </header>
    //
    //     <div className="flex flex-1 flex-col gap-4 p-4">
    //       <form onSubmit={createProject} className="flex gap-2">
    //         <Input
    //           placeholder="Project name"
    //           value={newProjectName}
    //           onChange={(e) => setNewProjectName(e.target.value)}
    //           disabled={loading}
    //           className="max-w-sm"
    //         />
    //         <Button type="submit" disabled={loading || !newProjectName.trim()} size="sm">
    //           <PlusIcon data-icon="inline-start" />
    //           {loading ? 'Creating...' : 'Create'}
    //         </Button>
    //       </form>
    //
    //       {error && <p className="text-sm text-destructive">{error}</p>}
    //
    //       {projects.length === 0 ? (
    //         <p className="text-sm text-muted-foreground">No projects yet. Create one above.</p>
    //       ) : (
    //         <div className="grid gap-2">
    //           {projects.map((project) => (
    //             <div key={project.id} className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
    //               <div className="flex flex-col gap-0.5">
    //                 <span className="font-medium">{project.name}</span>
    //                 {project.description && <span className="text-xs text-muted-foreground">{project.description}</span>}
    //                 {project.url && <span className="text-xs text-muted-foreground">{project.url}</span>}
    //               </div>
    //               <Button
    //                 variant="ghost"
    //                 size="icon-sm"
    //                 onClick={() => deleteProject(project.id, project.name)}
    //               >
    //                 <Trash2Icon />
    //               </Button>
    //             </div>
    //           ))}
    //         </div>
    //       )}
    //     </div>
    //   </SidebarInset>
    // </SidebarProvider>
  )
}
