import type { SiteConfig, Translatable } from '../types/config'

export type SettingRow = { key: string; value: string | null; locale: string }

function buildTranslatable(rows: SettingRow[], key: string): Translatable {
  const obj: Record<string, string> = {}
  for (const row of rows) {
    if (row.key === key && row.value != null) {
      obj[row.locale] = row.value
    }
  }
  if (!obj._) obj._ = ''
  return obj as Translatable
}

function getScalar(rows: SettingRow[], key: string): string {
  const row = rows.find((r) => r.key === key && r.locale === '_')
  return row?.value ?? ''
}

function getBlob<T>(rows: SettingRow[], key: string, fallback: T): T {
  const row = rows.find((r) => r.key === key && r.locale === '_')
  if (!row?.value) return fallback
  try {
    return JSON.parse(row.value) as T
  } catch {
    return fallback
  }
}

export function reconstructSiteConfig(rows: SettingRow[]): SiteConfig {
  return {
    site: {
      name: buildTranslatable(rows, 'site_name'),
      tagline: buildTranslatable(rows, 'site_tagline'),
      defaultLocale: getScalar(rows, 'default_locale') || 'en',
      locales: getBlob(rows, 'locales', []),
      favicon: getScalar(rows, 'favicon'),
      logo: {
        light: getScalar(rows, 'logo_light'),
        dark: getScalar(rows, 'logo_dark'),
      },
      timezone: getScalar(rows, 'timezone') || 'UTC',
      dateFormat: getScalar(rows, 'date_format') || 'YYYY-MM-DD',
      timeFormat: getScalar(rows, 'time_format') || 'HH:mm',
    },
    design: getBlob(rows, 'design', {} as any),
    contentTypes: getBlob(rows, 'content_types', []),
    taxonomies: getBlob(rows, 'taxonomies', []),
    roles: getBlob(rows, 'roles', []),
    redirects: getBlob(rows, 'redirects', []),
    integrations: getBlob(rows, 'integrations', []),
  }
}
