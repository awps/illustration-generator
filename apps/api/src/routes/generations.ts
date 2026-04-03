import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc, lt } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { generations, projects, palettes } from '@illustragen/db/platform'
import { inArray } from 'drizzle-orm'
import type { Env } from '../types'
import {
  RENDERING_KEYWORDS, ELEMENT_KEYWORDS, COMPOSITION_KEYWORDS,
  MOOD_KEYWORDS, COMPLEXITY_KEYWORDS, LAYOUT_KEYWORDS,
  SUBJECT_KEYWORDS, ICON_STYLE_KEYWORDS, PLACEMENT_KEYWORDS,
} from '../styles'
import { resolvePalette } from '../palettes'
import { runPipeline, PipelineError } from '../pipeline'

type DbClient = ReturnType<typeof drizzle>

async function enrichWithPalettes(db: DbClient, gens: typeof generations.$inferSelect[]) {
  const paletteIds = [...new Set(gens.map((g) => g.paletteId).filter(Boolean))] as string[]
  if (paletteIds.length === 0) return gens.map((g) => ({ ...g, paletteColors: null as string[] | null }))
  const paletteRows = await db.select({ id: palettes.id, colors: palettes.colors }).from(palettes).where(inArray(palettes.id, paletteIds))
  const colorMap = new Map(paletteRows.map((p) => [p.id, JSON.parse(p.colors) as string[]]))
  return gens.map((g) => ({ ...g, paletteColors: (g.paletteId ? colorMap.get(g.paletteId) : null) ?? null }))
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message)
}

function resolveArrayProp<T extends string>(
  value: unknown, name: string, keywords: Record<T, string>
): T[] | 'random' | null {
  const valid = Object.keys(keywords) as T[]
  if (value == null) return null
  if (value === 'random') return 'random'
  if (typeof value === 'string') {
    if (!(valid as string[]).includes(value))
      fail(`Invalid ${name} "${value}". Valid options: ${valid.join(', ')}, random`)
    return [value as T]
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v !== 'string' || !(valid as string[]).includes(v))
        fail(`Invalid ${name} "${v}". Valid options: ${valid.join(', ')}`)
    }
    return value.length > 0 ? (value as T[]) : null
  }
  fail(`Invalid ${name}. Must be a string, array of strings, or "random"`)
}

function resolveForPipeline<T extends string>(
  resolved: T[] | 'random' | null, keywords: Record<T, string>
): T[] | undefined {
  if (resolved === 'random') return [pickRandom(Object.keys(keywords) as T[])]
  return resolved ?? undefined
}

function cartesianProduct(
  varying: Record<string, string[]>
): Record<string, [string]>[] {
  const keys = Object.keys(varying)
  if (keys.length === 0) return [{}]
  const first = keys[0]!
  const rest = keys.slice(1)
  const restCombos = cartesianProduct(
    Object.fromEntries(rest.map(k => [k, varying[k]!]))
  )
  return varying[first]!.flatMap(val =>
    restCombos.map(combo => ({ ...combo, [first]: [val] as [string] }))
  )
}

const generationsRouter = new Hono<Env>()

// List generations for a project
// All generations across all users (authenticated)
generationsRouter.get('/generations', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const cursor = c.req.query('cursor')
  const limit = Math.min(Number(c.req.query('limit')) || 30, 50)

  const where = cursor ? lt(generations.id, cursor) : undefined

  const rows = await db.select().from(generations)
    .where(where)
    .orderBy(desc(generations.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1]!.id : null

  return c.json({ generations: await enrichWithPalettes(db, page), nextCursor })
})

generationsRouter.get('/projects/:projectId/generations', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const projectId = c.req.param('projectId')
  const userId = c.get('userId')

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  if (!project) return c.json({ error: 'not_found', message: 'Project not found' }, 404)

  const results = await db
    .select()
    .from(generations)
    .where(eq(generations.projectId, projectId))
    .orderBy(desc(generations.createdAt))

  return c.json({ generations: await enrichWithPalettes(db, results) })
})

// Get single generation (any user can view)
generationsRouter.get('/generations/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const [gen] = await db.select().from(generations)
    .where(eq(generations.id, c.req.param('id')))
    .limit(1)
  if (!gen) return c.json({ error: 'not_found', message: 'Generation not found' }, 404)
  const [enriched] = await enrichWithPalettes(db, [gen])
  return c.json({ generation: enriched })
})

