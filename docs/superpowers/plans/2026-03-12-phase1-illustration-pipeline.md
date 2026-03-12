# Phase 1: Illustration Generation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker that takes a text prompt + style ID, generates an AI illustration via Gemini, removes the background, stores both versions in R2, and returns public URLs.

**Architecture:** Single Cloudflare Worker with a sequential 6-step pipeline. Gemini models routed through Cloudflare AI Gateway. R2 for storage with `imagen.publingo.com` custom domain. Cloudflare Images `segment` transform for background removal.

**Tech Stack:** Cloudflare Workers (TypeScript, ES Modules), `@google/genai` SDK, Cloudflare R2, Cloudflare Images (segment transform), Wrangler (jsonc config)

**Spec:** `docs/superpowers/specs/2026-03-12-phase1-illustration-pipeline-design.md`

---

## Chunk 1: Project Scaffolding & Style Definitions

### Task 1: Reconfigure project for Cloudflare Workers

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `wrangler.jsonc`
- Create: `src/types.ts`

- [ ] **Step 1: Update `package.json` for Wrangler**

Remove the `tsc` build script and `main` field. Add Cloudflare Workers dependencies and the `@google/genai` SDK.

```json
{
  "name": "illustrations-generator",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@google/genai": "^1.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.5.3",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Update `tsconfig.json` for Workers**

Switch to ES modules, add Workers types, target modern JS.

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `wrangler.jsonc`**

```jsonc
{
  "name": "illustrations-generator",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-12",
  "compatibility_flags": ["nodejs_compat"],
  "r2_buckets": [
    {
      "binding": "IMAGES_BUCKET",
      "bucket_name": "illustrations-generator"
    }
  ],
  "vars": {
    "CLOUDFLARE_ACCOUNT_ID": "",
    "AI_GATEWAY_ID": "",
    "IMAGES_DOMAIN": "imagen.publingo.com"
  }
}
```

- [ ] **Step 4: Create `src/types.ts` with Env interface**

Note: We define Env manually rather than relying on `wrangler types` generated output, to keep full control and avoid potential conflicts. The `wrangler types` command is not used in this project.

```typescript
export interface Env {
  IMAGES_BUCKET: R2Bucket;
  GEMINI_API_KEY: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  IMAGES_DOMAIN: string;
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: Clean install with no errors. `node_modules/` created.

- [ ] **Step 6: Replace `src/index.ts` with minimal Worker skeleton**

```typescript
import { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response("illustrations-generator is running", {
      headers: { "Content-Type": "text/plain" },
    });
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Verify local dev server starts**

Run: `npx wrangler dev`
Expected: Dev server starts. Visiting `http://localhost:8787` returns "illustrations-generator is running".

- [ ] **Step 9: Remove `.DS_Store` from git tracking**

```bash
echo ".DS_Store" >> .gitignore
git rm --cached .DS_Store
```

- [ ] **Step 10: Commit scaffolding**

```bash
git add wrangler.jsonc package.json tsconfig.json package-lock.json src/index.ts src/types.ts
git commit -m "chore: reconfigure project for Cloudflare Workers with R2 and Wrangler"
```

---

### Task 2: Style definitions

**Files:**
- Create: `src/styles/index.ts`

- [ ] **Step 1: Create `src/styles/index.ts`**

```typescript
export interface Style {
  name: string;
  rules: string;
}

export const STYLES: Record<string, Style> = {
  "isometric-tech": {
    name: "Isometric Tech",
    rules:
      "3D isometric perspective. Clean geometric shapes. Tech/digital objects as polished 3D icons. Soft directional lighting from top-left. Subtle shadows. Vibrant professional palette with blues and purples.",
  },
  "floating-ui": {
    name: "Floating UI",
    rules:
      "UI cards, screens, and interface elements floating at slight angles in 3D space. Glassmorphism with frosted translucency. Soft glows and reflections. Modern SaaS aesthetic. Cool-toned gradients.",
  },
  "clay-3d": {
    name: "Clay 3D",
    rules:
      "Soft matte clay/plastic material. Rounded bubbly shapes. Pastel colors. Playful and approachable. Gentle ambient occlusion shadows. Objects look tactile and squeezable.",
  },
  "flat-geometric": {
    name: "Flat Geometric",
    rules:
      "Bold flat illustration. Simple geometric shapes. Limited palette (4-5 colors). No gradients or 3D. Clean vector-art look. Strong silhouettes. Modern editorial illustration.",
  },
  "neon-dark": {
    name: "Neon Dark",
    rules:
      "Dark scene with vibrant neon glowing edges. Cyberpunk-inspired. Objects emit colored light. High contrast. Electric blues, magentas, teals. Cinematic feel.",
  },
  "isometric-flat": {
    name: "Isometric Flat",
    rules:
      "Isometric perspective with flat illustration style. No gradients or realistic lighting. Clean vector shapes with solid fills. Limited color palette. Crisp edges, no shadows. Technical diagram meets modern infographic.",
  },
};

export const VALID_STYLE_IDS = Object.keys(STYLES);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.ts
git commit -m "feat: add style definitions for 6 illustration styles"
```

---

## Chunk 2: Request Handling & Input Validation

### Task 3: Request routing and input validation

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Implement request routing and validation in `src/index.ts`**

```typescript
import { Env } from "./types";
import { STYLES, VALID_STYLE_IDS } from "./styles";

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

    const { prompt, styleId } = body as Record<string, unknown>;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return errorResponse("prompt is required", 400);
    }

    if (prompt.length > 500) {
      return errorResponse("prompt must be 500 characters or less", 400);
    }

    if (!styleId || typeof styleId !== "string" || !STYLES[styleId]) {
      return errorResponse(
        `Unknown styleId. Valid options: ${VALID_STYLE_IDS.join(", ")}`,
        400
      );
    }

    // Pipeline will go here
    return jsonResponse({ message: "Validation passed", prompt, styleId });
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: Test validation manually with wrangler dev**

Run: `npx wrangler dev`

Test cases (in another terminal):

```bash
# Missing body
curl -s -X POST http://localhost:8787/generate | jq .

# Missing prompt
curl -s -X POST http://localhost:8787/generate -H 'Content-Type: application/json' -d '{"styleId":"clay-3d"}' | jq .

# Unknown style
curl -s -X POST http://localhost:8787/generate -H 'Content-Type: application/json' -d '{"prompt":"test","styleId":"nope"}' | jq .

# Valid request
curl -s -X POST http://localhost:8787/generate -H 'Content-Type: application/json' -d '{"prompt":"A laptop with floating code","styleId":"isometric-tech"}' | jq .

# Wrong path
curl -s http://localhost:8787/other | jq .

# Wrong method
curl -s http://localhost:8787/generate | jq .
```

Expected: Each returns the appropriate error or success JSON.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add request routing and input validation for /generate endpoint"
```

---

## Chunk 3: AI Integration (Prompt Enhancement + Image Generation)

### Task 4: Prompt enhancement via Gemini text model

**Files:**
- Create: `src/ai/prompt-enhancer.ts`

- [ ] **Step 1: Create `src/ai/prompt-enhancer.ts`**

```typescript
import { GoogleGenAI } from "@google/genai";
import { Style } from "../styles";

const SYSTEM_INSTRUCTION = `You are an expert image prompt engineer. Given a short description and a set of visual style rules,
generate a detailed 3-4 sentence prompt for an AI image generator. The prompt must:
1. Faithfully represent the user's subject
2. Strictly follow the provided visual style rules
3. Always end with: "The subject is rendered on a solid light gray (#E0E0E0) background with no floor, no shadows on the background, and no environmental elements. The subject is cleanly isolated."
4. Do NOT include any text, watermarks, labels, or UI elements in the image description.
Return ONLY the image generation prompt, nothing else.`;

export async function enhancePrompt(
  ai: GoogleGenAI,
  userPrompt: string,
  style: Style
): Promise<string> {
  const userMessage = `Subject: ${userPrompt}\nVisual Style: ${style.name} — ${style.rules}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  });

  // response.text is a string getter in @google/genai SDK
  const text = response.text;
  if (!text || typeof text !== "string") {
    throw new Error("Prompt enhancement returned empty response");
  }

  return text.trim();
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/ai/prompt-enhancer.ts
git commit -m "feat: add prompt enhancement module using Gemini text model"
```

---

### Task 5: Image generation via Gemini image model

**Files:**
- Create: `src/ai/image-generator.ts`

- [ ] **Step 1: Create `src/ai/image-generator.ts`**

```typescript
import { GoogleGenAI } from "@google/genai";

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export async function generateImage(
  ai: GoogleGenAI,
  enhancedPrompt: string
): Promise<GeneratedImage> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: enhancedPrompt,
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("Image generation returned no content");
  }

  const imagePart = parts.find((p) =>
    p.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) {
    throw new Error("Image generation returned no image data");
  }

  return {
    base64: imagePart.inlineData.data!,
    mimeType: imagePart.inlineData.mimeType!,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/ai/image-generator.ts
git commit -m "feat: add image generation module using Gemini image model"
```

---

## Chunk 4: R2 Storage

### Task 6: R2 upload helper and URL builder

**Files:**
- Create: `src/storage/r2.ts`

- [ ] **Step 1: Create `src/storage/r2.ts`**

```typescript
import { Env } from "../types";

export function generateId(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const shortId = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${timestamp}-${shortId}`;
}

export function buildPublicUrl(env: Env, key: string): string {
  return `https://${env.IMAGES_DOMAIN}/${key}`;
}

export async function uploadToR2(
  env: Env,
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<void> {
  await env.IMAGES_BUCKET.put(key, data, {
    httpMetadata: { contentType },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/storage/r2.ts
git commit -m "feat: add R2 upload helper and public URL builder"
```

---

## Chunk 5: Pipeline Orchestration & Integration

### Task 7: Pipeline orchestrator

**Files:**
- Create: `src/pipeline.ts`

- [ ] **Step 1: Create `src/pipeline.ts`**

Each pipeline step is wrapped in its own try/catch that throws a `PipelineError` with the step name and appropriate HTTP status code. This ensures the entry point can map errors correctly without fragile string matching.

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pipeline.ts
git commit -m "feat: add pipeline orchestrator wiring all 6 steps together"
```

---

### Task 8: Wire pipeline into the Worker entry point

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Replace the placeholder response with the pipeline call**

Update `src/index.ts` — replace the `// Pipeline will go here` placeholder and temporary response with:

```typescript
import { Env } from "./types";
import { STYLES, VALID_STYLE_IDS } from "./styles";
import { runPipeline, PipelineError } from "./pipeline";

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

    const { prompt, styleId } = body as Record<string, unknown>;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return errorResponse("prompt is required", 400);
    }

    if (prompt.length > 500) {
      return errorResponse("prompt must be 500 characters or less", 400);
    }

    if (!styleId || typeof styleId !== "string" || !STYLES[styleId]) {
      return errorResponse(
        `Unknown styleId. Valid options: ${VALID_STYLE_IDS.join(", ")}`,
        400
      );
    }

    const style = STYLES[styleId];

    try {
      const result = await runPipeline(env, prompt.trim(), style);
      return jsonResponse(result);
    } catch (err) {
      if (err instanceof PipelineError) {
        return errorResponse("Pipeline failed", err.statusCode, err.step, err.message);
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      return errorResponse("Pipeline failed", 500, "unknown", message);
    }
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire pipeline into Worker entry point with error mapping"
```

---

## Chunk 6: Infrastructure Setup & End-to-End Test

### Task 9: Cloudflare infrastructure setup

This task is done in the Cloudflare dashboard and CLI, not in code.

- [ ] **Step 1: Create the R2 bucket**

```bash
npx wrangler r2 bucket create illustrations-generator
```

Expected: Bucket created successfully.

- [ ] **Step 2: Configure `imagen.publingo.com` as R2 custom domain**

In Cloudflare dashboard:
1. Go to R2 > `illustrations-generator` bucket > Settings
2. Under "Custom Domains", add `imagen.publingo.com`
3. Ensure the domain is proxied through Cloudflare (orange cloud)

- [ ] **Step 3: Enable Cloudflare Images on the zone**

In Cloudflare dashboard:
1. Go to the `publingo.com` zone
2. Navigate to Images and enable the product
3. This is required for `cf.image` transforms (including `segment`) to work on the domain

- [ ] **Step 4: Set up AI Gateway**

In Cloudflare dashboard:
1. Go to AI > AI Gateway
2. Create a new gateway (note the gateway ID)
3. No provider-specific config needed — the SDK sends requests through it directly

- [ ] **Step 5: Set Wrangler secrets and vars**

```bash
npx wrangler secret put GEMINI_API_KEY
# Paste your Google AI Studio API key when prompted
```

Update `wrangler.jsonc` with your actual values:
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID
- `AI_GATEWAY_ID`: the gateway ID from Step 4

- [ ] **Step 6: Deploy the Worker**

```bash
npx wrangler deploy
```

Expected: Worker deployed successfully. Note the `*.workers.dev` URL.

**Important:** The Worker deploys to `*.workers.dev` by default. Do NOT add a custom domain route on `publingo.com` that could match `imagen.publingo.com` — this would cause the background removal fetch to loop back into the Worker instead of hitting R2.

- [ ] **Step 7: Commit final config (if vars were updated)**

```bash
git add wrangler.jsonc
git commit -m "chore: update wrangler vars with account and gateway IDs"
```

---

### Task 10: End-to-end smoke test

- [ ] **Step 1: Test with a simple prompt against deployed Worker**

```bash
curl -s -X POST https://illustrations-generator.<your-subdomain>.workers.dev/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "A laptop with code floating around it", "styleId": "isometric-tech"}' | jq .
```

Expected: JSON response with `id` and `urls.raw` / `urls.transparent` fields. May take 15-30 seconds.

- [ ] **Step 2: Verify the raw image URL loads in browser**

Open the `urls.raw` URL from the response in a browser.
Expected: An illustration of a laptop with code, on a light gray background, in the isometric tech style.

- [ ] **Step 3: Verify the transparent image URL loads in browser**

Open the `urls.transparent` URL from the response in a browser.
Expected: Same illustration but with a transparent background (checkered pattern in browser).

- [ ] **Step 4: Test each style**

Run the same curl command with each `styleId`: `floating-ui`, `clay-3d`, `flat-geometric`, `neon-dark`, `isometric-flat`.
Expected: Each produces a distinct visual style while maintaining the same subject.

- [ ] **Step 5: Test error cases against deployed Worker**

```bash
# Missing prompt
curl -s -X POST https://illustrations-generator.<your-subdomain>.workers.dev/generate \
  -H 'Content-Type: application/json' \
  -d '{"styleId": "clay-3d"}' | jq .

# Invalid style
curl -s -X POST https://illustrations-generator.<your-subdomain>.workers.dev/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "test", "styleId": "invalid"}' | jq .
```

Expected: Proper 400 error responses with descriptive messages.

- [ ] **Step 6: Check AI Gateway logs**

In Cloudflare dashboard, go to AI > AI Gateway > your gateway > Logs.
Expected: You should see 2 requests per successful generation (one text, one image), with model names and latency visible.
