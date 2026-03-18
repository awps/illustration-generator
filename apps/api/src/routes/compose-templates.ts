import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, or, isNull, desc, lt } from 'drizzle-orm'
import { composeTemplates, projects } from '@illustragen/db/platform'
import type { Env } from '../types'

const composeTemplatesRouter = new Hono<Env>()

function thumbnailKey(templateId: string) {
  return `compose-thumbnails/${templateId}.jpg`
}

async function uploadThumbnail(env: Env['Bindings'], templateId: string, dataUrl: string): Promise<string | null> {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/)
  if (!match?.[1]) return null
  const bytes = Uint8Array.from(atob(match[1]), (c) => c.charCodeAt(0))
  const key = thumbnailKey(templateId)
  await env.IMAGES_BUCKET.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } })
  return `https://${env.IMAGES_DOMAIN}/${key}`
}

// List templates with visibility filter + cursor pagination
composeTemplatesRouter.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userId = c.get('userId')
  const projectId = c.req.query('projectId')
  const tab = c.req.query('tab') as 'project' | 'personal' | 'public' | undefined
  const cursor = c.req.query('cursor')
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  let where
  if (tab === 'project' && projectId) {
    where = and(eq(composeTemplates.userId, userId), eq(composeTemplates.projectId, projectId))
  } else if (tab === 'public') {
    where = eq(composeTemplates.visibility, 'public')
  } else if (tab === 'personal') {
    where = and(eq(composeTemplates.userId, userId), eq(composeTemplates.visibility, 'personal'))
  } else {
    // Default: all visible to user
    where = projectId
      ? or(
          and(eq(composeTemplates.userId, userId), or(eq(composeTemplates.projectId, projectId), isNull(composeTemplates.projectId))),
          eq(composeTemplates.visibility, 'public')
        )
      : or(
          and(eq(composeTemplates.userId, userId), isNull(composeTemplates.projectId)),
          eq(composeTemplates.visibility, 'public')
        )
  }

  if (cursor) {
    where = and(where, lt(composeTemplates.id, cursor))
  }

  const rows = await db.select().from(composeTemplates)
    .where(where)
    .orderBy(desc(composeTemplates.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1]!.id : null

  const templates = page.map((r) => ({
    ...r,
    layers: JSON.parse(r.layers),
    createdAt: r.createdAt?.toISOString() ?? null,
    updatedAt: r.updatedAt?.toISOString() ?? null,
  }))

  return c.json({ templates, nextCursor })
})

// Create template
composeTemplatesRouter.post('/', async (c) => {
  const body = await c.req.json()
  const { name, width, height, layers, projectId, visibility, thumbnail } = body
  const userId = c.get('userId')

  if (!name || typeof name !== 'string')
    return c.json({ error: 'validation', message: 'name is required' }, 400)
  if (typeof width !== 'number' || width <= 0)
    return c.json({ error: 'validation', message: 'width must be a positive number' }, 400)
  if (typeof height !== 'number' || height <= 0)
    return c.json({ error: 'validation', message: 'height must be a positive number' }, 400)
  if (!Array.isArray(layers))
    return c.json({ error: 'validation', message: 'layers must be an array' }, 400)

  const db = drizzle(c.env.PLATFORM_DB)

  // Verify project ownership if projectId provided
  if (projectId) {
    const [project] = await db.select().from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1)
    if (!project)
      return c.json({ error: 'not_found', message: 'Project not found' }, 404)
  }

  const [template] = await db
    .insert(composeTemplates)
    .values({ userId, projectId: projectId ?? null, visibility: visibility ?? 'personal', name, width, height, layers: JSON.stringify(layers) })
    .returning()

  if (!template) return c.json({ error: 'internal', message: 'Failed to create template' }, 500)

  // Upload thumbnail to R2 if provided
  let thumbnailUrl: string | null = null
  if (typeof thumbnail === 'string' && thumbnail.startsWith('data:')) {
    thumbnailUrl = await uploadThumbnail(c.env, template.id, thumbnail)
    if (thumbnailUrl) {
      await db.update(composeTemplates).set({ thumbnail: thumbnailUrl }).where(eq(composeTemplates.id, template.id))
    }
  }

  return c.json({
    template: {
      ...template,
      thumbnail: thumbnailUrl,
      layers: JSON.parse(template.layers),
      createdAt: template.createdAt?.toISOString() ?? null,
      updatedAt: template.updatedAt?.toISOString() ?? null,
    },
  }, 201)
})

// Update template
composeTemplatesRouter.patch('/:id', async (c) => {
  const body = await c.req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.name === 'string') allowed.name = body.name
  if (typeof body.width === 'number' && body.width > 0) allowed.width = body.width
  if (typeof body.height === 'number' && body.height > 0) allowed.height = body.height
  if (Array.isArray(body.layers)) allowed.layers = JSON.stringify(body.layers)
  if (typeof body.visibility === 'string' && ['personal', 'project', 'public'].includes(body.visibility)) allowed.visibility = body.visibility

  // Upload new thumbnail if provided as base64
  if (typeof body.thumbnail === 'string' && body.thumbnail.startsWith('data:')) {
    const url = await uploadThumbnail(c.env, c.req.param('id'), body.thumbnail)
    if (url) allowed.thumbnail = url
  }

  const db = drizzle(c.env.PLATFORM_DB)
  const [template] = await db
    .update(composeTemplates)
    .set({ ...allowed, updatedAt: new Date() })
    .where(and(eq(composeTemplates.id, c.req.param('id')), eq(composeTemplates.userId, c.get('userId'))))
    .returning()

  if (!template) return c.json({ error: 'not_found', message: 'Template not found' }, 404)

  return c.json({
    template: {
      ...template,
      layers: JSON.parse(template.layers),
      createdAt: template.createdAt?.toISOString() ?? null,
      updatedAt: template.updatedAt?.toISOString() ?? null,
    },
  })
})

// Delete template
composeTemplatesRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [template] = await db
    .select()
    .from(composeTemplates)
    .where(and(eq(composeTemplates.id, c.req.param('id')), eq(composeTemplates.userId, c.get('userId'))))
    .limit(1)

  if (!template) return c.json({ error: 'not_found', message: 'Template not found' }, 404)

  // Clean up R2 thumbnail
  await c.env.IMAGES_BUCKET.delete(thumbnailKey(template.id)).catch(() => {})

  await db.delete(composeTemplates).where(eq(composeTemplates.id, c.req.param('id')))
  return c.json({ ok: true })
})

export { composeTemplatesRouter }
