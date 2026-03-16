import { createClient } from '@libsql/client'
import { reconstructSiteConfig } from '@eleming/shared'
import type { SiteConfig, SettingRow } from '@eleming/shared'

/** Read all site_settings rows and reconstruct a SiteConfig */
export async function readSiteConfig(
  tursoUrl: string,
  authToken: string,
): Promise<SiteConfig> {
  const client = createClient({ url: tursoUrl, authToken })
  try {
    const result = await client.execute('SELECT key, value, locale FROM site_settings')
    const rows = result.rows as unknown as SettingRow[]
    return reconstructSiteConfig(rows)
  } finally {
    client.close()
  }
}

/** Read rows for a single key (all locales or specific locale) */
export async function readSiteSetting(
  tursoUrl: string,
  authToken: string,
  key: string,
  locale?: string,
): Promise<SettingRow[]> {
  const client = createClient({ url: tursoUrl, authToken })
  try {
    const result = locale
      ? await client.execute({
          sql: 'SELECT key, value, locale FROM site_settings WHERE key = ? AND locale = ?',
          args: [key, locale],
        })
      : await client.execute({
          sql: 'SELECT key, value, locale FROM site_settings WHERE key = ?',
          args: [key],
        })
    return result.rows as unknown as SettingRow[]
  } finally {
    client.close()
  }
}

/** Write a single setting (upsert) */
export async function writeSiteSetting(
  tursoUrl: string,
  authToken: string,
  key: string,
  value: string | null,
  locale: string = '_',
): Promise<void> {
  const client = createClient({ url: tursoUrl, authToken })
  try {
    await client.execute({
      sql: `INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)
            ON CONFLICT (key, locale) DO UPDATE SET value = excluded.value`,
      args: [key, value, locale],
    })
  } finally {
    client.close()
  }
}

/** Write multiple settings in a batch (upsert) */
export async function writeSiteSettings(
  tursoUrl: string,
  authToken: string,
  entries: Array<{ key: string; value: string | null; locale?: string }>,
): Promise<void> {
  const client = createClient({ url: tursoUrl, authToken })
  try {
    await client.batch(
      entries.map((e) => ({
        sql: `INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)
              ON CONFLICT (key, locale) DO UPDATE SET value = excluded.value`,
        args: [e.key, e.value, e.locale ?? '_'],
      })),
    )
  } finally {
    client.close()
  }
}
