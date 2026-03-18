import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { GRADIENT_PRESETS } from '@/lib/compose-templates'

export function GradientControls({
  onChange,
  initialType = 'linear',
  initialAngle = 135,
  initialColors = ['#334155', '#0f172a'],
}: {
  onChange: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  initialType?: 'linear' | 'radial'
  initialAngle?: number
  initialColors?: string[]
}) {
  const [type, setType] = useState<'linear' | 'radial'>(initialType)
  const [angle, setAngle] = useState(initialAngle)
  const [color1, setColor1] = useState(initialColors[0] ?? '#334155')
  const [color2, setColor2] = useState(initialColors[1] ?? '#0f172a')

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onChange(type, angle, [color1, color2])
  }, [type, angle, color1, color2]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (preset: typeof GRADIENT_PRESETS[number]) => {
    setType(preset.type)
    setAngle(preset.angle)
    setColor1(preset.colors[0]!)
    setColor2(preset.colors[1]!)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Presets */}
      <div className="flex items-center gap-1">
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className="h-6 w-6 shrink-0 rounded border border-border transition-colors hover:border-primary/50"
            title={p.name}
            style={{
              background: p.type === 'linear'
                ? `linear-gradient(${p.angle}deg, ${p.colors.join(', ')})`
                : `radial-gradient(circle, ${p.colors.join(', ')})`,
            }}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Type toggle */}
      <div className="flex items-center gap-0.5">
        {(['linear', 'radial'] as const).map((t) => (
          <Button
            key={t}
            size="xs"
            variant={type === t ? 'default' : 'outline'}
            onClick={() => setType(t)}
            className="h-6 px-2 text-[10px]"
          >
            {t}
          </Button>
        ))}
      </div>

      {/* Angle (linear only) */}
      {type === 'linear' && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{angle}°</span>
            <Slider
              value={[angle]}
              onValueChange={([v]) => setAngle(v ?? 135)}
              min={0}
              max={360}
              step={5}
              className="w-20"
            />
          </div>
        </>
      )}

      <Separator orientation="vertical" className="h-6" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        <Input
          type="color"
          value={color1}
          onChange={(e) => setColor1(e.target.value)}
          className="h-6 w-8 cursor-pointer p-0.5"
        />
        <Input
          type="color"
          value={color2}
          onChange={(e) => setColor2(e.target.value)}
          className="h-6 w-8 cursor-pointer p-0.5"
        />
      </div>
    </div>
  )
}
