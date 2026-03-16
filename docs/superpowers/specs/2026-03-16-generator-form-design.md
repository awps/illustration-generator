# Sub-project 3: Right Sidebar Generator Form

## Problem

The right sidebar currently shows a placeholder. It needs a generator form that lets users configure style parameters and trigger image generation, with optimistic loading in the main grid.

## Generator Form (right sidebar)

### Layout

Scrollable sidebar content with these sections top to bottom:

1. **Prompt** — `<textarea>`, max 500 chars, always visible at top
2. **Style sections** — 9 collapsible accordion groups, each with checkbox toggles:
   - Renderings (14): flat, bold, geometric, lineart, clay, 3d, handdrawn, isometric, gradient, watercolor, pixel, cubist, risograph, doodle
   - Elements (11): cards, character, object, icons, browser, badges, cursors, arrows, pills, charts, tables
   - Compositions (8): flow, orbit, showcase, abstract, collection, diagram, split, editorial
   - Moods (17): professional, playful, techy, friendly, polished, corporate, clean, authoritative, energetic, fun, lively, approachable, technical, modern, precise, warm, inviting
   - Complexities (14): single, few, several, many, spacious, balanced, dense, simple, refined, intricate, sparse, informative, decorated, bare
   - Layouts (16): centered, offset, left, right, horizontal, vertical, diagonal, stacked, grouped, grid, symmetric, asymmetric, overlapping, spread, tight, layered
   - Subjects (14): dashboard, form, email, analytics, settings, integration, security, payment, editor, chat, website, mobile, wordpress, management
   - Icon Styles (8): outlined, filled, minimal, rounded, sharp, thin, bold, duotone
   - Placements (10): hero, feature, section, blog, header, card, thumbnail, onboarding, empty, state
3. **Palette** — optional filter inputs (color, style, topic) passed as array to API, or empty for random
4. **Generate button** — sticky at bottom of sidebar, with count selector (1-10 dropdown)

Each section starts collapsed. Selected items show as small tags next to the section header when collapsed. Clicking expands to show all checkboxes.

### Style data source

The keyword lists (renderings, elements, etc.) are currently defined in `apps/api/src/styles/index.ts`. The form needs the same keys. Rather than duplicating, extract the keys into a shared constant or just hardcode them in the form component — the API validates anyway, so the form is just a convenience UI. Hardcoding avoids a shared package dependency for now.

## Generate Flow

1. User fills prompt + optional style params, clicks Generate
2. **Optimistic update:** N placeholder cards appear instantly in the generation grid with a 30-second progress bar animation
3. `POST /v1/projects/:projectId/generate` fires in the background
4. **On success:** placeholder cards replaced with real image cards, left sidebar recent generations refreshes
5. **On error:** placeholder cards show error state with message

### State coordination

- `sidebar-right.tsx` renders the `GeneratorForm` and receives `projectId` + `onGenerate` callback from the parent
- `onGenerate(pendingCount, request)` is called when the user clicks Generate
- The parent (`ProjectLayout` in App.tsx) manages pending generations state and passes it to `ProjectDashboard`
- `ProjectDashboard` renders pending placeholders at the top of the grid, real generations below
- When the API responds, parent replaces pending items with real results and refreshes the generation list

## Components

### New files

- `apps/app/src/app/components/generator-form.tsx` — the full form (prompt, sections, palette, count, generate button)
- `apps/app/src/app/components/style-section.tsx` — reusable collapsible section with checkboxes (used 9 times)
- `apps/app/src/app/components/generation-placeholder.tsx` — loading card with 30s progress bar for the grid
- `apps/app/src/app/lib/style-options.ts` — hardcoded keyword lists for the form UI

### Modified files

- `apps/app/src/app/components/sidebar-right.tsx` — replace placeholder with `GeneratorForm`
- `apps/app/src/app/App.tsx` — add pending generations state, pass `onGenerate` callback and pending items down
- `apps/app/src/app/pages/project-dashboard.tsx` — render pending placeholders above real generations

## Dependencies

No new dependencies needed. Uses existing shadcn components: `collapsible`, `button`, `textarea`, `label`, `input`.