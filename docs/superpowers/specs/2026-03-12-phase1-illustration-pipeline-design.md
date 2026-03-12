# Phase 1: Illustration Generation Pipeline — Design Spec

## Overview

A serverless image generation pipeline deployed as a single Cloudflare Worker. Takes a short text prompt and a visual style ID, produces an AI-generated illustration with the background removed, stores both versions in R2, and returns public URLs.

This is Phase 1 — a proof of concept focused on the core generation pipeline. HTML compositing, Browser Rendering, and frontend preview UI are deferred to future phases.

## API Contract

### Request

```
POST /generate
Content-Type: application/json

{
  "prompt": "A laptop with code floating around it",
  "styleId": "isometric-tech"
}
```

- `prompt` (string, required): Short sentence describing the desired illustration subject. Max 500 characters.
- `styleId` (string, required): One of the predefined style keys (`isometric-tech`, `floating-ui`, `clay-3d`, `flat-geometric`, `neon-dark`, `isometric-flat`).

### Validation Rules

- Missing or empty `prompt` → 400 `{ "error": "prompt is required" }`
- `prompt` exceeds 500 characters → 400 `{ "error": "prompt must be 500 characters or less" }`
- Missing or unknown `styleId` → 400 `{ "error": "Unknown styleId. Valid options: ..." }`
- Invalid JSON body → 400 `{ "error": "Invalid JSON" }`
- Non-POST method or wrong path → 405 / 404

### Response (Success — 200)

```json
{
  "id": "1710000000-abc123",
  "urls": {
    "raw": "https://imagen.publingo.com/generations/1710000000-abc123/raw.png",
    "transparent": "https://imagen.publingo.com/generations/1710000000-abc123/transparent.png"
  }
}
```

All responses include `Content-Type: application/json`.

### Response (Error — 4xx/5xx)

```json
{
  "error": "Image generation failed",
  "step": "generate-image",
  "detail": "Model returned empty response"
}
```

Error status codes by step:
- Input validation failures → 400
- Gemini API failures (text or image) → 502
- R2 upload failures → 500
- Background removal failures → 502

## Architecture

### Single Worker, Sequential Pipeline

The Worker processes each request through 6 sequential steps. Total wall-clock time is expected to be 15-30 seconds, dominated by the Gemini image generation call. Cloudflare Workers have no hard wall-clock limit for HTTP-triggered requests (only CPU time limits), so this is acceptable as long as the client waits for the synchronous response.

```
Request
  → 1. Validate input & resolve style
  → 2. Enhance prompt (Gemini text model via AI Gateway)
  → 3. Generate image (Gemini image model via AI Gateway)
  → 4. Upload raw PNG to R2
  → 5. Background removal (fetch from R2 with cf.image.segment)
  → 6. Upload transparent PNG to R2
Response (JSON with URLs)
```

### Why a single Worker?

- Fastest path to a working POC
- No infrastructure overhead (queues, durable objects, status polling)
- Each step feeds directly into the next — no coordination needed
- If timeouts become an issue in practice, refactor to queue-based approach in a later phase

## AI Models

Both models are routed through **Cloudflare AI Gateway** for observability, rate limiting, and logging.

| Purpose | Model ID | Input | Output |
|---------|----------|-------|--------|
| Prompt enhancement | `gemini-3.1-flash-lite-preview` | text | text |
| Image generation | `gemini-3.1-flash-image-preview` | text | image (base64 PNG) |

### AI Gateway Configuration

Base URL pattern:
```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/google-ai-studio
```

SDK initialization:
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: {
    baseUrl: `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_ID}/google-ai-studio`,
  },
});
```

## Prompt Enhancement (Step 2)

The text model receives a system instruction and the user's prompt combined with style rules. It returns a detailed 3-4 sentence image generation prompt.

### System Instruction

```
You are an expert image prompt engineer. Given a short description and a set of visual style rules,
generate a detailed 3-4 sentence prompt for an AI image generator. The prompt must:
1. Faithfully represent the user's subject
2. Strictly follow the provided visual style rules
3. Always end with: "The subject is rendered on a solid light gray (#E0E0E0) background with no floor,
   no shadows on the background, and no environmental elements. The subject is cleanly isolated."
4. Do NOT include any text, watermarks, labels, or UI elements in the image description.
Return ONLY the image generation prompt, nothing else.
```

### User Message Format

```
Subject: {user prompt}
Visual Style: {style.name} — {style.rules}
```

### Model Configuration

- Model: `gemini-3.1-flash-lite-preview`
- Temperature: 0.7 (some creativity, but constrained by rules)
- Max output tokens: 512

## Image Generation (Step 3)

The image model receives the enhanced prompt and returns a base64-encoded PNG.

### Model Configuration

- Model: `gemini-3.1-flash-image-preview`
- Response modalities: `["IMAGE"]`
- Image output is extracted from `response.candidates[0].content.parts[].inlineData` where `inlineData.mimeType` is `image/png`
- If no image part is found in the response, the step fails with an error

### SDK Call Pattern

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: enhancedPrompt,
  config: {
    responseModalities: ["IMAGE"],
  },
});

const imagePart = response.candidates[0].content.parts.find(
  (p) => p.inlineData?.mimeType?.startsWith("image/")
);
const base64Image = imagePart.inlineData.data; // base64 string
```

## Style System

Each style is a named set of strict visual rules injected into the prompt enhancement step. All styles share a universal background instruction to ensure reliable background removal.

### Universal Background Instruction

> "Render the subject on a solid light gray (#E0E0E0) background with no floor, no shadows on the background, and no environmental elements. The subject must be cleanly isolated."

