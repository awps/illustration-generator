import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { platformUsers } from '@illustragen/db/platform'
import { platformAuth } from '../middleware/auth'
import type { Env } from '../types'

const user = new Hono<Env>()

user.use('*', platformAuth)

user.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [u] = await db
    .select({
      id: platformUsers.id,
      email: platformUsers.email,
      name: platformUsers.name,
      role: platformUsers.role,
      createdAt: platformUsers.createdAt,
    })
    .from(platformUsers)
    .where(eq(platformUsers.id, c.get('userId')))
    .limit(1)

  if (!u) return c.json({ error: 'not_found', message: 'User not found' }, 404)
  return c.json({ user: u })
})

user.patch('/', async (c) => {
  const { name } = await c.req.json()
  const db = drizzle(c.env.PLATFORM_DB)

  const [updated] = await db
    .update(platformUsers)
    .set({ name, updatedAt: new Date() })
    .where(eq(platformUsers.id, c.get('userId')))
    .returning({
      id: platformUsers.id,
      email: platformUsers.email,
      name: platformUsers.name,
      role: platformUsers.role,
    })

  return c.json({ user: updated })
})

export { user }