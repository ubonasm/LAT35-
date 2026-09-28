import type { Coding, Project } from './types'
import { STOPWORDS, type Token, type TokenizeFn } from './tokenizer'

export type Measure = 'jaccard' | 'cosine-tfidf' | 'cosine-tf'

export interface Matrix {
  labels: string[]
  colors?: string[]
  values: number[][]
  weights: number[]
}

export interface WordStat {
  word: string
  pos: string
  freq: number
  df: number
  tfidf: number
}

export interface WordAnalysisOptions {
  docIds: string[]
  range: [number, number] | null
  speakers: string[] | null
  pos: string[]
  minFreq: number
  topN: number
  window: number
  measure: Measure
  focus: string[]
  excluded: string[]
}

function keepToken(t: Token, pos: string[], excluded: Set<string>) {
  if (!pos.includes(t.pos) || t.base.length === 0) return false
  if (STOPWORDS.has(t.base) || excluded.has(t.base) || excluded.has(t.surface)) return false
  return !/^[\p{P}\p{S}\s]+$/u.test(t.base)
}

function jaccard(a: Set<number>, b: Set<number>) {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function cosine(a: number[], b: number[]) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb)
}

export function analyzeWords(project: Project, tokenize: TokenizeFn, opt: WordAnalysisOptions) {
  const units: Map<string, number>[] = []
  const posOf = new Map<string, string>()
  const utterBags: Map<string, number>[] = []
  const excluded = new Set(opt.excluded)

  for (const doc of project.documents.filter((d) => opt.docIds.includes(d.id))) {
    const docBags: Map<string, number>[] = []
    doc.utterances.forEach((u, i) => {
      const inRange = !opt.range || (i + 1 >= opt.range[0] && i + 1 <= opt.range[1])
      const spkOk = !opt.speakers || opt.speakers.includes(u.speaker)
      const bag = new Map<string, number>()
      if (inRange && spkOk) {
        for (const t of tokenize(u.text)) {
          const focused = opt.focus.includes(t.base) || opt.focus.includes(t.surface)
          if (!focused && !keepToken(t, opt.pos, excluded)) continue
          bag.set(t.base, (bag.get(t.base) ?? 0) + 1)
          if (!posOf.has(t.base)) posOf.set(t.base, t.pos)
        }
        utterBags.push(bag)
      }
      docBags.push(inRange && spkOk ? bag : new Map())
    })
    const w = Math.max(1, opt.window)
    for (let i = 0; i < docBags.length; i += w) {
      const merged = new Map<string, number>()
      for (let j = i; j < Math.min(i + w, docBags.length); j++) {
        for (const [k, v] of docBags[j]) merged.set(k, (merged.get(k) ?? 0) + v)
      }
      if (merged.size > 0) units.push(merged)
    }
  }

  const N = units.length
  const freq = new Map<string, number>()
  const df = new Map<string, number>()
  for (const bag of units) {
    for (const [k, v] of bag) {
      freq.set(k, (freq.get(k) ?? 0) + v)
      df.set(k, (df.get(k) ?? 0) + 1)
    }
  }
  const idf = (w: string) => Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 1

  const allStats: WordStat[] = [...freq.entries()]
    .map(([word, f]) => ({ word, pos: posOf.get(word) ?? '', freq: f, df: df.get(word) ?? 0, tfidf: f * idf(word) }))
    .sort((a, b) => b.freq - a.freq || b.tfidf - a.tfidf)
  const stats = allStats.filter((s) => s.freq >= opt.minFreq)

  const missingFocus = opt.focus.filter((w) => !freq.has(w))
  const top = opt.focus.length
    ? opt.focus.flatMap((w) => allStats.find((s) => s.word === w) ?? [])
    : stats.slice(0, opt.topN)
  const labels = top.map((s) => s.word)
  let values: number[][]

  if (opt.measure === 'jaccard') {
    const sets = labels.map((w) => {
      const s = new Set<number>()
      units.forEach((bag, i) => bag.has(w) && s.add(i))
      return s
    })
    values = sets.map((a, i) => sets.map((b, j) => (i === j ? 1 : jaccard(a, b))))
  } else {
    const vecs = labels.map((w) =>
      units.map((bag) => {
        const tf = bag.get(w) ?? 0
        return opt.measure === 'cosine-tfidf' ? tf * idf(w) : tf
      }),
    )
    values = vecs.map((a, i) => vecs.map((b, j) => (i === j ? 1 : cosine(a, b))))
  }

  return {
    stats,
    missingFocus,
    unitCount: N,
    utteranceCount: utterBags.length,
    matrix: { labels, values, weights: top.map((s) => s.freq) } satisfies Matrix,
  }
}

export type CodeMeasure = 'jaccard' | 'cosine-degree' | 'proximity'

function codingUnits(project: Project, docIds: string[], c: Coding) {
  const offset = unitOffsets(project, docIds)
  const base = offset.get(c.docId)
  if (base === undefined) return []
  const out: number[] = []
  for (let u = c.start.u; u <= c.end.u; u++) out.push(base + u)
  return out
}

function unitOffsets(project: Project, docIds: string[]) {
  const map = new Map<string, number>()
  let acc = 0
  for (const d of project.documents) {
    if (!docIds.includes(d.id)) continue
    map.set(d.id, acc)
    acc += d.utterances.length + 1000
  }
  return map
}

