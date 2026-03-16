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
| `paletteId` | text | soft reference to palettes table (same 8-char hash used in both JSON and DB) |
| `renderings` | text | JSON array, e.g. `["flat","bold"]` |
| `elements` | text | JSON array |
| `compositions` | text | JSON array |
| `placements` | text | JSON array |
| `moods` | text | JSON array |
| `complexities` | text | JSON array |
| `layouts` | text | JSON array |
| `subjects` | text | JSON array |
| `iconStyles` | text | JSON array |
| `storagePath` | text NOT NULL | `generations/<projectUuid>/<generationUuid>/` |
| `createdAt` | integer (timestamp) | default now |

Indexes: `idx_generations_project_id` on `projectId`, `idx_generations_user_id` on `userId`.

The storage path is deterministic. Raw image lives at `<storagePath>raw.png`, transparent at `<storagePath>transparent.png`. Public URLs are derived at read time: `https://${IMAGES_DOMAIN}/${storagePath}raw.png`.

### `palettes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | 8-char hash (same hash function as `palettes.json` migration script) |
| `colors` | text NOT NULL | JSON array of RGB strings |
| `totalColors` | integer NOT NULL | count of colors |
| `predominantColor` | text NOT NULL | e.g. "blue", "mixed" |
| `style` | text NOT NULL | e.g. "pastel", "warm" |
| `topic` | text NOT NULL | e.g. "autumn", "happy" |

No FK relationship from `generations.paletteId` → `palettes.id`. The palette ID is a soft reference. The hash function is identical between the migration script and the JSON file, so IDs are always consistent.

## API Endpoints

### Generations

**`GET /v1/projects/:projectId/generations`**

List generations for a project. Auth-scoped: verify `projects.userId = currentUser` with a compound WHERE before querying generations (same pattern as existing project routes). Ordered by `createdAt` desc.

Response:
```json
{
  "generations": [
    {
      "id": "...",
      "prompt": "...",
      "paletteId": "a3f2c1",
      "renderings": ["flat"],
      "storagePath": "generations/<projectUuid>/<genUuid>/",
      "createdAt": "..."
    }
  ]
}
```

**`POST /v1/projects/:projectId/generate`**

Generate image(s) and persist to DB. Same params as current `/v1/generate` except:
- `project` context string is derived from the DB project record (name + description), not from the request body.
- The route pre-allocates a `generationId` (uuidv7) and `storagePath` **per pipeline call**. For `expand` mode with N combinations, N IDs are pre-allocated before `Promise.all`. For `count: N`, N IDs are pre-allocated similarly.
- After each pipeline call completes, one `generations` row is inserted per result image.
- Storage path format: `generations/<projectId>/<generationId>/`.
- Response includes `generationId` and `storagePath` per image.
- `referenceId` is not supported on the project-scoped endpoint (out of scope for now — can be added later when the UI needs it).

Request body: same as current generate (prompt, palette, renderings, elements, etc., plus count/consistent/expand). No `project` or `referenceId` field.

Response: same shape as current generate, but each image object includes `generationId` and `storagePath`.

**`DELETE /v1/generations/:id`**

Delete a generation. Uses compound WHERE: `id = :id AND userId = :userId` (same pattern as project routes). Removes the DB row. R2 cleanup is optional/deferred.

### Palettes

**`GET /v1/palettes`**

Authenticated endpoint (covered by existing `/v1/*` middleware). Lists and filters palettes from the DB.

Query params:
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

The `filters` object lists all distinct values via four `SELECT DISTINCT` queries per request. Acceptable latency for D1 with ~3500 rows.

## Pipeline Changes

### Storage path

Currently: `generations/<timestamp-shortId>/raw.png`
New: `generations/<projectId>/<generationId>/raw.png`

The `generateId()` function in `storage/r2.ts` is removed. The caller (generate route) creates the generationId (uuidv7) and passes the full storage path prefix to `runPipeline`.

### `runPipeline` changes

- Receives `storagePath` and `generationId` instead of generating its own ID.
- Returns the `storagePath` and `generationId` in the result.
- No longer calls `generateId()` internally.

### Expand / count mode

For `expand` with N combos or `count: N`, the route pre-allocates N `generationId`s and N `storagePath`s before dispatching `Promise.all`. Each `runPipeline` call receives its own unique path.

### Backwards compatibility

The old `/v1/generate` endpoint stays functional but does NOT persist to DB (no project context). It continues using the old `<timestamp-shortId>` path pattern via a local ID generator. `referenceId` continues to work on this endpoint with the old flat path format.

**Known limitation:** Generations created via the new project-scoped endpoint cannot be referenced by `referenceId` on the old endpoint (different path schemes). This is acceptable — the old endpoint is for standalone/Postman use only.

## Scope

**Files to modify:**
- `packages/db/src/platform-schema.ts` — add `generations` and `palettes` tables
- `packages/db/drizzle/platform/` — new migration SQL
- `apps/api/src/routes/generate.ts` — create project-scoped generate route, keep old route
- `apps/api/src/pipeline.ts` — accept storagePath/generationId instead of generating ID
- `apps/api/src/storage/r2.ts` — remove `generateId()`, accept path from caller
- `apps/api/src/index.ts` — register new routes

**Files to create:**
- `apps/api/src/routes/generations.ts` — GET list, DELETE
- `apps/api/src/routes/palettes.ts` — GET list/filter

**Files unchanged:**
- `apps/api/src/styles/` — no changes
- `apps/api/src/ai/` — no changes
- `apps/api/src/palettes.ts` — JSON-based resolution stays for now, DB palettes are a parallel read path
