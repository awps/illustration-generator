import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { auth } from './routes/auth'
import { sitesRouter } from './routes/sites'
import { domainsRouter } from './routes/domains'
import { magic } from './routes/magic'
import { user } from './routes/user'
import { languagesRouter } from './routes/languages'

const app = new Hono<Env>()

app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.APP_ORIGIN],
    credentials: true,
  })
  return corsMiddleware(c, next)
})

app.get('/v1/health', (c) => c.json({ status: 'ok' }))

// Public auth routes
app.route('/v1/auth', auth)

// Authenticated routes
app.route('/v1/sites', sitesRouter)
app.route('/v1/sites/:siteId/domains', domainsRouter)
app.route('/v1/sites/:siteId/magic-token', magic)
app.route('/v1/sites/:siteId/languages', languagesRouter)
app.route('/v1/user', user)

export default app