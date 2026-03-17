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
  projectId,
  onGenerate,
  generating,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: User
  projectId?: string
  onGenerate: (request: GenerateRequest) => void
  generating: boolean
}) {
  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh border-l lg:flex"
      {...props}
    >
      <SidebarHeader className="h-16 shrink-0 border-b border-sidebar-border">
        <NavUser user={{ ...user, avatar: '' }} />
      </SidebarHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        <GeneratorForm projectId={projectId} onGenerate={onGenerate} generating={generating} />
      </div>
    </Sidebar>
  )
}
