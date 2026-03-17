import * as React from 'react'
import { ProjectSwitcher } from '@/components/project-switcher'
import { NavUser } from '@/components/nav-user'
import { GeneratorForm, type GenerateRequest } from '@/components/generator-form'
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { Project, User } from '@/lib/api'

export function SidebarLeft({
  user,
  projects,
  currentProjectId,
  onProjectCreated,
  onGenerate,
  generating,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User
  projects: Project[]
  currentProjectId?: string
  onProjectCreated: () => Promise<void>
  onGenerate: (request: GenerateRequest) => void
  generating: boolean
}) {
  return (
    <Sidebar className="flex h-svh flex-col border-r-0" {...props}>
      <SidebarHeader className="shrink-0">
        <ProjectSwitcher
          projects={projects}
          currentProjectId={currentProjectId}
          onProjectCreated={onProjectCreated}
        />
      </SidebarHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        <GeneratorForm projectId={currentProjectId} onGenerate={onGenerate} generating={generating} />
      </div>
      <SidebarFooter className="shrink-0">
        <NavUser user={{ ...user, avatar: '' }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
