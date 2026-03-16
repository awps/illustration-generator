import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { sites, domains } from '@eleming/db/platform'
import { platformAuth } from '../middleware/auth'
import { readSiteSetting, writeSiteSetting } from '../lib/site-config'
import type { LocaleMapping } from '@eleming/shared'
import type { Env } from '../types'

const languagesRouter = new Hono<Env>()

languagesRouter.use('*', platformAuth)

// List all languages for a site
languagesRouter.get('/', async (c) => {
  const siteId = c.req.param('siteId')
  const db = drizzle(c.env.PLATFORM_DB)

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId!))
    .limit(1)

  if (!site) return c.json({ error: 'not_found', message: 'Site not found' }, 404)

  const localesRows = await readSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales')
  const defaultLocaleRows = await readSiteSetting(site.tursoUrl, site.tursoAuthToken, 'default_locale')
  const locales: LocaleMapping[] = JSON.parse(localesRows[0]?.value ?? '[]')
  const defaultLocale = defaultLocaleRows[0]?.value ?? 'en'

  return c.json({ languages: locales, defaultLocale })
})

// Add a language
languagesRouter.post('/', async (c) => {
  const siteId = c.req.param('siteId')
  const body = await c.req.json()
  const { language, country, label, route } = body

  // Validate required fields
  if (!language || typeof language !== 'string') {
    return c.json({ error: 'validation', message: 'language is required (ISO 639-1 code)' }, 400)
  }
  if (!label || !label._) {
    return c.json({ error: 'validation', message: 'label with _ key is required' }, 400)
  }
  if (!route || !route.type) {
    return c.json({ error: 'validation', message: 'route is required ({ type: "prefix", slug } or { type: "domain", domain })' }, 400)
  }

  const db = drizzle(c.env.PLATFORM_DB)

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId!))
    .limit(1)

  if (!site) return c.json({ error: 'not_found', message: 'Site not found' }, 404)

  const localesRows = await readSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales')
  const locales: LocaleMapping[] = JSON.parse(localesRows[0]?.value ?? '[]')

  // Check language doesn't already exist
  if (locales.some((l) => l.language === language)) {
    return c.json({ error: 'conflict', message: `Language "${language}" already exists` }, 409)
  }

  // Check prefix slug uniqueness
  if (route.type === 'prefix') {
    if (locales.some((l) => l.route.type === 'prefix' && l.route.slug === route.slug)) {
      return c.json({ error: 'conflict', message: `Prefix slug "${route.slug}" already in use` }, 409)
    }
  }

  // Check domain uniqueness for domain routes
  if (route.type === 'domain') {
    if (!route.domain) {
      return c.json({ error: 'validation', message: 'domain is required for domain route type' }, 400)
    }
    // Check if domain already exists in domains table
    const [existingDomain] = await db
      .select()
      .from(domains)
      .where(eq(domains.domain, route.domain))
      .limit(1)

    if (existingDomain) {
      return c.json({ error: 'conflict', message: `Domain "${route.domain}" already exists` }, 409)
    }
  }

  // Add the locale and write back locales key only
  const newLocale = { language, ...(country && { country }), label, route }
  locales.push(newLocale)
  await writeSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales', JSON.stringify(locales))

  // Auto-create domain record for domain-routed locales
  if (route.type === 'domain') {
    await db
      .insert(domains)
      .values({ domain: route.domain, siteId: siteId!, isPrimary: false, locale: language })
  }

  return c.json({ language: newLocale }, 201)
})

