import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StyleSection } from '@/components/style-section'
import { PaletteBrowser } from '@/components/palette-browser'
import { STYLE_OPTIONS, STYLE_LABELS, type StyleCategory } from '@/lib/style-options'
import { SparklesIcon, PaletteIcon, XIcon } from 'lucide-react'

export interface GenerateRequest {
  prompt: string
  palette?: string
  count: number
  renderings?: string[]
  elements?: string[]
  compositions?: string[]
  moods?: string[]
  complexities?: string[]
  layouts?: string[]
  subjects?: string[]
  iconStyles?: string[]
  placements?: string[]
}

interface SelectedPalette {
  id: string
  colors: string[]
}

interface SavedFilters {
  selections: Record<StyleCategory, string[]>
  selectedPalette: SelectedPalette | null
  count: number
}

const emptySelections: Record<StyleCategory, string[]> = {
  renderings: [],
  elements: [],
  compositions: [],
  moods: [],
  complexities: [],
  layouts: [],
  subjects: [],
  iconStyles: [],
  placements: [],
}

function loadFilters(projectId?: string): SavedFilters {
  if (!projectId) return { selections: emptySelections, selectedPalette: null, count: 1 }
  try {
    const raw = localStorage.getItem(`gen-filters:${projectId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { selections: emptySelections, selectedPalette: null, count: 1 }
}

export function GeneratorForm({
  projectId,
  onGenerate,
  generating,
}: {
  projectId?: string
  onGenerate: (request: GenerateRequest) => void
  generating: boolean
}) {
  const saved = loadFilters(projectId)
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(saved.count)
  const [selections, setSelections] = useState<Record<StyleCategory, string[]>>(saved.selections)
  const [selectedPalette, setSelectedPalette] = useState<SelectedPalette | null>(saved.selectedPalette)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Restore filters when switching projects
  useEffect(() => {
    const s = loadFilters(projectId)
    setSelections(s.selections)
    setSelectedPalette(s.selectedPalette)
    setCount(s.count)
  }, [projectId])

  // Persist filters on change
  const saveFilters = useCallback(() => {
    if (!projectId) return
    const data: SavedFilters = { selections, selectedPalette, count }
    localStorage.setItem(`gen-filters:${projectId}`, JSON.stringify(data))
  }, [projectId, selections, selectedPalette, count])

  useEffect(() => {
    saveFilters()
  }, [saveFilters])

  const toggleOption = (category: StyleCategory, value: string) => {
    setSelections(prev => {
      const current = prev[category]
      return {
        ...prev,
        [category]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      }
    })
  }

  const handleGenerate = () => {
    if (!prompt.trim()) return

    const request: GenerateRequest = {
      prompt: prompt.trim(),
      count,
      ...(selectedPalette && { palette: selectedPalette.id }),
    }

    for (const [key, values] of Object.entries(selections)) {
      if (values.length > 0) {
        (request as any)[key] = values
      }
    }

    onGenerate(request)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Prompt */}
        <div className="border-b border-sidebar-border p-4">
          <Label htmlFor="prompt" className="mb-2 text-xs font-medium">Prompt</Label>
          <Textarea
            id="prompt"
            placeholder="Describe your illustration..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            rows={3}
            className="resize-none text-sm"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{prompt.length}/500</p>
        </div>

        {/* Style sections */}
        {(Object.keys(STYLE_OPTIONS) as StyleCategory[]).map((category) => (
          <StyleSection
            key={category}
            label={STYLE_LABELS[category]}
            options={STYLE_OPTIONS[category]}
            selected={selections[category]}
            onToggle={(value) => toggleOption(category, value)}
          />
        ))}

        {/* Palette */}
        <div className="border-b border-sidebar-border p-4">
          <Label className="mb-2 text-xs font-medium">Palette</Label>
          {selectedPalette ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex h-7 flex-1 overflow-hidden rounded border border-input"
              >
                {selectedPalette.colors.map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedPalette(null)}
              >
                <XIcon className="size-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs text-muted-foreground"
              onClick={() => setPaletteOpen(true)}
            >
              <PaletteIcon className="size-3" />
              Choose palette...
            </Button>
          )}
          <PaletteBrowser
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            selectedId={selectedPalette?.id ?? null}
            onSelect={(p) => setSelectedPalette(p ? { id: p.id, colors: p.colors } : null)}
          />
        </div>

        {/* Count */}
        <div className="p-4">
          <Label className="mb-2 text-xs font-medium">Count</Label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate button — sticky bottom */}
      <div className="border-t border-sidebar-border p-4">
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="w-full"
        >
          <SparklesIcon data-icon="inline-start" />
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    </div>
  )
}