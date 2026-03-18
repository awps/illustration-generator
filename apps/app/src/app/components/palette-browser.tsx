import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { XIcon } from 'lucide-react'

interface Palette {
  id: string
  colors: string
  totalColors: number
  predominantColor: string
  style: string
  topic: string
}

interface PaletteFilters {
  predominantColor: string[]
  style: string[]
  topic: string[]
  totalColors: number[]
}

const PAGE_SIZE = 50

export function PaletteBrowser({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedId: string | null
  onSelect: (palette: { id: string; colors: string[] } | null) => void
}) {
  const [palettes, setPalettes] = useState<Palette[]>([])
  const [filters, setFilters] = useState<PaletteFilters | null>(null)
  const [color, setColor] = useState('')
  const [style, setStyle] = useState('')
  const [topic, setTopic] = useState('')
  const [totalColors, setTotalColors] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchFilters = useCallback(async () => {
    const res = await apiFetch('/v1/palettes/filters')
    if (res.ok) {
      const data = await res.json()
      setFilters(data)
    }
  }, [])

  const fetchPalettes = useCallback(async (reset: boolean, currentOffset: number) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(currentOffset) })
    if (color) params.set('color', color)
    if (style) params.set('style', style)
    if (topic) params.set('topic', topic)
    if (totalColors) params.set('totalColors', totalColors)

    const res = await apiFetch(`/v1/palettes?${params}`)
    if (res.ok) {
      const data = await res.json()
      const newPalettes = data.palettes as Palette[]
      if (reset) {
        setPalettes(newPalettes)
        scrollRef.current?.scrollTo(0, 0)
      } else {
        setPalettes(prev => [...prev, ...newPalettes])
      }
      setOffset(currentOffset + newPalettes.length)
      setHasMore(newPalettes.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [color, style, topic, totalColors])

  // Load filters once on open
  useEffect(() => {
    if (open && !filters) {
      fetchFilters()
    }
  }, [open, filters, fetchFilters])

  // Load palettes on open and when filters change
  useEffect(() => {
    if (open) {
      fetchPalettes(true, 0)
    }
  }, [open, color, style, topic, totalColors]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || loading || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      fetchPalettes(false, offset)
    }
  }

  const parseColors = (colorsStr: string): string[] => {
    try { return JSON.parse(colorsStr) } catch { return [] }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] !max-w-[80rem] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle>Choose a Palette</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
          <select value={color} onChange={(e) => setColor(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All Colors</option>
            {filters?.predominantColor.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All Styles</option>
            {filters?.style.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">All Topics</option>
            {filters?.topic.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={totalColors} onChange={(e) => setTotalColors(e.target.value)} className="h-7 rounded-md border border-input bg-background px-2 text-xs">
            <option value="">Any Count</option>
            {filters?.totalColors.map(v => <option key={v} value={String(v)}>{v} colors</option>)}
          </select>
          {selectedId && (
            <Button size="xs" variant="ghost" onClick={() => onSelect(null)} className="ml-auto text-muted-foreground">
              <XIcon className="size-3" />
              Clear selection
            </Button>
          )}
        </div>

        {/* Grid */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {palettes.map((p) => {
              const colors = parseColors(p.colors)
              const isSelected = p.id === selectedId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect({ id: p.id, colors })
                    onOpenChange(false)
                  }}
                  className={`rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex h-8 overflow-hidden rounded">
                    {colors.map((c, i) => (
                      <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{p.predominantColor}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{p.style}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{p.topic}</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">{p.totalColors}</span>
                  </div>
                </button>
              )
            })}
          </div>
          {loading && <p className="mt-4 text-center text-xs text-muted-foreground">Loading...</p>}
          {!loading && palettes.length === 0 && <p className="mt-4 text-center text-xs text-muted-foreground">No palettes found.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
