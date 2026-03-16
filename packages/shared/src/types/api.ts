// Platform API types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export interface CreateSiteRequest {
  tursoUrl: string
  tursoAuthToken: string
}

export interface CreateDomainRequest {
  domain: string
  isPrimary?: boolean
}

export interface ApiError {
  error: string
  message: string
}

export interface MagicTokenResponse {
  token: string
  url: string
}