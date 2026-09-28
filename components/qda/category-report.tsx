'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { codedText } from '@/lib/qda/analysis'
import { buildReport } from '@/lib/qda/hierarchy'
import type { Coding, Project } from '@/lib/qda/types'
import { NativeSelect } from './native-select'

type Paper = 'A4' | 'letter'

const PAPER_MM: Record<Paper, { w: number; h: number; label: string }> = {
  A4: { w: 297, h: 210, label: 'A4 横' },
  letter: { w: 279.4, h: 215.9, label: 'レター 横' },
}

function numberLabel(project: Project, c: Coding) {
  const doc = project.documents.find((d) => d.id === c.docId)
  const a = doc?.utterances[c.start.u]?.number ?? '?'
  const b = doc?.utterances[c.end.u]?.number
  return { doc: doc?.name ?? '', num: b && c.end.u !== c.start.u ? `${a}–${b}` : a }
}

export function CategoryReport({ project, onClose }: { project: Project; onClose: () => void }) {
  const [paper, setPaper] = useState<Paper>('A4')
  const groups = buildReport(project)
  const size = PAPER_MM[paper]
  const multiDoc = project.documents.length > 1
  const today = new Date().toLocaleDateString('ja-JP')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('printing-report')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('printing-report')
    }
  }, [onClose])

  return createPortal(
    <div
      id="print-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      className="fixed inset-0 z-50 flex flex-col bg-muted print:static print:block print:bg-transparent"
    >
      <style>{`@page { size: ${paper === 'A4' ? 'A4' : 'letter'} landscape; margin: 20mm; }`}</style>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 print:hidden">
        <span className="text-sm font-medium">カテゴリ・コード一覧</span>
        <NativeSelect aria-label="用紙サイズ" value={paper} onChange={(e) => setPaper(e.target.value as Paper)}>
          <option value="A4">A4 横（余白20mm）</option>
          <option value="letter">レター 横（余白20mm）</option>
        </NativeSelect>
        <span className="hidden text-xs text-muted-foreground md:inline">
          PDFにする場合は、印刷画面で「PDFに保存」を選んでください。
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => window.print()}>
            <Printer data-icon="inline-start" />
            印刷・PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="閉じる">
            <X />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <article
          className="report-sheet mx-auto bg-card text-foreground shadow-sm print:shadow-none"
          style={{ width: `${size.w}mm`, minHeight: `${size.h}mm`, padding: '20mm' }}
        >
          <header className="mb-4 flex items-end justify-between gap-4 border-b border-foreground pb-2">
            <div>
              <h1 id="report-title" className="text-lg font-bold">
                カテゴリ・コード一覧
              </h1>
              <p className="text-xs text-muted-foreground">{project.name}</p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {size.label} ・ {today} ・ カテゴリ {groups.filter((g) => g.category).length} ・ コード{' '}
              {project.codes.filter((c) => c.kind !== 'category').length} ・ 付与 {project.codings.length}
            </p>
          </header>

          <table className="report-table w-full border-collapse text-[11px] leading-snug">
            <colgroup>
              <col style={{ width: '13%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: multiDoc ? '11%' : '8%' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                {['カテゴリ', 'カテゴリ定義', 'コード', '発言番号', '付された文章'].map((h) => (
                  <th key={h} scope="col" className="border border-foreground/60 bg-muted px-2 py-1 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g, gi) => {
              const rows = g.codes.flatMap((rc) =>
                rc.codings.length ? rc.codings.map((c) => ({ rc, c })) : [{ rc, c: null as Coding | null }],
              )
              if (rows.length === 0) rows.push({ rc: { code: null, depth: 0, codings: [] }, c: null })
              let prevCode: unknown = Symbol()
              return (
                <tbody key={g.category?.id ?? `none-${gi}`} className="report-group">
                  {rows.map(({ rc, c }, ri) => {
                    const firstOfCode = rc !== prevCode
                    prevCode = rc
                    const n = c ? numberLabel(project, c) : null
                    return (
                      <tr key={c?.id ?? `${ri}`}>
                        {ri === 0 && (
                          <>
                            <th
                              scope="rowgroup"
                              rowSpan={rows.length}
                              className="border border-foreground/60 px-2 py-1 text-left align-top font-bold"
                            >
                              <span className="flex items-start gap-1.5">
                                {g.category && (
                                  <span aria-hidden className="mt-1 size-2 shrink-0 rounded-sm" style={{ backgroundColor: g.category.color }} />
                                )}
                                {g.path}
                              </span>
                            </th>
                            <td rowSpan={rows.length} className="border border-foreground/60 px-2 py-1 align-top whitespace-pre-wrap">
                              {g.category ? g.category.definition || '（未定義）' : '—'}
                            </td>
                          </>
                        )}
                        {firstOfCode && (
                          <td
                            rowSpan={Math.max(1, rc.codings.length)}
                            className="border border-foreground/60 px-2 py-1 align-top"
                          >
                            {rc.code ? (
                              <span className="flex items-start gap-1.5" style={{ paddingLeft: rc.depth * 10 }}>
                                <span aria-hidden className="mt-1 size-2 shrink-0 rounded-sm" style={{ backgroundColor: rc.code.color }} />
                                <span>
                                  {rc.depth > 0 && '└ '}
                                  {rc.code.name}
                                  <span className="block text-[10px] text-muted-foreground">{rc.codings.length}件</span>
                                </span>
                              </span>
                            ) : rc.codings.length ? (
                              <span className="text-muted-foreground">（カテゴリに直接付与）</span>
                            ) : (
                              <span className="text-muted-foreground">（コードなし）</span>
                            )}
                          </td>
                        )}
                        <td className="border border-foreground/60 px-2 py-1 align-top font-mono whitespace-nowrap">
                          {n ? (
                            <>
                              {multiDoc && <span className="block font-sans text-[10px] text-muted-foreground">{n.doc}</span>}#{n.num}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="border border-foreground/60 px-2 py-1 align-top">
                          {c ? (
                            <>
                              {codedText(project, c)}
                              {rc.code && (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  〔{rc.code.degrees.find((d) => d.level === c.degree)?.label ?? `度合い${c.degree}`}〕
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              )
            })}
          </table>
        </article>
      </div>
    </div>,
    document.body,
  )
}
