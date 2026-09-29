'use client'

import { useRef, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseFile } from '@/lib/qda/parse'
import { useActiveProject, useProjects } from '@/lib/qda/store'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

export function DocumentList() {
  const project = useActiveProject()
  const { activeDocId, openDocument, addDocument, deleteDocument } = useProjects()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const t = useT()

  if (!project) return null

  const onFiles = async (files: FileList) => {
    const names: string[] = []
    for (const f of Array.from(files)) {
      const utterances = await parseFile(f)
      if (utterances.length === 0) continue
      addDocument(f.name.replace(/\.(csv|txt)$/i, ''), utterances)
      names.push(t('{name}（{n}発言）', { name: f.name, n: utterances.length }))
    }
    setMsg(names.length ? t('読み込み: {names}', { names: names.join(', ') }) : t('発言を読み取れませんでした。'))
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="doc-heading">
      <div className="flex items-center justify-between">
        <h2 id="doc-heading" className="text-xs font-medium tracking-wide text-muted-foreground">
          {t('文書')}
        </h2>
        <Button size="xs" variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload data-icon="inline-start" />
          CSV/TXT
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".csv,.txt,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      <ul className="flex flex-col">
        {project.documents.map((d) => {
          const n = project.codings.filter((c) => c.docId === d.id).length
          return (
            <li key={d.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => openDocument(d.id)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sidebar-accent',
                  d.id === activeDocId && 'bg-sidebar-accent font-medium',
                )}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {d.utterances.length}/{n}
                </span>
              </button>
              <Button
                size="icon-xs"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={t('{name}を削除', { name: d.name })}
                onClick={() => confirm(t('「{name}」とそのコード付与を削除しますか？', { name: d.name })) && deleteDocument(d.id)}
              >
                <Trash2 />
              </Button>
            </li>
          )
        })}
      </ul>
      {project.documents.length === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('発言番号・発言者・発言内容の列を持つCSV、または「番号 発言者：内容」形式のTXTを読み込んでください。')}
        </p>
      )}
      {msg && <p className="text-xs leading-relaxed text-muted-foreground">{msg}</p>}
    </section>
  )
}
