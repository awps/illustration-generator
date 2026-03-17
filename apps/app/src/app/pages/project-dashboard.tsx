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
  onRefreshRef,
}: {
  pendingGenerations: PendingGeneration[]
  onRefreshRef: MutableRefObject<() => Promise<void>>
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

  useEffect(() => {
    onRefreshRef.current = loadGenerations
  }, [loadGenerations, onRefreshRef])

  const deleteGeneration = async (id: string) => {
    const res = await apiFetch(`/v1/generations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setGenerations(prev => prev.filter(g => g.id !== id))
    }
  }

  const hasPending = pendingGenerations.length > 0
  const hasGenerations = generations.length > 0
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 p-4">
      {pendingGenerations.map((p) => (
        <GenerationPlaceholder key={p.id} prompt={p.prompt} error={p.error} />
      ))}

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