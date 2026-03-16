import { createClient } from '@libsql/client'

export interface TursoDbConfig {
  dbName: string
  hostname: string
  authToken: string
}

interface TursoApiResponse {
  database: {
    DbId: string
    Hostname: string
    Name: string
  }
}

interface TursoTokenResponse {
  jwt: string
}

export async function createTursoDb(
  name: string,
  tursoOrg: string,
  tursoGroup: string,
  tursoApiToken: string
): Promise<TursoDbConfig> {
  // Create the database
  const createRes = await fetch(
    `https://api.turso.tech/v1/organizations/${tursoOrg}/databases`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tursoApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, group: tursoGroup }),
    }
  )

  console.log(createRes);
  
  if (!createRes.ok) {
    const errorText = await createRes.text()
    throw new Error(`Failed to create Turso database: ${createRes.status} ${errorText}`)
  }

  const { database }: TursoApiResponse = await createRes.json()

  // Create full-access auth token
  const tokenRes = await fetch(
    `https://api.turso.tech/v1/organizations/${tursoOrg}/databases/${database.Name}/auth/tokens?authorization=full-access`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tursoApiToken}` },
    }
  )

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text()
    throw new Error(`Failed to create Turso token: ${tokenRes.status} ${errorText}`)
  }

  const { jwt }: TursoTokenResponse = await tokenRes.json()

  return {
    dbName: database.Name,
    hostname: database.Hostname,
    authToken: jwt,
  }
}

export async function deleteTursoDb(
  dbName: string,
  tursoOrg: string,
  tursoApiToken: string
): Promise<void> {
  const res = await fetch(
    `https://api.turso.tech/v1/organizations/${tursoOrg}/databases/${dbName}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tursoApiToken}` },
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to delete Turso database: ${res.status} ${errorText}`)
  }
}

/** Apply the site schema tables and seed default config */
export async function applySiteSchema(
  hostname: string,
  authToken: string,
  seed: { siteName: string },
): Promise<void> {
  const client = createClient({
    url: `libsql://${hostname}`,
    authToken,
  })

  const designDefault = {
    responsive: { minViewport: 320, maxViewport: 1440 },
    theme: 'system',
    light: {
      colors: {
        primary: '#2563eb', primaryHover: '#1d4ed8', primaryMuted: '#dbeafe',
        background: '#ffffff', surface: '#f8fafc', surfaceRaised: '#ffffff',
        text: '#0f172a', textMuted: '#64748b', border: '#e2e8f0',
        ring: '#2563eb', overlay: 'rgba(0,0,0,0.5)',
        success: '#16a34a', successMuted: '#dcfce7',
        warning: '#ca8a04', warningMuted: '#fef9c3',
        error: '#dc2626', errorMuted: '#fee2e2',
      },
      shadows: {
        none: 'none', sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.1)',
      },
    },
    dark: {
      colors: {
        primary: '#3b82f6', primaryHover: '#60a5fa', primaryMuted: '#1e3a5f',
        background: '#0f172a', surface: '#1e293b', surfaceRaised: '#334155',
        text: '#f1f5f9', textMuted: '#94a3b8', border: '#334155',
        ring: '#3b82f6', overlay: 'rgba(0,0,0,0.7)',
        success: '#22c55e', successMuted: '#14532d',
        warning: '#eab308', warningMuted: '#713f12',
        error: '#ef4444', errorMuted: '#7f1d1d',
      },
      shadows: {
        none: 'none', sm: '0 1px 2px rgba(0,0,0,0.3)',
        md: '0 4px 6px rgba(0,0,0,0.4)', lg: '0 10px 15px rgba(0,0,0,0.4)',
        xl: '0 20px 25px rgba(0,0,0,0.4)',
      },
    },
    spacing: {}, gaps: {}, sizing: {},
    typography: {
      fontFamily: { heading: 'system-ui, sans-serif', body: 'system-ui, sans-serif', mono: 'monospace' },
      fontSize: {}, lineHeight: {}, fontWeight: {},
    },
    borderRadius: {}, transitions: {}, customCSS: '',
  }

  try {
    await client.batch([
      // Site Settings
      `CREATE TABLE site_settings (key TEXT NOT NULL, value TEXT, locale TEXT NOT NULL DEFAULT '_', PRIMARY KEY (key, locale))`,
      // Users & Auth
      `CREATE TABLE users (id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER, updated_at INTEGER)`,
      `CREATE TABLE user_roles (user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL, PRIMARY KEY (user_id, role))`,
      `CREATE TABLE user_meta (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL, locale TEXT, value TEXT)`,
      `CREATE INDEX idx_user_meta_user_key_locale ON user_meta(user_id, key, locale)`,
      `CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token TEXT NOT NULL UNIQUE, ip_address TEXT, user_agent TEXT, expires_at INTEGER NOT NULL, created_at INTEGER)`,
      `CREATE INDEX idx_sessions_user ON sessions(user_id)`,
      `CREATE INDEX idx_sessions_expires ON sessions(expires_at)`,
      // Content
      `CREATE TABLE entries (id TEXT PRIMARY KEY, content_type TEXT NOT NULL, slug TEXT NOT NULL, status TEXT DEFAULT 'draft', author_id TEXT REFERENCES users(id), published_at INTEGER, created_at INTEGER, updated_at INTEGER)`,
      `CREATE UNIQUE INDEX idx_entries_type_slug ON entries(content_type, slug)`,
      `CREATE INDEX idx_entries_type_status ON entries(content_type, status)`,
      `CREATE TABLE entry_fields (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES entries(id), field_slug TEXT NOT NULL, locale TEXT NOT NULL DEFAULT '_', value TEXT)`,
      `CREATE UNIQUE INDEX idx_entry_fields_entry_field_locale ON entry_fields(entry_id, field_slug, locale)`,
      // Comments
      `CREATE TABLE comments (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES entries(id), parent_id TEXT, author_id TEXT REFERENCES users(id), guest_name TEXT, guest_email TEXT, content TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at INTEGER, updated_at INTEGER)`,
      `CREATE INDEX idx_comments_entry ON comments(entry_id, status)`,
      `CREATE INDEX idx_comments_parent ON comments(parent_id)`,
      // Navigation
      `CREATE TABLE menus (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, created_at INTEGER)`,
      `CREATE TABLE menu_translations (id TEXT PRIMARY KEY, menu_id TEXT NOT NULL REFERENCES menus(id), locale TEXT, label TEXT NOT NULL)`,
      `CREATE UNIQUE INDEX idx_menu_translations_menu_locale ON menu_translations(menu_id, locale)`,
      `CREATE TABLE menu_items (id TEXT PRIMARY KEY, menu_id TEXT NOT NULL REFERENCES menus(id), parent_id TEXT, href TEXT, icon TEXT, sort_order INTEGER DEFAULT 0, highlight INTEGER DEFAULT 0)`,
      `CREATE INDEX idx_menu_items_menu ON menu_items(menu_id, sort_order)`,
      `CREATE TABLE menu_item_translations (id TEXT PRIMARY KEY, menu_item_id TEXT NOT NULL REFERENCES menu_items(id), locale TEXT, label TEXT NOT NULL)`,
      `CREATE UNIQUE INDEX idx_menu_item_translations ON menu_item_translations(menu_item_id, locale)`,
      // Media
      `CREATE TABLE media (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size INTEGER NOT NULL, url TEXT NOT NULL, uploaded_by TEXT REFERENCES users(id), created_at INTEGER)`,
      `CREATE TABLE media_translations (id TEXT PRIMARY KEY, media_id TEXT NOT NULL REFERENCES media(id), locale TEXT, alt TEXT, title TEXT)`,
      `CREATE UNIQUE INDEX idx_media_translations ON media_translations(media_id, locale)`,
      // Taxonomies
      `CREATE TABLE terms (id TEXT PRIMARY KEY, taxonomy TEXT NOT NULL, slug TEXT NOT NULL, parent_id TEXT, sort_order INTEGER DEFAULT 0)`,
      `CREATE INDEX idx_terms_taxonomy ON terms(taxonomy, sort_order)`,
      `CREATE UNIQUE INDEX idx_terms_taxonomy_slug ON terms(taxonomy, slug)`,
      `CREATE TABLE term_translations (id TEXT PRIMARY KEY, term_id TEXT NOT NULL REFERENCES terms(id), locale TEXT, name TEXT NOT NULL)`,
      `CREATE UNIQUE INDEX idx_term_translations ON term_translations(term_id, locale)`,
      `CREATE TABLE entry_terms (entry_id TEXT NOT NULL REFERENCES entries(id), term_id TEXT NOT NULL REFERENCES terms(id), PRIMARY KEY (entry_id, term_id))`,
      // Seed site settings as keyed rows
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['site_name', seed.siteName, '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['site_tagline', '', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['default_locale', 'en', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['locales', JSON.stringify([{ language: 'en', label: { _: 'English' }, route: { type: 'prefix', slug: '' } }]), '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['favicon', '', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['logo_light', '', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['logo_dark', '', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['timezone', 'UTC', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['date_format', 'YYYY-MM-DD', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['time_format', 'HH:mm', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['design', JSON.stringify(designDefault), '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['content_types', '[]', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['taxonomies', '[]', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['roles', JSON.stringify([{ slug: 'admin', label: { _: 'Admin' }, permissions: ['*'] }]), '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['redirects', '[]', '_'] },
      { sql: 'INSERT INTO site_settings (key, value, locale) VALUES (?, ?, ?)', args: ['integrations', '[]', '_'] },
    ])
  } finally {
    client.close()
  }
}