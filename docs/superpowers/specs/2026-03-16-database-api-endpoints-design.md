# Sub-project 1: Database + API Endpoints

## Problem

The illustrations generator currently operates statelessly — images are generated and stored in R2 but not tracked in a database. To build a project-based UI where users manage generations per project, we need persistent storage for generations and palettes, plus API endpoints to CRUD them.

## Database Tables

### `generations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | uuidv7 |
| `projectId` | text FK → projects | cascade delete |
| `userId` | text FK → platform_users | cascade delete |
| `prompt` | text NOT NULL | user prompt (max 500 chars) |
| `paletteId` | text | soft reference to palettes table |
| `renderings` | text | JSON array, e.g. `["flat","bold"]` |
| `elements` | text | JSON array |
| `compositions` | text | JSON array |
| `placements` | text | JSON array |
| `moods` | text | JSON array |
| `complexities` | text | JSON array |
| `layouts` | text | JSON array |
| `subjects` | text | JSON array |
| `iconStyles` | text | JSON array |
| `storagePath` | text NOT NULL | `/generations/<projectUuid>/<generationUuid>/` |
| `createdAt` | integer (timestamp) | default now |

Indexes: `idx_generations_project_id` on `projectId`, `idx_generations_user_id` on `userId`.

The storage path is deterministic. Raw image lives at `<storagePath>raw.png`, transparent at `<storagePath>transparent.png`. Public URLs are derived at read time: `https://${IMAGES_DOMAIN}/${storagePath}raw.png`.

### `palettes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | 8-char hash (from migration script) |
| `colors` | text NOT NULL | JSON array of RGB strings |
| `totalColors` | integer NOT NULL | count of colors |
| `predominantColor` | text NOT NULL | e.g. "blue", "mixed" |
| `style` | text NOT NULL | e.g. "pastel", "warm" |
| `topic` | text NOT NULL | e.g. "autumn", "happy" |

No FK relationship from `generations.paletteId` → `palettes.id`. The palette ID is a soft reference. If a palette is missing from the DB, the generation still works — the ID is just metadata.

## API Endpoints

### Generations

**`GET /v1/projects/:projectId/generations`**

List generations for a project. Auth-scoped to the current user (project must belong to user). Ordered by `createdAt` desc.

Response:
```json
{
  "generations": [
    {
      "id": "...",
      "prompt": "...",
      "paletteId": "a3f2c1",
      "renderings": ["flat"],
      "storagePath": "/generations/<projectUuid>/<genUuid>/",
      "createdAt": "..."
    }
  ]
}
```

**`POST /v1/projects/:projectId/generate`**

Generate image(s) and persist to DB. Same params as current `/v1/generate` except:
- `project` context string is derived from the DB project record (name + description), not from the request body.
- After pipeline completes, one `generations` row is inserted per result image.
- Storage path uses `projectId` and a new `generationId` (uuidv7): `/generations/<projectId>/<generationId>/`.
- Response includes `generationId` per image.

Request body: same as current generate (prompt, palette, renderings, elements, etc., plus count/consistent/expand).

Response: same shape as current generate, but each image object includes `generationId` and `storagePath`.

**`DELETE /v1/generations/:id`**

Delete a generation. Auth-scoped (generation must belong to user). Removes the DB row. R2 cleanup is optional/deferred — orphaned R2 objects are harmless.

### Palettes

**`GET /v1/palettes`**

List and filter palettes from the DB. Query params:
- `color` — filter by `predominantColor`
- `style` — filter by `style`
- `topic` — filter by `topic`
- `totalColors` — filter by `totalColors`
- `limit` — default 50
- `offset` — default 0

Response:
```json
{
  "filters": {
    "predominantColor": ["blue", "brown", ...],
    "style": ["bright", "cold", ...],
    "topic": ["autumn", "christmas", ...],
    "totalColors": [2, 3, 4, ...]
  },
  "palettes": [...],
  "total": 3499
}
```

The `filters` object lists all distinct values for each field (for populating UI dropdowns). Computed once on first request or at startup.

## Pipeline Changes

### Storage path

Currently: `generations/<timestamp-shortId>/raw.png`
New: `generations/<projectId>/<generationId>/raw.png`

The `generateId()` function in `storage/r2.ts` is replaced. The caller (generate route) creates the generationId (uuidv7) and passes the full storage path prefix to `runPipeline`.

### `runPipeline` changes

- Receives `storagePath` instead of generating its own ID.
- Returns the `storagePath` and `generationId` in the result.
- No longer returns `id` based on timestamp — the ID comes from the caller.

### Backwards compatibility

The old `/v1/generate` endpoint stays functional but does NOT persist to DB (no project context). It generates a storage path using the old `<timestamp-shortId>` pattern. This is for Postman/standalone use.

## Scope

**Files to modify:**
- `packages/db/src/platform-schema.ts` — add `generations` and `palettes` tables
- `packages/db/drizzle/platform/` — new migration SQL
- `apps/api/src/routes/generate.ts` — update to persist generations
- `apps/api/src/pipeline.ts` — accept storagePath instead of generating ID
- `apps/api/src/storage/r2.ts` — remove `generateId()`, accept path from caller

**Files to create:**
- `apps/api/src/routes/generations.ts` — GET list, DELETE
- `apps/api/src/routes/palettes.ts` — GET list/filter

**Files unchanged:**
- `apps/api/src/styles/` — no changes
- `apps/api/src/ai/` — no changes
- `apps/api/src/palettes.ts` — JSON-based resolution stays for now, DB palettes are a parallel read path
