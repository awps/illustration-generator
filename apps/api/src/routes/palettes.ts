import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, type SQL } from 'drizzle-orm'
import { palettes } from '@illustragen/db/platform'
import type { Env } from '../types'

const PALETTE_FILTERS = {
  predominantColor: ['blue', 'brown', 'gray', 'green', 'mixed', 'orange', 'pink', 'red', 'turquoise', 'violet', 'yellow'],
  style: ['bright', 'cold', 'dark', 'gradient', 'monochromatic', 'pastel', 'rainbow', 'vintage', 'warm'],
  topic: ['autumn', 'christmas', 'food', 'gold', 'halloween', 'happy', 'kids', 'nature', 'space', 'spring', 'summer', 'sunset', 'water', 'wedding', 'winter'],
  totalColors: [2, 3, 4, 5, 6, 7, 8, 9, 10],
}

const palettesRouter = new Hono<Env>()

palettesRouter.get('/filters', (c) => {
  return c.json(PALETTE_FILTERS)
})

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
