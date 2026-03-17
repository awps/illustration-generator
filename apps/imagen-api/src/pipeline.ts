import { GoogleGenAI } from "@google/genai";
import { Buffer } from "node:buffer";
import { Env } from "./types";
import {
  Palette, buildPrompt,
  type Rendering, RENDERING_KEYWORDS,
  type IllustrationElement, ELEMENT_KEYWORDS,
  type Composition, COMPOSITION_KEYWORDS,
  type Mood, MOOD_KEYWORDS,
  type Complexity, COMPLEXITY_KEYWORDS,
  type Layout, LAYOUT_KEYWORDS,
  type Subject, SUBJECT_KEYWORDS,
  type IconStyle, ICON_STYLE_KEYWORDS,
  type Placement, PLACEMENT_KEYWORDS,
} from "./styles";
import { type ResolvedPalette, pickBackgroundColor } from "./palettes";
import { generateImage, type ReferenceImage } from "./ai/image-generator";
import { generateId, buildPublicUrl, uploadToR2 } from "./storage/r2";

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly detail: string,
    public readonly step: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export interface PipelineResult {
  id: string;
  urls: {
    raw: string;
    transparent: string;
  };
  config: {
    palette: ResolvedPalette;
    project: string | null;
    renderings: Rendering[];
    elements: IllustrationElement[];
    compositions: Composition[];
    placements: Placement[];
    moods: Mood[];
    complexities: Complexity[];
    layouts: Layout[];
    subjects: Subject[];
    iconStyles: IconStyle[];
  };
}

export interface PipelineOptions {
  palette: ResolvedPalette;
  project?: string;
  referenceImage?: ReferenceImage;
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

export async function runPipeline(
  env: Env,
  userPrompt: string,
  options: PipelineOptions
): Promise<PipelineResult> {
  const ai = new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY,
    httpOptions: {
      baseUrl: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/google-ai-studio`,
    },
  });

  const id = generateId();
  const rawKey = `generations/${id}/raw.png`;
  const transparentKey = `generations/${id}/transparent.png`;

  const chosen = options.palette.colors;
  const bgColor = pickBackgroundColor(chosen);
  const parts: string[] = [userPrompt];
  if (options.renderings?.length) parts.push(buildPrompt(options.renderings, RENDERING_KEYWORDS, "Style"));
  if (options.elements?.length) parts.push(buildPrompt(options.elements, ELEMENT_KEYWORDS, "Elements"));
  if (options.compositions?.length) parts.push(buildPrompt(options.compositions, COMPOSITION_KEYWORDS, "Composition"));
  if (options.project) parts.push(`Context: ${options.project}.`);
  if (options.subjects?.length) parts.push(buildPrompt(options.subjects, SUBJECT_KEYWORDS, "Subject"));
  if (options.placements?.length) parts.push(buildPrompt(options.placements, PLACEMENT_KEYWORDS, "Placement"));
  if (options.moods?.length) parts.push(buildPrompt(options.moods, MOOD_KEYWORDS, "Mood"));
  if (options.complexities?.length) parts.push(buildPrompt(options.complexities, COMPLEXITY_KEYWORDS, "Complexity"));
  if (options.layouts?.length) parts.push(buildPrompt(options.layouts, LAYOUT_KEYWORDS, "Layout"));
  if (options.iconStyles?.length) parts.push(buildPrompt(options.iconStyles, ICON_STYLE_KEYWORDS, "Icons"));
  parts.push(`Colors: ${chosen.join(", ")}. Use only as fills and accents, never render hex codes or color names as text.`);
  parts.push(`Background: solid dark ${bgColor} background. No illustration colors in the background.`);
  parts.push("Centered compact cluster with generous margins. No elements touching edges. No duplicated elements. No text outside UI elements.");
  parts.push("--no monochrome, grayscale, photo-realistic, clutter, watermarks, floor, scattered elements");

  const prompt = parts.join(" ");
  console.log(`[pipeline] Prompt length: ${prompt.length} chars`);

  // Step 2: Generate image
  let rawBytes: Buffer;
  try {
    const image = await generateImage(ai, prompt, options.referenceImage);
    rawBytes = Buffer.from(image.base64, "base64");
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    const msg = err instanceof Error ? `${err.message}${(err as any).status ? ` (status: ${(err as any).status})` : ""}` : "Unknown error";
    console.error("[pipeline:generate-image] Gemini API error:", msg);
    throw new PipelineError("Image generation failed", msg, "generate-image", 502);
  }

  // Step 3: Upload raw image to R2
  try {
    await uploadToR2(env, rawKey, rawBytes, "image/png");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError("Raw image upload failed", msg, "upload-raw", 500);
  }

  // Step 4: Background removal via Cloudflare Images segment transform
  // Using /cdn-cgi/image/ URL format because cf.image options in fetch()
  // don't apply transforms when called from within a Worker
  let transparentPng: ArrayBuffer;
  try {
    const segmentUrl = `https://${env.IMAGES_DOMAIN}/cdn-cgi/image/segment=foreground,format=png,quality=75/${rawKey}`;
    const segmentResponse = await fetch(segmentUrl);

    if (!segmentResponse.ok) {
      const body = await segmentResponse.text().catch(() => "");
      throw new Error(`${segmentResponse.status} ${segmentResponse.statusText}: ${body}`);
    }

    transparentPng = await segmentResponse.arrayBuffer();
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pipeline:remove-background] Error:", msg);
    throw new PipelineError("Background removal failed", msg, "remove-background", 502);
  }

  // Step 5: Upload transparent image to R2
  try {
    await uploadToR2(env, transparentKey, transparentPng, "image/png");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError("Transparent image upload failed", msg, "upload-transparent", 500);
  }

  return {
    id,
    urls: {
      raw: buildPublicUrl(env, rawKey),
      transparent: buildPublicUrl(env, transparentKey),
    },
    config: {
      palette: options.palette,
      project: options.project ?? null,
      renderings: options.renderings ?? [],
      elements: options.elements ?? [],
      compositions: options.compositions ?? [],
      placements: options.placements ?? [],
      moods: options.moods ?? [],
      complexities: options.complexities ?? [],
      layouts: options.layouts ?? [],
      subjects: options.subjects ?? [],
      iconStyles: options.iconStyles ?? [],
    },
  };
}