// Update a language
languagesRouter.patch('/:lang', async (c) => {
  const siteId = c.req.param('siteId')
  const lang = c.req.param('lang')
  const body = await c.req.json()

  const db = drizzle(c.env.PLATFORM_DB)

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId!))
    .limit(1)

  if (!site) return c.json({ error: 'not_found', message: 'Site not found' }, 404)

  const localesRows = await readSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales')
  const locales: LocaleMapping[] = JSON.parse(localesRows[0]?.value ?? '[]')

  const index = locales.findIndex((l) => l.language === lang)
  if (index === -1) {
    return c.json({ error: 'not_found', message: `Language "${lang}" not found` }, 404)
  }

  const existing = locales[index]!

  // Validate new prefix slug uniqueness
  if (body.route?.type === 'prefix') {
    const slugConflict = locales.some(
      (l, i) => i !== index && l.route.type === 'prefix' && l.route.slug === body.route.slug,
    )
    if (slugConflict) {
      return c.json({ error: 'conflict', message: `Prefix slug "${body.route.slug}" already in use` }, 409)
    }
  }

  // Validate new domain uniqueness
  if (body.route?.type === 'domain') {
    if (!body.route.domain) {
      return c.json({ error: 'validation', message: 'domain is required for domain route type' }, 400)
    }
    const [existingDomain] = await db
      .select()
      .from(domains)
      .where(eq(domains.domain, body.route.domain))
      .limit(1)

    if (existingDomain && existingDomain.siteId !== siteId) {
      return c.json({ error: 'conflict', message: `Domain "${body.route.domain}" belongs to another site` }, 409)
    }
  }

  // Domain sync: handle route type changes
  const oldRoute = existing.route
  const newRoute = body.route ?? oldRoute

  // Old was domain → delete old domain record
  if (oldRoute.type === 'domain' && (newRoute.type === 'prefix' || (newRoute.type === 'domain' && newRoute.domain !== oldRoute.domain))) {
    await db
      .delete(domains)
      .where(and(eq(domains.domain, oldRoute.domain), eq(domains.siteId, siteId!)))
  }

  // New is domain → create new domain record
  if (newRoute.type === 'domain' && (oldRoute.type === 'prefix' || (oldRoute.type === 'domain' && oldRoute.domain !== newRoute.domain))) {
    await db
      .insert(domains)
      .values({ domain: newRoute.domain, siteId: siteId!, isPrimary: false, locale: lang! })
  }

  // Apply updates and write back locales key only
  const updated = {
    ...existing,
    ...(body.country !== undefined && { country: body.country || undefined }),
    ...(body.label && { label: body.label }),
    ...(body.route && { route: body.route }),
  }
  locales[index] = updated
  await writeSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales', JSON.stringify(locales))

  return c.json({ language: updated })
})

// Delete a language
languagesRouter.delete('/:lang', async (c) => {
  const siteId = c.req.param('siteId')
  const lang = c.req.param('lang')

  const db = drizzle(c.env.PLATFORM_DB)

  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId!))
    .limit(1)

  if (!site) return c.json({ error: 'not_found', message: 'Site not found' }, 404)

  const localesRows = await readSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales')
  const defaultLocaleRows = await readSiteSetting(site.tursoUrl, site.tursoAuthToken, 'default_locale')
  const locales: LocaleMapping[] = JSON.parse(localesRows[0]?.value ?? '[]')
  const defaultLocale = defaultLocaleRows[0]?.value ?? 'en'

  // Can't delete default locale
  if (defaultLocale === lang) {
    return c.json({ error: 'validation', message: 'Cannot delete the default locale' }, 400)
  }

  const index = locales.findIndex((l) => l.language === lang)
  if (index === -1) {
    return c.json({ error: 'not_found', message: `Language "${lang}" not found` }, 404)
  }

  const removed = locales[index]!

  // Remove and write back locales key only
  locales.splice(index, 1)
  await writeSiteSetting(site.tursoUrl, site.tursoAuthToken, 'locales', JSON.stringify(locales))

  // Auto-delete domain record for domain-routed locales
  if (removed.route.type === 'domain') {
    await db
      .delete(domains)
      .where(and(eq(domains.domain, removed.route.domain), eq(domains.siteId, siteId!)))
  }

  return c.json({ ok: true })
})

export { languagesRouter }
