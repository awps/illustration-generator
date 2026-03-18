import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, Rect, FabricImage, Gradient, IText } from 'fabric'

export interface CanvasEditorHandle {
  canvas: Canvas | null
  setTemplate: (width: number, height: number) => void
  setGradient: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  addText: () => void
  exportPNG: () => string | null
}

interface CanvasEditorProps {
  imageUrl: string
  initialWidth: number
  initialHeight: number
  onSelectionChange?: (type: 'text' | 'image' | null, object: any) => void
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  ({ imageUrl, initialWidth, initialHeight, onSelectionChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<Canvas | null>(null)
    const bgRef = useRef<Rect | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const sizeRef = useRef({ width: initialWidth, height: initialHeight })

    const fitToContainer = useCallback((canvas: Canvas, w: number, h: number) => {
      const container = containerRef.current
      if (!container) return
      const containerW = container.clientWidth
      const containerH = container.clientHeight
      const scale = Math.min(containerW / w, containerH / h, 1)
      canvas.setZoom(scale)
      canvas.setDimensions({ width: w * scale, height: h * scale })
    }, [])

    useEffect(() => {
      if (!canvasRef.current) return

      const canvas = new Canvas(canvasRef.current, {
        width: initialWidth,
        height: initialHeight,
        backgroundColor: '#000000',
      })

      fabricRef.current = canvas

      // Background gradient rect
      const bg = new Rect({
        left: 0,
        top: 0,
        width: initialWidth,
        height: initialHeight,
        selectable: false,
        evented: false,
      })
      bg.set('fill', new Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: initialWidth, y2: initialHeight },
        colorStops: [
          { offset: 0, color: '#334155' },
          { offset: 1, color: '#0f172a' },
        ],
      }))
      canvas.add(bg)
      canvas.sendObjectToBack(bg)
      bgRef.current = bg

      // Load illustration
      FabricImage.fromURL(imageUrl).then((img) => {
        const scale = Math.min(
          (initialWidth * 0.7) / (img.width ?? 1),
          (initialHeight * 0.7) / (img.height ?? 1)
        )
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: initialWidth / 2,
          top: initialHeight / 2,
          originX: 'center',
          originY: 'center',
        })
        canvas.add(img)
        canvas.renderAll()
      }).catch((err) => {
        console.error('[canvas] Failed to load image:', imageUrl, err)
      })

      // Selection events
      canvas.on('selection:created', (e) => {
        const obj = e.selected?.[0]
        if (obj instanceof IText) onSelectionChange?.('text', obj)
        else onSelectionChange?.('image', obj)
      })
      canvas.on('selection:updated', (e) => {
        const obj = e.selected?.[0]
        if (obj instanceof IText) onSelectionChange?.('text', obj)
        else onSelectionChange?.('image', obj)
      })
      canvas.on('selection:cleared', () => {
        onSelectionChange?.(null, null)
      })
      // Also track text edits
      canvas.on('object:modified', (e) => {
        const obj = e.target
        if (obj instanceof IText) onSelectionChange?.('text', obj)
      })

      fitToContainer(canvas, initialWidth, initialHeight)

      // Resize handler
      const handleResize = () => {
        fitToContainer(canvas, sizeRef.current.width, sizeRef.current.height)
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        canvas.dispose()
        fabricRef.current = null
      }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
      canvas: fabricRef.current,
      setTemplate(width: number, height: number) {
        const canvas = fabricRef.current
        const bg = bgRef.current
        if (!canvas || !bg) return
        sizeRef.current = { width, height }

        // Update background rect size
        bg.set({ width, height })

        // Re-apply gradient with new dimensions
        const fill = bg.fill
        if (fill instanceof Gradient) {
          const coords = fill.coords
          if (fill.type === 'linear' && coords) {
            // Recalculate based on stored gradient
          }
        }

        canvas.setDimensions({ width, height })
        fitToContainer(canvas, width, height)
        canvas.renderAll()
      },
      setGradient(type: 'linear' | 'radial', angle: number, colors: string[]) {
        const bg = bgRef.current
        const canvas = fabricRef.current
        if (!bg || !canvas) return
        const w = bg.width ?? 1
        const h = bg.height ?? 1
        const rad = (angle * Math.PI) / 180

        if (type === 'linear') {
          bg.set('fill', new Gradient({
            type: 'linear',
            coords: {
              x1: w / 2 - Math.cos(rad) * w / 2,
              y1: h / 2 - Math.sin(rad) * h / 2,
              x2: w / 2 + Math.cos(rad) * w / 2,
              y2: h / 2 + Math.sin(rad) * h / 2,
            },
            colorStops: colors.map((c, i) => ({ offset: i / Math.max(colors.length - 1, 1), color: c })),
          }))
        } else {
          bg.set('fill', new Gradient({
            type: 'radial',
            coords: { x1: w / 2, y1: h / 2, r1: 0, x2: w / 2, y2: h / 2, r2: Math.max(w, h) / 2 },
            colorStops: colors.map((c, i) => ({ offset: i / Math.max(colors.length - 1, 1), color: c })),
          }))
        }
        canvas.renderAll()
      },
      addText() {
        const canvas = fabricRef.current
        if (!canvas) return
        const { width, height } = sizeRef.current
        const text = new IText('Your text here', {
          left: width / 2,
          top: height / 2,
          originX: 'center',
          originY: 'center',
          fontFamily: 'Inter Variable, sans-serif',
          fontSize: 48,
          fill: '#ffffff',
          fontWeight: 'bold',
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        canvas.renderAll()
      },
      exportPNG() {
        const canvas = fabricRef.current
        const bg = bgRef.current
        if (!canvas || !bg) return null
        const w = bg.width ?? 0
        const h = bg.height ?? 0
        const currentZoom = canvas.getZoom()
        canvas.setZoom(1)
        canvas.setDimensions({ width: w, height: h })
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 })
        canvas.setZoom(currentZoom)
        fitToContainer(canvas, w, h)
        return dataUrl
      },
    }))

    return (
      <div ref={containerRef} className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30">
        <canvas ref={canvasRef} />
      </div>
    )
  }
)
