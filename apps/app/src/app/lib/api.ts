const apiUrl = (window as any).__CONFIG__?.apiUrl ?? 'https://api-igen.publingo.com'

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { credentials: 'include', ...init })
}

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  url: string | null
  createdAt: string
}

export interface Generation {
  id: string
  projectId: string
  prompt: string
  paletteId: string | null
  renderings: string | null
  elements: string | null
  compositions: string | null
  storagePath: string
  createdAt: string
}