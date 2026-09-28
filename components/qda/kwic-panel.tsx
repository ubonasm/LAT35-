'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useActiveProject, useProjects, useUI } from '@/lib/qda/store'
import type { Degree } from '@/lib/qda/types'
import { NativeSelect } from './native-select'

interface Hit {
  key: string
  docId: string
  docName: string
  u: number
  number: string
  speaker: string
  left: string
  kw: string
  right: string
  start: number
  end: number
}

export function KwicPanel() {
  const project = useActiveProject()
  const { activeDocId, addCoding } = useProjects()
  const jumpTo = useUI((s) => s.jumpTo)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [regex, setRegex] = useState(false)
  const [scope, setScope] = useState<'doc' | 'all'>('all')
  const [ctx, setCtx] = useState(18)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [codeId, setCodeId] = useState('')
  const [degree, setDegree] = useState<Degree>(2)
  const [msg, setMsg] = useState<string | null>(null)

  const { hits, error } = useMemo(() => {
    if (!project || !query) return { hits: [] as Hit[], error: null }
    let re: RegExp
    try {
      re = new RegExp(regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    } catch {
      return { hits: [] as Hit[], error: '正規表現が正しくありません' }
    }
    const out: Hit[] = []
    for (const d of project.documents) {
      if (scope === 'doc' && d.id !== activeDocId) continue
      d.utterances.forEach((u, i) => {
        for (const m of u.text.matchAll(re)) {
          if (!m[0]) continue
          const s = m.index ?? 0
          const e = s + m[0].length
          out.push({
            key: `${d.id}:${i}:${s}`,
            docId: d.id,
            docName: d.name,
            u: i,
            number: u.number,
            speaker: u.speaker,
            left: u.text.slice(Math.max(0, s - ctx), s),
            kw: m[0],
            right: u.text.slice(e, e + ctx),
            start: s,
            end: e,
          })
        }
      })
    }
    return { hits: out, error: null }
  }, [project, query, regex, scope, activeDocId, ctx])

  if (!project) return null

  const applyCodes = () => {
    if (!codeId) return
    const targets = hits.filter((h) => checked.has(h.key))
    for (const h of targets) {
      addCoding({ docId: h.docId, codeId, degree, start: { u: h.u, o: h.start }, end: { u: h.u, o: h.end } })
    }
    setMsg(`${targets.length}件にコードを付しました`)
    setChecked(new Set())
  }

  const allChecked = hits.length > 0 && hits.every((h) => checked.has(h.key))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(input.trim())
          setChecked(new Set())
          setMsg(null)
        }}
      >
        <div className="flex gap-1">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="語を検索（例：やめて）" aria-label="検索語" />
          <Button type="submit" size="icon" aria-label="検索">
            <Search />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <NativeSelect aria-label="範囲" className="h-7 text-xs" value={scope} onChange={(e) => setScope(e.target.value as 'doc' | 'all')}>
            <option value="all">全文書</option>
            <option value="doc">表示中の文書</option>
          </NativeSelect>
          <label className="flex items-center gap-1.5">
            <Checkbox checked={regex} onCheckedChange={(v) => setRegex(!!v)} />
            正規表現
          </label>
          <label className="flex items-center gap-1.5">
            前後
            <Input
              type="number"
              min={4}
              max={60}
              value={ctx}
              onChange={(e) => setCtx(Math.max(4, Math.min(60, Number(e.target.value) || 18)))}
              className="h-7 w-14 text-xs"
            />
            字
          </label>
        </div>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {query && !error && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <label className="flex items-center gap-1.5">
            <Checkbox
              checked={allChecked}
              onCheckedChange={(v) => setChecked(v ? new Set(hits.map((h) => h.key)) : new Set())}
              aria-label="すべて選択"
            />
            {'「'}
            {query}
            {'」'} {hits.length}件
          </label>
        </div>
      )}

      <ol className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-card font-sans text-[13px]">
        {hits.map((h) => (
          <li key={h.key} className="flex items-center gap-1.5 border-b border-border/60 px-1.5 py-1 last:border-b-0">
            <Checkbox
              checked={checked.has(h.key)}
              aria-label={`${h.number}を選択`}
              onCheckedChange={(v) =>
                setChecked((prev) => {
                  const n = new Set(prev)
                  if (v) n.add(h.key)
                  else n.delete(h.key)
                  return n
                })
              }
            />
            <button
              type="button"
              onClick={() => jumpTo(h.docId, h.u)}
              className="flex min-w-0 flex-1 flex-col gap-0.5 text-left hover:text-primary"
            >
              <span className="flex gap-1 font-mono text-[11px] text-muted-foreground">
                <span className="truncate">{h.docName}</span>
                <span>#{h.number}</span>
                <span className="truncate">{h.speaker}</span>
              </span>
              <span className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-1">
                <span className="truncate text-right text-muted-foreground" dir="rtl">
                  <bdi>{h.left}</bdi>
                </span>
                <span className="rounded-sm bg-accent px-0.5 font-medium text-accent-foreground">{h.kw}</span>
                <span className="truncate text-muted-foreground">{h.right}</span>
              </span>
            </button>
          </li>
        ))}
        {!query && (
          <li className="p-3 text-xs leading-relaxed text-muted-foreground">
            語を検索すると、前後の文脈とともに一覧表示（KWIC）します。行をクリックすると本文へ移動、チェックした箇所にまとめてコードを付せます。
          </li>
        )}
      </ol>

      {checked.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-secondary p-2">
          <NativeSelect aria-label="付すコード" className="h-7 min-w-0 flex-1 text-xs" value={codeId} onChange={(e) => setCodeId(e.target.value)}>
            <option value="">コードを選択</option>
            {project.codes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="度合い" className="h-7 text-xs" value={degree} onChange={(e) => setDegree(Number(e.target.value) as Degree)}>
            <option value={1}>度合い1</option>
            <option value={2}>度合い2</option>
            <option value={3}>度合い3</option>
          </NativeSelect>
          <Button size="sm" disabled={!codeId} onClick={applyCodes}>
            {checked.size}件に付す
          </Button>
        </div>
      )}
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  )
}
