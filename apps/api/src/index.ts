import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import { platformAuth } from './middleware/auth'
import { auth } from './routes/auth'
import { projectsRouter } from './routes/projects'
import { generateRouter } from './routes/generate'
import { generationsRouter } from './routes/generations'
import { palettesRouter } from './routes/palettes'
import { user } from './routes/user'

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
app.use('/v1/*', platformAuth)
app.route('/v1/projects', projectsRouter)
app.route('/v1/generate', generateRouter)
app.route('/v1', generationsRouter)
app.route('/v1/palettes', palettesRouter)
app.route('/v1/user', user)

export default app
