export interface Template {
  id: string
  name: string
  width: number
  height: number
}

export const TEMPLATES: Template[] = [
  { id: 'blog-header', name: 'Blog Header', width: 1200, height: 630 },
  { id: 'social-square', name: 'Social Square', width: 1080, height: 1080 },
  { id: 'feature', name: 'Feature Image', width: 800, height: 450 },
  { id: 'thumbnail', name: 'Thumbnail', width: 512, height: 512 },
]

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
