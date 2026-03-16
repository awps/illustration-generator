import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { platformUsers, platformSessions } from '@illustragen/db/platform'
import { serializeCookie } from '@illustragen/shared'
import { hashPassword, verifyPassword } from '../lib/password'
import { uuidv7 } from 'uuidv7'
import type { Env } from '../types'

const auth = new Hono<Env>()

auth.post('/register', async (c) => {
  const { email, password, name } = await c.req.json()
  if (!email || !password || !name) {
    return c.json({ error: 'validation', message: 'Email, password, and name required' }, 400)
  }

  const db = drizzle(c.env.PLATFORM_DB)

  const [existing] = await db
    .select({ id: platformUsers.id })
    .from(platformUsers)
    .where(eq(platformUsers.email, email))
    .limit(1)

  if (existing) {
    return c.json({ error: 'conflict', message: 'Email already registered' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const [user] = await db
    .insert(platformUsers)
    .values({ email, passwordHash, name })
    .returning()

  const token = uuidv7()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await db.insert(platformSessions).values({
    userId: user!.id,
    token,
    ipAddress: c.req.header('cf-connecting-ip') ?? null,
    userAgent: c.req.header('user-agent') ?? null,
    expiresAt,
  })

  const cookie = serializeCookie('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    domain: c.env.COOKIE_DOMAIN,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  c.header('Set-Cookie', cookie)
  return c.json({
    user: { id: user!.id, email: user!.email, name: user!.name, role: user!.role },
  }, 201)
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) {
    return c.json({ error: 'validation', message: 'Email and password required' }, 400)
  }

  const db = drizzle(c.env.PLATFORM_DB)
  const [user] = await db
    .select()
    .from(platformUsers)
    .where(eq(platformUsers.email, email))
    .limit(1)

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'unauthorized', message: 'Invalid credentials' }, 401)
  }

  const token = uuidv7()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await db.insert(platformSessions).values({
    userId: user.id,
    token,
    ipAddress: c.req.header('cf-connecting-ip') ?? null,
    userAgent: c.req.header('user-agent') ?? null,
    expiresAt,
  })

  const cookie = serializeCookie('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    domain: c.env.COOKIE_DOMAIN,
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  c.header('Set-Cookie', cookie)
  return c.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

auth.post('/logout', async (c) => {
  const cookieHeader = c.req.header('cookie') ?? ''
  const token = cookieHeader.match(/session=([^;]+)/)?.[1]

  if (token) {
    const db = drizzle(c.env.PLATFORM_DB)
    await db.delete(platformSessions).where(eq(platformSessions.token, token))
  }

  const cookie = serializeCookie('session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    domain: c.env.COOKIE_DOMAIN,
    path: '/',
    maxAge: 0,
  })

  c.header('Set-Cookie', cookie)
  return c.json({ ok: true })
})

export { auth }