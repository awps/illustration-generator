import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { GRADIENT_PRESETS } from '@/lib/compose-templates'

export function GradientControls({
  onChange,
}: {
  onChange: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
}) {
  const [type, setType] = useState<'linear' | 'radial'>('linear')
  const [angle, setAngle] = useState(135)
  const [color1, setColor1] = useState('#334155')
  const [color2, setColor2] = useState('#0f172a')

  useEffect(() => {
    onChange(type, angle, [color1, color2])
  }, [type, angle, color1, color2]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (preset: typeof GRADIENT_PRESETS[number]) => {
    setType(preset.type)
    setAngle(preset.angle)
    setColor1(preset.colors[0]!)
    setColor2(preset.colors[1]!)
  }

  return (
    <div className="border-b border-sidebar-border p-4">
      <Label className="mb-2 text-xs font-medium">Background</Label>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p)}
            className="h-6 w-10 rounded border border-border transition-colors hover:border-primary/50"
            title={p.name}
            style={{
              background: p.type === 'linear'
                ? `linear-gradient(${p.angle}deg, ${p.colors.join(', ')})`
                : `radial-gradient(circle, ${p.colors.join(', ')})`,
            }}
          />
        ))}
      </div>

      <div className="mb-2 flex gap-1">
        {(['linear', 'radial'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md border px-2 py-0.5 text-xs ${
              type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {type === 'linear' && (
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Angle</span>
            <span className="text-[10px] text-muted-foreground">{angle}°</span>
          </div>
          <Slider
            value={[angle]}
            onValueChange={([v]) => setAngle(v ?? 135)}
            min={0}
            max={360}
            step={5}
            className="mt-1"
          />
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <span className="text-[10px] text-muted-foreground">Start</span>
          <Input
            type="color"
            value={color1}
            onChange={(e) => setColor1(e.target.value)}
            className="mt-0.5 h-7 w-full cursor-pointer p-0.5"
          />
        </div>
        <div className="flex-1">
          <span className="text-[10px] text-muted-foreground">End</span>
          <Input
            type="color"
            value={color2}
            onChange={(e) => setColor2(e.target.value)}
            className="mt-0.5 h-7 w-full cursor-pointer p-0.5"
          />
        </div>
      </div>
    </div>
  )
}
