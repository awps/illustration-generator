import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Trash2Icon, CopyIcon } from 'lucide-react'
import type { Generation } from '@/lib/api'
import { STYLE_LABELS, type StyleCategory } from '@/lib/style-options'

const IMAGES_DOMAIN = (window as any).__CONFIG__?.imagesDomain ?? 'imagen.publingo.com'

const STYLE_FIELDS: { key: keyof Generation; category: StyleCategory }[] = [
  { key: 'renderings', category: 'renderings' },
  { key: 'elements', category: 'elements' },
  { key: 'compositions', category: 'compositions' },
  { key: 'moods', category: 'moods' },
  { key: 'complexities', category: 'complexities' },
  { key: 'layouts', category: 'layouts' },
  { key: 'subjects', category: 'subjects' },
  { key: 'iconStyles', category: 'iconStyles' },
  { key: 'placements', category: 'placements' },
]

function parseTags(value: string | null): string[] {
  if (!value) return []
  try { return JSON.parse(value) as string[] } catch { return [] }
}

export function GenerationCard({
  generation,
  onDelete,
}: {
  generation: Generation
  onDelete?: (id: string) => void
}) {
  const paletteColors = generation.paletteColors ?? undefined
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const imgUrl = `https://${IMAGES_DOMAIN}/${generation.storagePath}transparent.png`

  // Collect all non-empty style tags
  const allTags: { label: string; values: string[] }[] = []
  for (const { key, category } of STYLE_FIELDS) {
    const values = parseTags(generation[key] as string | null)
    if (values.length > 0) allTags.push({ label: STYLE_LABELS[category], values })
  }

  const handleUseConfig = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Build config object and store in sessionStorage for the generator form to pick up
    const config: Record<string, any> = {}
    for (const { key, category } of STYLE_FIELDS) {
      const values = parseTags(generation[key] as string | null)
      if (values.length > 0) config[category] = values
    }
    if (generation.paletteId) {
      config.paletteId = generation.paletteId
      if (generation.paletteColors) config.paletteColors = generation.paletteColors
    }
    config.prompt = generation.prompt
    sessionStorage.setItem('gen-prefill', JSON.stringify(config))
    window.dispatchEvent(new Event('gen-prefill'))
    navigate(`/projects/${generation.projectId}`)
  }

  return (
    <>
      <Link
        to={`/compose/${generation.id}`}
        className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/50"
      >
        <div className="aspect-square bg-muted/30">
          <img
            src={imgUrl}
            alt={generation.prompt}
            className="size-full object-contain p-2"
            loading="lazy"
          />
        </div>
        <div className="p-2">
          <p className="truncate text-xs font-medium">{generation.prompt}</p>

          {/* Style tags */}
          {allTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {allTags.flatMap(({ values }) =>
                values.map((v) => (
                  <span key={v} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {v}
                  </span>
                ))
              )}
            </div>
          )}

          {/* Palette */}
          {paletteColors && paletteColors.length > 0 && (
            <div className="mt-1.5 flex h-3 overflow-hidden rounded">
              {paletteColors.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            title="Use this config"
            onClick={handleUseConfig}
          >
            <CopyIcon className="size-3" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
              title="Delete"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setConfirmDelete(true)
              }}
            >
              <Trash2Icon className="size-3" />
            </Button>
          )}
        </div>
      </Link>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete illustration?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(generation.id)
                setConfirmDelete(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}