import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { palettes } from '@illustragen/db/platform'
import type { Env } from '../types'

const palettesRouter = new Hono<Env>()

palettesRouter.get('/', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)

  const color = c.req.query('color')
  const style = c.req.query('style')
  const topic = c.req.query('topic')
  const totalColors = c.req.query('totalColors')
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200)
  const offset = Number(c.req.query('offset')) || 0

  const conditions: ReturnType<typeof eq>[] = []
  if (color) conditions.push(eq(palettes.predominantColor, color))
  if (style) conditions.push(eq(palettes.style, style))
  if (topic) conditions.push(eq(palettes.topic, topic))
  if (totalColors) conditions.push(eq(palettes.totalColors, Number(totalColors)))

  let query = db.select().from(palettes).$dynamic()
  for (const cond of conditions) {
    query = query.where(cond)
  }

  const results = await query.limit(limit).offset(offset)

  const [colors, styles, topics, counts] = await Promise.all([
    db.selectDistinct({ v: palettes.predominantColor }).from(palettes),
    db.selectDistinct({ v: palettes.style }).from(palettes),
    db.selectDistinct({ v: palettes.topic }).from(palettes),
    db.selectDistinct({ v: palettes.totalColors }).from(palettes),
  ])

  return c.json({
    filters: {
      predominantColor: colors.map(r => r.v).sort(),
      style: styles.map(r => r.v).sort(),
      topic: topics.map(r => r.v).sort(),
      totalColors: counts.map(r => r.v).sort((a, b) => a - b),
    },
    palettes: results,
    total: results.length,
  })
})

export { palettesRouter }