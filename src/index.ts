import { Env } from "./types";
import {
  PALETTES, RENDERINGS, ELEMENTS, COMPOSITIONS,
  MOODS, COMPLEXITIES, LAYOUTS, SUBJECTS, ICON_STYLES, PLACEMENTS,
  type Rendering, type IllustrationElement, type Composition,
  type Subject, type Placement, type Mood, type IconStyle,
  type Complexity, type Layout,
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

    const { prompt, paletteIndex, project, renderings, elements, compositions, placements, moods, complexities, layouts, subjects, iconStyles, count } = body as Record<string, unknown>;

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

    // Resolve paletteIndex — supports number, array of numbers, or "random"
    let resolvedPalette;
    if (paletteIndex === "random") {
      resolvedPalette = pickRandom(PALETTES);
    } else if (Array.isArray(paletteIndex)) {
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
        `Invalid paletteIndex. Must be 0-${PALETTES.length - 1}, an array of indexes, or "random"`,
        400
      );
    } else {
      resolvedPalette = paletteIndex != null ? PALETTES[paletteIndex as number] : undefined;
    }

    if (project != null && (typeof project !== "string" || project.length > 200)) {
      return errorResponse("project must be a string of 200 characters or less", 400);
    }

    // Resolve array-based props helper
    function resolveArrayProp<T extends string>(
      value: unknown, name: string, valid: readonly T[]
    ): T[] | undefined | Response {
      if (value === "random") return [pickRandom([...valid])];
      if (typeof value === "string") {
        if (!(valid as readonly string[]).includes(value))
          return errorResponse(`Invalid ${name} "${value}". Valid options: ${valid.join(", ")}, random`, 400);
        return [value as T];
      }
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof v !== "string" || !(valid as readonly string[]).includes(v))
            return errorResponse(`Invalid ${name} "${v}". Valid options: ${valid.join(", ")}`, 400);
        }
        return value.length > 0 ? (value as T[]) : undefined;
      }
      if (value != null)
        return errorResponse(`Invalid ${name}. Must be a string, array of strings, or "random"`, 400);
      return undefined;
    }

    const resolvedMoods = resolveArrayProp(moods, "mood", MOODS);
    if (resolvedMoods instanceof Response) return resolvedMoods;
    const resolvedComplexities = resolveArrayProp(complexities, "complexity", COMPLEXITIES);
    if (resolvedComplexities instanceof Response) return resolvedComplexities;
    const resolvedLayouts = resolveArrayProp(layouts, "layout", LAYOUTS);
    if (resolvedLayouts instanceof Response) return resolvedLayouts;

    const resolvedSubjects = resolveArrayProp(subjects, "subject", SUBJECTS);
    if (resolvedSubjects instanceof Response) return resolvedSubjects;
    const resolvedIconStyles = resolveArrayProp(iconStyles, "iconStyle", ICON_STYLES);
    if (resolvedIconStyles instanceof Response) return resolvedIconStyles;
    const resolvedPlacements = resolveArrayProp(placements, "placement", PLACEMENTS);
    if (resolvedPlacements instanceof Response) return resolvedPlacements;

    const resolvedRenderings = resolveArrayProp(renderings, "rendering", RENDERINGS);
    if (resolvedRenderings instanceof Response) return resolvedRenderings;
    const resolvedElements = resolveArrayProp(elements, "element", ELEMENTS);
    if (resolvedElements instanceof Response) return resolvedElements;
    const resolvedCompositions = resolveArrayProp(compositions, "composition", COMPOSITIONS);
    if (resolvedCompositions instanceof Response) return resolvedCompositions;

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

    const runs = Array.from({ length: imageCount }, () =>
      runPipeline(env, prompt.trim(), pipelineOptions)
    );

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

    try {
      const results = await Promise.all(runs);
      return jsonResponse({
        images: imageCount === 1 ? [results[0]] : results,
        config,
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
