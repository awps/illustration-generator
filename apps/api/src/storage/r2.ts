import { type GenerationEnv as Env } from "../types";

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
