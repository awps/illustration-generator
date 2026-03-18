# Save Compose Templates

## Context

The compose editor has a composite template system where templates define canvas dimensions and layer layouts (background, illustration position, title, text blocks) as JSON configs. Currently templates are hardcoded. Users need to save their own templates, scoped either to a specific project or globally across all projects.

## Design

### Database Table

New `compose_templates` table in the platform schema (`packages/db/src/platform-schema.ts`):

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | uuidv7 default |
| userId | text FK → platform_users | cascade delete |
| projectId | text FK → projects | cascade delete, nullable — null means global |
| name | text | NOT NULL |
| width | integer | NOT NULL |
| height | integer | NOT NULL |
| layers | text | NOT NULL, JSON string of `LayerConfig[]` |
| createdAt | integer (timestamp) | default `new Date()` |
| updatedAt | integer (timestamp) | default `new Date()` |

Indexes: `idx_compose_templates_user_id`, `idx_compose_templates_project_id`.

Migration generated via `drizzle-kit generate`.

### API Endpoints

New route file: `apps/api/src/routes/compose-templates.ts`, mounted at `/v1/compose-templates`.

**GET `/v1/compose-templates?projectId=xxx`**
- Returns all templates owned by the user where `projectId` matches OR `projectId IS NULL` (globals)
- If `projectId` query param is absent, returns only global templates (`projectId IS NULL`)
- Response: `{ templates: SavedTemplate[] }` — each with `id`, `name`, `width`, `height`, `layers` (parsed from JSON), `projectId`, `createdAt`, `updatedAt`
- Timestamps serialized as ISO strings (matching existing `Generation.createdAt` convention)

**POST `/v1/compose-templates`**
- Body: `{ name: string, width: number, height: number, layers: LayerConfig[], projectId?: string }`
- Validates: `name` is a non-empty string, `width`/`height` are positive numbers, `layers` is an array
- If `projectId` is provided, verifies the user owns that project by querying `projects` with `AND userId = c.get('userId')`. Returns 404 if not found.
- Stores `layers` as `JSON.stringify(layers)`
- Response: `{ template }` with status 201

**PATCH `/v1/compose-templates/:id`**
- Body: any subset of `{ name, width, height, layers }`
- Combined ownership check in WHERE: `AND userId = c.get('userId')`
- Explicitly sets `updatedAt: new Date()` in the `.set()` call (not auto-stamped by DB)
- Returns 404 if template not found or not owned by user
- Response: `{ template }`

**DELETE `/v1/compose-templates/:id`**
- Combined ownership check in WHERE: `AND userId = c.get('userId')`
- Returns 404 if template not found or not owned by user
- Response: `{ ok: true }`

All endpoints follow existing conventions: inline validation, `{ error, message }` error format, ownership checks via `c.get('userId')`.

### Canvas Editor: `getTemplateConfig()` Method

New method on `CanvasEditorHandle` that reads the current canvas state and produces a template config (the reverse of `applyTemplate`).

**Return type:** `TemplateConfig` (new type — `Omit<CompositeTemplate, 'id' | 'name'>`), added to `compose-templates.ts`.

**Steps:**
1. Read `sizeRef` for `width`/`height`
2. Read `gradientRef` → produce `BackgroundLayerConfig` with gradient state
3. Read `imgRef` → compute fractional position and reconstruct `fit`:
   ```
   fit = Math.max(
     img.scaleX * img.getOriginalSize().width  / canvasWidth,
     img.scaleY * img.getOriginalSize().height / canvasHeight,
   )
   ```
   Read `left / width`, `top / height` for fractional position, read `originX`/`originY` directly from the object.
   Note: `fit` round-trips imperfectly for non-square images since `positionIllustration` uses `Math.min` to constrain. This is acceptable — applying the saved template will produce a visually identical result.
