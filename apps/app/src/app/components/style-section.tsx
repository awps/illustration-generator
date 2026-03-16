import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronRightIcon } from 'lucide-react'

export function StyleSection({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <Collapsible className="border-b border-sidebar-border">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-muted/50">
        <ChevronRightIcon className="size-3.5 transition-transform [[data-state=open]_&]:rotate-90" />
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="ml-auto text-[10px] text-muted-foreground">{selected.length}</span>
        )}
      </CollapsibleTrigger>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-2 [[data-state=open]_&]:hidden">
          {selected.map((s) => (
            <span key={s} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {s}
            </span>
          ))}
        </div>
      )}
      <CollapsibleContent>
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {options.map((option) => {
            const isSelected = selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}