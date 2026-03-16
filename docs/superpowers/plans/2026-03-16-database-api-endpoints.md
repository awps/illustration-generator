# Database + API Endpoints Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `generations` and `palettes` DB tables, API endpoints for CRUD, and modify the pipeline to use project-scoped storage paths.

**Architecture:** Add two Drizzle tables to `platform-schema.ts`, a migration SQL, three new Hono route files, and refactor the pipeline to accept caller-provided storage paths. The old `/v1/generate` endpoint stays untouched for backwards compatibility.

**Tech Stack:** D1/SQLite, Drizzle ORM, Hono, Cloudflare Workers, R2

**Spec:** `docs/superpowers/specs/2026-03-16-database-api-endpoints-design.md`

---

## Chunk 1: Database schema + migration

### Task 1: Add `generations` and `palettes` tables to Drizzle schema

**Files:**
- Modify: `packages/db/src/platform-schema.ts`

- [ ] **Step 1: Add the `palettes` table**

Add after the `projects` table:

```ts
// =====================
// Palettes
// =====================

export const palettes = sqliteTable('palettes', {
  id: text('id').primaryKey(),
  colors: text('colors').notNull(),
  totalColors: integer('total_colors').notNull(),
  predominantColor: text('predominant_color').notNull(),
  style: text('style').notNull(),
  topic: text('topic').notNull(),
})
```

- [ ] **Step 2: Add the `generations` table**

Add after `palettes`:

```ts
// =====================
// Generations
// =====================

export const generations = sqliteTable('generations', {
  id: text('id').primaryKey().$defaultFn(() => uuidv7()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  paletteId: text('palette_id'),
  renderings: text('renderings'),
  elements: text('elements'),
  compositions: text('compositions'),
  placements: text('placements'),
  moods: text('moods'),
  complexities: text('complexities'),
  layouts: text('layouts'),
  subjects: text('subjects'),
  iconStyles: text('icon_styles'),
  storagePath: text('storage_path').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('idx_generations_project_id').on(table.projectId),
  index('idx_generations_user_id').on(table.userId),
])
```

- [ ] **Step 3: Type-check**

