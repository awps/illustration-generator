import * as React from 'react'

import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { FolderIcon, ImageIcon, PaletteIcon, SettingsIcon } from 'lucide-react'

const navItems = [
  { title: 'Projects', icon: FolderIcon, isActive: true },
  { title: 'Generate', icon: ImageIcon },
  { title: 'Palettes', icon: PaletteIcon },
  { title: 'Settings', icon: SettingsIcon },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: { id: string; email: string; name: string; role: string }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const [active, setActive] = React.useState('Projects')

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ImageIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Illustragen</span>
                  <span className="truncate text-xs">Image Generator</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active === item.title}
                    onClick={() => setActive(item.title)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: '' }} />
      </SidebarFooter>
    </Sidebar>
  )
}
