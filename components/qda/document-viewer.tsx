'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useActiveProject, useProjects, useUI } from '@/lib/qda/store'
import { DEGREE_WIDTH, type Code, type Coding, type TextPos, type Utterance } from '@/lib/qda/types'
import { cn } from '@/lib/utils'
import { CodingToolbar, type PendingSelection } from './coding-toolbar'
import { useT } from '@/lib/i18n'

const LANE_W = 11

function assignLanes(codings: Coding[]) {
  const sorted = [...codings].sort((a, b) => a.start.u - b.start.u || b.end.u - a.end.u)
  const laneEnds: number[] = []
  const lane = new Map<string, number>()
  for (const c of sorted) {
    let l = laneEnds.findIndex((end) => end < c.start.u)
    if (l === -1) {
      l = laneEnds.length
      laneEnds.push(c.end.u)
    } else laneEnds[l] = c.end.u
    lane.set(c.id, l)
  }
  return { lane, count: laneEnds.length }
}

function posFromPoint(node: Node, offset: number, isEnd: boolean): TextPos | null {
  const el = (node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)) as HTMLElement | null
  const row = el?.closest<HTMLElement>('[data-row-u]')
  if (!row) return null
  const u = Number(row.dataset.rowU)
  const textEl = row.querySelector<HTMLElement>('[data-text-u]')
  if (!textEl) return null
  const len = textEl.textContent?.length ?? 0
  if (!textEl.contains(node)) {
    const before = !!(textEl.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING)
    return { u, o: before ? 0 : isEnd ? len : 0 }
  }
  const r = document.createRange()
  r.selectNodeContents(textEl)
  r.setEnd(node, offset)
  return { u, o: r.toString().length }
}

export function DocumentViewer() {
  const project = useActiveProject()
  const activeDocId = useProjects((s) => s.activeDocId)
  const { selectedCodingId, selectCoding, jump, focusCodeId } = useUI()
  const t = useT()
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [flashU, setFlashU] = useState<number | null>(null)
  const rowRefs = useRef(new Map<number, HTMLElement>())

  const doc = project?.documents.find((d) => d.id === activeDocId)
  const codeMap = useMemo(() => new Map(project?.codes.map((c) => [c.id, c]) ?? []), [project?.codes])
  const codings = useMemo(
    () => project?.codings.filter((c) => c.docId === activeDocId && codeMap.has(c.codeId)) ?? [],
    [project?.codings, activeDocId, codeMap],
  )
  const { lane, count } = useMemo(() => assignLanes(codings), [codings])
  const byRow = useMemo(() => {
    const m = new Map<number, Coding[]>()
    for (const c of codings) for (let u = c.start.u; u <= c.end.u; u++) m.set(u, [...(m.get(u) ?? []), c])
    return m
  }, [codings])

  useEffect(() => {
    if (!jump || jump.docId !== activeDocId) return
    const el = rowRefs.current.get(jump.u)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setFlashU(jump.u)
    const t = setTimeout(() => setFlashU(null), 1600)
    return () => clearTimeout(t)
  }, [jump, activeDocId])

  const onMouseUp = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const start = posFromPoint(range.startContainer, range.startOffset, false)
    let end = posFromPoint(range.endContainer, range.endOffset, true)
    if (!start || !end || !doc) return
    if (end.u > start.u && end.o === 0) end = { u: end.u - 1, o: doc.utterances[end.u - 1].text.length }
    if (end.u === start.u && end.o <= start.o) return
    const rect = range.getBoundingClientRect()
    setPending({ start, end, text: sel.toString().slice(0, 80), x: rect.left, y: rect.bottom })
  }, [doc])

  const codeWholeRow = (i: number, e: React.MouseEvent) => {
    if (!doc) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const u = doc.utterances[i]
    setPending({ start: { u: i, o: 0 }, end: { u: i, o: u.text.length }, text: u.text.slice(0, 80), x: rect.right, y: rect.top })
  }

  if (!project) return null
  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm leading-relaxed text-muted-foreground">
        {t('左の「文書」から文書を選ぶか、CSV/TXTを読み込んでください。')}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-2">
        <h2 className="truncate text-sm font-medium">{doc.name}</h2>
        <p className="shrink-0 font-mono text-xs text-muted-foreground">
          {t('{u}発言 ・ {c}箇所', { u: doc.utterances.length, c: codings.length })}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" onMouseUp={onMouseUp}>
        <div role="table" aria-label={t('{name}の発言', { name: doc.name })} className="flex flex-col pb-24">
          {doc.utterances.map((u, i) => (
            <Row
              key={u.id}
              ref={(el) => {
                if (el) rowRefs.current.set(i, el)
                else rowRefs.current.delete(i)
              }}
              index={i}
              utterance={u}
              codings={byRow.get(i) ?? []}
              lane={lane}
              laneCount={count}
              codeMap={codeMap}
              selectedCodingId={selectedCodingId}
              focusCodeId={focusCodeId}
              flash={flashU === i}
              onSelectCoding={selectCoding}
              onCodeRow={codeWholeRow}
            />
          ))}
        </div>
      </div>
      {pending && <CodingToolbar pending={pending} onClose={() => setPending(null)} />}
    </div>
  )
}

