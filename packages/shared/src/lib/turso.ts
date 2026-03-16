import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

export function createSiteDB(config: { url: string; authToken: string }) {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  })
  return drizzle(client)
}