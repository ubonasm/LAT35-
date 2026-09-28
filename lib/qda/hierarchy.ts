import type { Code, Coding, Project } from './types'

export const isCategory = (c: Code | undefined) => c?.kind === 'category'

export function descendantIds(codes: Code[], id: string): Set<string> {
  const out = new Set<string>([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of codes) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id)
        grew = true
      }
    }
  }
  return out
}

export function rootCodes(codes: Code[]) {
  return codes.filter((c) => !c.parentId || !codes.some((p) => p.id === c.parentId))
}

/** Depth-first order of the code system as it appears in the tree. */
export function treeOrder(codes: Code[]): { code: Code; depth: number }[] {
  const out: { code: Code; depth: number }[] = []
  const walk = (c: Code, depth: number) => {
    out.push({ code: c, depth })
    for (const ch of codes.filter((x) => x.parentId === c.id)) walk(ch, depth + 1)
  }
  for (const r of rootCodes(codes)) walk(r, 0)
  return out
}

export function nearestCategory(codes: Code[], code: Code): Code | null {
  let cur = code.parentId ? codes.find((c) => c.id === code.parentId) : undefined
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    if (isCategory(cur)) return cur
    seen.add(cur.id)
    cur = cur.parentId ? codes.find((c) => c.id === cur!.parentId) : undefined
  }
  return null
}

export function categoryPath(codes: Code[], cat: Code): string {
  const names = [cat.name]
  let p = nearestCategory(codes, cat)
  while (p) {
    names.unshift(p.name)
    p = nearestCategory(codes, p)
  }
  return names.join(' › ')
}

export function sortCodings(project: Project, list: Coding[]) {
  const docOrder = new Map(project.documents.map((d, i) => [d.id, i]))
  return list
    .filter((c) => docOrder.has(c.docId))
    .sort((a, b) => docOrder.get(a.docId)! - docOrder.get(b.docId)! || a.start.u - b.start.u || a.start.o - b.start.o)
}

export interface ReportCode {
  code: Code | null
  depth: number
  codings: Coding[]
}

export interface ReportGroup {
  category: Code | null
  path: string
  codes: ReportCode[]
}

/** Categories (in tree order) with the codes they directly explain; codes outside any category go last. */
export function buildReport(project: Project): ReportGroup[] {
  const order = treeOrder(project.codes)
  const byCode = (id: string) => sortCodings(project, project.codings.filter((c) => c.codeId === id))
  const groups = new Map<string | null, ReportGroup>()
  for (const { code } of order) {
    if (isCategory(code)) {
      groups.set(code.id, { category: code, path: categoryPath(project.codes, code), codes: [] })
    }
  }
  const depthWithin = (code: Code, cat: Code | null) => {
    let d = 0
    let cur = code.parentId ? project.codes.find((c) => c.id === code.parentId) : undefined
    while (cur && cur.id !== cat?.id && !isCategory(cur)) {
      d++
      cur = cur.parentId ? project.codes.find((c) => c.id === cur!.parentId) : undefined
    }
    return d
  }
  for (const { code } of order) {
    if (isCategory(code)) {
      const direct = byCode(code.id)
      if (direct.length) groups.get(code.id)!.codes.unshift({ code: null, depth: 0, codings: direct })
      continue
    }
    const cat = nearestCategory(project.codes, code)
    const key = cat?.id ?? null
    if (!groups.has(key)) groups.set(key, { category: null, path: '（カテゴリ未設定）', codes: [] })
    groups.get(key)!.codes.push({ code, depth: depthWithin(code, cat), codings: byCode(code.id) })
  }
  const list = [...groups.values()]
  const uncategorized = list.filter((g) => !g.category)
  return [...list.filter((g) => g.category), ...uncategorized]
}
