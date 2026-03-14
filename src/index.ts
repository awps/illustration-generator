import { Env } from "./types";
import {
  PALETTES,
  RENDERING_KEYWORDS, ELEMENT_KEYWORDS, COMPOSITION_KEYWORDS,
  MOOD_KEYWORDS, COMPLEXITY_KEYWORDS, LAYOUT_KEYWORDS,
  SUBJECT_KEYWORDS, ICON_STYLE_KEYWORDS, PLACEMENT_KEYWORDS,
} from "./styles";
import { runPipeline, PipelineError } from "./pipeline";

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(error: string, status: number, step?: string, detail?: string): Response {
  const body: Record<string, string> = { error };
  if (step) body.step = step;
  if (detail) body.detail = detail;
  return jsonResponse(body, status);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/generate") {
      return errorResponse("Not found", 404);
    }

    if (request.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const { prompt, paletteIndex, project, renderings, elements, compositions, placements, moods, complexities, layouts, subjects, iconStyles, count, consistent } = body as Record<string, unknown>;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return errorResponse("prompt is required", 400);
    }

    if (prompt.length > 500) {
      return errorResponse("prompt must be 500 characters or less", 400);
    }

    const imageCount = count == null ? 1 : count;
    if (typeof imageCount !== "number" || !Number.isInteger(imageCount) || imageCount < 1 || imageCount > 10) {
      return errorResponse("count must be an integer between 1 and 10", 400);
    }

    // Resolve paletteIndex — supports number or array of numbers; omitted picks random
    let resolvedPalette;
    if (Array.isArray(paletteIndex)) {
      const validIndex = (v: unknown): v is number =>
        typeof v === "number" && Number.isInteger(v) && v >= 0 && v < PALETTES.length;
      if (paletteIndex.length === 0 || !paletteIndex.every(validIndex)) {
        return errorResponse(
          `Invalid paletteIndex array. Each value must be 0-${PALETTES.length - 1}`,
          400
        );
      }
      resolvedPalette = PALETTES[pickRandom(paletteIndex)];
    } else if (paletteIndex != null && (typeof paletteIndex !== "number" || !Number.isInteger(paletteIndex) || paletteIndex < 0 || paletteIndex >= PALETTES.length)) {
      return errorResponse(
        `Invalid paletteIndex. Must be 0-${PALETTES.length - 1} or an array of indexes`,
        400
      );
    } else {
      resolvedPalette = paletteIndex != null ? PALETTES[paletteIndex as number] : undefined;
    }

    const isConsistent = consistent === true;
    if (consistent != null && typeof consistent !== "boolean") {
      return errorResponse("consistent must be a boolean", 400);
    }

    if (project != null && (typeof project !== "string" || project.length > 200)) {
      return errorResponse("project must be a string of 200 characters or less", 400);
    }

    // Validate array-based props — omitted = not included, "random" = pick one
    function resolveArrayProp<T extends string>(
      value: unknown, name: string, keywords: Record<T, string>
    ): T[] | "random" | null | Response {
      const valid = Object.keys(keywords) as T[];
      if (value == null) return null;
      if (value === "random") return "random";
      if (typeof value === "string") {
        if (!(valid as string[]).includes(value))
          return errorResponse(`Invalid ${name} "${value}". Valid options: ${valid.join(", ")}, random`, 400);
        return [value as T];
      }
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof v !== "string" || !(valid as string[]).includes(v))
            return errorResponse(`Invalid ${name} "${v}". Valid options: ${valid.join(", ")}`, 400);
        }
        return value.length > 0 ? (value as T[]) : null;
      }
      return errorResponse(`Invalid ${name}. Must be a string, array of strings, or "random"`, 400);
    }

    function resolveForPipeline<T extends string>(
      resolved: T[] | "random" | null, keywords: Record<T, string>
    ): T[] | undefined {
      if (resolved === "random") return [pickRandom(Object.keys(keywords) as T[])];
      return resolved ?? undefined;
    }

    const resolvedRenderings = resolveArrayProp(renderings, "rendering", RENDERING_KEYWORDS);
    if (resolvedRenderings instanceof Response) return resolvedRenderings;
    const resolvedElements = resolveArrayProp(elements, "element", ELEMENT_KEYWORDS);
    if (resolvedElements instanceof Response) return resolvedElements;
    const resolvedCompositions = resolveArrayProp(compositions, "composition", COMPOSITION_KEYWORDS);
    if (resolvedCompositions instanceof Response) return resolvedCompositions;
    const resolvedMoods = resolveArrayProp(moods, "mood", MOOD_KEYWORDS);
    if (resolvedMoods instanceof Response) return resolvedMoods;
    const resolvedComplexities = resolveArrayProp(complexities, "complexity", COMPLEXITY_KEYWORDS);
    if (resolvedComplexities instanceof Response) return resolvedComplexities;
    const resolvedLayouts = resolveArrayProp(layouts, "layout", LAYOUT_KEYWORDS);
    if (resolvedLayouts instanceof Response) return resolvedLayouts;
    const resolvedSubjects = resolveArrayProp(subjects, "subject", SUBJECT_KEYWORDS);
    if (resolvedSubjects instanceof Response) return resolvedSubjects;
    const resolvedIconStyles = resolveArrayProp(iconStyles, "iconStyle", ICON_STYLE_KEYWORDS);
    if (resolvedIconStyles instanceof Response) return resolvedIconStyles;
    const resolvedPlacements = resolveArrayProp(placements, "placement", PLACEMENT_KEYWORDS);
    if (resolvedPlacements instanceof Response) return resolvedPlacements;

    function buildPipelineOptions() {
      return {
        palette: resolvedPalette ?? PALETTES[Math.floor(Math.random() * PALETTES.length)],
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

    try {
      const results = await Promise.all(runs);
      return jsonResponse({
        images: imageCount === 1 ? [results[0]] : results,
        consistent: isConsistent,
        count: imageCount,
      });
    } catch (err) {
      if (err instanceof PipelineError) {
        return errorResponse(err.message, err.statusCode, err.step, err.detail);
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      return errorResponse("Pipeline failed", 500, "unknown", message);
    }
  },
} satisfies ExportedHandler<Env>;