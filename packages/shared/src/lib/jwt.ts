const encoder = new TextEncoder()

export interface MagicTokenPayload {
  siteId: string
  platformUserId: string
  email: string
  role: string
  exp: number
  jti: string
}

export async function signJwt(
  payload: Omit<MagicTokenPayload, 'exp' | 'jti'>,
  secret: string,
  ttlSeconds: number = 60,
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const fullPayload: MagicTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    jti: crypto.randomUUID(),
  }

  const body = btoa(JSON.stringify(fullPayload))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${body}`))
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${header}.${body}.${sig}`
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<MagicTokenPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, body, sig] = parts

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const sigBytes = Uint8Array.from(
    atob(sig!.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  )

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    encoder.encode(`${header}.${body}`),
  )

  if (!valid) return null

  const payload: MagicTokenPayload = JSON.parse(
    atob(body!.replace(/-/g, '+').replace(/_/g, '/')),
  )

  if (payload.exp < Math.floor(Date.now() / 1000)) return null

  return payload
}