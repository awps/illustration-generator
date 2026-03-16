import { useParams } from 'react-router'

export function ProjectDashboard() {
  const { projectId } = useParams()
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <p className="text-sm text-muted-foreground">Project: {projectId}</p>
    </div>
  )
}