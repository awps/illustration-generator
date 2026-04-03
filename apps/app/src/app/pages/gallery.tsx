import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch, type Generation } from '@/lib/api'
import { GenerationCard } from '@/components/generation-card'
import { ImageIcon } from 'lucide-react'

export function GalleryPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(async (cursor?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      const res = await apiFetch(`/v1/generations?${params}`)
      const data = await res.json()
      const fetched = data.generations ?? []
      setGenerations((prev) => cursor ? [...prev, ...fetched] : fetched)
      setNextCursor(data.nextCursor ?? null)
    } catch { /* ignore */ }
    setLoading(false)
    setInitialLoad(false)
  }, [])

  useEffect(() => {
    fetchPage()
  }, [fetchPage])

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loading) {
          fetchPage(nextCursor)
        }
      },
      { root: listRef.current, threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nextCursor, loading, fetchPage])

  if (initialLoad) {
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
        <p className="text-sm text-muted-foreground">No illustrations yet.</p>
      </div>
    )
  }

  return (
    <div ref={listRef} className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 p-4">
        {generations.map((gen) => (
          <GenerationCard key={gen.id} generation={gen} />
        ))}
      </div>

      {nextCursor && !loading && (
        <div className="px-4 pb-4">
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
            onClick={() => fetchPage(nextCursor)}
          >
            Load more
          </Button>
        </div>
      )}

      {loading && (
        <p className="py-4 text-center text-xs text-muted-foreground">Loading...</p>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  )
}
