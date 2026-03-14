# Atomic Styles Decomposition Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace monolithic `styleId` with 3 atomic array params (`renderings`, `elements`, `compositions`) following the same keyword pattern as existing params.

**Architecture:** Remove `Style`/`STYLES`/`VALID_STYLE_IDS` from styles module. Add 3 new const arrays + type + keyword record + builder function sets. Update pipeline to drop `style` param and assemble prompt from new builders. Update API handler to validate/resolve new params and remove styleId logic.

**Tech Stack:** TypeScript, Cloudflare Workers (Wrangler)

**Spec:** `docs/superpowers/specs/2026-03-13-atomic-styles-decomposition-design.md`

---

## Chunk 1: styles module and pipeline

### Task 1: Add renderings, elements, compositions to styles module

**Files:**
- Modify: `src/styles/index.ts:1-117` (remove Style/STYLES/VALID_STYLE_IDS, add new arrays/types/keywords/builders)

- [ ] **Step 1: Remove old style exports**

In `src/styles/index.ts`, delete lines 6-117: the `Style` interface, `STYLES` record, and `VALID_STYLE_IDS`. Keep the `Palette` type and palettes import (lines 1-4).

- [ ] **Step 2: Add RENDERINGS array, type, keywords, and builder**

Add after line 4 (after PALETTES):

```typescript
export const RENDERINGS = [
  "flat", "bold", "geometric", "editorial", "lineart", "infographic",
] as const;
export type Rendering = (typeof RENDERINGS)[number];

export const RENDERING_KEYWORDS: Record<Rendering, string> = {
  flat: "clean flat color fills, no outlines, rounded soft shapes, 2D",
  bold: "bold heavy shapes, strong visual weight, thick prominent forms",
  geometric: "sharp angular shapes, structured mathematical forms",
  editorial: "conceptual editorial design, bold composition, magazine-ready",
  lineart: "single-weight line illustration, elegant stroked forms",
  infographic: "information design aesthetic, clear visual hierarchy, diagram-friendly",
};

export function buildRenderingPrompt(renderings: Rendering[]): string {
  const keywords = renderings.map(r => RENDERING_KEYWORDS[r]).join(", ");
  return `Rendering style: ${keywords}.`;
}
```

- [ ] **Step 3: Add ELEMENTS array, type, keywords, and builder**

Add after renderings block. Note: use `IllustrationElement` as the type name to avoid collision with DOM `Element`.

```typescript
export const ELEMENTS = [
  "cards", "character", "object", "icons", "browser",
  "badges", "cursors", "arrows", "pills", "charts", "tables",
] as const;
export type IllustrationElement = (typeof ELEMENTS)[number];

export const ELEMENT_KEYWORDS: Record<IllustrationElement, string> = {
  cards: "white rounded UI cards/panels with content sections",
  character: "friendly simplified character with minimal features interacting with subject",
  object: "product device as central figure — laptop, phone, tablet, or symbolic object",
  icons: "iconic symbolic objects, simple recognizable forms",
  browser: "browser window frame with dark top bar, navigation dots, URL bar",
  badges: "small floating benefit/status badges with checkmark icons",
  cursors: "pointer or hand cursor hints indicating interactivity",
  arrows: "directional connectors — dashed or solid arrows showing relationships",
  pills: "grey rounded placeholder pills for abstracted text content",
  charts: "data charts, graphs, metric visualizations",
  tables: "data tables with rows, columns, and status indicators",
};

export function buildElementPrompt(elements: IllustrationElement[]): string {
  const keywords = elements.map(e => ELEMENT_KEYWORDS[e]).join(", ");
  return `Visual elements: ${keywords}.`;
}
```

- [ ] **Step 4: Add COMPOSITIONS array, type, keywords, and builder**

Add after elements block:

```typescript
export const COMPOSITIONS = [
  "flow", "orbit", "showcase", "abstract", "collection", "diagram", "split",
] as const;
export type Composition = (typeof COMPOSITIONS)[number];

export const COMPOSITION_KEYWORDS: Record<Composition, string> = {
  flow: "multi-step sequential process, elements connected in progression order",
  orbit: "central hub element with satellite elements in circular orbit, connector lines",
  showcase: "product demo presentation, overlapping panels at slight offsets",
  abstract: "single clear visual metaphor, conceptual, not literal representation",
  collection: "curated set of related items in balanced arrangement",
  diagram: "explanatory visual with labeled parts and connections",
  split: "side-by-side panels, comparison or input/output view",
};

export function buildCompositionPrompt(compositions: Composition[]): string {
  const keywords = compositions.map(c => COMPOSITION_KEYWORDS[c]).join(", ");
  return `Scene composition: ${keywords}.`;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/index.ts
git commit -m "feat: replace monolithic styles with atomic renderings, elements, compositions"
```

