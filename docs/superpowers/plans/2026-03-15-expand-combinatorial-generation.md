# Expand: Combinatorial Generation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `expand: true` request prop that generates one image per cartesian-product combination of multi-value style props, capped at 10.

**Architecture:** Single-file change in `src/index.ts`. Add a `cartesianProduct` helper, validate the new `expand` prop (mutually exclusive with `count` and `consistent`), and branch the run logic to build one `PipelineOptions` per combination.

**Tech Stack:** TypeScript, Cloudflare Workers

**Spec:** `docs/superpowers/specs/2026-03-15-expand-combinatorial-generation-design.md`

---

## Chunk 1: Implementation

### Task 1: Add `cartesianProduct` helper

**Files:**
- Modify: `src/index.ts` (add function after `resolveForPipeline`, before the `export default`)

- [ ] **Step 1: Add the helper function**

Insert after the `resolveForPipeline` function (after line 75):

```ts
function cartesianProduct(
  varying: Record<string, string[]>
): Record<string, [string]>[] {
  const keys = Object.keys(varying);
  if (keys.length === 0) return [{}];
  const [first, ...rest] = keys;
  const restCombos = cartesianProduct(
    Object.fromEntries(rest.map(k => [k, varying[k]]))
  );
  return varying[first].flatMap(val =>
    restCombos.map(combo => ({ ...combo, [first]: [val] as [string] }))
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add cartesianProduct helper for expand mode"
```

---

### Task 2: Add `expand` validation and mutual exclusivity guards

**Files:**
- Modify: `src/index.ts` — destructure `expand` from body, add validation

- [ ] **Step 1: Destructure `expand` from request body**

In the destructuring block (line 86-90), add `expand` to the list:

```ts
const {
  prompt, paletteIndex, project, renderings, elements, compositions,
  placements, moods, complexities, layouts, subjects, iconStyles,
  count, consistent, expand
} = body as Record<string, unknown>;
```

- [ ] **Step 2: Add validation guards**

After the `project` validation (after line 105), add:

```ts
const isExpand = expand === true;
if (expand != null && typeof expand !== "boolean")
  return errorResponse("expand must be a boolean", 400);
if (isExpand && count != null)
  return errorResponse("expand and count cannot be used together", 400);
if (isExpand && isConsistent)
  return errorResponse("expand and consistent cannot be used together", 400);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: validate expand prop with mutual exclusivity guards"
```

---

### Task 3: Implement expand branch in handler

**Files:**
- Modify: `src/index.ts` — replace the run logic block (lines 135-145) with branching for expand vs. normal mode

- [ ] **Step 1: Replace the run + response block**

Replace the block from `const shared = isConsistent ...` through the `return jsonResponse(...)` (lines 135-145) with:

```ts
      let results: Awaited<ReturnType<typeof runPipeline>>[];

      if (isExpand) {
        const allResolved = {
          renderings: resolvedRenderings,
          elements: resolvedElements,
          compositions: resolvedCompositions,
          placements: resolvedPlacements,
          moods: resolvedMoods,
          complexities: resolvedComplexities,
          layouts: resolvedLayouts,
          subjects: resolvedSubjects,
          iconStyles: resolvedIconStyles,
        } as const;

        const keywordsMap = {
          renderings: RENDERING_KEYWORDS,
          elements: ELEMENT_KEYWORDS,
          compositions: COMPOSITION_KEYWORDS,
          placements: PLACEMENT_KEYWORDS,
          moods: MOOD_KEYWORDS,
          complexities: COMPLEXITY_KEYWORDS,
          layouts: LAYOUT_KEYWORDS,
          subjects: SUBJECT_KEYWORDS,
          iconStyles: ICON_STYLE_KEYWORDS,
        } as const;

        // Identify varying props (array length > 1)
        const varying: Record<string, string[]> = {};
        for (const [key, val] of Object.entries(allResolved)) {
          if (Array.isArray(val) && val.length > 1) {
            varying[key] = val;
          }
        }

        const combos = cartesianProduct(varying);
        if (combos.length > 10)
          fail(`expand produces ${combos.length} combinations, max is 10`);

        const baseOptions = {
          palette: palette ?? pickRandom(PALETTES),
          project: project as string | undefined,
        };

        results = await Promise.all(
          combos.map(combo => {
            // For each combo, resolve fixed props fresh (so "random" re-rolls)
            const freshFixed: Record<string, string[] | undefined> = {};
            for (const [key, val] of Object.entries(allResolved)) {
              if (!varying[key]) {
                const kw = keywordsMap[key as keyof typeof keywordsMap];
                freshFixed[key] = resolveForPipeline(val as any, kw as any);
              }
            }
            return runPipeline(env, prompt.trim(), { ...baseOptions, ...freshFixed, ...combo });
          })
        );
      } else {
        const shared = isConsistent ? buildPipelineOptions() : null;
        const runs = Array.from({ length: imageCount }, () =>
          runPipeline(env, prompt.trim(), shared ?? buildPipelineOptions())
        );
        results = await Promise.all(runs);
      }

      const totalCount = results.length;
      return jsonResponse({
        images: totalCount === 1 ? [results[0]] : results,
        ...(isExpand ? { expand: true } : { consistent: isConsistent }),
        count: totalCount,
      });
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement expand mode with cartesian product combinations"
```

---

### Task 4: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npx wrangler dev`

- [ ] **Step 2: Test expand with 2×2 combinations**

```bash
curl -s http://localhost:8787/generate -H 'Content-Type: application/json' -d '{
  "prompt": "isolated bonsai tree",
  "paletteIndex": 13,
  "renderings": ["flat", "clay"],
  "complexities": ["balanced", "several"],
  "expand": true
}' | jq '.count, .expand, [.images[].config.renderings[0]], [.images[].config.complexities[0]]'
```

Expected: `count: 4`, `expand: true`, renderings cycle through flat/clay, complexities cycle through balanced/several.

- [ ] **Step 3: Test mutual exclusivity — expand + count**

```bash
curl -s http://localhost:8787/generate -H 'Content-Type: application/json' -d '{
  "prompt": "test",
  "expand": true,
  "count": 2
}' | jq .
```

Expected: 400 `"expand and count cannot be used together"`

- [ ] **Step 4: Test mutual exclusivity — expand + consistent**

```bash
curl -s http://localhost:8787/generate -H 'Content-Type: application/json' -d '{
  "prompt": "test",
  "expand": true,
  "consistent": true,
  "renderings": ["flat", "clay"]
}' | jq .
```

Expected: 400 `"expand and consistent cannot be used together"`

- [ ] **Step 5: Test combination limit**

```bash
curl -s http://localhost:8787/generate -H 'Content-Type: application/json' -d '{
  "prompt": "test",
  "expand": true,
  "renderings": ["flat", "clay", "geometric"],
  "complexities": ["balanced", "several", "single", "few"]
}' | jq .
```

Expected: 400 `"expand produces 12 combinations, max is 10"`

- [ ] **Step 6: Test expand with single-value props (no expansion)**

```bash
curl -s http://localhost:8787/generate -H 'Content-Type: application/json' -d '{
  "prompt": "isolated bonsai tree",
  "renderings": ["flat"],
  "expand": true
}' | jq '.count'
```

Expected: `count: 1` — single value means 1 combination.