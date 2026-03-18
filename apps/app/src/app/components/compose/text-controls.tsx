import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FONT_FAMILIES } from '@/lib/compose-templates'
import { BoldIcon, ItalicIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from 'lucide-react'
import type { Textbox as IText } from 'fabric'

export function TextControls({
  selectedText,
  onUpdate,
}: {
  selectedText: IText | null
  onUpdate: () => void
}) {
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]!.value)
  const [color, setColor] = useState('#ffffff')
  const [bold, setBold] = useState(true)
  const [italic, setItalic] = useState(false)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')

  useEffect(() => {
    if (!selectedText) return
    setFontSize(selectedText.fontSize ?? 48)
    setFontFamily(selectedText.fontFamily ?? FONT_FAMILIES[0]!.value)
    setColor((selectedText.fill as string) ?? '#ffffff')
    setBold(selectedText.fontWeight === 'bold')
    setItalic(selectedText.fontStyle === 'italic')
    setTextAlign((selectedText.textAlign as 'left' | 'center' | 'right') ?? 'left')
  }, [selectedText])

  const apply = (props: Record<string, any>) => {
    if (!selectedText) return
    selectedText.set(props)
    onUpdate()
  }

  if (!selectedText) return null

  return (
    <div className="flex items-center gap-2">
      {/* Font family */}
      <select
        value={fontFamily}
        onChange={(e) => {
          setFontFamily(e.target.value)
          apply({ fontFamily: e.target.value })
        }}
        className="h-7 w-28 rounded-md border border-input bg-background px-1.5 text-xs"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.id} value={f.value}>{f.name}</option>
        ))}
      </select>

      <Separator orientation="vertical" className="h-6" />

      {/* Font size */}
      <Input
        type="number"
        value={fontSize}
        onChange={(e) => {
          const size = Number(e.target.value) || 48
          setFontSize(size)
          apply({ fontSize: size })
        }}
        className="h-7 w-14 px-1.5 text-xs"
        min={8}
        max={200}
      />

      <Separator orientation="vertical" className="h-6" />

      {/* Color */}
      <Input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value)
          apply({ fill: e.target.value })
        }}
        className="h-7 w-8 cursor-pointer p-0.5"
      />

      <Separator orientation="vertical" className="h-6" />

      {/* Bold / Italic */}
      <div className="flex items-center gap-0.5">
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
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        {([['left', AlignLeftIcon], ['center', AlignCenterIcon], ['right', AlignRightIcon]] as const).map(([align, Icon]) => (
          <Button
            key={align}
            size="icon-xs"
            variant={textAlign === align ? 'default' : 'outline'}
            onClick={() => {
              setTextAlign(align)
              apply({ textAlign: align })
            }}
          >
            <Icon className="size-3" />
          </Button>
        ))}
      </div>
    </div>
  )
}