### Task 2: Update pipeline to use new params

**Files:**
- Modify: `src/pipeline.ts:1-132`

- [ ] **Step 1: Update imports**

Replace the current import block (lines 4-9) with:

```typescript
import {
  Palette, PALETTES,
  Rendering, IllustrationElement, Composition,
  Mood, Complexity, Layout, Subject, IconStyle, Placement,
  buildRenderingPrompt, buildElementPrompt, buildCompositionPrompt,
  buildMoodPrompt, buildComplexityPrompt, buildLayoutPrompt,
  buildSubjectPrompt, buildIconStylePrompt, buildPlacementPrompt,
} from "./styles";
```

- [ ] **Step 2: Update PipelineOptions**

Replace the `PipelineOptions` interface (lines 33-42) with:

```typescript
export interface PipelineOptions {
  palette?: Palette;
  project?: string;
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

- [ ] **Step 3: Update runPipeline signature and prompt assembly**

Remove the `style: Style` param from `runPipeline` (line 47). Replace the prompt assembly block (lines 61-74) with:

```typescript
  const chosen = options.palette ?? PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const parts: string[] = [userPrompt];
  if (options.renderings?.length) parts.push(buildRenderingPrompt(options.renderings));
  if (options.elements?.length) parts.push(buildElementPrompt(options.elements));
  if (options.compositions?.length) parts.push(buildCompositionPrompt(options.compositions));
  if (options.project) parts.push(`Project context: ${options.project}.`);
  if (options.subjects?.length) parts.push(buildSubjectPrompt(options.subjects));
  if (options.placements?.length) parts.push(buildPlacementPrompt(options.placements));
  if (options.moods?.length) parts.push(buildMoodPrompt(options.moods));
  if (options.complexities?.length) parts.push(buildComplexityPrompt(options.complexities));
  if (options.layouts?.length) parts.push(buildLayoutPrompt(options.layouts));
  if (options.iconStyles?.length) parts.push(buildIconStylePrompt(options.iconStyles));
  parts.push(`Use this color palette as fill/background colors for UI elements, cards, buttons, and icons: ${chosen.join(", ")}. Text inside elements must be relevant labels or grey skeleton placeholder pills — never display color names or color codes as text.`);
  parts.push("MANDATORY: The background must be a solid light lavender purple color — no floor, no shadows on the background, and no environmental elements. Do NOT place any floating text, titles, or labels outside of the main subject — all text must stay within UI cards or elements, never on the background.");
  parts.push("--no monochrome, no grayscale, no photo-realistic, no clutter, no text watermarks, no busy details");
```

- [ ] **Step 4: Commit**

```bash
git add src/pipeline.ts
git commit -m "feat: update pipeline to use atomic renderings/elements/compositions"
```

## Chunk 2: API handler and postman

### Task 3: Update API handler

**Files:**
- Modify: `src/index.ts:1-182`

- [ ] **Step 1: Update imports**

Replace the import from `./styles` (lines 2-7) with:

```typescript
import {
  PALETTES, RENDERINGS, ELEMENTS, COMPOSITIONS,
  MOODS, COMPLEXITIES, LAYOUTS, SUBJECTS, ICON_STYLES, PLACEMENTS,
  type Rendering, type IllustrationElement, type Composition,
  type Subject, type Placement, type Mood, type IconStyle,
  type Complexity, type Layout,
} from "./styles";
```

- [ ] **Step 2: Update request destructuring**

Replace line 47 destructuring. Remove `styleId`, add `renderings`, `elements`, `compositions`:

```typescript
    const { prompt, paletteIndex, project, renderings, elements, compositions, placements, moods, complexities, layouts, subjects, iconStyles, count } = body as Record<string, unknown>;
```

- [ ] **Step 3: Remove styleId validation block**

Delete lines 62-73 (the entire `// Resolve styleId` block including `resolvedStyleId` variable).

