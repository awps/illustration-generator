import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { uuidv7 } from 'uuidv7'

// =====================
// Projects
// =====================

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: text('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  url: text('url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_projects_user_id').on(table.userId),
])

// =====================
// Palettes
// =====================

export const palettes = sqliteTable('palettes', {
  id: text('id').primaryKey(),
  colors: text('colors').notNull(),
  totalColors: integer('total_colors').notNull(),
  predominantColor: text('predominant_color').notNull(),
  style: text('style').notNull(),
  topic: text('topic').notNull(),
}, (table) => [
  index('idx_palettes_predominant_color').on(table.predominantColor),
  index('idx_palettes_style').on(table.style),
  index('idx_palettes_topic').on(table.topic),
  index('idx_palettes_total_colors').on(table.totalColors),
])

// =====================
// Generations
// =====================

export const generations = sqliteTable('generations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  paletteId: text('palette_id'),
  renderings: text('renderings'),
  elements: text('elements'),
  compositions: text('compositions'),
  placements: text('placements'),
  moods: text('moods'),
  complexities: text('complexities'),
  layouts: text('layouts'),
  subjects: text('subjects'),
  iconStyles: text('icon_styles'),
  storagePath: text('storage_path').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_generations_project_id').on(table.projectId),
  index('idx_generations_user_id').on(table.userId),
  index('idx_generations_created_at').on(table.createdAt),
  index('idx_generations_palette_id').on(table.paletteId),
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