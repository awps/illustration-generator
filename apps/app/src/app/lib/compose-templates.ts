export interface Template {
  id: string
  name: string
  width: number
  height: number
}

// --- Composite template types (JSON-serializable) ---

export interface BackgroundLayerConfig {
  type: 'background'
  gradient?: { type: 'linear' | 'radial'; angle: number; colors: string[] }
}

export interface IllustrationLayerConfig {
  type: 'illustration'
  visible?: boolean
  locked?: boolean
  left?: number       // fraction of canvas width, default 0.5
  top?: number        // fraction of canvas height, default 0.5
  originX?: 'left' | 'center' | 'right'
  originY?: 'top' | 'center' | 'bottom'
  fit?: number        // fraction of canvas to fit within, default 0.7
}

export interface TitleLayerConfig {
  type: 'title'
  visible?: boolean
  locked?: boolean
  content?: string    // default text (only used on first render)
  left?: number       // fraction of canvas width, default 0.1
  top?: number        // fraction of canvas height, default 0.1
  width?: number      // fraction of canvas width, default 0.4
  fontSize?: number
  fontFamily?: string
  fill?: string
  fontWeight?: string
  fontStyle?: string
  textAlign?: 'left' | 'center' | 'right'
}

export interface TextLayerConfig {
  type: 'text'
  visible?: boolean
  locked?: boolean
  name?: string
  content?: string
  left?: number       // fraction of canvas width, default 0.1
  top?: number        // fraction of canvas height, default 0.1
  width?: number      // fraction of canvas width, default 0.4
  fontSize?: number
  fontFamily?: string
  fill?: string
  fontWeight?: string
  fontStyle?: string
  textAlign?: 'left' | 'center' | 'right'
}

export type LayerConfig = BackgroundLayerConfig | IllustrationLayerConfig | TitleLayerConfig | TextLayerConfig

export interface CompositeTemplate {
  id: string
  name: string
  width: number
  height: number
  layers: LayerConfig[]
}

// --- Types for saved templates ---

export type TemplateConfig = Omit<CompositeTemplate, 'id' | 'name'>

export interface SavedTemplate extends CompositeTemplate {
  userId: string
  projectId: string | null
  visibility: 'project' | 'personal' | 'public'
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

export interface GradientPreset {
  id: string
  name: string
  type: 'linear' | 'radial'
  angle: number
  colors: string[]
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'sunset', name: 'Sunset', type: 'linear', angle: 135, colors: ['#f97316', '#ec4899'] },
  { id: 'ocean', name: 'Ocean', type: 'linear', angle: 180, colors: ['#06b6d4', '#3b82f6'] },
  { id: 'forest', name: 'Forest', type: 'linear', angle: 160, colors: ['#10b981', '#064e3b'] },
  { id: 'purple-haze', name: 'Purple Haze', type: 'linear', angle: 135, colors: ['#8b5cf6', '#ec4899'] },
  { id: 'midnight', name: 'Midnight', type: 'linear', angle: 180, colors: ['#1e1b4b', '#312e81'] },
  { id: 'warm-sand', name: 'Warm Sand', type: 'linear', angle: 135, colors: ['#f59e0b', '#d97706'] },
  { id: 'mint', name: 'Mint', type: 'radial', angle: 0, colors: ['#d1fae5', '#6ee7b7'] },
  { id: 'slate', name: 'Slate', type: 'linear', angle: 180, colors: ['#334155', '#0f172a'] },
]

export const FONT_FAMILIES = [
  { id: 'inter', name: 'Inter', value: 'Inter Variable, sans-serif' },
  { id: 'system', name: 'System', value: 'system-ui, sans-serif' },
  { id: 'georgia', name: 'Georgia', value: 'Georgia, serif' },
  { id: 'mono', name: 'Monospace', value: 'ui-monospace, monospace' },
]
