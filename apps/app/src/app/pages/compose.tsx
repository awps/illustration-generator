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
  const { generationId } = useParams()
  const editorRef = useRef<CanvasEditorHandle>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
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
  const [activeOpacity, setActiveOpacity] = useState(1)
  const [generation, setGeneration] = useState<{ projectId: string; storagePath: string } | null>(null)

  useEffect(() => {
    if (!generationId) return
    apiFetch(`/v1/generations/${generationId}`)
      .then((r) => r.json())
      .then((data) => {
        const gen = data.generation
        if (gen) {
          setGeneration({ projectId: gen.projectId, storagePath: gen.storagePath })
          if (gen.prompt) setPrompt(gen.prompt)
        }
      })
      .catch(() => {})
  }, [generationId])

  const imageUrl = generation ? `/images/${generation.storagePath}transparent.png` : ''

  // Derive active layer type for context-sensitive controls
  const activeLayer = layers.find((l) => l.id === activeLayerId)
  const activeLayerType = activeLayer?.type ?? 'background'

  // Sync opacity when selection changes
  const updateOpacityFromSelection = useCallback((obj: any) => {
    setActiveOpacity(obj?.opacity ?? 1)
  }, [])

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
    setActiveOpacity(obj?.opacity ?? 1)
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
    link.download = `illustration-${(generationId ?? '').slice(0, 8)}.jpg`
    link.href = dataUrl
    link.click()
  }

  const handleTextUpdate = useCallback(() => {
    editorRef.current?.canvas?.renderAll()
    editorRef.current?.snapshot()
  }, [])

  const handleOpacityChange = useCallback((opacity: number) => {
    if (activeLayerId) {
      editorRef.current?.setLayerOpacity(activeLayerId, opacity)
      setActiveOpacity(opacity)
    }
  }, [activeLayerId])

  const handleAddElement = useCallback((type: 'text' | 'image') => {
    if (type === 'text') {
      editorRef.current?.addText()
    } else if (type === 'image') {
      imageInputRef.current?.click()
    }
  }, [])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      editorRef.current?.addImage(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  return (
    <div className="flex h-screen">
      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Sidebar */}
      <div className="flex h-full w-72 shrink-0 flex-col border-r bg-sidebar">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={generation?.projectId ? `/projects/${generation.projectId}` : '/gallery'}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Link>
          </Button>
        </div>

        {/* TemplatePicker manages its own scroll */}
        <div className="min-h-0 flex-1">
          <TemplatePicker
            activeId={activeTemplate}
            projectId={generation?.projectId ?? ''}
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
              onAddElement={handleAddElement}
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
          activeLayerOpacity={activeOpacity}
          onOpacityChange={handleOpacityChange}
        />
        {generation ? (
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
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading...</div>
        )}
      </div>
    </div>
  )
}
