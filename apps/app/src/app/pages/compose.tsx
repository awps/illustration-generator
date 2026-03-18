import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { CanvasEditor, type CanvasEditorHandle } from '@/components/compose/canvas-editor'
import { TemplatePicker } from '@/components/compose/template-picker'
import { ComposeToolbar } from '@/components/compose/compose-toolbar'
import { LayerPanel } from '@/components/compose/layer-panel'
import type { CompositeTemplate } from '@/lib/compose-templates'
import { apiFetch } from '@/lib/api'
import { ArrowLeftIcon } from 'lucide-react'
import type { Textbox as IText } from 'fabric'
import type { Layer } from '@/lib/layer-types'

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630

export function ComposePage() {
  const { projectId, generationId } = useParams()
  const editorRef = useRef<CanvasEditorHandle>(null)
  const [activeTemplate, setActiveTemplate] = useState('default')
  const [selectedText, setSelectedText] = useState<IText | null>(null)
  const [layers, setLayers] = useState<Layer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [gradientKey, setGradientKey] = useState(0)
  const [gradientInit, setGradientInit] = useState<{ type: 'linear' | 'radial'; angle: number; colors: string[] }>({ type: 'linear', angle: 135, colors: ['#334155', '#0f172a'] })
  const [keepStyle, setKeepStyle] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_WIDTH)
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_HEIGHT)
  const [prompt, setPrompt] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!projectId) return
    apiFetch(`/v1/projects/${projectId}/generations`)
      .then((r) => r.json())
      .then((data) => {
        const gen = (data.generations ?? []).find((g: any) => g.id === generationId)
        if (gen?.prompt) setPrompt(gen.prompt)
      })
      .catch(() => {})
  }, [projectId, generationId])

  const imageUrl = `/images/generations/${projectId}/${generationId}/transparent.png`

  // Derive active layer type for context-sensitive controls
  const activeLayer = layers.find((l) => l.id === activeLayerId)
  const activeLayerType = activeLayer?.type ?? 'background'

  const handleTemplateSelect = useCallback((template: CompositeTemplate) => {
    setActiveTemplate(template.id)
    setCanvasWidth(template.width)
    setCanvasHeight(template.height)
    if (template.layers.length > 0) {
      editorRef.current?.applyTemplate(template, { keepGradient: keepStyle })
    } else {
      editorRef.current?.setTemplate(template.width, template.height)
    }
    setSelectedText(null)
    setActiveLayerId(null)
  }, [keepStyle])

  const handleCanvasSize = useCallback((w: number, h: number) => {
    setCanvasWidth(w)
    setCanvasHeight(h)
    editorRef.current?.setTemplate(w, h)
  }, [])

  const handleGradientChange = useCallback((type: 'linear' | 'radial', angle: number, colors: string[]) => {
    editorRef.current?.setGradient(type, angle, colors)
  }, [])

  const handleSelectionChange = useCallback((type: 'text' | 'image' | null, obj: any, layerId?: string) => {
    setSelectedText(type === 'text' ? obj : null)
    setActiveLayerId(layerId ?? null)
  }, [])

  const handleLayersChange = useCallback((newLayers: Layer[]) => {
    setLayers(newLayers)
  }, [])

  const handleGradientApplied = useCallback((type: 'linear' | 'radial', angle: number, colors: string[]) => {
    setGradientInit({ type, angle, colors })
    setGradientKey((k) => k + 1)
  }, [])

  const handleHistoryChange = useCallback(() => {
    setCanUndo(editorRef.current?.canUndo() ?? false)
    setCanRedo(editorRef.current?.canRedo() ?? false)
  }, [])

  const handleExport = () => {
    const dataUrl = editorRef.current?.exportPNG()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `illustration-${generationId?.slice(0, 8)}.jpg`
    link.href = dataUrl
    link.click()
  }

  const handleTextUpdate = useCallback(() => {
    editorRef.current?.canvas?.renderAll()
    editorRef.current?.snapshot()
  }, [])

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex h-full w-72 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/projects/${projectId}`}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
        </div>

        {/* TemplatePicker manages its own scroll */}
        <div className="min-h-0 flex-1">
          <TemplatePicker
            activeId={activeTemplate}
            projectId={projectId ?? ''}
            keepStyle={keepStyle}
            onKeepStyleChange={setKeepStyle}
            onSelect={handleTemplateSelect}
            onGetTemplateConfig={() => editorRef.current!.getTemplateConfig()}
            onGetThumbnail={() => editorRef.current?.getThumbnail() ?? null}
          />
        </div>

        {/* Sticky bottom: LayerPanel */}
        <div className="shrink-0 border-t" style={{ maxHeight: 200 }}>
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            <LayerPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelect={(id) => {
                editorRef.current?.selectLayer(id)
                setActiveLayerId(id)
              }}
              onToggleVisibility={(id) => {
                const layer = layers.find((l) => l.id === id)
                if (layer) editorRef.current?.setLayerVisibility(id, !layer.visible)
              }}
              onToggleLock={(id) => {
                const layer = layers.find((l) => l.id === id)
                if (layer) editorRef.current?.setLayerLocked(id, !layer.locked)
              }}
              onMoveUp={(id) => editorRef.current?.moveLayer(id, 'up')}
              onMoveDown={(id) => editorRef.current?.moveLayer(id, 'down')}
              onDelete={(id) => {
                editorRef.current?.removeLayer(id)
                if (activeLayerId === id) {
                  setActiveLayerId(null)
                  setSelectedText(null)
                }
              }}
              onRename={(id, name) => editorRef.current?.renameLayer(id, name)}
              onAddElement={() => editorRef.current?.addText()}
            />
          </div>
        </div>
      </div>

      {/* Main content: Toolbar + Canvas */}
      <div className="flex flex-1 flex-col">
        <ComposeToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => editorRef.current?.undo()}
          onRedo={() => editorRef.current?.redo()}
          onExport={handleExport}
          onAlign={(alignment) => {
            if (activeLayerId) editorRef.current?.alignLayer(activeLayerId, alignment)
          }}
          onCanvasSize={handleCanvasSize}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          activeLayerType={activeLayerType}
          gradientKey={gradientKey}
          gradientInit={gradientInit}
          onGradientChange={handleGradientChange}
          selectedText={selectedText}
          onTextUpdate={handleTextUpdate}
        />
        <CanvasEditor
          ref={editorRef}
          imageUrl={imageUrl}
          initialWidth={DEFAULT_WIDTH}
          initialHeight={DEFAULT_HEIGHT}
          initialTitle={prompt}
          onSelectionChange={handleSelectionChange}
          onLayersChange={handleLayersChange}
          onGradientApplied={handleGradientApplied}
          onHistoryChange={handleHistoryChange}
        />
      </div>
    </div>
  )
}
