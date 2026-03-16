import { Hono } from 'hono'
import { parseCookies } from '@eleming/shared'
import { loginPage } from './templates/login'
import { registerPage } from './templates/register'
import { shellPage } from './templates/shell'

type Env = {
  Bindings: {
    API: Fetcher
    ASSETS: Fetcher
    API_URL: string
    API_INTERNAL_URL?: string
  }
}

/** In Docker, Service Bindings don't work across containers.
 *  When API_INTERNAL_URL is set, use direct HTTP instead. */
function fetchAPI(env: Env['Bindings'], url: string, init?: RequestInit): Promise<Response> {
  if (env.API_INTERNAL_URL) {
    const path = new URL(url).pathname
    return fetch(`${env.API_INTERNAL_URL}${path}`, init)
  }
  return env.API.fetch(url, init)
}

const app = new Hono<Env>()

// Auth pages — always accessible
app.get('/auth/login', (c) => {
  return c.html(loginPage())
})

app.get('/auth/register', (c) => {
  return c.html(registerPage())
})

// POST /auth/login — form submission, call API via Service Binding
app.post('/auth/login', async (c) => {
  const formData = await c.req.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetchAPI(c.env,'https://api.eleming.com/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const body = await res.json() as { message?: string }
    return c.html(loginPage(body.message ?? 'Invalid credentials'), 401)
  }

  // Forward the Set-Cookie from API response
  const setCookie = res.headers.get('Set-Cookie')
  if (setCookie) {
    c.header('Set-Cookie', setCookie)
  }

  return c.redirect('/')
})

// POST /auth/register — form submission
app.post('/auth/register', async (c) => {
  const formData = await c.req.formData()
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetchAPI(c.env,'https://api.eleming.com/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  if (!res.ok) {
    const body = await res.json() as { message?: string }
    return c.html(registerPage(body.message ?? 'Registration failed'), 400)
  }

  const setCookie = res.headers.get('Set-Cookie')
  if (setCookie) {
    c.header('Set-Cookie', setCookie)
  }

  return c.redirect('/')
})

// POST /auth/logout
app.post('/auth/logout', async (c) => {
  const cookie = c.req.header('cookie') ?? ''
  await fetchAPI(c.env,'https://api.eleming.com/v1/auth/logout', {
    method: 'POST',
    headers: { 'Cookie': cookie },
  })

  return c.redirect('/auth/login')
})

// Serve static assets without auth check
app.get('/assets/*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw)
  }
  // Fallback for local dev (no ASSETS binding) — serve from built files
  const url = new URL(c.req.url)
  const filePath = `dist/client${url.pathname}`
  try {
    const file = await import('node:fs/promises').then(fs => fs.readFile(filePath))
    const ext = url.pathname.split('.').pop()
    const types: Record<string, string> = { js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png' }
    return new Response(file, { headers: { 'Content-Type': types[ext ?? ''] ?? 'application/octet-stream' } })
  } catch {
    return c.notFound()
  }
})

// All other routes — auth gate
app.all('*', async (c) => {
  const cookieHeader = c.req.header('cookie') ?? ''
  const cookies = parseCookies(cookieHeader)

  if (!cookies['session']) {
    return c.redirect('/auth/login')
  }

  // Validate session by calling API
  const res = await fetchAPI(c.env,'https://api.eleming.com/v1/user', {
    headers: { 'Cookie': cookieHeader },
  })

  if (!res.ok) {
    return c.redirect('/auth/login')
  }

  // Serve SPA shell for all authenticated routes
  return c.html(shellPage(c.env.API_URL))
})

export default app