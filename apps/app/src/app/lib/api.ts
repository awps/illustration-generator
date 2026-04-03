export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`/api${path}`, init)
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
  placements: string | null
  moods: string | null
  complexities: string | null
  layouts: string | null
  subjects: string | null
  iconStyles: string | null
  storagePath: string
  paletteColors: string[] | null
  createdAt: string
}