4. Read `titleRef` → compute fractional position (`left / width`, `top / height`), `width / canvasWidth`, extract `fontSize`, `fontFamily`, `fill`, `fontWeight`, `fontStyle`, preserve `text` as `content`
5. Read all `layerType === 'text'` objects → same extraction as title, including `layerName` as `name`
6. Return `{ width, height, layers: [...] }`

### Frontend: Template Picker Changes

**File:** `apps/app/src/app/components/compose/template-picker.tsx`

**State:**
- `savedTemplates: SavedTemplate[]` — fetched on mount via `apiFetch`
- `saving: boolean` — controls the save input visibility

**Layout changes:**
1. Built-in presets section (unchanged)
2. Custom size input (unchanged)
3. Divider + "Saved" label
4. Saved templates list — same button style as presets, but each has a small `...` button with "Rename" and "Delete" options
5. "Save Current" button at the bottom of the saved section — shows an inline input for name + a "Project only" / "Global" toggle, then saves

**`activeId` handling:** Both built-in templates (string IDs like `'centered'`) and saved templates (UUID IDs) share the same `activeId` state. No namespace collision — built-in IDs are kebab-case strings, saved IDs are UUIDs.

**Data flow — Save:**
1. User clicks "Save Current"
2. Inline input appears for template name + scope toggle (project/global)
3. On confirm: calls `onGetTemplateConfig()` callback prop to capture layout
4. POSTs to `/v1/compose-templates` with name, config, and optional projectId
5. Appends response to `savedTemplates` state
6. The returned `template.id` (DB UUID) becomes the `CompositeTemplate.id` used for PATCH/DELETE

**Data flow — Load:**
1. On mount, `apiFetch('/v1/compose-templates?projectId=xxx')` fetches saved templates
2. Merged into the picker UI below built-in presets
3. Clicking a saved template calls `onSelect()` same as built-in presets — `applyTemplate` handles it

**Data flow — Delete:**
1. User clicks delete in context menu
2. `DELETE /v1/compose-templates/:id` using the DB UUID
3. Removes from local `savedTemplates` state

**Data flow — Rename:**
1. User clicks rename in context menu
2. Inline input replaces the name
3. `PATCH /v1/compose-templates/:id` with `{ name }` using the DB UUID
4. Updates local state

### Props Changes

`TemplatePicker` needs new props:
- `onGetTemplateConfig: () => TemplateConfig` — callback that reads canvas state (wired to `editorRef.current.getTemplateConfig()` in compose.tsx)
- `projectId: string` — for scoping API calls and the save toggle

### Types

Added to `apps/app/src/app/lib/compose-templates.ts`:

```typescript
// Return type of getTemplateConfig() — a template without id/name
type TemplateConfig = Omit<CompositeTemplate, 'id' | 'name'>

// A saved template from the DB
interface SavedTemplate extends CompositeTemplate {
  projectId: string | null
  createdAt: string   // ISO string (matches existing Generation.createdAt convention)
  updatedAt: string
}
```

## Files to Create
- `apps/api/src/routes/compose-templates.ts` — CRUD route handlers

## Files to Modify
- `packages/db/src/platform-schema.ts` — add `composeTemplates` table + indexes
- `apps/api/src/index.ts` — mount compose-templates route
- `apps/app/src/app/components/compose/canvas-editor.tsx` — add `getTemplateConfig()` to handle
- `apps/app/src/app/components/compose/template-picker.tsx` — saved templates UI, save/delete/rename
- `apps/app/src/app/pages/compose.tsx` — pass projectId and onGetTemplateConfig callback to template picker
- `apps/app/src/app/lib/compose-templates.ts` — add `TemplateConfig` and `SavedTemplate` types

## Verification
1. Save a template with "Save Current" — appears in the saved section
2. Switch templates, then apply the saved one — layout restores correctly
3. Rename a saved template — name updates in picker
4. Delete a saved template — removed from picker
5. Save as "project only" — not visible in other projects
6. Save as "global" — visible across projects
7. Refresh page — saved templates persist (loaded from API)
8. Different user — cannot see other users' templates
9. Delete/rename non-existent or other-user's template — returns 404