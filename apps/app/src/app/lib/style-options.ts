export const STYLE_OPTIONS = {
  renderings: ['flat', 'bold', 'geometric', 'lineart', 'clay', '3d', 'handdrawn', 'isometric', 'gradient', 'watercolor', 'pixel', 'cubist', 'risograph', 'doodle'] as const,
  elements: ['cards', 'character', 'object', 'icons', 'browser', 'badges', 'cursors', 'arrows', 'pills', 'charts', 'tables'] as const,
  compositions: ['flow', 'orbit', 'showcase', 'abstract', 'collection', 'diagram', 'split', 'editorial'] as const,
  moods: ['professional', 'playful', 'techy', 'friendly', 'polished', 'corporate', 'clean', 'authoritative', 'energetic', 'fun', 'lively', 'approachable', 'technical', 'modern', 'precise', 'warm', 'inviting'] as const,
  complexities: ['single', 'few', 'several', 'many', 'spacious', 'balanced', 'dense', 'simple', 'refined', 'intricate', 'sparse', 'informative', 'decorated', 'bare'] as const,
  layouts: ['centered', 'offset', 'left', 'right', 'horizontal', 'vertical', 'diagonal', 'stacked', 'grouped', 'grid', 'symmetric', 'asymmetric', 'overlapping', 'spread', 'tight', 'layered'] as const,
  subjects: ['dashboard', 'form', 'email', 'analytics', 'settings', 'integration', 'security', 'payment', 'editor', 'chat', 'website', 'mobile', 'wordpress', 'management'] as const,
  iconStyles: ['outlined', 'filled', 'minimal', 'rounded', 'sharp', 'thin', 'bold', 'duotone'] as const,
  placements: ['hero', 'feature', 'section', 'blog', 'header', 'card', 'thumbnail', 'onboarding', 'empty', 'state'] as const,
} as const

export type StyleCategory = keyof typeof STYLE_OPTIONS

export const STYLE_LABELS: Record<StyleCategory, string> = {
  renderings: 'Renderings',
  elements: 'Elements',
  compositions: 'Compositions',
  moods: 'Moods',
  complexities: 'Complexities',
  layouts: 'Layouts',
  subjects: 'Subjects',
  iconStyles: 'Icon Styles',
  placements: 'Placements',
}