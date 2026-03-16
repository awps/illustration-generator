import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { ImageIcon } from 'lucide-react'

export function NoProject({ onProjectCreated }: { onProjectCreated: () => Promise<void> }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.message ?? 'Failed to create project')
        return
      }
      const { project } = await res.json()
      await onProjectCreated()
      navigate(`/projects/${project.id}`)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <ImageIcon className="size-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Welcome to Illustragen</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your first project to start generating illustrations.</p>
        </div>
        <form onSubmit={create} className="flex w-full gap-2">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
