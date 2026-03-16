// src/db/site-schema.ts
import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'
import { uuidv7 } from 'uuidv7'

// =====================
// Site Settings (replaces KV config)
// =====================

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').notNull(),
  value: text('value'),
  locale: text('locale').notNull().default('_'),
}, (table) => [
  primaryKey({ columns: [table.key, table.locale] }),
])

// =====================
// Users & Auth
// =====================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.role] }),
])

export const userMeta = sqliteTable('user_meta', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: text('user_id').notNull().references(() => users.id),
  key: text('key').notNull(),
  locale: text('locale'),
  value: text('value'),
}, (table) => [
  index('idx_user_meta_user_key_locale').on(table.userId, table.key, table.locale),
])

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_sessions_user').on(table.userId),
  index('idx_sessions_expires').on(table.expiresAt),
])

// =====================
// Content
// =====================

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  contentType: text('content_type').notNull(),
  slug: text('slug').notNull(),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).default('draft'),
  authorId: text('author_id').references(() => users.id),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('idx_entries_type_slug').on(table.contentType, table.slug),
  index('idx_entries_type_status').on(table.contentType, table.status),
])

export const entryFields = sqliteTable('entry_fields', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  entryId: text('entry_id').notNull().references(() => entries.id),
  fieldSlug: text('field_slug').notNull(),
  locale: text('locale').notNull().default('_'),
  value: text('value'),
}, (table) => [
  uniqueIndex('idx_entry_fields_entry_field_locale').on(table.entryId, table.fieldSlug, table.locale),
])

// =====================
// Comments
// =====================

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  entryId: text('entry_id').notNull().references(() => entries.id),
  parentId: text('parent_id'),
  authorId: text('author_id').references(() => users.id),
  guestName: text('guest_name'),
  guestEmail: text('guest_email'),
  content: text('content').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'spam', 'trash'] }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_comments_entry').on(table.entryId, table.status),
  index('idx_comments_parent').on(table.parentId),
])

// =====================
// Navigation
// =====================

export const menus = sqliteTable('menus', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const menuTranslations = sqliteTable('menu_translations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  menuId: text('menu_id').notNull().references(() => menus.id),
  locale: text('locale'),
  label: text('label').notNull(),
}, (table) => [
  uniqueIndex('idx_menu_translations_menu_locale').on(table.menuId, table.locale),
])

export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  menuId: text('menu_id').notNull().references(() => menus.id),
  parentId: text('parent_id'),
  href: text('href'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  highlight: integer('highlight', { mode: 'boolean' }).default(false),
}, (table) => [
  index('idx_menu_items_menu').on(table.menuId, table.sortOrder),
])

export const menuItemTranslations = sqliteTable('menu_item_translations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  menuItemId: text('menu_item_id').notNull().references(() => menuItems.id),
  locale: text('locale'),
  label: text('label').notNull(),
}, (table) => [
  uniqueIndex('idx_menu_item_translations').on(table.menuItemId, table.locale),
])

// =====================
// Media
// =====================

export const media = sqliteTable('media', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url').notNull(),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const mediaTranslations = sqliteTable('media_translations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  mediaId: text('media_id').notNull().references(() => media.id),
  locale: text('locale'),
  alt: text('alt'),
  title: text('title'),
}, (table) => [
  uniqueIndex('idx_media_translations').on(table.mediaId, table.locale),
])

// =====================
// Taxonomies
// =====================

export const terms = sqliteTable('terms', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  taxonomy: text('taxonomy').notNull(),
  slug: text('slug').notNull(),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').default(0),
}, (table) => [
  index('idx_terms_taxonomy').on(table.taxonomy, table.sortOrder),
  uniqueIndex('idx_terms_taxonomy_slug').on(table.taxonomy, table.slug),
])

export const termTranslations = sqliteTable('term_translations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  termId: text('term_id').notNull().references(() => terms.id),
  locale: text('locale'),
  name: text('name').notNull(),
}, (table) => [
  uniqueIndex('idx_term_translations').on(table.termId, table.locale),
])

export const entryTerms = sqliteTable('entry_terms', {
  entryId: text('entry_id').notNull().references(() => entries.id),
  termId: text('term_id').notNull().references(() => terms.id),
}, (table) => [
  primaryKey({ columns: [table.entryId, table.termId] }),
])