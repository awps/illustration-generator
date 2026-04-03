import { Hono } from 'hono'
import type { Env } from './types'
import { platformAuth } from './middleware/auth'
import { auth } from './routes/auth'
import { projectsRouter } from './routes/projects'
import { generationsRouter } from './routes/generations'
import { palettesRouter } from './routes/palettes'
import { user } from './routes/user'
import { composeTemplatesRouter } from './routes/compose-templates'
import { preferencesRouter } from './routes/preferences'

const app = new Hono<Env>()

app.get('/v1/health', (c) => c.json({ status: 'ok' }))

// Public auth routes
app.route('/v1/auth', auth)

// Authenticated routes
app.use('/v1/*', platformAuth)
app.route('/v1/projects', projectsRouter)
app.route('/v1', generationsRouter)
app.route('/v1/palettes', palettesRouter)
app.route('/v1/user', user)
app.route('/v1/compose-templates', composeTemplatesRouter)
app.route('/v1', preferencesRouter)

export default app