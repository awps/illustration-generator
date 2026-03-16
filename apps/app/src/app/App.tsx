import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface Site {
  id: string
  name: string
  active: boolean
  tursoDbName: string
  tursoUrl: string
  createdAt: string
}

const apiUrl = (window as any).__CONFIG__?.apiUrl ?? 'https://api.eleming.com'

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${apiUrl}${path}`, { credentials: 'include', ...init })
}

export function App() {
  const [user, setUser] = useState<User | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [newSiteName, setNewSiteName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadSites = useCallback(async () => {
    const res = await apiFetch('/v1/sites')
    if (res.ok) {
      const data = await res.json()
      setSites(data.sites)
    }
  }, [])

  useEffect(() => {
    apiFetch('/v1/user')
      .then((res) => res.json())
      .then((data: { user: User }) => {
        setUser(data.user)
        loadSites()
      })
  }, [loadSites])

  const createSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSiteName.trim()) return

    setError('')
    setLoading(true)
    try {
      const res = await apiFetch('/v1/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Failed to create site')
        return
      }
      setNewSiteName('')
      await loadSites()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const deleteSite = async (id: string, name: string) => {
    if (!confirm(`Delete site "${name}"? This will also delete its Turso database.`)) return

    setError('')
    const res = await apiFetch(`/v1/sites/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setError(data.message ?? 'Failed to delete site')
      return
    }
    await loadSites()
  }

  if (!user) return <div style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0 }}>Eleming Dashboard</h1>
        <div>
          <span style={{ marginRight: 12 }}>{user.name} ({user.role})</span>
          <form method="POST" action="/auth/logout" style={{ display: 'inline' }}>
            <button type="submit">Logout</button>
          </form>
        </div>
      </header>

      <section>
        <h2>Sites</h2>

        <form onSubmit={createSite} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Site name (e.g. my-blog)"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            disabled={loading}
            style={{ flex: 1, padding: '8px 12px', fontSize: 14 }}
          />
          <button type="submit" disabled={loading || !newSiteName.trim()} style={{ padding: '8px 16px' }}>
            {loading ? 'Creating...' : 'Create Site'}
          </button>
        </form>

        {error && <div style={{ color: '#c00', marginBottom: 12 }}>{error}</div>}

        {sites.length === 0 ? (
          <p style={{ color: '#666' }}>No sites yet. Create one above.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>Turso DB</th>
                <th style={{ padding: 8 }}>Created</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{site.name}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ color: site.active ? '#080' : '#c00' }}>
                      {site.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 13 }}>{site.tursoDbName}</td>
                  <td style={{ padding: 8 }}>{new Date(site.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 8 }}>
                    <button
                      onClick={() => deleteSite(site.id, site.name)}
                      style={{ color: '#c00', background: 'none', border: '1px solid #c00', padding: '4px 8px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}