import { Env } from "./types";
import {
  PALETTES,
  RENDERING_KEYWORDS, ELEMENT_KEYWORDS, COMPOSITION_KEYWORDS,
  MOOD_KEYWORDS, COMPLEXITY_KEYWORDS, LAYOUT_KEYWORDS,
  SUBJECT_KEYWORDS, ICON_STYLE_KEYWORDS, PLACEMENT_KEYWORDS,
  Palette,
} from "./styles";
import {runPipeline, PipelineError} from "./pipeline";

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"Content-Type": "application/json"},
  });
}

function errorResponse(error: string, status: number, step?: string, detail?: string): Response {
  const body: Record<string, string> = {error};
  if (step) body.step = step;
  if (detail) body.detail = detail;
  return jsonResponse(body, status);
}

class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message);
}

function resolvePalette(paletteIndex: unknown): Palette | undefined {
  if (paletteIndex == null) return undefined;
  if (Array.isArray(paletteIndex)) {
    const validIndex = (v: unknown): v is number =>
      typeof v === "number" && Number.isInteger(v) && v >= 0 && v < PALETTES.length;
    if (paletteIndex.length === 0 || !paletteIndex.every(validIndex))
      fail(`Invalid paletteIndex array. Each value must be 0-${PALETTES.length - 1}`);
    return PALETTES[pickRandom(paletteIndex)];
  }
  if (typeof paletteIndex !== "number" || !Number.isInteger(paletteIndex) || paletteIndex < 0 || paletteIndex >= PALETTES.length)
    fail(`Invalid paletteIndex. Must be 0-${PALETTES.length - 1} or an array of indexes`);
  return PALETTES[paletteIndex];
}

function resolveArrayProp<T extends string>(
  value: unknown, name: string, keywords: Record<T, string>
): T[] | "random" | null {
  const valid = Object.keys(keywords) as T[];
  if (value == null) return null;
  if (value === "random") return "random";
  if (typeof value === "string") {
    if (!(valid as string[]).includes(value))
      fail(`Invalid ${name} "${value}". Valid options: ${valid.join(", ")}, random`);
    return [value as T];
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      if (typeof v !== "string" || !(valid as string[]).includes(v))
        fail(`Invalid ${name} "${v}". Valid options: ${valid.join(", ")}`);
    }
    return value.length > 0 ? (value as T[]) : null;
  }
  fail(`Invalid ${name}. Must be a string, array of strings, or "random"`);
}

function resolveForPipeline<T extends string>(
  resolved: T[] | "random" | null, keywords: Record<T, string>
): T[] | undefined {
  if (resolved === "random") return [pickRandom(Object.keys(keywords) as T[])];
  return resolved ?? undefined;
}

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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/generate") return errorResponse("Not found", 404);
    if (request.method !== "POST") return errorResponse("Method not allowed", 405);

    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse("Invalid JSON", 400); }

    const {
      prompt, paletteIndex, project, renderings, elements, compositions,
      placements, moods, complexities, layouts, subjects, iconStyles,
      count, consistent, expand
    } = body as Record<string, unknown>;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0)
      return errorResponse("prompt is required", 400);
    if (prompt.length > 500)
      return errorResponse("prompt must be 500 characters or less", 400);

    const imageCount = count == null ? 1 : count;
    if (typeof imageCount !== "number" || !Number.isInteger(imageCount) || imageCount < 1 || imageCount > 10)
      return errorResponse("count must be an integer between 1 and 10", 400);

    const isConsistent = consistent === true;
    if (consistent != null && typeof consistent !== "boolean")
      return errorResponse("consistent must be a boolean", 400);
    if (project != null && (typeof project !== "string" || project.length > 200))
      return errorResponse("project must be a string of 200 characters or less", 400);

    const isExpand = expand === true;
    if (expand != null && typeof expand !== "boolean")
      return errorResponse("expand must be a boolean", 400);
    if (isExpand && count != null)
      return errorResponse("expand and count cannot be used together", 400);
    if (isExpand && isConsistent)
      return errorResponse("expand and consistent cannot be used together", 400);

    try {
      const palette = resolvePalette(paletteIndex);
      const resolvedRenderings = resolveArrayProp(renderings, "rendering", RENDERING_KEYWORDS);
      const resolvedElements = resolveArrayProp(elements, "element", ELEMENT_KEYWORDS);
      const resolvedCompositions = resolveArrayProp(compositions, "composition", COMPOSITION_KEYWORDS);
      const resolvedPlacements = resolveArrayProp(placements, "placement", PLACEMENT_KEYWORDS);
      const resolvedMoods = resolveArrayProp(moods, "mood", MOOD_KEYWORDS);
      const resolvedComplexities = resolveArrayProp(complexities, "complexity", COMPLEXITY_KEYWORDS);
      const resolvedLayouts = resolveArrayProp(layouts, "layout", LAYOUT_KEYWORDS);
      const resolvedSubjects = resolveArrayProp(subjects, "subject", SUBJECT_KEYWORDS);
      const resolvedIconStyles = resolveArrayProp(iconStyles, "iconStyle", ICON_STYLE_KEYWORDS);

      function buildPipelineOptions() {
        return {
          palette: palette ?? pickRandom(PALETTES),
          project: project as string | undefined,
          renderings: resolveForPipeline(resolvedRenderings, RENDERING_KEYWORDS),
          elements: resolveForPipeline(resolvedElements, ELEMENT_KEYWORDS),
          compositions: resolveForPipeline(resolvedCompositions, COMPOSITION_KEYWORDS),
          placements: resolveForPipeline(resolvedPlacements, PLACEMENT_KEYWORDS),
          moods: resolveForPipeline(resolvedMoods, MOOD_KEYWORDS),
          complexities: resolveForPipeline(resolvedComplexities, COMPLEXITY_KEYWORDS),
          layouts: resolveForPipeline(resolvedLayouts, LAYOUT_KEYWORDS),
          subjects: resolveForPipeline(resolvedSubjects, SUBJECT_KEYWORDS),
          iconStyles: resolveForPipeline(resolvedIconStyles, ICON_STYLE_KEYWORDS),
        };
      }

      const shared = isConsistent ? buildPipelineOptions() : null;
      const runs = Array.from({ length: imageCount }, () =>
        runPipeline(env, prompt.trim(), shared ?? buildPipelineOptions())
      );

      const results = await Promise.all(runs);
      return jsonResponse({
        images: imageCount === 1 ? [results[0]] : results,
        consistent: isConsistent,
        count: imageCount,
      });
    } catch (err) {
      if (err instanceof ValidationError) return errorResponse(err.message, 400);
      if (err instanceof PipelineError)
        return errorResponse(err.message, err.statusCode, err.step, err.detail);
      const message = err instanceof Error ? err.message : "Unknown error";
      return errorResponse("Pipeline failed", 500, "unknown", message);
    }
  },
} satisfies ExportedHandler<Env>;