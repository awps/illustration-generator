import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Layer } from '@/lib/layer-types'
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Trash2Icon,
  ImageIcon,
  TypeIcon,
  SquareIcon,
  HeadingIcon,
  PencilIcon,
  CheckIcon,
  PlusIcon,
  ImagePlusIcon,
} from 'lucide-react'

const TYPE_ICONS: Record<Layer['type'], typeof ImageIcon> = {
  background: SquareIcon,
  illustration: ImageIcon,
  title: HeadingIcon,
  text: TypeIcon,
  image: ImagePlusIcon,
}

interface LayerPanelProps {
  layers: Layer[]
  activeLayerId: string | null
  onSelect: (layerId: string) => void
  onToggleVisibility: (layerId: string) => void
  onToggleLock: (layerId: string) => void
  onMoveUp: (layerId: string) => void
  onMoveDown: (layerId: string) => void
  onDelete: (layerId: string) => void
  onRename: (layerId: string, name: string) => void
  onAddElement?: (type: 'text' | 'image') => void
}

export function LayerPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRename,
  onAddElement,
}: LayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  // Reverse z-order: topmost layer first (matching Figma/Photoshop)
  const reversed = [...layers].reverse()

  const startEditing = (layer: Layer) => {
    setEditingId(layer.id)
    setEditValue(layer.name)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="border-b border-sidebar-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs font-medium">Layers</Label>
        <div className="relative">
          <Button size="icon-xs" variant="outline" onClick={() => setAddMenuOpen(!addMenuOpen)}>
            <PlusIcon className="size-3" />
          </Button>
          {addMenuOpen && (
            <div className="absolute right-0 top-6 z-10 flex flex-col rounded-md border bg-popover p-1 shadow-md">
              <button
                type="button"
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-muted"
                onClick={() => {
                  onAddElement?.('text')
                  setAddMenuOpen(false)
                }}
              >
                <TypeIcon className="size-3" /> Text
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-muted"
                onClick={() => {
                  onAddElement?.('image')
                  setAddMenuOpen(false)
                }}
              >
                <ImagePlusIcon className="size-3" /> Image
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        {reversed.map((layer) => {
          const Icon = TYPE_ICONS[layer.type]
          const isActive = layer.id === activeLayerId
          const isBackground = layer.type === 'background'
          const isDeletable = layer.type === 'text' || layer.type === 'image'
          const isRenamable = layer.type === 'text' || layer.type === 'title' || layer.type === 'image'
          const isEditing = editingId === layer.id

          return (
            <div
              key={layer.id}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                isActive
                  ? 'border border-primary/50 bg-primary/10'
                  : 'border border-transparent hover:bg-muted/50'
              } ${!layer.visible ? 'opacity-50' : ''}`}
              onClick={() => onSelect(layer.id)}
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />

              {isEditing ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    commitEdit()
                  }}
                >
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-5 min-w-0 flex-1 px-1 text-xs"
                    autoFocus
                    onBlur={commitEdit}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    type="submit"
                    size="icon-xs"
                    variant="ghost"
                    className="size-5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CheckIcon className="size-3" />
                  </Button>
                </form>
              ) : (
                <span className="min-w-0 flex-1 truncate">{layer.name}</span>
              )}

              <div className="flex shrink-0 items-center gap-0.5">
                {isRenamable && !isEditing && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(layer)
                    }}
                  >
                    <PencilIcon className="size-3" />
                  </Button>
                )}

                {!isBackground && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVisibility(layer.id)
                    }}
                  >
                    {layer.visible ? (
                      <EyeIcon className="size-3" />
                    ) : (
                      <EyeOffIcon className="size-3" />
                    )}
                  </Button>
                )}

                {!isBackground && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleLock(layer.id)
                    }}
                  >
                    {layer.locked ? (
                      <LockIcon className="size-3" />
                    ) : (
                      <UnlockIcon className="size-3" />
                    )}
                  </Button>
                )}

                {!isBackground && (
                  <>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="size-5"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveUp(layer.id)
                      }}
                    >
                      <ChevronUpIcon className="size-3" />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="size-5"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveDown(layer.id)
                      }}
                    >
                      <ChevronDownIcon className="size-3" />
                    </Button>
                  </>
                )}

                {isDeletable && (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="size-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(layer.id)
                    }}
                  >
                    <Trash2Icon className="size-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
