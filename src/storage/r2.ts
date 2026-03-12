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
