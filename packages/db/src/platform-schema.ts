import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { uuidv7 } from 'uuidv7'

// =====================
// Sites & Domains
// =====================

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).default(true),
  tursoDbName: text('turso_db_name').notNull(),
  tursoUrl: text('turso_url').notNull(),
  tursoAuthToken: text('turso_auth_token').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const domains = sqliteTable('domains', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  domain: text('domain').notNull().unique(),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(true),
  locale: text('locale'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_domains_site_id').on(table.siteId),
])

// =====================
// Platform Users & Auth
// =====================

export const platformUsers = sqliteTable('platform_users', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['superadmin', 'admin'] }).notNull().default('admin'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const platformSessions = sqliteTable('platform_sessions', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: text('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_platform_sessions_token').on(table.token),
  index('idx_platform_sessions_user').on(table.userId),
  index('idx_platform_sessions_expires').on(table.expiresAt),
])