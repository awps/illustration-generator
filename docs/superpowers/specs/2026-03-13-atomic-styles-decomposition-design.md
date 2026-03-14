# Atomic Styles Decomposition

## Problem

The current `styleId` param selects one of 11 monolithic style presets — each a paragraph-long prompt blob mixing rendering technique, element types, composition patterns, and shared boilerplate. This gives no granular control and creates massive duplication across styles.

## Solution

Replace `styleId` with 3 new atomic array params: `renderings`, `elements`, `compositions`. Each follows the same pattern as existing params (`moods`, `complexities`, etc.) — single-word keywords with descriptive expansions, composable via arrays.

## New Params

### `renderings` — how the illustration is drawn

| Atom | Keyword expansion |
|------|------------------|
| `flat` | clean flat color fills, no outlines, rounded soft shapes, 2D |
| `bold` | bold heavy shapes, strong visual weight, thick prominent forms |
| `geometric` | sharp angular shapes, structured mathematical forms |
| `editorial` | conceptual editorial design, bold composition, magazine-ready |
| `lineart` | single-weight line illustration, elegant stroked forms |
| `infographic` | information design aesthetic, clear visual hierarchy, diagram-friendly |

### `elements` — what building blocks are in the scene

| Atom | Keyword expansion |
|------|------------------|
| `cards` | white rounded UI cards/panels with content sections |
| `character` | friendly simplified character with minimal features interacting with subject |
| `object` | product device as central figure — laptop, phone, tablet, or symbolic object |
| `icons` | iconic symbolic objects, simple recognizable forms |
| `browser` | browser window frame with dark top bar, navigation dots, URL bar |
| `badges` | small floating benefit/status badges with checkmark icons |
| `cursors` | pointer or hand cursor hints indicating interactivity |
| `arrows` | directional connectors — dashed or solid arrows showing relationships |
| `pills` | grey rounded placeholder pills for abstracted text content |
| `charts` | data charts, graphs, metric visualizations |
| `tables` | data tables with rows, columns, and status indicators |

### `compositions` — the scene's structural pattern

| Atom | Keyword expansion |
|------|------------------|
| `flow` | multi-step sequential process, elements connected in progression order |
| `orbit` | central hub element with satellite elements in circular orbit, connector lines |
| `showcase` | product demo presentation, overlapping panels at slight offsets |
| `abstract` | single clear visual metaphor, conceptual, not literal representation |
| `collection` | curated set of related items in balanced arrangement |
| `diagram` | explanatory visual with labeled parts and connections |
| `split` | side-by-side panels, comparison or input/output view |

## API

Each param accepts: a string, an array of strings, `"random"`, or omit. Validated via the existing `resolveArrayProp` helper. Returned in the `config` response object.

```jsonc
// Example request
{
  "prompt": "WordPress form builder",
  "renderings": ["flat"],
  "elements": ["character", "object"],
  "compositions": ["abstract"],
  "moods": ["friendly"],
  "subjects": ["form"],
  "paletteIndex": 0
}
```

When omitted, no keywords are injected for that dimension (fully flexible).

## Old Style Mapping

| Old style | renderings | elements | compositions |
|-----------|-----------|----------|-------------|
| product-feature-illustrations | `["flat"]` | `["cards", "badges", "cursors", "pills"]` | — |
| ui-preview | `["flat"]` | `["cards", "cursors"]` | — |
| pop-icons | `["bold"]` | `["icons"]` | `["collection"]` |
| workflow-process | `["flat"]` | `["cards", "arrows"]` | `["flow"]` |
| integration-orbit | `["flat"]` | `["icons"]` | `["orbit"]` |
| conceptual | `["flat"]` | `["cards", "badges", "cursors"]` | `["abstract"]` |
| character-flat | `["flat"]` | `["character", "object"]` | — |
| object-flat | `["flat"]` | `["object"]` | — |
| dashboard-showcase | `["flat", "infographic"]` | `["browser", "cards", "pills", "tables"]` | `["showcase"]` |
| feature-flow | `["flat"]` | `["cards", "arrows", "badges"]` | `["flow"]` |
| flat-icon | `["geometric", "editorial", "lineart"]` | `["icons"]` | — |

## Pipeline Prompt Assembly

Order of prompt parts:

1. `userPrompt`
2. `buildRenderingPrompt(renderings)` — if provided
3. `buildElementPrompt(elements)` — if provided
4. `buildCompositionPrompt(compositions)` — if provided
5. Project context — if provided
6. `buildSubjectPrompt(subjects)` — if provided
7. `buildPlacementPrompt(placements)` — if provided
8. `buildMoodPrompt(moods)` — if provided
9. `buildComplexityPrompt(complexities)` — if provided
10. `buildLayoutPrompt(layouts)` — if provided
11. `buildIconStylePrompt(iconStyles)` — if provided
12. Palette instruction
13. Background instruction
14. Quality constraints: `"--no monochrome, no grayscale, no photo-realistic, no clutter, no text watermarks, no busy details"`

Quality constraints are safety rails, not style — always applied.

## Removed

- `Style` interface
- `STYLES` record
- `VALID_STYLE_IDS`
- All monolithic style rule strings
- `styleId` from request validation, config output, and pipeline
- `style` param from `runPipeline`

## Files to Modify

1. **`src/styles/index.ts`** — Remove `Style`/`STYLES`/`VALID_STYLE_IDS`. Add `RENDERINGS`, `ELEMENTS`, `COMPOSITIONS` arrays + types + keyword maps + builder functions.
2. **`src/index.ts`** — Remove `styleId` handling. Add `renderings`, `elements`, `compositions` destructuring and validation via `resolveArrayProp`. Update `pipelineOptions` and `config` output.
3. **`src/pipeline.ts`** — Remove `Style` import and `style` param. Add imports for new types/builders. Update `PipelineOptions`. Replace `style.rules` with three conditional builder calls + trailing quality constraints.
4. **`postman-collection.json`** — Replace `styleId` with `renderings`, `elements`, `compositions` arrays in all requests.