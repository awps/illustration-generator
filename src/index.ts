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
