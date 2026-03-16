export type Env = {
  Bindings: {
    PLATFORM_DB: D1Database
    MAGIC_TOKEN_SECRET: string
    COOKIE_DOMAIN: string
    APP_ORIGIN: string
    TURSO_ORG: string
    TURSO_GROUP: string
    TURSO_API_TOKEN: string
    SITE_BASE_DOMAIN: string
  }
  Variables: {
    userId: string
    userRole: string
  }
}