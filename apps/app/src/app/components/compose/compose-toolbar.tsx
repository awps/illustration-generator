import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { GradientControls } from '@/components/compose/gradient-controls'
import { TextControls } from '@/components/compose/text-controls'
import {
  Undo2Icon,
  Redo2Icon,
  DownloadIcon,
  AlignHorizontalJustifyStartIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignHorizontalJustifyEndIcon,
  AlignVerticalJustifyStartIcon,
  AlignVerticalJustifyCenterIcon,
  AlignVerticalJustifyEndIcon,
} from 'lucide-react'
import type { Textbox as IText } from 'fabric'
import type { LayerType } from '@/lib/layer-types'

export type Alignment = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom'

interface ComposeToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  onAlign: (alignment: Alignment) => void
  onCanvasSize: (w: number, h: number) => void
  canvasWidth: number
  canvasHeight: number
  activeLayerType: LayerType | null
  gradientKey: number
  gradientInit: { type: 'linear' | 'radial'; angle: number; colors: string[] }
  onGradientChange: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  selectedText: IText | null
  onTextUpdate: () => void
  activeLayerOpacity: number
  onOpacityChange: (opacity: number) => void
}

const ALIGN_BUTTONS: { alignment: Alignment; icon: typeof AlignHorizontalJustifyStartIcon; title: string }[] = [
  { alignment: 'left', icon: AlignHorizontalJustifyStartIcon, title: 'Align left' },
  { alignment: 'center-h', icon: AlignHorizontalJustifyCenterIcon, title: 'Align center' },
  { alignment: 'right', icon: AlignHorizontalJustifyEndIcon, title: 'Align right' },
  { alignment: 'top', icon: AlignVerticalJustifyStartIcon, title: 'Align top' },
  { alignment: 'center-v', icon: AlignVerticalJustifyCenterIcon, title: 'Align middle' },
  { alignment: 'bottom', icon: AlignVerticalJustifyEndIcon, title: 'Align bottom' },
]

export function ComposeToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onAlign,
  onCanvasSize,
  canvasWidth,
  canvasHeight,
  activeLayerType,
  gradientKey,
  gradientInit,
  onGradientChange,
  selectedText,
  onTextUpdate,
  activeLayerOpacity,
  onOpacityChange,
}: ComposeToolbarProps) {
  const showAlign = activeLayerType && activeLayerType !== 'background'
  const [w, setW] = useState(String(canvasWidth))
  const [h, setH] = useState(String(canvasHeight))

  return (
    <div className="flex h-10 shrink-0 items-center overflow-hidden border-b bg-background px-2">
      {/* Left: Undo / Redo */}
      <div className="flex items-center">
        <Button size="icon-xs" variant="ghost" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2Icon className="size-3.5" />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2Icon className="size-3.5" />
        </Button>
      </div>

      <Separator orientation="vertical" className="mx-1.5 h-5" />

      {/* Center: Context-sensitive controls */}
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {activeLayerType === 'background' && (
          <GradientControls
            key={gradientKey}
            onChange={onGradientChange}
            initialType={gradientInit.type}
            initialAngle={gradientInit.angle}
            initialColors={gradientInit.colors}
          />
        )}
        {(activeLayerType === 'title' || activeLayerType === 'text') && (
          <TextControls
            selectedText={selectedText}
            onUpdate={onTextUpdate}
          />
        )}

        {showAlign && (
          <>
            {(activeLayerType === 'title' || activeLayerType === 'text') && (
              <Separator orientation="vertical" className="mx-1.5 h-5" />
            )}
            <div className="flex items-center">
              {ALIGN_BUTTONS.map(({ alignment, icon: Icon, title }) => (
                <Button
                  key={alignment}
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => onAlign(alignment)}
                  title={title}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="mx-1.5 h-5" />

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{Math.round(activeLayerOpacity * 100)}%</span>
              <Slider
                value={[activeLayerOpacity * 100]}
                onValueChange={([v]) => onOpacityChange((v ?? 100) / 100)}
                min={0}
                max={100}
                step={1}
                className="w-16"
              />
            </div>
          </>
        )}
      </div>

      <Separator orientation="vertical" className="mx-1.5 h-5" />

      {/* Right: Canvas size + Download */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Input
          className="h-6 w-14 px-1 text-center text-[10px]"
          value={w}
          onChange={(e) => setW(e.target.value)}
          onBlur={() => {
            const nw = Number(w) || canvasWidth
            setW(String(nw))
            if (nw !== canvasWidth) onCanvasSize(nw, Number(h) || canvasHeight)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const nw = Number(w) || canvasWidth
              setW(String(nw))
              onCanvasSize(nw, Number(h) || canvasHeight)
            }
          }}
        />
        <span className="text-[10px] text-muted-foreground">&times;</span>
        <Input
          className="h-6 w-14 px-1 text-center text-[10px]"
          value={h}
          onChange={(e) => setH(e.target.value)}
          onBlur={() => {
            const nh = Number(h) || canvasHeight
            setH(String(nh))
            if (nh !== canvasHeight) onCanvasSize(Number(w) || canvasWidth, nh)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const nh = Number(h) || canvasHeight
              setH(String(nh))
              onCanvasSize(Number(w) || canvasWidth, nh)
            }
          }}
        />

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <Button size="sm" variant="outline" onClick={onExport} className="h-7 px-2.5 text-xs">
          <DownloadIcon className="size-3.5" />
          <span className="ml-1">JPG</span>
        </Button>
      </div>
    </div>
  )
}
