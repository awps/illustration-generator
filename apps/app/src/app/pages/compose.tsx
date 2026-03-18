import { useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { CanvasEditor, type CanvasEditorHandle } from '@/components/compose/canvas-editor'
import { TemplatePicker } from '@/components/compose/template-picker'
import { GradientControls } from '@/components/compose/gradient-controls'
import { TextControls } from '@/components/compose/text-controls'
import { TEMPLATES } from '@/lib/compose-templates'
import { ArrowLeftIcon, DownloadIcon } from 'lucide-react'
import type { IText } from 'fabric'

export function ComposePage() {
  const { projectId, generationId } = useParams()
  const editorRef = useRef<CanvasEditorHandle>(null)
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]!.id)
  const [selectedText, setSelectedText] = useState<IText | null>(null)

  const imageUrl = `/images/generations/${projectId}/${generationId}/transparent.png`

  const handleTemplateSelect = useCallback((template: { id: string; width: number; height: number }) => {
    setActiveTemplate(template.id)
    editorRef.current?.setTemplate(template.width, template.height)
  }, [])

  const handleGradientChange = useCallback((type: 'linear' | 'radial', angle: number, colors: string[]) => {
    editorRef.current?.setGradient(type, angle, colors)
  }, [])

  const handleSelectionChange = useCallback((type: 'text' | 'image' | null, obj: any) => {
    setSelectedText(type === 'text' ? obj : null)
  }, [])

  const handleExport = () => {
    const dataUrl = editorRef.current?.exportPNG()
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `illustration-${generationId?.slice(0, 8)}.png`
    link.href = dataUrl
    link.click()
  }

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

        <div className="flex-1 overflow-y-auto">
          <TemplatePicker activeId={activeTemplate} onSelect={handleTemplateSelect} />
          <GradientControls onChange={handleGradientChange} />
          <TextControls
            selectedText={selectedText}
            onAddText={() => editorRef.current?.addText()}
            onUpdate={() => editorRef.current?.canvas?.renderAll()}
            onDelete={() => {
              const canvas = editorRef.current?.canvas
              if (canvas && selectedText) {
                canvas.remove(selectedText)
                canvas.renderAll()
                setSelectedText(null)
              }
            }}
          />
        </div>

        <div className="shrink-0 border-t p-4">
          <Button onClick={handleExport} className="w-full">
            <DownloadIcon className="size-4" />
            Download PNG
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <CanvasEditor
        ref={editorRef}
        imageUrl={imageUrl}
        initialWidth={TEMPLATES[0]!.width}
        initialHeight={TEMPLATES[0]!.height}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  )
}
