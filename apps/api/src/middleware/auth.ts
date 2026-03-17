import { createMiddleware } from 'hono/factory'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { platformSessions, platformUsers } from '@illustragen/db/platform'
import { parseCookies } from '@illustragen/shared'
import type { Env } from '../types'

export const platformAuth = createMiddleware<Env>(async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()

  // Skip auth for public routes
  const path = new URL(c.req.url).pathname
  if (path.startsWith('/v1/auth/') || path.startsWith('/v1/health')) return next()

  const cookieHeader = c.req.header('cookie') ?? ''
  const cookies = parseCookies(cookieHeader)
  const token = cookies['session']

  if (!token) {
    return c.json({ error: 'unauthorized', message: 'No session' }, 401)
  }

  const db = drizzle(c.env.PLATFORM_DB)
  const [session] = await db
    .select()
    .from(platformSessions)
    .where(eq(platformSessions.token, token))
    .limit(1)

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: 'unauthorized', message: 'Session expired' }, 401)
  }

  const [user] = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.id, session.userId))
    .limit(1)

  if (!user) {
    return c.json({ error: 'unauthorized', message: 'User not found' }, 401)
  }

  c.set('userId', user.id)
  c.set('userRole', user.role)
  await next()
})