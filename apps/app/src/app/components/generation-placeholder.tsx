import { useEffect, useState } from 'react'
import { LoaderIcon } from 'lucide-react'

const DURATION_MS = 30_000

export function GenerationPlaceholder({ prompt, error }: { prompt: string; error?: string }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (error) return
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.min(elapsed / DURATION_MS, 0.95))
    }, 200)
    return () => clearInterval(interval)
  }, [error])

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card">
      <div className="flex aspect-square items-center justify-center bg-muted/30">
        {error ? (
          <p className="px-4 text-center text-xs text-destructive">{error}</p>
        ) : (
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium">{prompt}</p>
      </div>
      {!error && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-200" style={{ width: `${progress * 100}%` }} />
      )}
    </div>
  )
}