### Style Definitions

| ID | Name | Visual Rules |
|----|------|-------------|
| `isometric-tech` | Isometric Tech | 3D isometric perspective. Clean geometric shapes. Tech/digital objects as polished 3D icons. Soft directional lighting from top-left. Subtle shadows. Vibrant professional palette with blues and purples. |
| `floating-ui` | Floating UI | UI cards, screens, and interface elements floating at slight angles in 3D space. Glassmorphism with frosted translucency. Soft glows and reflections. Modern SaaS aesthetic. Cool-toned gradients. |
| `clay-3d` | Clay 3D | Soft matte clay/plastic material. Rounded bubbly shapes. Pastel colors. Playful and approachable. Gentle ambient occlusion shadows. Objects look tactile and squeezable. |
| `flat-geometric` | Flat Geometric | Bold flat illustration. Simple geometric shapes. Limited palette (4-5 colors). No gradients or 3D. Clean vector-art look. Strong silhouettes. Modern editorial illustration. |
| `neon-dark` | Neon Dark | Dark scene with vibrant neon glowing edges. Cyberpunk-inspired. Objects emit colored light. High contrast. Electric blues, magentas, teals. Cinematic feel. |
| `isometric-flat` | Isometric Flat | Isometric perspective with flat illustration style. No gradients or realistic lighting. Clean vector shapes with solid fills. Limited color palette. Crisp edges, no shadows. Technical diagram meets modern infographic. |

## Storage

### R2 Bucket

- **Bucket name:** `illustrations-generator`
- **Custom domain:** `imagen.publingo.com`
- **Structure:**

```
generations/
  {timestamp}-{shortId}/
    raw.png          ← Original Gemini output (with gray background)
    transparent.png  ← Background removed (transparent PNG)
```

- `timestamp`: Unix seconds at generation time
- `shortId`: 8-character random alphanumeric string generated via `crypto.randomUUID().replace(/-/g, '').slice(0, 8)`

### Background Removal

Uses Cloudflare Images `segment` transform via a fetch subrequest to the R2 public URL:

```typescript
const response = await fetch(
  `https://imagen.publingo.com/generations/${id}/raw.png`,
  { cf: { image: { segment: "foreground" } } }
);
const transparentPng = await response.arrayBuffer();
```

### Prerequisites for Background Removal

- `imagen.publingo.com` must be configured as a Cloudflare-proxied custom domain on the R2 bucket
- **Cloudflare Images** must be enabled on the zone (required for `cf.image` transforms including `segment`)
- The `segment` feature uses the BiRefNet model via Workers AI and is currently in open beta

### Self-Fetch Gotcha

The background removal step fetches from the same domain (`imagen.publingo.com`) that serves R2 content. This is a subrequest within the Cloudflare network. Important:
- The Worker's route must NOT match the `imagen.publingo.com` domain, or the fetch will loop back into the Worker instead of hitting R2. The Worker should be deployed on a separate route (e.g., `api.publingo.com/generate` or the default `*.workers.dev` domain). The R2 custom domain serves images independently.
- The raw image must be fully uploaded to R2 before the segment fetch is issued (guaranteed by the sequential pipeline).

## Project Structure

```
illustrations-generator/
├── src/
│   ├── index.ts                ← Worker entry point (route handler)
│   ├── pipeline.ts             ← Orchestrates the sequential pipeline
│   ├── ai/
│   │   ├── prompt-enhancer.ts  ← Gemini text model: expand prompt + style rules
│   │   └── image-generator.ts  ← Gemini image model: generate image from enhanced prompt
│   ├── styles/
│   │   └── index.ts            ← Style definitions map
│   └── storage/
│       └── r2.ts               ← R2 upload helper, public URL builder
├── wrangler.jsonc
├── package.json
└── tsconfig.json
```

## TypeScript Env Interface

```typescript
interface Env {
  // R2 binding
  IMAGES_BUCKET: R2Bucket;
  // Secrets (set via wrangler secret put)
  GEMINI_API_KEY: string;
  // Environment variables
  CLOUDFLARE_ACCOUNT_ID: string;
  AI_GATEWAY_ID: string;
  IMAGES_DOMAIN: string;
}
```

## Wrangler Configuration

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

Secrets (set via `wrangler secret put`):
- `GEMINI_API_KEY` — Google AI Studio API key

## Project Setup Notes

The existing `package.json` and `tsconfig.json` need to be reconfigured for Wrangler:
- Remove `"main": "dist/index.js"` and `"build": "tsc"` from `package.json` (Wrangler uses esbuild to compile TS)
- Add dependencies: `@google/genai`
- Add dev dependencies: `wrangler`, `@cloudflare/workers-types`
- Update `tsconfig.json` for ES modules and Workers types

## CORS

Phase 1 is a POC — no CORS headers are needed yet. The endpoint can be tested via `curl` or tools like Postman. CORS will be added when the frontend preview UI is built in Phase 3.

## Access Control

Phase 1 has no authentication. The endpoint is open. This is acceptable for a POC with limited use, but should be addressed before any broader deployment. A simple shared-secret header (`X-API-Key`) is recommended for Phase 2.

## Error Handling (POC Level)

- Each pipeline step is wrapped in try/catch
- On failure, return JSON error with the step name and error message
- No partial cleanup — leftover R2 objects from failed runs are harmless
- No retries in Phase 1

## Out of Scope (Future Phases)

- **Phase 2:** HTML template compositing with Browser Rendering (Puppeteer)
- **Phase 3:** Frontend preview UI with approve/reject workflow
- **Future:** Queue-based async pipeline, retry logic, rate limiting, authentication