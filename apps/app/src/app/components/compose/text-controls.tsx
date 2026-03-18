import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { FONT_FAMILIES } from '@/lib/compose-templates'
import { PlusIcon, Trash2Icon, BoldIcon, ItalicIcon } from 'lucide-react'
import type { IText } from 'fabric'

export function TextControls({
  selectedText,
  onAddText,
  onUpdate,
  onDelete,
}: {
  selectedText: IText | null
  onAddText: () => void
  onUpdate: () => void
  onDelete: () => void
}) {
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]!.value)
  const [color, setColor] = useState('#ffffff')
  const [bold, setBold] = useState(true)
  const [italic, setItalic] = useState(false)

  useEffect(() => {
    if (!selectedText) return
    setFontSize(selectedText.fontSize ?? 48)
    setFontFamily(selectedText.fontFamily ?? FONT_FAMILIES[0]!.value)
    setColor((selectedText.fill as string) ?? '#ffffff')
    setBold(selectedText.fontWeight === 'bold')
    setItalic(selectedText.fontStyle === 'italic')
  }, [selectedText])

  const apply = (props: Record<string, any>) => {
    if (!selectedText) return
    selectedText.set(props)
    onUpdate()
  }

  return (
    <div className="border-b border-sidebar-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-medium">Text</Label>
        <Button size="icon-xs" variant="outline" onClick={onAddText}>
          <PlusIcon className="size-3" />
        </Button>
      </div>

      {selectedText ? (
        <div className="flex flex-col gap-2">
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value)
              apply({ fontFamily: e.target.value })
            }}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.id} value={f.value}>{f.name}</option>
            ))}
          </select>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Size</span>
              <span className="text-[10px] text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={([v]) => {
                const size = v ?? 48
                setFontSize(size)
                apply({ fontSize: size })
              }}
              min={12}
              max={120}
              step={1}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value)
                apply({ fill: e.target.value })
              }}
              className="h-7 w-10 cursor-pointer p-0.5"
            />
            <Button
              size="icon-xs"
              variant={bold ? 'default' : 'outline'}
              onClick={() => {
                const next = !bold
                setBold(next)
                apply({ fontWeight: next ? 'bold' : 'normal' })
              }}
            >
              <BoldIcon className="size-3" />
            </Button>
            <Button
              size="icon-xs"
              variant={italic ? 'default' : 'outline'}
              onClick={() => {
                const next = !italic
                setItalic(next)
                apply({ fontStyle: next ? 'italic' : 'normal' })
              }}
            >
              <ItalicIcon className="size-3" />
            </Button>
            <Button size="icon-xs" variant="ghost" onClick={onDelete} className="ml-auto">
              <Trash2Icon className="size-3" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Click "+" to add text, then select it on canvas to edit.</p>
      )}
    </div>
  )
}
