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

export function RecentGenerations({ projectId, refreshKey }: { projectId?: string; refreshKey?: number }) {
  const [generations, setGenerations] = useState<Generation[]>([])

  useEffect(() => {
    if (!projectId) return
    apiFetch(`/v1/projects/${projectId}/generations`)
      .then(res => res.ok ? res.json() : { generations: [] })
      .then(data => setGenerations(data.generations.slice(0, 10)))
  }, [projectId, refreshKey])

  if (!projectId || generations.length === 0) return null

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Generations</SidebarGroupLabel>
      <SidebarMenu>
        {generations.map((gen) => {
          const renderings = gen.renderings ? JSON.parse(gen.renderings) as string[] : []
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