Run: `cd packages/db && npx tsc -b`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/platform-schema.ts
git commit -m "feat: add generations and palettes tables to Drizzle schema"
```

---

### Task 2: Add migration SQL

**Files:**
- Create: `packages/db/drizzle/platform/0001_add_generations_palettes.sql`
- Modify: `packages/db/drizzle/platform/meta/_journal.json`

- [ ] **Step 1: Create the migration file**

```sql
CREATE TABLE `palettes` (
	`id` text PRIMARY KEY NOT NULL,
	`colors` text NOT NULL,
	`total_colors` integer NOT NULL,
	`predominant_color` text NOT NULL,
	`style` text NOT NULL,
	`topic` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`prompt` text NOT NULL,
	`palette_id` text,
	`renderings` text,
	`elements` text,
	`compositions` text,
	`placements` text,
	`moods` text,
	`complexities` text,
	`layouts` text,
	`subjects` text,
	`icon_styles` text,
	`storage_path` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_generations_project_id` ON `generations` (`project_id`);
--> statement-breakpoint
CREATE INDEX `idx_generations_user_id` ON `generations` (`user_id`);
```

- [ ] **Step 2: Update the journal**

Add entry to `packages/db/drizzle/platform/meta/_journal.json`:

```json
{
  "version": "7",
  "dialect": "sqlite",
  "entries": [
    {
      "idx": 0,
      "version": "6",
      "when": 1741996800000,
      "tag": "0000_init",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "6",
      "when": 1742083200000,
      "tag": "0001_add_generations_palettes",
      "breakpoints": true
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/drizzle/
git commit -m "feat: add migration for generations and palettes tables"
```

---

## Chunk 2: Pipeline refactor

### Task 3: Refactor pipeline to accept storagePath from caller

**Files:**
- Modify: `apps/api/src/pipeline.ts`
- Modify: `apps/api/src/storage/r2.ts`

- [ ] **Step 1: Update `PipelineOptions` and `PipelineResult`**

In `pipeline.ts`, add `storagePath` and `generationId` to `PipelineOptions`:

```ts
export interface PipelineOptions {
  palette: ResolvedPalette;
  project?: string;
  referenceImage?: ReferenceImage;
  storagePath?: string;    // caller-provided, e.g. "generations/<projectId>/<genId>/"
  generationId?: string;   // caller-provided uuidv7
  renderings?: Rendering[];
  elements?: IllustrationElement[];
  compositions?: Composition[];
  placements?: Placement[];
  moods?: Mood[];
  complexities?: Complexity[];
  layouts?: Layout[];
  subjects?: Subject[];
  iconStyles?: IconStyle[];
}
```

Update `PipelineResult` — replace `id` and `urls` with `generationId` and `storagePath`:

```ts
export interface PipelineResult {
  generationId: string;
  storagePath: string;
  urls: {
    raw: string;
    transparent: string;
  };
  config: {
    palette: ResolvedPalette;
    project: string | null;
    renderings: Rendering[];
    elements: IllustrationElement[];
    compositions: Composition[];
    placements: Placement[];
    moods: Mood[];
    complexities: Complexity[];
    layouts: Layout[];
    subjects: Subject[];
    iconStyles: IconStyle[];
  };
}
```

- [ ] **Step 2: Update `runPipeline` body**

Replace lines 80-82 (the ID and key generation) with:

```ts
  const generationId = options.generationId ?? generateId();
  const basePath = options.storagePath ?? `generations/${generationId}/`;
  const rawKey = `${basePath}raw.png`;
  const transparentKey = `${basePath}transparent.png`;
```

Replace the return block (lines 154-173) with:

```ts
  return {
    generationId,
    storagePath: basePath,
    urls: {
      raw: buildPublicUrl(env, rawKey),
      transparent: buildPublicUrl(env, transparentKey),
    },
    config: {
      palette: options.palette,
      project: options.project ?? null,
      renderings: options.renderings ?? [],
      elements: options.elements ?? [],
      compositions: options.compositions ?? [],
      placements: options.placements ?? [],
      moods: options.moods ?? [],
      complexities: options.complexities ?? [],
      layouts: options.layouts ?? [],
      subjects: options.subjects ?? [],
      iconStyles: options.iconStyles ?? [],
    },
  };
```

- [ ] **Step 3: Update the old generate route**

In `apps/api/src/routes/generate.ts`, update all references from `result.id` to `result.generationId` if any exist in the response building. The old route does not pass `storagePath`/`generationId`, so the pipeline falls back to `generateId()` — no other changes needed.

- [ ] **Step 4: Type-check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/pipeline.ts apps/api/src/routes/generate.ts
git commit -m "refactor: pipeline accepts caller-provided storagePath and generationId"
```

---

## Chunk 3: New API routes

### Task 4: Create palettes route

**Files:**
- Create: `apps/api/src/routes/palettes.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `palettes.ts`**

```ts
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
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
```

- [ ] **Step 2: Register in index.ts**

Add import and route:

```ts
import { palettesRouter } from './routes/palettes'
// ...
app.route('/v1/palettes', palettesRouter)
```

- [ ] **Step 3: Type-check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/palettes.ts apps/api/src/index.ts
git commit -m "feat: add GET /v1/palettes endpoint with filtering"
```

---

### Task 5: Create generations routes (list + delete)

**Files:**
- Create: `apps/api/src/routes/generations.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `generations.ts`**

```ts
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { eq, and, desc } from 'drizzle-orm'
import { generations, projects } from '@illustragen/db/platform'
import type { Env } from '../types'

const generationsRouter = new Hono<Env>()

// List generations for a project
generationsRouter.get('/projects/:projectId/generations', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const projectId = c.req.param('projectId')
  const userId = c.get('userId')

  // Verify project ownership
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

  return c.json({ generations: results })
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

export { generationsRouter }
```

- [ ] **Step 2: Register in index.ts**

Add import and route. Note: generations uses `/v1/projects/:projectId/generations` and `/v1/generations/:id`, so mount at `/v1`:

```ts
import { generationsRouter } from './routes/generations'
// ...
app.route('/v1', generationsRouter)
```

- [ ] **Step 3: Type-check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/generations.ts apps/api/src/index.ts
git commit -m "feat: add generations list and delete endpoints"
```

---

### Task 6: Create project-scoped generate endpoint

**Files:**
- Modify: `apps/api/src/routes/generations.ts`

- [ ] **Step 1: Add the POST generate route**

Add to `generations.ts`, before the export. This reuses the same validation/pipeline logic from the old generate route but persists results to DB:

```ts
import { Buffer } from 'node:buffer'
import { uuidv7 } from 'uuidv7'
import {
  RENDERING_KEYWORDS, ELEMENT_KEYWORDS, COMPOSITION_KEYWORDS,
  MOOD_KEYWORDS, COMPLEXITY_KEYWORDS, LAYOUT_KEYWORDS,
  SUBJECT_KEYWORDS, ICON_STYLE_KEYWORDS, PLACEMENT_KEYWORDS,
} from '../styles'
import { resolvePalette } from '../palettes'
import { runPipeline, PipelineError } from '../pipeline'
```

Add these helpers at the top of the file (or import from a shared location — but for now keep it self-contained):

```ts
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
```

Then add the route handler:

```ts
// Generate for a project — persists to DB
generationsRouter.post('/projects/:projectId/generate', async (c) => {
  const db = drizzle(c.env.PLATFORM_DB)
  const projectId = c.req.param('projectId')
  const userId = c.get('userId')

  // Verify project ownership
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
    count, consistent, expand
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

    function buildPipelineOptions(genId: string) {
      return {
        palette,
        project: projectContext,
        generationId: genId,
        storagePath: `generations/${projectId}/${genId}/`,
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
        ids.map((genId, i) => {
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
```

- [ ] **Step 2: Type-check**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/generations.ts
git commit -m "feat: add project-scoped generate endpoint with DB persistence"
```

---

### Task 7: Reset DB and smoke test

- [ ] **Step 1: Reset the database**

```bash
npm run docker:reset-db
```

- [ ] **Step 2: Test palettes endpoint**

```bash
curl -s https://api-imagen.publingo.kom/v1/palettes?limit=2 -H 'Cookie: session=<your-session>' | jq '.filters | keys, (.palettes | length)'
```

Note: palettes table will be empty until migration from JSON is done. The endpoint should return an empty array with filters. This is expected — palette migration is a separate future task.

- [ ] **Step 3: Test project-scoped generate**

```bash
curl -s https://api-imagen.publingo.kom/v1/projects/<projectId>/generate \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=<your-session>' \
  -d '{"prompt": "test illustration", "renderings": ["flat"]}' | jq '.images[0].generationId, .images[0].storagePath'
```

Expected: a `generationId` (UUID) and `storagePath` like `generations/<projectId>/<genId>/`.

- [ ] **Step 4: Test list generations**

```bash
curl -s https://api-imagen.publingo.kom/v1/projects/<projectId>/generations \
  -H 'Cookie: session=<your-session>' | jq '.generations | length'
```

Expected: 1 (the generation from step 3).

- [ ] **Step 5: Test delete generation**

```bash
curl -s -X DELETE https://api-imagen.publingo.kom/v1/generations/<genId> \
  -H 'Cookie: session=<your-session>' | jq .
```

Expected: `{ "ok": true }`