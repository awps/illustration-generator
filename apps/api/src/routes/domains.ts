import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { domains } from '@eleming/db/platform'
import { platformAuth } from '../middleware/auth'
import type { Env } from '../types'

const domainsRouter = new Hono<Env>()

domainsRouter.use('*', platformAuth)

// List domains for a site
domainsRouter.get('/', async (c) => {
  const siteId = c.req.param('siteId')
  const db = drizzle(c.env.PLATFORM_DB)
  const result = await db
    .select()
    .from(domains)
    .where(eq(domains.siteId, siteId))

  return c.json({ domains: result })
})

// Add domain
domainsRouter.post('/', async (c) => {
  const siteId = c.req.param('siteId')
  const { domain, isPrimary, locale } = await c.req.json()
  if (!domain) {
    return c.json({ error: 'validation', message: 'domain required' }, 400)
  }

  const db = drizzle(c.env.PLATFORM_DB)
  const [created] = await db
    .insert(domains)
    .values({ domain, siteId, isPrimary: isPrimary ?? false, locale: locale ?? null })
    .returning()

  return c.json({ domain: created }, 201)
})

// Update domain
domainsRouter.patch('/:domainId', async (c) => {
  const siteId = c.req.param('siteId')
  const body = await c.req.json()
  const allowed: Record<string, unknown> = {}

  if (typeof body.isPrimary === 'boolean') allowed.isPrimary = body.isPrimary
  if (typeof body.locale === 'string' || body.locale === null) allowed.locale = body.locale

  if (Object.keys(allowed).length === 0) {
    return c.json({ error: 'validation', message: 'No valid fields to update' }, 400)
  }

  const db = drizzle(c.env.PLATFORM_DB)
  const [updated] = await db
    .update(domains)
    .set(allowed)
    .where(
      and(
        eq(domains.id, c.req.param('domainId')),
        eq(domains.siteId, siteId),
      ),
    )
    .returning()

  if (!updated) return c.json({ error: 'not_found', message: 'Domain not found' }, 404)
  return c.json({ domain: updated })
})

// Delete domain
domainsRouter.delete('/:domainId', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [deleted] = await db
    .delete(domains)
    .where(
      and(
        eq(domains.id, c.req.param('domainId')),
        eq(domains.siteId, c.req.param('siteId')),
      ),
    )
    .returning()

  if (!deleted) return c.json({ error: 'not_found', message: 'Domain not found' }, 404)
  return c.json({ ok: true })
})

export { domainsRouter }