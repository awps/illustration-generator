import { GoogleGenAI } from "@google/genai";
import { Buffer } from "node:buffer";
import { Env } from "./types";
import {
  Palette, PALETTES, buildPrompt,
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
import { generateImage } from "./ai/image-generator";
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
}

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

export async function runPipeline(
  env: Env,
  userPrompt: string,
  options: PipelineOptions = {}
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

  const chosen = options.palette ?? PALETTES[Math.floor(Math.random() * PALETTES.length)];
  const parts: string[] = [userPrompt];
  if (options.renderings?.length) parts.push(buildPrompt(options.renderings, RENDERING_KEYWORDS, "Rendering style"));
  if (options.elements?.length) parts.push(buildPrompt(options.elements, ELEMENT_KEYWORDS, "Visual elements"));
  if (options.compositions?.length) parts.push(buildPrompt(options.compositions, COMPOSITION_KEYWORDS, "Scene composition"));
  if (options.project) parts.push(`Project context: ${options.project}.`);
  if (options.subjects?.length) parts.push(buildPrompt(options.subjects, SUBJECT_KEYWORDS, "Subject context"));
  if (options.placements?.length) parts.push(buildPrompt(options.placements, PLACEMENT_KEYWORDS, "Image placement"));
  if (options.moods?.length) parts.push(buildPrompt(options.moods, MOOD_KEYWORDS, "Illustration mood"));
  if (options.complexities?.length) parts.push(buildPrompt(options.complexities, COMPLEXITY_KEYWORDS, "Composition complexity"));
  if (options.layouts?.length) parts.push(buildPrompt(options.layouts, LAYOUT_KEYWORDS, "Layout"));
  if (options.iconStyles?.length) parts.push(buildPrompt(options.iconStyles, ICON_STYLE_KEYWORDS, "Icon style"));
  parts.push(`Color palette: ${chosen.join(", ")}. Use for fills and accents. Text must be relevant labels — never display color names or codes as text.`);
  parts.push("MANDATORY: The background must be a solid light lavender purple color.");
  parts.push("--no monochrome, no grayscale, no photo-realistic, no clutter, no text watermarks, no busy details, no floor, no shadows on background, no environmental elements, no floating text or labels outside the main subject");

  const prompt = parts.join(" ");

  // Step 2: Generate image
  let rawBytes: Buffer;
  try {
    const image = await generateImage(ai, prompt);
    rawBytes = Buffer.from(image.base64, "base64");
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown error";
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
    const segmentUrl = `https://${env.IMAGES_DOMAIN}/cdn-cgi/image/segment=foreground/${rawKey}`;
    const segmentResponse = await fetch(segmentUrl);

    if (!segmentResponse.ok) {
      throw new Error(`${segmentResponse.status} ${segmentResponse.statusText}`);
    }

    transparentPng = await segmentResponse.arrayBuffer();
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown error";
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
  };
}
