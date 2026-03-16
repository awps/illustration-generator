import {Hono} from 'hono'
import {drizzle} from 'drizzle-orm/d1'
import {eq} from 'drizzle-orm'
import {sites, domains} from '@eleming/db/platform'
import {uuidv7} from 'uuidv7'
import {platformAuth} from '../middleware/auth'
import {createTursoDb, deleteTursoDb, applySiteSchema} from '../lib/turso-platform'
import type {Env} from '../types'

function generateRandomSuffix(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const sitesRouter = new Hono<Env>()

sitesRouter.use('*', platformAuth)

// List sites
sitesRouter.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const allSites = await db.select().from(sites)
  const allDomains = await db.select().from(domains)

  const domainsBySiteId = new Map<string, typeof allDomains>()
  for (const d of allDomains) {
    const list = domainsBySiteId.get(d.siteId) ?? []
    list.push(d)
    domainsBySiteId.set(d.siteId, list)
  }

  return c.json({
    sites: allSites.map((s) => ({...s, domains: domainsBySiteId.get(s.id) ?? []})),
  })
})

// Create site — auto-provisions Turso database
sitesRouter.post('/', async (c) => {
  const body = await c.req.json()
  const {name} = body
  const slug = body.slug as string | undefined
  if (!name || typeof name !== 'string') {
    return c.json({error: 'validation', message: 'name is required'}, 400)
  }

  const baseSlug = toSlug(slug || name)
  if (!baseSlug) {
    return c.json({error: 'validation', message: 'could not derive a valid slug from name'}, 400)
  }

  const siteId = uuidv7()
  const dbName = `site-${siteId}`

  // Resolve subdomain early (needed for Turso config seed)
  const db = drizzle(c.env.PLATFORM_DB)
  let domainName = `${baseSlug}.${c.env.SITE_BASE_DOMAIN}`

  const [existing] = await db
    .select()
    .from(domains)
    .where(eq(domains.domain, domainName))
    .limit(1)

  if (existing) {
    domainName = `${baseSlug}-${generateRandomSuffix(5)}.${c.env.SITE_BASE_DOMAIN}`
  }

  // Provision Turso database
  let tursoConfig
  try {
    tursoConfig = await createTursoDb(
      dbName,
      c.env.TURSO_ORG,
      c.env.TURSO_GROUP,
      c.env.TURSO_API_TOKEN
    )
  } catch (err) {
    return c.json({error: 'turso', message: `Failed to create database: ${(err as Error).message}`}, 502)
  }

  // Apply site schema + seed default config — if this fails, clean up the orphaned Turso DB
  try {
    await applySiteSchema(tursoConfig.hostname, tursoConfig.authToken, {
      siteName: name,
      domain:   domainName,
    })
  } catch (err) {
    await deleteTursoDb(tursoConfig.dbName, c.env.TURSO_ORG, c.env.TURSO_API_TOKEN).catch(() => {
    })
    return c.json({error: 'turso', message: `Failed to apply schema: ${(err as Error).message}`}, 502)
  }

  // Store in D1
  const [site] = await db
    .insert(sites)
    .values({
      id:             siteId,
      name,
      tursoDbName:    tursoConfig.dbName,
      tursoUrl:       `libsql://${tursoConfig.hostname}`,
      tursoAuthToken: tursoConfig.authToken,
    })
    .returning()

  if (!site) return c.json({error: 'internal', message: 'Failed to create site'}, 500);

  const [domain] = await db
    .insert(domains)
    .values({domain: domainName, siteId: site.id, isPrimary: true})
    .returning()

  return c.json({site: {...site, domains: [domain]}}, 201)
})

// Get site
sitesRouter.get('/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, c.req.param('id')))
    .limit(1)

  if (!site) return c.json({error: 'not_found', message: 'Site not found'}, 404)

  const siteDomains = await db
    .select()
    .from(domains)
    .where(eq(domains.siteId, site.id))

  return c.json({site: {...site, domains: siteDomains}})
})

// Update site
sitesRouter.patch('/:id', async (c) => {
  const body = await c.req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.active === 'boolean') allowed.active = body.active
  if (typeof body.name === 'string') allowed.name = body.name

  const db = drizzle(c.env.PLATFORM_DB)

  const [site] = await db
    .update(sites)
    .set({...allowed, updatedAt: new Date()})
    .where(eq(sites.id, c.req.param('id')))
    .returning()

  if (!site) return c.json({error: 'not_found', message: 'Site not found'}, 404)
  return c.json({site})
})

// Delete site — also deletes Turso database
sitesRouter.delete('/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)

  // Get the site first to know the Turso DB name
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, c.req.param('id')))
    .limit(1)

  if (!site) return c.json({error: 'not_found', message: 'Site not found'}, 404)

  // Delete Turso DB first — if this fails, D1 row stays intact for retry
  try {
    await deleteTursoDb(site.tursoDbName, c.env.TURSO_ORG, c.env.TURSO_API_TOKEN)
  } catch (err) {
    return c.json({error: 'turso', message: `Failed to delete database: ${(err as Error).message}`}, 502)
  }

  // Delete from D1 (cascade deletes domains)
  await db.delete(sites).where(eq(sites.id, c.req.param('id')))

  return c.json({ok: true})
})

export {sitesRouter}