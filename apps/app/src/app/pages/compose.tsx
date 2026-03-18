import { useParams, Link } from 'react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ComposePage() {
  const { projectId, generationId } = useParams()

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/projects/${projectId}`}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">Compose — {generationId?.slice(0, 8)}</span>
      </header>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Canvas editor placeholder
      </div>
    </div>
  )
}
