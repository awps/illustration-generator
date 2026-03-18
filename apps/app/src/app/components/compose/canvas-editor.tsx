import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, Rect, FabricImage, Gradient, Textbox } from 'fabric'

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

// Store last gradient params so we can re-apply on resize
interface GradientState {
  type: 'linear' | 'radial'
  angle: number
  colors: string[]
}

function applyGradient(bg: Rect, state: GradientState) {
  // Fabric v7: use gradientUnits 'percentage' so coords are 0-1 relative to object size
  const rad = (state.angle * Math.PI) / 180
  const stops = state.colors.map((c, i) => ({
    offset: i / Math.max(state.colors.length - 1, 1),
    color: c,
  }))

  if (state.type === 'linear') {
    bg.set('fill', new Gradient({
      type: 'linear',
      gradientUnits: 'percentage',
      coords: {
        x1: 0.5 - Math.cos(rad) * 0.5,
        y1: 0.5 - Math.sin(rad) * 0.5,
        x2: 0.5 + Math.cos(rad) * 0.5,
        y2: 0.5 + Math.sin(rad) * 0.5,
      },
      colorStops: stops,
    }))
  } else {
    bg.set('fill', new Gradient({
      type: 'radial',
      gradientUnits: 'percentage',
      coords: {
        x1: 0.5, y1: 0.5, r1: 0,
        x2: 0.5, y2: 0.5, r2: 0.5,
      },
      colorStops: stops,
    }))
  }
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  ({ imageUrl, initialWidth, initialHeight, onSelectionChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<Canvas | null>(null)
    const bgRef = useRef<Rect | null>(null)
    const imgRef = useRef<FabricImage | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const sizeRef = useRef({ width: initialWidth, height: initialHeight })
    const gradientRef = useRef<GradientState>({
      type: 'linear', angle: 135, colors: ['#334155', '#0f172a'],
    })

    const fitToContainer = useCallback((canvas: Canvas, w: number, h: number) => {
      const container = containerRef.current
      if (!container) return
      const containerW = container.clientWidth
      const containerH = container.clientHeight
      const scale = Math.min(containerW / w, containerH / h, 1)
      canvas.setZoom(scale)
      canvas.setDimensions({ width: w * scale, height: h * scale })
    }, [])

    const centerIllustration = useCallback((canvas: Canvas, img: FabricImage, w: number, h: number) => {
      const scale = Math.min(
        (w * 0.7) / (img.getOriginalSize().width),
        (h * 0.7) / (img.getOriginalSize().height)
      )
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: w / 2,
        top: h / 2,
        originX: 'center',
        originY: 'center',
      })
      canvas.renderAll()
    }, [])

    useEffect(() => {
      if (!canvasRef.current) return

      const canvas = new Canvas(canvasRef.current, {
        width: initialWidth,
        height: initialHeight,
      })

      fabricRef.current = canvas

      // Background rect — fill entire canvas
      const bg = new Rect({
        left: 0,
        top: 0,
        width: initialWidth,
        height: initialHeight,
        selectable: false,
        evented: false,
      })
      applyGradient(bg, gradientRef.current)
      canvas.add(bg)
      canvas.sendObjectToBack(bg)
      bgRef.current = bg

      // Load illustration
      FabricImage.fromURL(imageUrl).then((img) => {
        imgRef.current = img
        centerIllustration(canvas, img, initialWidth, initialHeight)
        canvas.add(img)
        canvas.renderAll()
      }).catch((err) => {
        console.error('[canvas] Failed to load image:', imageUrl, err)
      })

      // Selection events
      canvas.on('selection:created', (e) => {
        const obj = e.selected?.[0]
        if (obj instanceof Textbox) onSelectionChange?.('text', obj)
        else onSelectionChange?.('image', obj)
      })
      canvas.on('selection:updated', (e) => {
        const obj = e.selected?.[0]
        if (obj instanceof Textbox) onSelectionChange?.('text', obj)
        else onSelectionChange?.('image', obj)
      })
      canvas.on('selection:cleared', () => {
        onSelectionChange?.(null, null)
      })
      canvas.on('object:modified', (e) => {
        const obj = e.target
        if (obj instanceof Textbox) onSelectionChange?.('text', obj)
      })

      fitToContainer(canvas, initialWidth, initialHeight)

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
        const img = imgRef.current
        if (!canvas || !bg) return
        sizeRef.current = { width, height }

        // Resize background
        bg.set({ width, height })
        applyGradient(bg, gradientRef.current)

        // Re-center and scale illustration to fit new dimensions
        if (img) {
          centerIllustration(canvas, img, width, height)
        }

        // Re-center any text objects
        canvas.getObjects().forEach((obj) => {
          if (obj instanceof Textbox) {
            // Keep text within bounds — clamp position
            const objW = (obj.width ?? 0) * (obj.scaleX ?? 1)
            const objH = (obj.height ?? 0) * (obj.scaleY ?? 1)
            if ((obj.left ?? 0) > width) obj.set({ left: width - objW / 2 })
            if ((obj.top ?? 0) > height) obj.set({ top: height - objH / 2 })
          }
        })

        canvas.setDimensions({ width, height })
        fitToContainer(canvas, width, height)
        canvas.renderAll()
      },

      setGradient(type: 'linear' | 'radial', angle: number, colors: string[]) {
        const bg = bgRef.current
        const canvas = fabricRef.current
        if (!bg || !canvas) return
        gradientRef.current = { type, angle, colors }
        applyGradient(bg, gradientRef.current)
        canvas.renderAll()
      },

      addText() {
        const canvas = fabricRef.current
        if (!canvas) return
        const { width, height } = sizeRef.current
        const textbox = new Textbox('Your text here', {
          left: width * 0.1,
          top: height * 0.1,
          width: width * 0.4,
          fontFamily: 'Inter Variable, sans-serif',
          fontSize: 48,
          fill: '#ffffff',
          fontWeight: 'bold',
          splitByGrapheme: false,
        })
        canvas.add(textbox)
        canvas.setActiveObject(textbox)
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
