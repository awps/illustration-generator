/** Translatable string: { _: default, locale?: override } */
export type Translatable = { _: string } & Record<string, string>

/** Static value or [mobile, desktop] responsive pair */
export type ResponsiveValue = string | [string, string]

export interface SiteConfig {
  site: SiteIdentity
  design: DesignSystem
  contentTypes: ContentType[]
  taxonomies: Taxonomy[]
  roles: Role[]
  redirects: Redirect[]
  integrations: Integration[]
}

export type LocaleRoute =
  | { type: 'prefix'; slug: string }
  | { type: 'domain'; domain: string }

export interface LocaleMapping {
  language: string          // ISO 639-1: "pt", "ro", "en"
  country?: string          // ISO 3166-1 alpha-2 lowercase: "br", "pt", "md"
  label: Translatable       // { _: "Português (Brasil)" }
  route: LocaleRoute
}

export interface SiteIdentity {
  name: Translatable
  tagline: Translatable
  defaultLocale: string
  locales: LocaleMapping[]
  favicon: string
  logo: {
    light: string
    dark: string
  }
  timezone: string
  dateFormat: string
  timeFormat: string
}

export interface ThemeColors {
  primary: string
  primaryHover: string
  primaryMuted: string
  background: string
  surface: string
  surfaceRaised: string
  text: string
  textMuted: string
  border: string
  ring: string
  overlay: string
  success: string
  successMuted: string
  warning: string
  warningMuted: string
  error: string
  errorMuted: string
}

export interface ThemeShadows {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
}

export interface ThemeDefinition {
  colors: ThemeColors
  shadows: ThemeShadows
}

export interface DesignSystem {
  responsive: {
    minViewport: number
    maxViewport: number
  }
  theme: 'light' | 'dark' | 'system'
  light: ThemeDefinition
  dark: ThemeDefinition
  spacing: Record<string, ResponsiveValue>
  gaps: Record<string, ResponsiveValue>
  sizing: Record<string, string>
  typography: {
    fontFamily: {
      heading: string
      body: string
      mono: string
    }
    fontSize: Record<string, ResponsiveValue>
    lineHeight: Record<string, string>
    fontWeight: Record<string, string>
  }
  borderRadius: Record<string, string>
  transitions: Record<string, string>
  customCSS: string
}

export interface ContentTypeField {
  slug: string
  type: 'text' | 'textarea' | 'richtext' | 'slug' | 'image' | 'datetime' | 'number' | 'boolean' | 'select' | 'relation'
  required?: boolean
  translatable?: boolean
  relation?: string
  multiple?: boolean
}

export interface ContentType {
  slug: string
  label: Translatable
  icon: string
  public: boolean
  urlFormat?: string
  fields: ContentTypeField[]
  seo: {
    enabled: boolean
    fields?: ContentTypeField[]
  }
}

export interface Taxonomy {
  slug: string
  label: Translatable
  hierarchical: boolean
  contentTypes: string[]
}

export interface Role {
  slug: string
  label: Translatable
  permissions: string[]
}

export interface Redirect {
  from: string
  to: string
  statusCode: 301 | 302
}

export interface Integration {
  id: string
  enabled: boolean
  config: Record<string, unknown>
}