'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileSpreadsheet, FileText, Printer, X } from 'lucide-react'
import { downloadReportCsv, downloadReportXlsx, reportTable } from '@/lib/qda/report-export'
import { Button } from '@/components/ui/button'
import { codedText } from '@/lib/qda/analysis'
import { buildReport } from '@/lib/qda/hierarchy'
import type { Coding, Project } from '@/lib/qda/types'
import { NativeSelect } from './native-select'
import { useLocale, useT } from '@/lib/i18n'

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
  const t = useT()
  const lang = useLocale((s) => s.locale)
  const groups = buildReport(project)
  const size = PAPER_MM[paper]
  const multiDoc = project.documents.length > 1
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')
  const [xlsxBusy, setXlsxBusy] = useState(false)
  const exportName = () =>
    `${project.name}_${t('カテゴリ・コード一覧')}_${new Date().toISOString().slice(0, 10)}`.replace(/[\\/:*?"<>|\s]+/g, '_')

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
        <span className="text-sm font-medium">{t('カテゴリ・コード一覧')}</span>
        <NativeSelect aria-label={t('用紙サイズ')} value={paper} onChange={(e) => setPaper(e.target.value as Paper)}>
          <option value="A4">{t('A4 横（余白20mm）')}</option>
          <option value="letter">{t('レター 横（余白20mm）')}</option>
        </NativeSelect>
        <span className="hidden text-xs text-muted-foreground md:inline">
          {t('PDFにする場合は、印刷画面で「PDFに保存」を選んでください。')}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadReportCsv(reportTable(project, t), exportName())}
          >
            <FileText data-icon="inline-start" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={xlsxBusy}
            onClick={async () => {
              setXlsxBusy(true)
              try {
                await downloadReportXlsx(reportTable(project, t), exportName(), t('カテゴリ・コード一覧'))
              } finally {
                setXlsxBusy(false)
              }
            }}
          >
            <FileSpreadsheet data-icon="inline-start" />
            {xlsxBusy ? '…' : 'Excel (xlsx)'}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer data-icon="inline-start" />
            {t('印刷・PDF')}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label={t('閉じる')}>
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
                {t('カテゴリ・コード一覧')}
              </h1>
              <p className="text-xs text-muted-foreground">{project.name}</p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              {t(size.label)} ・ {today} ・ {t('カテゴリ {c} ・ コード {k} ・ 付与 {n}', {
                c: groups.filter((g) => g.category).length,
                k: project.codes.filter((c) => c.kind !== 'category').length,
                n: project.codings.length,
              })}
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
                    {t(h)}
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
                              {g.category ? g.category.definition || t('（未定義）') : '—'}
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
                                  <span className="block text-[10px] text-muted-foreground">{t('{n}件', { n: rc.codings.length })}</span>
                                </span>
                              </span>
                            ) : rc.codings.length ? (
                              <span className="text-muted-foreground">{t('（カテゴリに直接付与）')}</span>
                            ) : (
                              <span className="text-muted-foreground">{t('（コードなし）')}</span>
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
                                  〔{t(rc.code.degrees.find((d) => d.level === c.degree)?.label ?? `度合い${c.degree}`)}〕
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
