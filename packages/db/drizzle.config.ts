import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/platform-schema.ts',
  out: './drizzle/platform',
  dialect: 'sqlite',
})