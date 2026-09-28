'use client'

import { useRef, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseFile } from '@/lib/qda/parse'
import { useActiveProject, useProjects } from '@/lib/qda/store'
import { cn } from '@/lib/utils'

export function DocumentList() {
  const project = useActiveProject()
  const { activeDocId, openDocument, addDocument, deleteDocument } = useProjects()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  if (!project) return null

  const onFiles = async (files: FileList) => {
    const names: string[] = []
    for (const f of Array.from(files)) {
      const utterances = await parseFile(f)
      if (utterances.length === 0) continue
      addDocument(f.name.replace(/\.(csv|txt)$/i, ''), utterances)
      names.push(`${f.name}（${utterances.length}発言）`)
    }
    setMsg(names.length ? `読み込み: ${names.join('、')}` : '発言を読み取れませんでした。')
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="doc-heading">
      <div className="flex items-center justify-between">
        <h2 id="doc-heading" className="text-xs font-medium tracking-wide text-muted-foreground">
          文書
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
                aria-label={`${d.name}を削除`}
                onClick={() => confirm(`「${d.name}」とそのコード付与を削除しますか？`) && deleteDocument(d.id)}
              >
                <Trash2 />
              </Button>
            </li>
          )
        })}
      </ul>
      {project.documents.length === 0 && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          発言番号・発言者・発言内容の列を持つCSV、または「番号 発言者：内容」形式のTXTを読み込んでください。
        </p>
      )}
      {msg && <p className="text-xs leading-relaxed text-muted-foreground">{msg}</p>}
    </section>
  )
}