// Delete a generation
generationsRouter.delete('/generations/:id', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const id = c.req.param('id')
  const userId = c.get('userId')

  const [gen] = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .limit(1)

  if (!gen) return c.json({ error: 'not_found', message: 'Generation not found' }, 404)

  await db.delete(generations).where(eq(generations.id, id))
  return c.json({ ok: true })
})

// Generate for a project — persists to DB
generationsRouter.post('/projects/:projectId/generate', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const projectId = c.req.param('projectId')
  const userId = c.get('userId')

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)

  if (!project) return c.json({ error: 'not_found', message: 'Project not found' }, 404)

  const body = await c.req.json()
  const {
    prompt, palette: paletteInput, renderings, elements, compositions,
    placements, moods, complexities, layouts, subjects, iconStyles,
    count, consistent, expand, referenceImage, referenceMode,
  } = body as Record<string, unknown>

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0)
    return c.json({ error: 'prompt is required' }, 400)
  if ((prompt as string).length > 500)
    return c.json({ error: 'prompt must be 500 characters or less' }, 400)

  const imageCount = count == null ? 1 : count
  if (typeof imageCount !== 'number' || !Number.isInteger(imageCount) || imageCount < 1 || imageCount > 10)
    return c.json({ error: 'count must be an integer between 1 and 10' }, 400)

  const isConsistent = consistent === true
  if (consistent != null && typeof consistent !== 'boolean')
    return c.json({ error: 'consistent must be a boolean' }, 400)

  const isExpand = expand === true
  if (expand != null && typeof expand !== 'boolean')
    return c.json({ error: 'expand must be a boolean' }, 400)
  if (isExpand && count != null)
    return c.json({ error: 'expand and count cannot be used together' }, 400)
  if (isExpand && isConsistent)
    return c.json({ error: 'expand and consistent cannot be used together' }, 400)

  const projectContext = [project.name, project.description].filter(Boolean).join('. ')

  try {
    const palette = resolvePalette(paletteInput)
    const resolvedRenderings = resolveArrayProp(renderings, 'rendering', RENDERING_KEYWORDS)
    const resolvedElements = resolveArrayProp(elements, 'element', ELEMENT_KEYWORDS)
    const resolvedCompositions = resolveArrayProp(compositions, 'composition', COMPOSITION_KEYWORDS)
    const resolvedPlacements = resolveArrayProp(placements, 'placement', PLACEMENT_KEYWORDS)
    const resolvedMoods = resolveArrayProp(moods, 'mood', MOOD_KEYWORDS)
    const resolvedComplexities = resolveArrayProp(complexities, 'complexity', COMPLEXITY_KEYWORDS)
    const resolvedLayouts = resolveArrayProp(layouts, 'layout', LAYOUT_KEYWORDS)
    const resolvedSubjects = resolveArrayProp(subjects, 'subject', SUBJECT_KEYWORDS)
    const resolvedIconStyles = resolveArrayProp(iconStyles, 'iconStyle', ICON_STYLE_KEYWORDS)

    // Parse reference image if provided
    const parsedRef = referenceImage && typeof referenceImage === 'object' && 'base64' in (referenceImage as any) && 'mimeType' in (referenceImage as any)
      ? { base64: (referenceImage as any).base64 as string, mimeType: (referenceImage as any).mimeType as string }
      : undefined
    const parsedRefMode = referenceMode === 'structure' ? 'structure' as const : 'style' as const

    function buildPipelineOptions(genId: string) {
      return {
        palette,
        project: projectContext,
        generationId: genId,
        storagePath: `generations/${projectId}/${genId}/`,
        ...(parsedRef && { referenceImage: parsedRef, referenceMode: parsedRefMode }),
        renderings: resolveForPipeline(resolvedRenderings, RENDERING_KEYWORDS),
        elements: resolveForPipeline(resolvedElements, ELEMENT_KEYWORDS),
        compositions: resolveForPipeline(resolvedCompositions, COMPOSITION_KEYWORDS),
        placements: resolveForPipeline(resolvedPlacements, PLACEMENT_KEYWORDS),
        moods: resolveForPipeline(resolvedMoods, MOOD_KEYWORDS),
        complexities: resolveForPipeline(resolvedComplexities, COMPLEXITY_KEYWORDS),
        layouts: resolveForPipeline(resolvedLayouts, LAYOUT_KEYWORDS),
        subjects: resolveForPipeline(resolvedSubjects, SUBJECT_KEYWORDS),
        iconStyles: resolveForPipeline(resolvedIconStyles, ICON_STYLE_KEYWORDS),
      }
    }

    let results: Awaited<ReturnType<typeof runPipeline>>[]

    if (isExpand) {
      const allResolved = {
        renderings: resolvedRenderings, elements: resolvedElements,
        compositions: resolvedCompositions, placements: resolvedPlacements,
        moods: resolvedMoods, complexities: resolvedComplexities,
        layouts: resolvedLayouts, subjects: resolvedSubjects,
        iconStyles: resolvedIconStyles,
      } as const

      const keywordsMap = {
        renderings: RENDERING_KEYWORDS, elements: ELEMENT_KEYWORDS,
        compositions: COMPOSITION_KEYWORDS, placements: PLACEMENT_KEYWORDS,
        moods: MOOD_KEYWORDS, complexities: COMPLEXITY_KEYWORDS,
        layouts: LAYOUT_KEYWORDS, subjects: SUBJECT_KEYWORDS,
        iconStyles: ICON_STYLE_KEYWORDS,
      } as const

      const varying: Record<string, string[]> = {}
      for (const [key, val] of Object.entries(allResolved)) {
        if (Array.isArray(val) && val.length > 1) varying[key] = val
      }

      const combos = cartesianProduct(varying)
      if (combos.length > 20)
        fail(`expand produces ${combos.length} combinations, max is 20`)

      results = await Promise.all(
        combos.map(combo => {
          const genId = uuidv7()
          const freshFixed: Record<string, string[] | undefined> = {}
          for (const [key, val] of Object.entries(allResolved)) {
            if (!varying[key]) {
              const kw = keywordsMap[key as keyof typeof keywordsMap]
              freshFixed[key] = resolveForPipeline(val as any, kw as any)
            }
          }
          return runPipeline(c.env, (prompt as string).trim(), {
            palette,
            project: projectContext,
            generationId: genId,
            storagePath: `generations/${projectId}/${genId}/`,
            ...freshFixed,
            ...combo,
          })
        })
      )
    } else {
      const ids = Array.from({ length: imageCount }, () => uuidv7())
      const shared = isConsistent ? buildPipelineOptions(ids[0]!) : null
      results = await Promise.all(
        ids.map((genId) => {
          const opts = shared
            ? { ...shared, generationId: genId, storagePath: `generations/${projectId}/${genId}/` }
            : buildPipelineOptions(genId)
          return runPipeline(c.env, (prompt as string).trim(), opts)
        })
      )
    }

    // Persist to DB
    for (const result of results) {
      await db.insert(generations).values({
        id: result.generationId,
        projectId,
        userId,
        prompt: (prompt as string).trim(),
        paletteId: palette.id,
        renderings: JSON.stringify(result.config.renderings),
        elements: JSON.stringify(result.config.elements),
        compositions: JSON.stringify(result.config.compositions),
        placements: JSON.stringify(result.config.placements),
        moods: JSON.stringify(result.config.moods),
        complexities: JSON.stringify(result.config.complexities),
        layouts: JSON.stringify(result.config.layouts),
        subjects: JSON.stringify(result.config.subjects),
        iconStyles: JSON.stringify(result.config.iconStyles),
        storagePath: result.storagePath,
      })
    }

    const totalCount = results.length
    return c.json({
      images: results,
      ...(isExpand ? { expand: true } : { consistent: isConsistent }),
      count: totalCount,
    })
  } catch (err) {
    if (err instanceof ValidationError) return c.json({ error: err.message }, 400)
    if (err instanceof PipelineError) {
      console.error(`[pipeline] Step "${err.step}" failed (${err.statusCode}): ${err.message} — ${err.detail}`)
      return c.json({ error: err.message, step: err.step, detail: err.detail }, err.statusCode as any)
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[pipeline] Unexpected error:', message)
    return c.json({ error: 'Pipeline failed', step: 'unknown', detail: message }, 500)
  }
})

export { generationsRouter }