import { codedText } from './analysis'
import { buildReport } from './hierarchy'
import type { Project } from './types'

type Translate = (key: string, vars?: Record<string, string | number>) => string

export interface ReportTable {
  header: string[]
  rows: string[][]
  /** Row indexes where a new category group starts (used for styling). */
  groupStarts: Set<number>
}

export function reportTable(project: Project, t: Translate): ReportTable {
  const multiDoc = project.documents.length > 1
  const header = [
    t('カテゴリ'),
    t('カテゴリ定義'),
    t('コード'),
    ...(multiDoc ? [t('文書')] : []),
    t('発言番号'),
    t('付された文章'),
    t('度合い'),
  ]
  const rows: string[][] = []
  const groupStarts = new Set<number>()

  for (const g of buildReport(project)) {
    groupStarts.add(rows.length)
    const catDef = g.category ? g.category.definition || t('（未定義）') : ''
    const codes = g.codes.length ? g.codes : [{ code: null, depth: 0, codings: [] }]
    for (const rc of codes) {
      const codeName = rc.code
        ? `${'　'.repeat(rc.depth)}${rc.depth > 0 ? '└ ' : ''}${rc.code.name}`
        : rc.codings.length
          ? t('（カテゴリに直接付与）')
          : t('（コードなし）')
      if (rc.codings.length === 0) {
        rows.push([g.path, catDef, codeName, ...(multiDoc ? [''] : []), '', '', ''])
        continue
      }
      for (const c of rc.codings) {
        const doc = project.documents.find((d) => d.id === c.docId)
        const a = doc?.utterances[c.start.u]?.number ?? '?'
        const b = doc?.utterances[c.end.u]?.number
        const num = b && c.end.u !== c.start.u ? `${a}–${b}` : String(a)
        const degree = rc.code
          ? t(rc.code.degrees.find((d) => d.level === c.degree)?.label ?? `度合い${c.degree}`)
          : ''
        rows.push([g.path, catDef, codeName, ...(multiDoc ? [doc?.name ?? ''] : []), num, codedText(project, c), degree])
      }
    }
  }
  return { header, rows, groupStarts }
}

function csvCell(v: string) {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadReportCsv(table: ReportTable, filename: string) {
  const text = [table.header, ...table.rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
  // BOM so that Excel opens UTF-8 Japanese text correctly
  download(new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export async function downloadReportXlsx(table: ReportTable, filename: string, sheetName: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const headerRow = table.header.map((h) => ({
    value: h,
    fontWeight: 'bold' as const,
    backgroundColor: '#E5E7EB',
    alignVertical: 'center' as const,
  }))
  const body = table.rows.map((r, i) =>
    r.map((v) => ({
      value: v,
      wrap: true,
      alignVertical: 'top' as const,
      ...(table.groupStarts.has(i) ? { topBorderStyle: 'thin' as const } : {}),
    })),
  )
  const widthByHeader = (h: string, i: number) => {
    const last = table.header.length - 1
    if (i === last) return 12
    if (i === last - 1) return 60
    if (i === 1) return 36
    return h.length > 4 ? 18 : 16
  }
  const blob = await writeXlsxFile([headerRow, ...body], {
    sheet: sheetName.slice(0, 31).replace(/[\\/?*[\]:]/g, '_'),
    columns: table.header.map((h, i) => ({ width: widthByHeader(h, i) })),
    stickyRowsCount: 1,
  }).toBlob()
  download(blob, `${filename}.xlsx`)
}
