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