- [ ] **Step 4: Add new param resolution**

After the existing `resolvedPlacements` resolution (line 135-136 area), add:

```typescript
    const resolvedRenderings = resolveArrayProp(renderings, "rendering", RENDERINGS);
    if (resolvedRenderings instanceof Response) return resolvedRenderings;
    const resolvedElements = resolveArrayProp(elements, "element", ELEMENTS);
    if (resolvedElements instanceof Response) return resolvedElements;
    const resolvedCompositions = resolveArrayProp(compositions, "composition", COMPOSITIONS);
    if (resolvedCompositions instanceof Response) return resolvedCompositions;
```

- [ ] **Step 5: Update pipelineOptions and runPipeline call**

Replace `pipelineOptions` (lines 139-148) — add new fields, remove `style` variable:

```typescript
    const pipelineOptions = {
      palette: resolvedPalette,
      project: project as string | undefined,
      renderings: resolvedRenderings,
      elements: resolvedElements,
      compositions: resolvedCompositions,
      placements: resolvedPlacements,
      moods: resolvedMoods,
      complexities: resolvedComplexities,
      layouts: resolvedLayouts,
      subjects: resolvedSubjects,
      iconStyles: resolvedIconStyles,
    };
```

Remove `const style = STYLES[resolvedStyleId];` (line 138).

Update `runPipeline` call — drop `style` param:

```typescript
    const runs = Array.from({ length: imageCount }, () =>
      runPipeline(env, prompt.trim(), pipelineOptions)
    );
```

- [ ] **Step 6: Update config output**

Replace `config` object (lines 154-165) — drop `styleId`, add new fields:

```typescript
    const config = {
      renderings: resolvedRenderings ?? null,
      elements: resolvedElements ?? null,
      compositions: resolvedCompositions ?? null,
      palette: resolvedPalette,
      project: (project as string | undefined) ?? null,
      placements: resolvedPlacements ?? null,
      moods: resolvedMoods ?? null,
      complexities: resolvedComplexities ?? null,
      layouts: resolvedLayouts ?? null,
      subjects: resolvedSubjects ?? null,
      iconStyles: resolvedIconStyles ?? null,
      count: imageCount,
    };
```

- [ ] **Step 7: Commit**

```bash
git add src/index.ts
git commit -m "feat: replace styleId with renderings/elements/compositions in API handler"
```

### Task 4: Update Postman collection

**Files:**
- Modify: `postman-collection.json`

- [ ] **Step 1: Rewrite collection**

Replace all 11 requests. Remove `styleId` from every request body. Add `renderings`, `elements`, `compositions` arrays using the mapping from the spec:

| Old name | renderings | elements | compositions |
|----------|-----------|----------|-------------|
| Product Feature Illustrations | `["flat"]` | `["cards", "badges", "cursors", "pills"]` | — |
| UI Preview | `["flat"]` | `["cards", "cursors"]` | — |
| Pop Icons | `["bold"]` | `["icons"]` | `["collection"]` |
| Workflow Process | `["flat"]` | `["cards", "arrows"]` | `["flow"]` |
| Integration Orbit | `["flat"]` | `["icons"]` | `["orbit"]` |
| Conceptual | `["flat"]` | `["cards", "badges", "cursors"]` | `["abstract"]` |
| Character Flat | `["flat"]` | `["character", "object"]` | — |
| Object Flat | `["flat"]` | `["object"]` | — |
| Dashboard Showcase | `["flat", "infographic"]` | `["browser", "cards", "pills", "tables"]` | `["showcase"]` |
| Feature Flow | `["flat"]` | `["cards", "arrows", "badges"]` | `["flow"]` |
| Flat Icon | `["geometric", "editorial", "lineart"]` | `["icons"]` | — |

Keep all other fields (`moods`, `complexities`, `layouts`, `subjects`, `iconStyles`, `paletteIndex`, `project`, `prompt`) unchanged from current collection.

- [ ] **Step 2: Commit**

```bash
git add postman-collection.json
git commit -m "feat: update Postman collection for atomic style params"
```

### Task 5: Build verification

- [ ] **Step 1: Run dry-run deploy**

```bash
npx wrangler deploy --dry-run
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Verify no remaining references to old style system**

Search for `STYLES`, `VALID_STYLE_IDS`, `styleId`, `Style` (as type) across `src/`. Expected: zero matches.