function Row({
  ref,
  index,
  utterance,
  codings,
  lane,
  laneCount,
  codeMap,
  selectedCodingId,
  focusCodeId,
  flash,
  onSelectCoding,
  onCodeRow,
}: {
  ref: (el: HTMLDivElement | null) => void
  index: number
  utterance: Utterance
  codings: Coding[]
  lane: Map<string, number>
  laneCount: number
  codeMap: Map<string, Code>
  selectedCodingId: string | null
  focusCodeId: string | null
  flash: boolean
  onSelectCoding: (id: string | null) => void
  onCodeRow: (i: number, e: React.MouseEvent) => void
}) {
  const t = useT()
  const lanes: (Coding | null)[] = Array.from({ length: laneCount }, () => null)
  for (const c of codings) lanes[lane.get(c.id) ?? 0] = c

  return (
    <div
      ref={ref}
      role="row"
      data-row-u={index}
      className={cn('group flex border-b border-border/60 transition-colors', flash && 'bg-accent')}
    >
      <div role="cell" className="flex shrink-0 select-none justify-end pl-2" style={{ width: Math.max(laneCount, 1) * LANE_W + 8 }}>
        {lanes.map((c, l) => {
          if (!c) return <span key={l} style={{ width: LANE_W }} />
          const code = codeMap.get(c.codeId)!
          const isStart = c.start.u === index
          const isEnd = c.end.u === index
          const dim = focusCodeId && focusCodeId !== c.codeId
          const deg = code.degrees.find((d) => d.level === c.degree)
          return (
            <button
              key={l}
              type="button"
              onClick={() => onSelectCoding(c.id)}
              aria-label={t('{code}・度合い{n}（{label}）', { code: code.name, n: c.degree, label: t(deg?.label ?? '') })}
              title={t('{code}\n度合い{n}：{label}', { code: code.name, n: c.degree, label: t(deg?.label ?? '') })}
              className={cn('flex justify-center', isStart && 'pt-1.5', isEnd && 'pb-1.5')}
              style={{ width: LANE_W }}
            >
              <span
                className={cn(
                  'block h-full',
                  isStart && 'rounded-t-full',
                  isEnd && 'rounded-b-full',
                  selectedCodingId === c.id && 'outline-2 outline-offset-1 outline-foreground',
                )}
                style={{ width: DEGREE_WIDTH[c.degree], backgroundColor: code.color, opacity: dim ? 0.2 : 1 }}
              />
            </button>
          )
        })}
      </div>
      <div role="cell" className="flex w-14 shrink-0 flex-col items-end gap-0.5 py-2 pr-2">
        <button
          type="button"
          onClick={(e) => onCodeRow(index, e)}
          className="rounded-sm px-1 font-mono text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          title={t('この発言全体にコードを付す')}
        >
          {utterance.number}
        </button>
      </div>
      <div role="cell" className="w-20 shrink-0 truncate py-2 pr-2 text-xs font-medium leading-6 text-muted-foreground sm:w-24">
        {utterance.speaker}
      </div>
      <div role="cell" className="min-w-0 flex-1 py-2 pr-4">
        <p data-text-u={index} className="text-[15px] leading-relaxed text-pretty">
          <HighlightedText
            text={utterance.text}
            index={index}
            codings={codings}
            codeMap={codeMap}
            selectedCodingId={selectedCodingId}
            focusCodeId={focusCodeId}
          />
        </p>
      </div>
    </div>
  )
}

function HighlightedText({
  text,
  index,
  codings,
  codeMap,
  selectedCodingId,
  focusCodeId,
}: {
  text: string
  index: number
  codings: Coding[]
  codeMap: Map<string, Code>
  selectedCodingId: string | null
  focusCodeId: string | null
}) {
  if (codings.length === 0) return <>{text}</>
  const spans = codings.map((c) => ({
    c,
    s: c.start.u === index ? c.start.o : 0,
    e: c.end.u === index ? c.end.o : text.length,
  }))
  const cuts = [...new Set([0, text.length, ...spans.flatMap((x) => [x.s, x.e])])]
    .filter((n) => n >= 0 && n <= text.length)
    .sort((a, b) => a - b)
  const pieces: React.ReactNode[] = []
  for (let k = 0; k < cuts.length - 1; k++) {
    const a = cuts[k]
    const b = cuts[k + 1]
    const covering = spans.filter((x) => x.s <= a && x.e >= b)
    const piece = text.slice(a, b)
    if (covering.length === 0) {
      pieces.push(piece)
      continue
    }
    const top =
      covering.find((x) => x.c.id === selectedCodingId) ??
      covering.find((x) => x.c.codeId === focusCodeId) ??
      [...covering].sort((x, y) => x.e - x.s - (y.e - y.s))[0]
    const color = codeMap.get(top.c.codeId)?.color ?? '#888'
    const strong = top.c.id === selectedCodingId
    const alpha = strong ? '55' : top.c.degree === 3 ? '3a' : top.c.degree === 2 ? '2a' : '1c'
    pieces.push(
      <mark
        key={k}
        className="rounded-[2px] bg-transparent text-inherit"
        style={{ backgroundImage: `linear-gradient(transparent 45%, ${color}${alpha} 45%)` }}
      >
        {piece}
      </mark>,
    )
  }
  return <>{pieces}</>
}
