import { useState, useEffect, useCallback, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  type CompositeTemplate,
  type SavedTemplate,
  type TemplateConfig,
} from '@/lib/compose-templates'
import { apiFetch } from '@/lib/api'
import { SaveIcon, Trash2Icon, PencilIcon, CheckIcon, MoreHorizontalIcon } from 'lucide-react'

type Visibility = 'project' | 'personal' | 'public'

// --- Template preview card ---

function TemplatePreviewCard({
  template,
  isActive,
  onClick,
}: {
  template: SavedTemplate
  isActive: boolean
  onClick: () => void
}) {
  const { width, height, name, thumbnail } = template
  const aspect = width / height

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-lg border-2 text-left transition-colors ${
        isActive ? 'border-primary' : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="relative w-full" style={{ paddingBottom: `${(1 / aspect) * 100}%` }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-muted/50" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
          <p className="truncate text-[11px] font-medium leading-tight text-white">{name}</p>
          <p className="text-[9px] leading-tight text-white/60">{width}&times;{height}</p>
        </div>
      </div>
    </button>
  )
}

// --- Template picker ---

interface TemplatePickerProps {
  activeId: string
  projectId: string
  keepStyle: boolean
  onKeepStyleChange: (value: boolean) => void
  onSelect: (template: CompositeTemplate) => void
  onGetTemplateConfig: () => TemplateConfig
  onGetThumbnail: () => string | null
}

export function TemplatePicker({ activeId, projectId, keepStyle, onKeepStyleChange, onSelect, onGetTemplateConfig, onGetThumbnail }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [tab, setTab] = useState<Visibility>('personal')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Save dialog state
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveVisibility, setSaveVisibility] = useState<Visibility>('personal')
  const [savePending, setSavePending] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch templates for current tab
  const fetchTemplates = useCallback(async (cursor?: string) => {
    if (!projectId) return
    setLoading(true)
    const params = new URLSearchParams({ projectId, tab })
    if (cursor) params.set('cursor', cursor)
    try {
      const res = await apiFetch(`/v1/compose-templates?${params}`)
      const data = await res.json()
      const fetched = data.templates ?? []
      setTemplates((prev) => cursor ? [...prev, ...fetched] : fetched)
      setNextCursor(data.nextCursor ?? null)
    } catch { /* ignore */ }
    setLoading(false)
  }, [projectId, tab])

  // Reset + fetch when tab changes
  useEffect(() => {
    setTemplates([])
    setNextCursor(null)
    fetchTemplates()
  }, [fetchTemplates])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loading) {
          fetchTemplates(nextCursor)
        }
      },
      { root: listRef.current, threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [nextCursor, loading, fetchTemplates])

  const handleSave = useCallback(async () => {
    if (!saveName.trim() || savePending) return
    setSavePending(true)
    const config = onGetTemplateConfig()
    const thumbnail = onGetThumbnail()
    const res = await apiFetch('/v1/compose-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveName.trim(),
        width: config.width,
        height: config.height,
        layers: config.layers,
        projectId: saveVisibility === 'project' ? projectId : undefined,
        visibility: saveVisibility,
        thumbnail,
      }),
    })
    setSavePending(false)
    if (!res.ok) return
    const { template } = await res.json()
    // Add to list if it matches current tab
    if (saveVisibility === tab) {
      setTemplates((prev) => [template, ...prev])
    }
    setSaveOpen(false)
    setSaveName('')
  }, [saveName, saveVisibility, savePending, projectId, tab, onGetTemplateConfig, onGetThumbnail])

  const handleDelete = useCallback(async (id: string) => {
    const res = await apiFetch(`/v1/compose-templates/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    setMenuOpenId(null)
  }, [])

  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return
    const res = await apiFetch(`/v1/compose-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    if (!res.ok) return
    const { template } = await res.json()
    setTemplates((prev) => prev.map((t) => (t.id === id ? template : t)))
    setEditingId(null)
  }, [editName])

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header: title + toggle + tabs */}
      <div className="shrink-0 border-b border-sidebar-border px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Templates</Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Switch
                id="keep-style"
                checked={keepStyle}
                onCheckedChange={onKeepStyleChange}
              />
              <label htmlFor="keep-style" className="cursor-pointer text-[10px] text-muted-foreground">
                Keep bg
              </label>
            </div>
            <Button size="icon-xs" variant="outline" onClick={() => setSaveOpen(true)}>
              <SaveIcon className="size-3" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Visibility)} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="project" className="text-[10px]">Project</TabsTrigger>
            <TabsTrigger value="personal" className="text-[10px]">Personal</TabsTrigger>
            <TabsTrigger value="public" className="text-[10px]">Public</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable template list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-2">
        {templates.length > 0 && (
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <div key={t.id} className="group relative">
                {editingId === t.id ? (
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => { e.preventDefault(); handleRename(t.id) }}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 flex-1 px-1 text-xs"
                      autoFocus
                      onBlur={() => setEditingId(null)}
                    />
                    <Button type="submit" size="icon-xs" variant="ghost" className="size-5"
                      onMouseDown={(e) => e.preventDefault()}>
                      <CheckIcon className="size-3" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <TemplatePreviewCard
                      template={t}
                      isActive={activeId === t.id}
                      onClick={() => onSelect(t)}
                    />
                    <div className="absolute right-2 top-2">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="size-5 bg-black/40 text-white opacity-0 backdrop-blur-sm hover:bg-black/60 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === t.id ? null : t.id)
                        }}
                      >
                        <MoreHorizontalIcon className="size-3" />
                      </Button>
                      {menuOpenId === t.id && (
                        <div className="absolute right-0 top-6 z-10 flex flex-col rounded-md border bg-popover p-1 shadow-md">
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-muted"
                            onClick={() => {
                              setEditingId(t.id)
                              setEditName(t.name)
                              setMenuOpenId(null)
                            }}
                          >
                            <PencilIcon className="size-3" /> Rename
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-destructive hover:bg-muted"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2Icon className="size-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {templates.length === 0 && !loading && (
          <p className="py-4 text-center text-[10px] text-muted-foreground">No templates yet.</p>
        )}

        {loading && (
          <p className="py-2 text-center text-[10px] text-muted-foreground">Loading...</p>
        )}

        {/* Load more button + infinite scroll sentinel */}
        {nextCursor && !loading && (
          <Button
            size="xs"
            variant="ghost"
            className="mt-1 w-full text-[10px] text-muted-foreground"
            onClick={() => fetchTemplates(nextCursor)}
          >
            Load more
          </Button>
        )}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Template name"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            />
            <div className="flex items-center gap-2">
              {(['project', 'personal', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSaveVisibility(v)}
                  className={`flex-1 rounded-md border py-1 text-xs capitalize ${
                    saveVisibility === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {v === 'project' ? 'Project' : v === 'personal' ? 'Personal' : 'Public'}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!saveName.trim() || savePending} className="w-full">
              {savePending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
