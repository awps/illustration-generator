export interface GenerationEnv {
  IMAGES_BUCKET: R2Bucket
  GEMINI_API_KEY: string
  CLOUDFLARE_ACCOUNT_ID: string
  AI_GATEWAY_ID: string
  IMAGES_DOMAIN: string
}

export type Env = {
  Bindings: GenerationEnv & {
    PLATFORM_DB: D1Database
    COOKIE_DOMAIN: string
    APP_ORIGIN: string
  }
  Variables: {
    userId: string
    userRole: string
  }
}
