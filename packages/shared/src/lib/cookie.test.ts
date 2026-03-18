import { describe, it, expect } from 'vitest'
import { serializeCookie, parseCookies } from './cookie'

describe('serializeCookie', () => {
  it('serializes a simple cookie', () => {
    expect(serializeCookie('session', 'abc123')).toBe('session=abc123')
  })

  it('serializes with all options', () => {
    const result = serializeCookie('session', 'abc123', {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      domain: '.illustragen.com',
      path: '/',
      maxAge: 2592000,
    })
    expect(result).toBe(
      'session=abc123; HttpOnly; Secure; SameSite=Lax; Domain=.illustragen.com; Path=/; Max-Age=2592000'
    )
  })

  it('serializes with partial options', () => {
    const result = serializeCookie('locale', 'en', {
      path: '/',
      maxAge: 86400,
    })
    expect(result).toBe('locale=en; Path=/; Max-Age=86400')
  })

  it('handles Max-Age=0 for cookie deletion', () => {
    const result = serializeCookie('session', '', {
      httpOnly: true,
      secure: true,
      maxAge: 0,
    })
    expect(result).toBe('session=; HttpOnly; Secure; Max-Age=0')
  })
})

describe('parseCookies', () => {
  it('parses a cookie header with multiple cookies', () => {
    expect(parseCookies('session=abc123; locale=en')).toEqual({
      session: 'abc123',
      locale: 'en',
    })
  })

  it('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({})
  })

  it('handles cookies with = in value', () => {
    expect(parseCookies('token=abc=def=ghi')).toEqual({
      token: 'abc=def=ghi',
    })
  })

  it('trims whitespace', () => {
    expect(parseCookies('  session = abc123 ;  locale = en  ')).toEqual({
      session: 'abc123',
      locale: 'en',
    })
  })
})