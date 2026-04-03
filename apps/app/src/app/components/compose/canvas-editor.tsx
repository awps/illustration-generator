import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Canvas, Rect, FabricImage, Gradient, Textbox, FabricObject, BaseFabricObject } from 'fabric'
import { type Layer, buildLayersFromCanvas } from '@/lib/layer-types'
import type { CompositeTemplate, IllustrationLayerConfig, TitleLayerConfig, TextLayerConfig, ImageLayerConfig, TemplateConfig, LayerConfig } from '@/lib/compose-templates'

FabricObject.customProperties = ['layerId', 'layerType', 'layerName']
BaseFabricObject.ownDefaults.originX = 'center'
BaseFabricObject.ownDefaults.originY = 'center'

export interface CanvasEditorHandle {
  canvas: Canvas | null
  setTemplate: (width: number, height: number) => void
  applyTemplate: (config: CompositeTemplate, options?: { keepGradient?: boolean }) => void
  setGradient: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  addText: () => string | undefined
  addImage: (dataUrl: string) => string | undefined
  setLayerOpacity: (layerId: string, opacity: number) => void
  exportPNG: () => string | null
  setLayerVisibility: (layerId: string, visible: boolean) => void
  setLayerLocked: (layerId: string, locked: boolean) => void
  moveLayer: (layerId: string, direction: 'up' | 'down') => void
  removeLayer: (layerId: string) => void
  selectLayer: (layerId: string) => void
  renameLayer: (layerId: string, name: string) => void
  getLayers: () => Layer[]
  getTemplateConfig: () => TemplateConfig
  alignLayer: (layerId: string, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => void
  getThumbnail: (maxWidth?: number) => string | null
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  snapshot: () => void
}

interface CanvasEditorProps {
  imageUrl: string
  initialWidth: number
  initialHeight: number
  initialTitle?: string
  onSelectionChange?: (type: 'text' | 'image' | null, object: any, layerId?: string) => void
  onLayersChange?: (layers: Layer[]) => void
  onGradientApplied?: (type: 'linear' | 'radial', angle: number, colors: string[]) => void
  onHistoryChange?: () => void
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

function extractGradientState(gradient: Gradient<'linear' | 'radial'>): GradientState {
  const colors = (gradient.colorStops ?? [])
    .sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
    .map((s) => s.color)

  if (gradient.type === 'radial') {
    return { type: 'radial', angle: 0, colors }
  }

  const coords = gradient.coords as { x1: number; y1: number; x2: number; y2: number }
  const dx = (coords.x2 ?? 0.5) - (coords.x1 ?? 0.5)
  const dy = (coords.y2 ?? 0.5) - (coords.y1 ?? 0.5)
  const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI)