export function analyzeCodes(
  project: Project,
  opt: { docIds: string[]; codeIds: string[]; measure: CodeMeasure; window: number; minDegree: number },
): Matrix {
  const codes = project.codes.filter((c) => opt.codeIds.includes(c.id))
  const codings = project.codings.filter((c) => opt.docIds.includes(c.docId) && c.degree >= opt.minDegree)
  const unitDeg = codes.map((code) => {
    const m = new Map<number, number>()
    for (const c of codings.filter((x) => x.codeId === code.id)) {
      for (const u of codingUnits(project, opt.docIds, c)) m.set(u, Math.max(m.get(u) ?? 0, c.degree))
    }
    return m
  })

  let values: number[][]
  if (opt.measure === 'jaccard') {
    const sets = unitDeg.map((m) => new Set(m.keys()))
    values = sets.map((a, i) => sets.map((b, j) => (i === j ? 1 : jaccard(a, b))))
  } else if (opt.measure === 'cosine-degree') {
    const all = [...new Set(unitDeg.flatMap((m) => [...m.keys()]))].sort((a, b) => a - b)
    const vecs = unitDeg.map((m) => all.map((u) => m.get(u) ?? 0))
    values = vecs.map((a, i) => vecs.map((b, j) => (i === j ? 1 : cosine(a, b))))
  } else {
    const w = Math.max(0, opt.window)
    const lists = unitDeg.map((m) => [...m.keys()])
    values = lists.map((a, i) =>
      lists.map((b, j) => {
        if (i === j) return 1
        if (a.length === 0 || b.length === 0) return 0
        const near = a.filter((x) => b.some((y) => Math.abs(x - y) <= w)).length
        const nearB = b.filter((y) => a.some((x) => Math.abs(x - y) <= w)).length
        return (near + nearB) / (a.length + b.length)
      }),
    )
  }
  return {
    labels: codes.map((c) => c.name),
    colors: codes.map((c) => c.color),
    values,
    weights: unitDeg.map((m) => m.size),
  }
}

export type CAColumn = 'code' | 'code-degree' | 'speaker' | 'document'

export interface CATableOptions {
  docIds: string[]
  codeIds: string[]
  column: CAColumn
  pos: string[]
  excluded: string[]
  minFreq: number
  topN: number
  weightDegree: boolean
}

export function buildCATable(project: Project, tokenize: TokenizeFn, opt: CATableOptions) {
  const excluded = new Set(opt.excluded)
  const colIndex = new Map<string, number>()
  const colLabels: string[] = []
  const colColors: string[] = []
  const counts = new Map<string, Map<number, number>>()

  const colFor = (key: string, label: string, color: string) => {
    let idx = colIndex.get(key)
    if (idx === undefined) {
      idx = colLabels.length
      colIndex.set(key, idx)
      colLabels.push(label)
      colColors.push(color)
    }
    return idx
  }
  const add = (text: string, col: number, weight: number) => {
    for (const t of tokenize(text)) {
      if (!keepToken(t, opt.pos, excluded)) continue
      let m = counts.get(t.base)
      if (!m) counts.set(t.base, (m = new Map()))
      m.set(col, (m.get(col) ?? 0) + weight)
    }
  }

  const docs = project.documents.filter((d) => opt.docIds.includes(d.id))
  if (opt.column === 'code' || opt.column === 'code-degree') {
    const codes = project.codes.filter((c) => opt.codeIds.includes(c.id))
    const byId = new Map(codes.map((c) => [c.id, c]))
    const ordered = [...project.codings]
      .filter((c) => opt.docIds.includes(c.docId) && byId.has(c.codeId))
      .sort((a, b) => codes.indexOf(byId.get(a.codeId)!) - codes.indexOf(byId.get(b.codeId)!) || a.degree - b.degree)
    for (const c of ordered) {
      const code = byId.get(c.codeId)!
      const col =
        opt.column === 'code'
          ? colFor(code.id, code.name, code.color)
          : colFor(`${code.id}:${c.degree}`, `${code.name}・${c.degree}`, code.color)
      add(codedText(project, c), col, opt.weightDegree ? c.degree : 1)
    }
  } else {
    for (const d of docs) {
      for (const u of d.utterances) {
        const col = opt.column === 'speaker' ? colFor(u.speaker, u.speaker, '') : colFor(d.id, d.name, '')
        add(u.text, col, 1)
      }
    }
  }

  const words = [...counts.entries()]
    .map(([w, m]) => ({ w, m, total: [...m.values()].reduce((a, b) => a + b, 0) }))
    .filter((x) => x.total >= opt.minFreq)
    .sort((a, b) => b.total - a.total)
    .slice(0, opt.topN)
  const colTotals = colLabels.map((_, j) => words.reduce((s, x) => s + (x.m.get(j) ?? 0), 0))
  const keepCols = colLabels.map((_, j) => j).filter((j) => colTotals[j] > 0)
  return {
    rowLabels: words.map((x) => x.w),
    rowFreq: words.map((x) => x.total),
    colLabels: keepCols.map((j) => colLabels[j]),
    colColors: keepCols.map((j) => colColors[j]),
    colFreq: keepCols.map((j) => colTotals[j]),
    table: words.map((x) => keepCols.map((j) => x.m.get(j) ?? 0)),
  }
}

export function codedText(project: Project, c: Coding) {
  const doc = project.documents.find((d) => d.id === c.docId)
  if (!doc) return ''
  const parts: string[] = []
  for (let u = c.start.u; u <= c.end.u; u++) {
    const t = doc.utterances[u]?.text ?? ''
    const s = u === c.start.u ? c.start.o : 0
    const e = u === c.end.u ? c.end.o : t.length
    parts.push(t.slice(s, e))
  }
  return parts.join(' / ')
}
