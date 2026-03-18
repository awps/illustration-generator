import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TEMPLATES, type Template } from '@/lib/compose-templates'

export function TemplatePicker({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (template: Template) => void
}) {
  const [customW, setCustomW] = useState('1200')
  const [customH, setCustomH] = useState('630')

  return (
    <div className="border-b border-sidebar-border p-4">
      <Label className="mb-2 text-xs font-medium">Template</Label>
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              activeId === t.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            }`}
          >
            {t.name}
            <span className="ml-1 text-[10px] opacity-60">{t.width}×{t.height}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          className="h-7 w-20 text-xs"
          value={customW}
          onChange={(e) => setCustomW(e.target.value)}
          placeholder="W"
        />
        <span className="text-xs text-muted-foreground">×</span>
        <Input
          className="h-7 w-20 text-xs"
          value={customH}
          onChange={(e) => setCustomH(e.target.value)}
          placeholder="H"
        />
        <Button
          size="xs"
          variant="outline"
          onClick={() => {
            const w = Number(customW) || 1200
            const h = Number(customH) || 630
            onSelect({ id: 'custom', name: 'Custom', width: w, height: h })
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
