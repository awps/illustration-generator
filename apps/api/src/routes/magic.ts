import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { sites, domains, platformUsers } from '@eleming/db/platform'
import { platformAuth } from '../middleware/auth'
import { signJwt } from '../lib/jwt'
import type { Env } from '../types'

const magic = new Hono<Env>()

magic.use('*', platformAuth)

// POST /v1/sites/:siteId/magic-token
magic.post('/', async (c) => {
  // Only superadmins can generate magic tokens
  if (c.get('userRole') !== 'superadmin') {
    return c.json({ error: 'forbidden', message: 'Superadmin required' }, 403)
  }

  const siteId = c.req.param('siteId')!
  const db = drizzle(c.env.PLATFORM_DB)

  // Verify site exists
  const [site] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1)

  if (!site) {
    return c.json({ error: 'not_found', message: 'Site not found' }, 404)
  }

  // Get primary domain for redirect URL
  const [primaryDomain] = await db
    .select()
    .from(domains)
    .where(eq(domains.siteId, siteId))
    .limit(1)

  if (!primaryDomain) {
    return c.json({ error: 'not_found', message: 'Site has no domains' }, 404)
  }

  // Get current user's email
  const [user] = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.id, c.get('userId')))
    .limit(1)

  const token = await signJwt(
    {
      siteId,
      platformUserId: c.get('userId'),
      email: user!.email,
      role: 'admin',
    },
    c.env.MAGIC_TOKEN_SECRET,
    60, // 60 seconds TTL
  )

  const url = `https://${primaryDomain.domain}/api/v1/auth/magic?token=${token}`

  return c.json({ token, url })
})

export { magic }