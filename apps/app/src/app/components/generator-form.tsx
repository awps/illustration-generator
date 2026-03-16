import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { StyleSection } from '@/components/style-section'
import { STYLE_OPTIONS, STYLE_LABELS, type StyleCategory } from '@/lib/style-options'
import { SparklesIcon } from 'lucide-react'

export interface GenerateRequest {
  prompt: string
  palette?: string[]
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

export function GeneratorForm({
  onGenerate,
  generating,
}: {
  onGenerate: (request: GenerateRequest) => void
  generating: boolean
}) {
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(1)
  const [selections, setSelections] = useState<Record<StyleCategory, string[]>>({
    renderings: [],
    elements: [],
    compositions: [],
    moods: [],
    complexities: [],
    layouts: [],
    subjects: [],
    iconStyles: [],
    placements: [],
  })
  const [paletteColor, setPaletteColor] = useState('')
  const [paletteStyle, setPaletteStyle] = useState('')
  const [paletteTopic, setPaletteTopic] = useState('')

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

    const paletteFilters = [paletteColor, paletteStyle, paletteTopic].filter(Boolean)

    const request: GenerateRequest = {
      prompt: prompt.trim(),
      count,
      ...(paletteFilters.length > 0 && { palette: paletteFilters }),
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

        {/* Palette filters */}
        <div className="border-b border-sidebar-border p-4">
          <Label className="mb-2 text-xs font-medium">Palette (optional)</Label>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Color (e.g. blue)"
              value={paletteColor}
              onChange={(e) => setPaletteColor(e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Style (e.g. pastel)"
              value={paletteStyle}
              onChange={(e) => setPaletteStyle(e.target.value)}
              className="h-7 text-xs"
            />
            <Input
              placeholder="Topic (e.g. nature)"
              value={paletteTopic}
              onChange={(e) => setPaletteTopic(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
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