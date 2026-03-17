import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, type SQL } from 'drizzle-orm'
import { palettes } from '@illustragen/db/platform'
import type { Env } from '../types'

const palettesRouter = new Hono<Env>()

// GET /v1/palettes/filters — distinct values for dropdowns
palettesRouter.get('/filters', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)

  const [colors, styles, topics, counts] = await Promise.all([
    db.selectDistinct({ v: palettes.predominantColor }).from(palettes),
    db.selectDistinct({ v: palettes.style }).from(palettes),
    db.selectDistinct({ v: palettes.topic }).from(palettes),
    db.selectDistinct({ v: palettes.totalColors }).from(palettes),
  ])

  return c.json({
    predominantColor: colors.map(r => r.v).sort(),
    style: styles.map(r => r.v).sort(),
    topic: topics.map(r => r.v).sort(),
    totalColors: counts.map(r => r.v).sort((a, b) => a - b),
  })
})

// GET /v1/palettes — paginated list with filters
palettesRouter.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)

  const color = c.req.query('color')
  const style = c.req.query('style')
  const topic = c.req.query('topic')
  const totalColors = c.req.query('totalColors')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  const conditions: SQL[] = []
  if (color) conditions.push(eq(palettes.predominantColor, color))
  if (style) conditions.push(eq(palettes.style, style))
  if (topic) conditions.push(eq(palettes.topic, topic))
  if (totalColors) conditions.push(eq(palettes.totalColors, Number(totalColors)))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const results = await db.select().from(palettes).where(where).limit(limit).offset(offset)

  return c.json({ palettes: results })
})

export { palettesRouter }
