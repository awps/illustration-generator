# Expand: Combinatorial Generation

## Problem

The API currently treats array style props as "use all together" — passing `["flat", "clay"]` to `renderings` produces one image using both styles. Users need a way to generate one image **per combination** of style values across multiple props, for use cases like generating preview thumbnails for each option in a form.

## Design

### New request prop

`expand` — boolean, optional, defaults to `false`.

When `true`, the API computes the cartesian product of all array style props that have more than one value and generates one image per combination.

### Mutual exclusivity

- `expand` + `count` → 400 error: `"expand and count cannot be used together"`. Check the raw `count` field from the request body (`count != null`), not the post-default `imageCount` (which defaults to 1 when omitted).
- `expand` + `consistent: true` → 400 error: `"expand and consistent cannot be used together"`. Only fires when `consistent` is explicitly `true`, not when omitted or `false`.

### Combination limit

After resolving all array props, the cartesian product is computed. If the total exceeds 10, return 400: `"expand produces N combinations, max is 10"`.

### Which props participate

All 9 array style props participate in expansion when they have >1 resolved value:

- `renderings`, `elements`, `compositions`, `placements`, `moods`, `complexities`, `layouts`, `subjects`, `iconStyles`

Props that do **not** expand:

- `paletteIndex` — resolved once (random pick from array or fixed index), shared across all combinations
- `prompt`, `project` — scalars, fixed across all combinations

### Resolution logic

1. Resolve all array props via existing `resolveArrayProp` (validates values)
2. Identify "varying" props: those with a resolved array of length > 1
3. Non-varying props resolve per-combination via existing `resolveForPipeline`:
   - `null` (omitted) → `undefined`, prop not included
   - `"random"` → fresh random pick per combination
   - single-element array `["flat"]` → fixed value, same across all combinations
4. Compute cartesian product of the varying props
5. For each combination, build `PipelineOptions` with each varying prop set to a single-element array `[value]`
6. Run all combinations through `runPipeline` in parallel

### Example

```json
// Request
{
  "prompt": "isolated bonsai tree",
  "paletteIndex": 13,
  "renderings": ["flat", "clay"],
  "complexities": ["balanced", "several"],
  "expand": true
}

// 4 combinations: flat+balanced, flat+several, clay+balanced, clay+several

// Response
{
  "images": [
    { "id": "...", "urls": {...}, "config": { "renderings": ["flat"], "complexities": ["balanced"], ... } },
    { "id": "...", "urls": {...}, "config": { "renderings": ["flat"], "complexities": ["several"], ... } },
    { "id": "...", "urls": {...}, "config": { "renderings": ["clay"], "complexities": ["balanced"], ... } },
    { "id": "...", "urls": {...}, "config": { "renderings": ["clay"], "complexities": ["several"], ... } }
  ],
  "expand": true,
  "count": 4
}
```

### Response shape

Same `images` array as today. When `expand` is true:
- `count` in the response equals the number of combinations generated (not a request input)
- `expand: true` is included in the response
- The `images` array always contains all results (never the single-element unwrap that `count: 1` uses)

### Scope

All changes in `src/index.ts`. The pipeline (`src/pipeline.ts`) and styles (`src/styles/index.ts`) are untouched.

### Implementation sketch

A `cartesianProduct` helper with signature:

```ts
function cartesianProduct(
  varying: Record<string, string[]>
): Record<string, [string]>[]
```

Takes a record of `{ propName: values[] }` and returns an array of objects where each varying prop is a single-element array `[value]`.

In the handler, after prop resolution:

```ts
if (isExpand) {
  // baseOptions: palette, project, plus resolveForPipeline for non-varying props
  const combos = cartesianProduct(varying);
  if (combos.length > 10) fail("expand produces N combinations, max is 10");
  const runs = combos.map(combo => runPipeline(env, prompt, { ...baseOptions, ...combo }));
}
```