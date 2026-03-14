# Expand: Combinatorial Generation

## Problem

The API currently treats array style props as "use all together" — passing `["flat", "clay"]` to `renderings` produces one image using both styles. Users need a way to generate one image **per combination** of style values across multiple props, for use cases like generating preview thumbnails for each option in a form.

## Design

### New request prop

`expand` — boolean, optional, defaults to `false`.

When `true`, the API computes the cartesian product of all array style props that have more than one value and generates one image per combination.

### Mutual exclusivity

- `expand` + `count` → 400 error: `"expand and count cannot be used together"`
- `expand` + `consistent` → 400 error: `"expand and consistent cannot be used together"`

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
3. Non-varying props (null, "random", or single-element arrays) resolve per-combination via existing `resolveForPipeline` — meaning `"random"` still picks fresh random values for each combination
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

### Scope

All changes in `src/index.ts`. The pipeline (`src/pipeline.ts`) and styles (`src/styles/index.ts`) are untouched.

### Implementation sketch

In `src/index.ts`, after the existing prop resolution block:

```ts
// When expand is true, compute cartesian product of multi-value props
// and generate one image per combination
if (isExpand) {
  const varying = { renderings, elements, ... } // only props with length > 1
  const combos = cartesianProduct(varying);
  // cap at 10
  const runs = combos.map(combo => runPipeline(env, prompt, { ...baseOptions, ...combo }));
}
```

A generic `cartesianProduct` helper takes a record of `{ propName: values[] }` and returns an array of `{ propName: [singleValue] }` objects.