'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { blankCode, useActiveProject, useProjects, useUI } from '@/lib/qda/store'
import { DEGREE_WIDTH, type Degree, type TextPos } from '@/lib/qda/types'
import { cn } from '@/lib/utils'

export interface PendingSelection {
  start: TextPos
  end: TextPos
  text: string
  x: number
  y: number
}

export function CodingToolbar({ pending, onClose }: { pending: PendingSelection; onClose: () => void }) {
  const project = useActiveProject()!
  const { addCoding, addCode, activeDocId } = useProjects()
  const focusCodeId = useUI((s) => s.focusCodeId)
  const [codeId, setCodeId] = useState<string | null>(focusCodeId ?? project.codes[0]?.id ?? null)
  const [degree, setDegree] = useState<Degree>(2)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const code = project.codes.find((c) => c.id === codeId)
  const list = project.codes.filter((c) => c.kind !== 'category' && c.name.includes(filter.trim()))
  const canCreate = filter.trim() && !project.codes.some((c) => c.name === filter.trim())

  const apply = (targetCodeId: string) => {
    if (!activeDocId) return
    addCoding({ docId: activeDocId, codeId: targetCodeId, degree, start: pending.start, end: pending.end })
    window.getSelection()?.removeAllRanges()
    onClose()
  }

  const width = 300
  const left = Math.max(8, Math.min(pending.x, window.innerWidth - width - 8))
  const top = Math.min(pending.y + 8, window.innerHeight - 380)

  return (
    <div
      role="dialog"
      aria-label="コードを付す"
      className="fixed z-40 flex flex-col gap-2 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg"
      style={{ left, top: Math.max(8, top), width }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
          {'「'}
          {pending.text}
          {'」'}
          <span className="font-mono">
            {' '}
            #{pending.start.u + 1}
            {pending.end.u !== pending.start.u && `–${pending.end.u + 1}`}
          </span>
        </p>
        <Button size="icon-xs" variant="ghost" aria-label="閉じる" onClick={onClose}>
          <X />
        </Button>
      </div>

      <Input
        autoFocus
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.keyCode === 229) return
          e.preventDefault()
          if (canCreate) {
            const id = addCode({ ...blankCode(project.codes), name: filter.trim() })
            apply(id)
          } else if (list[0]) apply(list[0].id)
        }}
        placeholder="コードを検索／新規作成"
        className="h-7 text-sm"
      />

      <ul className="flex max-h-40 flex-col overflow-y-auto" role="listbox" aria-label="コード">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              role="option"
              aria-selected={c.id === codeId}
              onClick={() => setCodeId(c.id)}
              onDoubleClick={() => apply(c.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted',
                c.id === codeId && 'bg-secondary font-medium',
              )}
            >
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} />
              <span className="truncate">{c.name}</span>
            </button>
          </li>
        ))}
        {canCreate && (
          <li>
            <button
              type="button"
              onClick={() => apply(addCode({ ...blankCode(project.codes), name: filter.trim() }))}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-primary hover:bg-muted"
            >
              <Plus className="size-3.5" aria-hidden />
              {'「'}
              {filter.trim()}
              {'」を作成して付す'}
            </button>
          </li>
        )}
      </ul>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs text-muted-foreground">度合い</legend>
        <div className="grid grid-cols-3 gap-1">
          {([1, 2, 3] as Degree[]).map((d) => {
            const def = code?.degrees.find((x) => x.level === d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={degree === d}
                title={def?.description}
                onClick={() => setDegree(d)}
                className="flex items-center gap-1.5 rounded-md border border-border px-1.5 py-1 text-xs aria-pressed:border-primary aria-pressed:bg-secondary"
              >
                <span
                  aria-hidden
                  className="h-4 rounded-full"
                  style={{ width: DEGREE_WIDTH[d], backgroundColor: code?.color ?? 'currentColor' }}
                />
                <span className="truncate">{def?.label ?? d}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <Button size="sm" disabled={!codeId} onClick={() => codeId && apply(codeId)}>
        コードを付す
      </Button>
    </div>
  )
}
