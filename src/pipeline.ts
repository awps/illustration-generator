import { GoogleGenAI } from "@google/genai";
import { Buffer } from "node:buffer";
import { Env } from "./types";
import { Style } from "./styles";
import { enhancePrompt } from "./ai/prompt-enhancer";
import { generateImage } from "./ai/image-generator";
import { generateId, buildPublicUrl, uploadToR2 } from "./storage/r2";

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly step: string,
    public readonly statusCode: number
  ) {
    super(message);
  }
}

export interface PipelineResult {
  id: string;
  urls: {
    raw: string;
    transparent: string;
  };
}

export async function runPipeline(
  env: Env,
  userPrompt: string,
  style: Style
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

  // Step 2: Enhance prompt
  let enhancedPrompt: string;
  try {
    enhancedPrompt = await enhancePrompt(ai, userPrompt, style);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError(`Prompt enhancement failed: ${msg}`, "enhance-prompt", 502);
  }

  // Step 3: Generate image
  let rawBytes: Buffer;
  try {
    const image = await generateImage(ai, enhancedPrompt);
    rawBytes = Buffer.from(image.base64, "base64");
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError(`Image generation failed: ${msg}`, "generate-image", 502);
  }

  // Step 4: Upload raw image to R2
  try {
    await uploadToR2(env, rawKey, rawBytes, "image/png");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError(`Raw image upload failed: ${msg}`, "upload-raw", 500);
  }

  // Step 5: Background removal via Cloudflare Images segment transform
  let transparentPng: ArrayBuffer;
  try {
    const rawUrl = buildPublicUrl(env, rawKey);
    const segmentResponse = await fetch(rawUrl, {
      cf: { image: { segment: "foreground" } },
    } as RequestInit);

    if (!segmentResponse.ok) {
      throw new Error(`${segmentResponse.status} ${segmentResponse.statusText}`);
    }

    transparentPng = await segmentResponse.arrayBuffer();
  } catch (err) {
    if (err instanceof PipelineError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError(`Background removal failed: ${msg}`, "remove-background", 502);
  }

  // Step 6: Upload transparent image to R2
  try {
    await uploadToR2(env, transparentKey, transparentPng, "image/png");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new PipelineError(`Transparent image upload failed: ${msg}`, "upload-transparent", 500);
  }

  return {
    id,
    urls: {
      raw: buildPublicUrl(env, rawKey),
      transparent: buildPublicUrl(env, transparentKey),
    },
  };
}
