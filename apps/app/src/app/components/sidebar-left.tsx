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
  generationCounter,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  projects: Project[]
  currentProjectId?: string
  onProjectCreated: () => Promise<void>
  generationCounter?: number
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
        <RecentGenerations projectId={currentProjectId} refreshKey={generationCounter} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
