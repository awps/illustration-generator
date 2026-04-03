import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { userProjectPreferences } from '@illustragen/db/platform'
import type { Env } from '../types'

const preferencesRouter = new Hono<Env>()

// Get all preferences for a user+project
preferencesRouter.get('/projects/:projectId/preferences', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userId = c.get('userId')
  const projectId = c.req.param('projectId')

  const rows = await db.select().from(userProjectPreferences)
    .where(and(eq(userProjectPreferences.userId, userId), eq(userProjectPreferences.projectId, projectId)))

  const prefs: Record<string, string> = {}
  for (const row of rows) prefs[row.key] = row.value

  return c.json({ preferences: prefs })
})

// Get a single preference
preferencesRouter.get('/projects/:projectId/preferences/:key', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userId = c.get('userId')
  const projectId = c.req.param('projectId')
  const key = c.req.param('key')

  const [row] = await db.select().from(userProjectPreferences)
    .where(and(
      eq(userProjectPreferences.userId, userId),
      eq(userProjectPreferences.projectId, projectId),
      eq(userProjectPreferences.key, key),
    ))
    .limit(1)

  if (!row) return c.json({ value: null })
  return c.json({ value: row.value })
})

// Set a preference (upsert)
preferencesRouter.put('/projects/:projectId/preferences/:key', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userId = c.get('userId')
  const projectId = c.req.param('projectId')
  const key = c.req.param('key')
  const body = await c.req.json()
  const value = body.value

  if (typeof value !== 'string')
    return c.json({ error: 'validation', message: 'value must be a string' }, 400)

  // Delete + insert (SQLite upsert)
  await db.delete(userProjectPreferences).where(and(
    eq(userProjectPreferences.userId, userId),
    eq(userProjectPreferences.projectId, projectId),
    eq(userProjectPreferences.key, key),
  ))
  await db.insert(userProjectPreferences).values({ userId, projectId, key, value })

  return c.json({ ok: true })
})

// Delete a preference
preferencesRouter.delete('/projects/:projectId/preferences/:key', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userId = c.get('userId')
  const projectId = c.req.param('projectId')
  const key = c.req.param('key')

  await db.delete(userProjectPreferences).where(and(
    eq(userProjectPreferences.userId, userId),
    eq(userProjectPreferences.projectId, projectId),
    eq(userProjectPreferences.key, key),
  ))

  return c.json({ ok: true })
})

export { preferencesRouter }