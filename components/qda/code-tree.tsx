'use client'

import { useState } from 'react'
import { FileText, FolderTree, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { descendantIds, isCategory, rootCodes } from '@/lib/qda/hierarchy'
import { useActiveProject, useUI } from '@/lib/qda/store'
import type { Code, CodeKind, Project } from '@/lib/qda/types'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { CategoryReport } from './category-report'
import { CodeDialog } from './code-dialog'

interface DialogState {
  open: boolean
  codeId: string | null
  parentId?: string | null
  kind?: CodeKind
}

export function CodeTree() {
  const project = useActiveProject()
  const [dialog, setDialog] = useState<DialogState>({ open: false, codeId: null })
  const [report, setReport] = useState(false)
  const t = useT()
  if (!project) return null
  const roots = rootCodes(project.codes)

  return (
    <section className="flex flex-col gap-2" aria-labelledby="code-heading">
      <div className="flex items-center justify-between gap-1">
        <h2 id="code-heading" className="text-xs font-medium tracking-wide text-muted-foreground">
          {t('コードシステム')}
        </h2>
        <div className="flex">
          <Button size="xs" variant="ghost" onClick={() => setDialog({ open: true, codeId: null, kind: 'category' })}>
            <Plus data-icon="inline-start" />
            {t('カテゴリ')}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDialog({ open: true, codeId: null, kind: 'code' })}>
            <Plus data-icon="inline-start" />
            {t('コード')}
          </Button>
        </div>
      </div>
      <ul role="tree" aria-label={t('コードシステム')} className="flex flex-col">
        {roots.map((c) => (
          <CodeNode
            key={c.id}
            code={c}
            project={project}
            depth={0}
            onEdit={(id) => setDialog({ open: true, codeId: id })}
            onAddChild={(id) => setDialog({ open: true, codeId: null, parentId: id, kind: 'code' })}
          />
        ))}
      </ul>
      {project.codes.length === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('コードを定義するか、本文を選択してその場で新しいコードを作成できます。')}
        </p>
      )}
      {project.codes.length > 0 && (
        <Button size="sm" variant="outline" className="mt-1" onClick={() => setReport(true)}>
          <FileText data-icon="inline-start" />
          {t('カテゴリ・コード一覧作成')}
        </Button>
      )}
      <CodeDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        codeId={dialog.codeId}
        defaultParentId={dialog.parentId}
        defaultKind={dialog.kind}
      />
      {report && <CategoryReport project={project} onClose={() => setReport(false)} />}
    </section>
  )
}

function CodeNode({
  code,
  project,
  depth,
  onEdit,
  onAddChild,
}: {
  code: Code
  project: Project
  depth: number
  onEdit: (id: string) => void
  onAddChild: (id: string) => void
}) {
  const { focusCodeId, setFocusCode, setPanelTab } = useUI()
  const t = useT()
  const children = project.codes.filter((c) => c.parentId === code.id)
  const category = isCategory(code)
  const scope = category ? descendantIds(project.codes, code.id) : new Set([code.id])
  const counts = [1, 2, 3].map((d) => project.codings.filter((c) => scope.has(c.codeId) && c.degree === d).length)
  const total = counts[0] + counts[1] + counts[2]
  const active = focusCodeId === code.id

  return (
    <li role="treeitem" aria-selected={active} aria-expanded={children.length ? true : undefined}>
      <div className="group flex items-center" style={{ paddingLeft: depth * 14 }}>
        <button
          type="button"
          title={code.definition}
          onClick={() => {
            setFocusCode(active ? null : code.id)
            setPanelTab('segments')
          }}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent',
            active && 'bg-sidebar-accent font-medium',
            category && 'font-semibold',
          )}
        >
          {category ? (
            <FolderTree aria-hidden className="size-3.5 shrink-0" style={{ color: code.color }} />
          ) : (
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: code.color }} />
          )}
          <span className="truncate">{code.name}</span>
          {category && <span className="sr-only">{t('（カテゴリ）')}</span>}
          <span
            className="ml-auto flex items-center gap-1 font-mono text-xs font-normal text-muted-foreground"
            title={t(category ? '含むコードの付与件数（度合い1/2/3）' : '度合い1/2/3の件数')}
          >
            {total > 0 && (
              <span className="flex h-3 items-stretch gap-px" aria-hidden>
                {counts.map((n, i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{ width: i + 1, backgroundColor: code.color, opacity: n ? 1 : 0.2 }}
                  />
                ))}
              </span>
            )}
            {category ? `Σ${total}` : total}
          </span>
        </button>
        <Button
          size="icon-xs"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t('{name}に下位コードを追加', { name: code.name })}
          onClick={() => onAddChild(code.id)}
        >
          <Plus />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t('{name}を編集', { name: code.name })}
          onClick={() => onEdit(code.id)}
        >
          <Pencil />
        </Button>
      </div>
      {children.length > 0 && (
        <ul role="group" className="flex flex-col">
          {children.map((c) => (
            <CodeNode key={c.id} code={c} project={project} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} />
          ))}
        </ul>
      )}
    </li>
  )
}
