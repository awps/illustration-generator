import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { projects } from '@illustragen/db/platform'
import type { Env } from '../types'

const projectsRouter = new Hono<Env>()

// List projects (own only)
projectsRouter.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const userProjects = await db.select().from(projects).where(eq(projects.userId, c.get('userId')))
  return c.json({ projects: userProjects })
})

// Create project
projectsRouter.post('/', async (c) => {
  const body = await c.req.json()
  const { name, description, url } = body

  if (!name || typeof name !== 'string')
    return c.json({ error: 'validation', message: 'name is required' }, 400)

  if (description != null && typeof description !== 'string')
    return c.json({ error: 'validation', message: 'description must be a string' }, 400)

  if (url != null && typeof url !== 'string')
    return c.json({ error: 'validation', message: 'url must be a string' }, 400)

  const db = drizzle(c.env.PLATFORM_DB)
  const [project] = await db
    .insert(projects)
    .values({ userId: c.get('userId'), name, description: description ?? null, url: url ?? null })
    .returning()

  if (!project) return c.json({ error: 'internal', message: 'Failed to create project' }, 500)
  return c.json({ project }, 201)
})

// Get project (own only)
projectsRouter.get('/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, c.get('userId'))))
    .limit(1)

  if (!project) return c.json({ error: 'not_found', message: 'Project not found' }, 404)
  return c.json({ project })
})

// Update project (own only)
projectsRouter.patch('/:id', async (c) => {
  const body = await c.req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.name === 'string') allowed.name = body.name
  if (typeof body.description === 'string') allowed.description = body.description
  if (typeof body.url === 'string') allowed.url = body.url

  const db = drizzle(c.env.PLATFORM_DB)
  const [project] = await db
    .update(projects)
    .set({ ...allowed, updatedAt: new Date() })
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, c.get('userId'))))
    .returning()

  if (!project) return c.json({ error: 'not_found', message: 'Project not found' }, 404)
  return c.json({ project })
})

// Delete project (own only)
projectsRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, c.get('userId'))))
    .limit(1)

  if (!project) return c.json({ error: 'not_found', message: 'Project not found' }, 404)

  await db.delete(projects).where(eq(projects.id, c.req.param('id')))
  return c.json({ ok: true })
})

export { projectsRouter }