  return { type: 'linear', angle: ((angle % 360) + 360) % 360, colors }
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  ({ imageUrl, initialWidth, initialHeight, initialTitle, onSelectionChange, onLayersChange, onGradientApplied, onHistoryChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<Canvas | null>(null)
    const bgRef = useRef<Rect | null>(null)
    const imgRef = useRef<FabricImage | null>(null)
    const titleRef = useRef<Textbox | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const sizeRef = useRef({ width: initialWidth, height: initialHeight })
    const gradientRef = useRef<GradientState>({
      type: 'linear', angle: 135, colors: ['#334155', '#0f172a'],
    })
    const textCountRef = useRef(0)
    const pendingIllConfig = useRef<IllustrationLayerConfig | null>(null)
    const pendingTitleConfig = useRef<TitleLayerConfig | null>(null)
    const undoStackRef = useRef<string[]>([])
    const redoStackRef = useRef<string[]>([])
    const isRestoringRef = useRef(false)

    const fireLayers = useCallback(() => {
      const canvas = fabricRef.current
      if (canvas) onLayersChange?.(buildLayersFromCanvas(canvas))
    }, [onLayersChange])

    const findObjectByLayerId = useCallback((layerId: string) => {
      return fabricRef.current?.getObjects().find((o) => o.layerId === layerId)
    }, [])

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
      })
      canvas.renderAll()
    }, [])

    const positionIllustration = useCallback((img: FabricImage, w: number, h: number, cfg: IllustrationLayerConfig) => {
      const fit = cfg.fit ?? 0.7
      const scale = Math.min(
        (w * fit) / img.getOriginalSize().width,
        (h * fit) / img.getOriginalSize().height,
      )
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: w * (cfg.left ?? 0.5),
        top: h * (cfg.top ?? 0.5),
      })
    }, [])

    const positionTitle = useCallback((title: Textbox, w: number, h: number, cfg: TitleLayerConfig) => {
      title.set({
        left: w * (cfg.left ?? 0.1),
        top: h * (cfg.top ?? 0.1),
        width: w * (cfg.width ?? 0.4),
        fontSize: cfg.fontSize ?? 48,
        fontFamily: cfg.fontFamily ?? 'Inter Variable, sans-serif',
        fill: cfg.fill ?? '#ffffff',
        fontWeight: cfg.fontWeight ?? 'bold',
        fontStyle: (cfg.fontStyle ?? 'normal') as '' | 'normal' | 'italic' | 'oblique',
        textAlign: cfg.textAlign ?? 'left',
      })
    }, [])

    const takeSnapshot = useCallback(() => {
      const canvas = fabricRef.current
      if (!canvas || isRestoringRef.current) return
      const json = JSON.stringify(canvas.toJSON())
      undoStackRef.current.push(json)
      if (undoStackRef.current.length > 50) undoStackRef.current.shift()
      redoStackRef.current = []
      onHistoryChange?.()
    }, [onHistoryChange])

    const restore = useCallback(async (snapshot: string) => {
      const canvas = fabricRef.current
      if (!canvas) return
      isRestoringRef.current = true
      canvas.discardActiveObject()
      await canvas.loadFromJSON(snapshot)

      bgRef.current = null
      imgRef.current = null
      titleRef.current = null
      for (const obj of canvas.getObjects()) {
        if (obj.layerType === 'background') bgRef.current = obj as Rect
        if (obj.layerType === 'illustration') imgRef.current = obj as FabricImage
        if (obj.layerType === 'title') titleRef.current = obj as Textbox
      }

      const bg = bgRef.current
      if (bg) {
        bg.set({ selectable: false, evented: false })
        sizeRef.current = { width: bg.width ?? initialWidth, height: bg.height ?? initialHeight }
        const fill = bg.fill
        if (fill instanceof Gradient) {
          gradientRef.current = extractGradientState(fill)
          onGradientApplied?.(gradientRef.current.type, gradientRef.current.angle, gradientRef.current.colors)
        }
      }
      textCountRef.current = canvas.getObjects().filter((o) => o.layerType === 'text').length

      fitToContainer(canvas, sizeRef.current.width, sizeRef.current.height)
      canvas.renderAll()
      fireLayers()
      onSelectionChange?.(null, null, undefined)
      isRestoringRef.current = false
      onHistoryChange?.()
    }, [initialWidth, initialHeight, fitToContainer, fireLayers, onSelectionChange, onGradientApplied, onHistoryChange])

    useEffect(() => {
      if (!canvasRef.current) return

      const canvas = new Canvas(canvasRef.current, {
        width: initialWidth,
        height: initialHeight,
      })

      fabricRef.current = canvas

      // Background rect — fill entire canvas
      const bgLayerId = crypto.randomUUID()
      const bg = new Rect({
        left: initialWidth / 2,
        top: initialHeight / 2,
        width: initialWidth,
        height: initialHeight,
        strokeWidth: 0,
        selectable: false,
        evented: false,
      })
      bg.layerId = bgLayerId
      bg.layerType = 'background'
      bg.layerName = 'Background'
      applyGradient(bg, gradientRef.current)
      canvas.add(bg)
      canvas.sendObjectToBack(bg)
      bgRef.current = bg

      // Load illustration
      const imgLayerId = crypto.randomUUID()
      FabricImage.fromURL(imageUrl).then((img) => {
        imgRef.current = img
        img.layerId = imgLayerId
        img.layerType = 'illustration'
        img.layerName = 'Illustration'
        // If a template was applied before image loaded, use its config
        const pending = pendingIllConfig.current
        const { width: curW, height: curH } = sizeRef.current
        if (pending) {
          positionIllustration(img, curW, curH, pending)
          pendingIllConfig.current = null
        } else {
          centerIllustration(canvas, img, curW, curH)
        }
        canvas.add(img)
        // Ensure illustration is at index 1 (above bg, below text)
        canvas.moveObjectTo(img, 1)
        canvas.renderAll()
        fireLayers()
      }).catch((err) => {
        console.error('[canvas] Failed to load image:', imageUrl, err)
      })

      // Title text — persistent across template changes
      const titleLayerId = crypto.randomUUID()
      const title = new Textbox(initialTitle || 'Your title here', {
        left: initialWidth * 0.5,
        top: initialHeight * 0.88,
        width: initialWidth * 0.8,
        fontFamily: 'Inter Variable, sans-serif',
        fontSize: 48,
        fill: '#ffffff',
        fontWeight: 'bold',
        splitByGrapheme: false,
        textAlign: 'left',
      })
      title.layerId = titleLayerId
      title.layerType = 'title'
      title.layerName = 'Title'
      canvas.add(title)
      titleRef.current = title

      fireLayers()

      // Take initial snapshot for undo baseline
      setTimeout(() => takeSnapshot(), 0)

      // Selection events
      const emitSelection = (obj: any) => {
        if (obj instanceof Textbox) onSelectionChange?.('text', obj, obj.layerId)
        else onSelectionChange?.('image', obj, obj.layerId)
      }
      canvas.on('selection:created', (e) => emitSelection(e.selected?.[0]))
      canvas.on('selection:updated', (e) => emitSelection(e.selected?.[0]))
      canvas.on('selection:cleared', () => {
        onSelectionChange?.(null, null, undefined)
      })
      canvas.on('object:modified', (e) => {
        const obj = e.target
        if (obj instanceof Textbox) onSelectionChange?.('text', obj, obj.layerId)
      })
      canvas.on('object:modified', () => {
        takeSnapshot()
      })

      fitToContainer(canvas, initialWidth, initialHeight)

      const handleResize = () => {
        fitToContainer(canvas, sizeRef.current.width, sizeRef.current.height)
      }
      window.addEventListener('resize', handleResize)

      const handleKeyDown = (e: KeyboardEvent) => {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        const textboxes = canvas.getObjects().filter((o): o is Textbox => o instanceof Textbox)
        if (textboxes.some((t) => t.isEditing)) return

        const mod = e.metaKey || e.ctrlKey

        if (mod && e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          const stack = undoStackRef.current
          if (stack.length === 0) return
          const current = JSON.stringify(canvas.toJSON())
          redoStackRef.current.push(current)
          const prev = stack.pop()!
          restore(prev)
        } else if (mod && e.key === 'z' && e.shiftKey) {
          e.preventDefault()
          const stack = redoStackRef.current
          if (stack.length === 0) return
          const current = JSON.stringify(canvas.toJSON())
          undoStackRef.current.push(current)
          const next = stack.pop()!
          restore(next)
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          const active = canvas.getActiveObject()
          if (active && active.layerType === 'text') {
            e.preventDefault()
            canvas.discardActiveObject()
            canvas.remove(active)
            canvas.renderAll()
            fireLayers()
            onSelectionChange?.(null, null, undefined)
            takeSnapshot()
          }
        }
      }
      document.addEventListener('keydown', handleKeyDown)

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
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

        // Resize background (with bleed)
        bg.set({ left: width / 2, top: height / 2, width, height, strokeWidth: 0 })
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
        takeSnapshot()
      },

      applyTemplate(config: CompositeTemplate, options?: { keepGradient?: boolean }) {
        const canvas = fabricRef.current
        const bg = bgRef.current
        const img = imgRef.current
        if (!canvas || !bg) return

        const { width, height } = config
        sizeRef.current = { width, height }

        // Remove disposable text layers (keep title)
        canvas.discardActiveObject()
        const textObjects = canvas.getObjects().filter((o) => o.layerType === 'text' || o.layerType === 'image')
        for (const obj of textObjects) canvas.remove(obj)
        textCountRef.current = 0

        // Resize background (with bleed)
        bg.set({ left: width / 2, top: height / 2, width, height, strokeWidth: 0 })

        // Apply gradient from template (or keep current)
        if (!options?.keepGradient) {
          const bgConfig = config.layers.find((l) => l.type === 'background')
          if (bgConfig?.type === 'background' && bgConfig.gradient) {
            const g = bgConfig.gradient
            gradientRef.current = { type: g.type, angle: g.angle, colors: g.colors }
            onGradientApplied?.(g.type, g.angle, g.colors)
          }
        }
        applyGradient(bg, gradientRef.current)

        // Position illustration (or store config for when image loads)
        const illConfig = config.layers.find((l): l is IllustrationLayerConfig => l.type === 'illustration')
        if (img && illConfig) {
          positionIllustration(img, width, height, illConfig)
          img.visible = illConfig.visible ?? true
          img.selectable = !(illConfig.locked ?? false)
          img.evented = !(illConfig.locked ?? false)
          img.opacity = illConfig.opacity ?? 1
          canvas.moveObjectTo(img, 1)
        } else if (img) {
          centerIllustration(canvas, img, width, height)
          canvas.moveObjectTo(img, 1)
        } else if (illConfig) {
          pendingIllConfig.current = illConfig
        }

        // Reposition title (preserving user's text content)
        const titleConfig = config.layers.find((l): l is TitleLayerConfig => l.type === 'title')
        const titleObj = titleRef.current
        if (titleObj && titleConfig) {
          positionTitle(titleObj, width, height, titleConfig)
          titleObj.visible = titleConfig.visible ?? true
          titleObj.selectable = !(titleConfig.locked ?? false)
          titleObj.evented = !(titleConfig.locked ?? false)
          titleObj.opacity = titleConfig.opacity ?? 1
        } else if (titleObj) {
          // No title config — recenter with defaults
          titleObj.set({
            left: width * 0.5,
            top: height * 0.88,
            width: width * 0.8,
            fontSize: 48,
          })
        }

        // Create text layers from config
        for (const layerCfg of config.layers) {
          if (layerCfg.type !== 'text') continue
          const tc = layerCfg as TextLayerConfig
          textCountRef.current += 1
          const layerId = crypto.randomUUID()
          const textbox = new Textbox(tc.content ?? 'Your text here', {
            left: width * (tc.left ?? 0.1),
            top: height * (tc.top ?? 0.1),
            width: width * (tc.width ?? 0.4),
            fontFamily: tc.fontFamily ?? 'Inter Variable, sans-serif',
            fontSize: tc.fontSize ?? 48,
            fill: tc.fill ?? '#ffffff',
            fontWeight: tc.fontWeight ?? 'bold',
            fontStyle: (tc.fontStyle ?? 'normal') as '' | 'normal' | 'italic' | 'oblique',
            textAlign: tc.textAlign ?? 'left',
            splitByGrapheme: false,
          })
          textbox.layerId = layerId
          textbox.layerType = 'text'
          textbox.layerName = tc.name ?? `Text ${textCountRef.current}`
          textbox.visible = tc.visible ?? true
          textbox.selectable = !(tc.locked ?? false)
          textbox.evented = !(tc.locked ?? false)
          textbox.opacity = tc.opacity ?? 1
          canvas.add(textbox)
        }

        // Create image layers from config
        for (const layerCfg of config.layers) {
          if (layerCfg.type !== 'image') continue
          const ic = layerCfg as ImageLayerConfig
          if (!ic.src) continue
          const imgLayerId = crypto.randomUUID()
          FabricImage.fromURL(ic.src).then((img) => {
            img.set({
              left: width * (ic.left ?? 0.5),
              top: height * (ic.top ?? 0.5),
              scaleX: ic.scaleX ?? 1,
              scaleY: ic.scaleY ?? 1,
              opacity: ic.opacity ?? 1,
              visible: ic.visible ?? true,
              selectable: !(ic.locked ?? false),
              evented: !(ic.locked ?? false),
            })
            img.layerId = imgLayerId
            img.layerType = 'image'
            img.layerName = ic.name ?? 'Image'
            canvas.add(img)
            canvas.renderAll()
            fireLayers()
          })
        }

        canvas.setDimensions({ width, height })
        fitToContainer(canvas, width, height)
        canvas.renderAll()
        fireLayers()
        takeSnapshot()
      },

      setGradient(type: 'linear' | 'radial', angle: number, colors: string[]) {
        const bg = bgRef.current
        const canvas = fabricRef.current
        if (!bg || !canvas) return
        gradientRef.current = { type, angle, colors }
        applyGradient(bg, gradientRef.current)
        canvas.renderAll()
        takeSnapshot()
      },

      addText() {
        const canvas = fabricRef.current
        if (!canvas) return undefined
        const { width, height } = sizeRef.current
        textCountRef.current += 1
        const layerId = crypto.randomUUID()
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
        textbox.layerId = layerId
        textbox.layerType = 'text'
        textbox.layerName = `Text ${textCountRef.current}`
        canvas.add(textbox)
        canvas.setActiveObject(textbox)
        canvas.renderAll()
        fireLayers()
        takeSnapshot()
        return layerId
      },

      addImage(dataUrl: string) {
        const canvas = fabricRef.current
        if (!canvas) return undefined
        const { width, height } = sizeRef.current
        const layerId = crypto.randomUUID()
        FabricImage.fromURL(dataUrl).then((img) => {
          // Scale to fit 50% of canvas
          const scale = Math.min(
            (width * 0.5) / img.getOriginalSize().width,
            (height * 0.5) / img.getOriginalSize().height,
            1,
          )
          img.set({
            scaleX: scale,
            scaleY: scale,
            left: width / 2,
            top: height / 2,
          })
          img.layerId = layerId
          img.layerType = 'image'
          img.layerName = 'Image'
          canvas.add(img)
          canvas.setActiveObject(img)
          canvas.renderAll()
          fireLayers()
          takeSnapshot()
        })
        return layerId
      },

      setLayerVisibility(layerId: string, visible: boolean) {
        const obj = findObjectByLayerId(layerId)
        const canvas = fabricRef.current
        if (!obj || !canvas) return
        obj.visible = visible
        if (!visible && canvas.getActiveObject() === obj) {
          canvas.discardActiveObject()
        }
        canvas.renderAll()
        fireLayers()
        takeSnapshot()
      },

      setLayerLocked(layerId: string, locked: boolean) {
        const obj = findObjectByLayerId(layerId)
        const canvas = fabricRef.current
        if (!obj || !canvas) return
        obj.selectable = !locked
        obj.evented = !locked
        if (locked && canvas.getActiveObject() === obj) {
          canvas.discardActiveObject()
        }
        canvas.renderAll()
        fireLayers()
        takeSnapshot()
      },

      setLayerOpacity(layerId: string, opacity: number) {
        const obj = findObjectByLayerId(layerId)
        const canvas = fabricRef.current
        if (!obj || !canvas) return
        obj.set({ opacity })
        canvas.renderAll()
        takeSnapshot()
      },

      moveLayer(layerId: string, direction: 'up' | 'down') {
        const canvas = fabricRef.current
        if (!canvas) return
        const objects = canvas.getObjects()
        const obj = objects.find((o) => o.layerId === layerId)
        if (!obj) return
        const idx = objects.indexOf(obj)
        // Background must stay at index 0
        if (obj.layerType === 'background') return
        if (direction === 'up' && idx < objects.length - 1) {
          canvas.moveObjectTo(obj, idx + 1)
        } else if (direction === 'down' && idx > 1) {
          // Don't allow moving below index 1 (index 0 is background)
          canvas.moveObjectTo(obj, idx - 1)
        }
        canvas.renderAll()
        fireLayers()
        takeSnapshot()
      },

      removeLayer(layerId: string) {
        const canvas = fabricRef.current
        if (!canvas) return
        const obj = findObjectByLayerId(layerId)
        if (!obj || (obj.layerType !== 'text' && obj.layerType !== 'image')) return
        if (canvas.getActiveObject() === obj) {
          canvas.discardActiveObject()
        }
        canvas.remove(obj)
        canvas.renderAll()
        fireLayers()
        takeSnapshot()
      },

      selectLayer(layerId: string) {
        const canvas = fabricRef.current
        if (!canvas) return
        const obj = findObjectByLayerId(layerId)
        if (!obj || !obj.selectable || !obj.visible) return
        canvas.setActiveObject(obj)
        canvas.renderAll()
      },

      renameLayer(layerId: string, name: string) {
        const obj = findObjectByLayerId(layerId)
        if (!obj) return
        obj.layerName = name
        fireLayers()
        takeSnapshot()
      },

      getLayers() {
        const canvas = fabricRef.current
        if (!canvas) return []
        return buildLayersFromCanvas(canvas)
      },

      getTemplateConfig(): TemplateConfig {
        const { width, height } = sizeRef.current
        const layers: LayerConfig[] = []

        // Background
        const g = gradientRef.current
        layers.push({ type: 'background', gradient: { type: g.type, angle: g.angle, colors: [...g.colors] } })

        // Illustration
        const img = imgRef.current
        if (img) {
          const fit = Math.max(
            (img.scaleX ?? 1) * img.getOriginalSize().width / width,
            (img.scaleY ?? 1) * img.getOriginalSize().height / height,
          )
          layers.push({
            type: 'illustration',
            visible: img.visible ?? true,
            locked: !(img.selectable ?? true),
            left: (img.left ?? 0) / width,
            top: (img.top ?? 0) / height,
            fit,
            opacity: img.opacity ?? 1,
          })
        }

        // Title
        const title = titleRef.current
        if (title) {
          layers.push({
            type: 'title',
            visible: title.visible ?? true,
            locked: !(title.selectable ?? true),
            content: title.text ?? 'Your title here',
            left: (title.left ?? 0) / width,
            top: (title.top ?? 0) / height,
            width: (title.width ?? width * 0.4) / width,
            fontSize: title.fontSize ?? 48,
            fontFamily: title.fontFamily as string | undefined,
            fill: title.fill as string | undefined,
            fontWeight: title.fontWeight as string | undefined,
            textAlign: (title.textAlign as 'left' | 'center' | 'right') ?? 'left',
            opacity: title.opacity ?? 1,
          })
        }

        // Text layers
        const canvas = fabricRef.current
        if (canvas) {
          for (const obj of canvas.getObjects()) {
            if (obj.layerType !== 'text') continue
            const tb = obj as Textbox
            layers.push({
              type: 'text',
              visible: tb.visible ?? true,
              locked: !(tb.selectable ?? true),
              name: obj.layerName,
              content: tb.text ?? 'Your text here',
              left: (tb.left ?? 0) / width,
              top: (tb.top ?? 0) / height,
              width: (tb.width ?? width * 0.4) / width,
              fontSize: tb.fontSize ?? 48,
              fontFamily: tb.fontFamily as string | undefined,
              fill: tb.fill as string | undefined,
              fontWeight: tb.fontWeight as string | undefined,
              textAlign: (tb.textAlign as 'left' | 'center' | 'right') ?? 'left',
              opacity: tb.opacity ?? 1,
            })
          }
        }

        // Image layers
        if (canvas) {
          for (const obj of canvas.getObjects()) {
            if (obj.layerType !== 'image') continue
            const fi = obj as FabricImage
            layers.push({
              type: 'image',
              visible: fi.visible ?? true,
              locked: !(fi.selectable ?? true),
              opacity: fi.opacity ?? 1,
              name: obj.layerName,
              src: fi.getSrc(),
              left: (fi.left ?? 0) / width,
              top: (fi.top ?? 0) / height,
              scaleX: fi.scaleX ?? 1,
              scaleY: fi.scaleY ?? 1,
            })
          }
        }

        return { width, height, layers }
      },

      exportPNG() {
        const canvas = fabricRef.current
        if (!canvas) return null
        const { width: w, height: h } = sizeRef.current
        const currentZoom = canvas.getZoom()
        canvas.setZoom(1)
        canvas.setDimensions({ width: w, height: h })
        const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.92, multiplier: 1 })
        canvas.setZoom(currentZoom)
        fitToContainer(canvas, w, h)
        return dataUrl
      },

      getThumbnail(maxWidth = 480) {
        const canvas = fabricRef.current
        if (!canvas) return null
        const { width: w, height: h } = sizeRef.current
        const scale = Math.min(maxWidth / w, 1)
        const currentZoom = canvas.getZoom()
        canvas.setZoom(1)
        canvas.setDimensions({ width: w, height: h })
        const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.7, multiplier: scale })
        canvas.setZoom(currentZoom)
        fitToContainer(canvas, w, h)
        return dataUrl
      },

      alignLayer(layerId: string, alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') {
        const canvas = fabricRef.current
        if (!canvas) return
        const obj = findObjectByLayerId(layerId)
        if (!obj || obj.layerType === 'background') return
        const { width, height } = sizeRef.current
        const bound = obj.getBoundingRect()
        const curLeft = obj.left ?? 0
        const curTop = obj.top ?? 0

        switch (alignment) {
          case 'left':
            obj.set({ left: curLeft - bound.left })
            break
          case 'center-h':
            obj.set({ left: curLeft - bound.left - bound.width / 2 + width / 2 })
            break
          case 'right':
            obj.set({ left: curLeft - bound.left - bound.width + width })
            break
          case 'top':
            obj.set({ top: curTop - bound.top })
            break
          case 'center-v':
            obj.set({ top: curTop - bound.top - bound.height / 2 + height / 2 })
            break
          case 'bottom':
            obj.set({ top: curTop - bound.top - bound.height + height })
            break
        }
        obj.setCoords()
        canvas.renderAll()
        takeSnapshot()
      },

      undo() {
        const canvas = fabricRef.current
        if (!canvas) return
        const stack = undoStackRef.current
        if (stack.length === 0) return
        const current = JSON.stringify(canvas.toJSON())
        redoStackRef.current.push(current)
        const prev = stack.pop()!
        restore(prev)
      },

      redo() {
        const canvas = fabricRef.current
        if (!canvas) return
        const stack = redoStackRef.current
        if (stack.length === 0) return
        const current = JSON.stringify(canvas.toJSON())
        undoStackRef.current.push(current)
        const next = stack.pop()!
        restore(next)
      },

      canUndo() {
        return undoStackRef.current.length > 0
      },

      canRedo() {
        return redoStackRef.current.length > 0
      },

      snapshot() {
        takeSnapshot()
      },
    }))

    return (
      <div ref={containerRef} className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30">
        <canvas ref={canvasRef} />
      </div>
    )
  }
)
