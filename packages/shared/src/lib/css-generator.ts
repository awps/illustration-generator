import type { DesignSystem, ThemeDefinition, ResponsiveValue } from '../types/config'

export function toClamp(mobile: string, desktop: string, minVp: number, maxVp: number): string {
  const mobileNum = parseFloat(mobile)
  const desktopNum = parseFloat(desktop)
  const mobileUnit = mobile.replace(/[\d.-]/g, '')
  const desktopUnit = desktop.replace(/[\d.-]/g, '')

  // Guard: equal values need no interpolation
  if (mobileNum === desktopNum) return mobile

  // Guard: mismatched units - fall back to desktop value
  if (mobileUnit !== desktopUnit) return desktop

  // Guard: division by zero
  if (maxVp === minVp) return mobile

  // Ensure min <= max for valid clamp()
  const [min, max] = mobileNum <= desktopNum ? [mobile, desktop] : [desktop, mobile]
  const minNum = Math.min(mobileNum, desktopNum)
  const maxNum = Math.max(mobileNum, desktopNum)

  const slope = (maxNum - minNum) / (maxVp - minVp)
  const intercept = minNum - slope * minVp
  return `clamp(${min}, ${intercept.toFixed(4)}${mobileUnit} + ${(slope * 100).toFixed(4)}vw, ${max})`
}

export function generateTokenCSS(
  prefix: string,
  tokens: Record<string, ResponsiveValue>,
  minVp: number,
  maxVp: number,
): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(tokens)) {
    const varName = `--${prefix}-${key}`
    if (Array.isArray(value)) {
      lines.push(`  ${varName}: ${toClamp(value[0], value[1], minVp, maxVp)};`)
    } else {
      lines.push(`  ${varName}: ${value};`)
    }
  }
  return lines.join('\n')
}

export function generateThemeCSS(theme: ThemeDefinition): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(theme.colors)) {
    const varName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    lines.push(`  ${varName}: ${value};`)
  }
  for (const [key, value] of Object.entries(theme.shadows)) {
    lines.push(`  --shadow-${key}: ${value};`)
  }
  return lines.join('\n')
}

export function generateFullCSS(design: DesignSystem): string {
  const { responsive, light, dark } = design
  const { minViewport, maxViewport } = responsive
  const sections: string[] = []

  // Shared tokens
  sections.push(':root {')
  sections.push(generateTokenCSS('space', design.spacing, minViewport, maxViewport))
  sections.push(generateTokenCSS('gap', design.gaps, minViewport, maxViewport))
  sections.push(generateTokenCSS('size', design.sizing, minViewport, maxViewport))
  sections.push(generateTokenCSS('text', design.typography.fontSize, minViewport, maxViewport))

  for (const [key, value] of Object.entries(design.typography.lineHeight)) {
    sections.push(`  --leading-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(design.typography.fontWeight)) {
    sections.push(`  --font-weight-${key}: ${value};`)
  }

  sections.push(`  --font-heading: '${design.typography.fontFamily.heading}', sans-serif;`)
  sections.push(`  --font-body: '${design.typography.fontFamily.body}', sans-serif;`)
  sections.push(`  --font-mono: '${design.typography.fontFamily.mono}', monospace;`)

  for (const [key, value] of Object.entries(design.borderRadius)) {
    sections.push(`  --radius-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(design.transitions)) {
    sections.push(`  --transition-${key}: ${value};`)
  }
  sections.push('}')

  // Light theme (default)
  sections.push(':root, [data-theme="light"] {')
  sections.push(generateThemeCSS(light))
  sections.push('}')

  // Dark theme
  sections.push('[data-theme="dark"] {')
  sections.push(generateThemeCSS(dark))
  sections.push('}')

  // System preference dark
  sections.push('@media (prefers-color-scheme: dark) {')
  sections.push('  :root:not([data-theme]) {')
  sections.push(generateThemeCSS(dark).split('\n').map(l => '  ' + l).join('\n'))
  sections.push('  }')
  sections.push('}')

  // Custom CSS
  if (design.customCSS) {
    sections.push(design.customCSS)
  }

  return sections.join('\n')
}