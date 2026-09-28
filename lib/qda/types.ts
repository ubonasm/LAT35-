export type Degree = 1 | 2 | 3

export interface Utterance {
  id: string
  number: string
  speaker: string
  text: string
}

export interface QDocument {
  id: string
  name: string
  createdAt: number
  utterances: Utterance[]
}

export interface DegreeDef {
  level: Degree
  label: string
  description: string
}

export type CodeKind = 'code' | 'category'

export interface Code {
  id: string
  kind?: CodeKind
  name: string
  definition: string
  color: string
  parentId: string | null
  keywords: string[]
  degrees: DegreeDef[]
}

export interface TextPos {
  u: number
  o: number
}

export interface Coding {
  id: string
  docId: string
  codeId: string
  degree: Degree
  start: TextPos
  end: TextPos
  memo: string
  createdAt: number
}

export interface DictEntry {
  word: string
  pos: string
}

export interface Project {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number
  documents: QDocument[]
  codes: Code[]
  codings: Coding[]
  dictionary?: DictEntry[]
  excludedWords?: string[]
  compoundNouns?: boolean
}

export type TextSettings = Pick<Project, 'dictionary' | 'excludedWords' | 'compoundNouns'>

export const CODE_COLORS = [
  '#2f6fb5',
  '#c2410c',
  '#15803d',
  '#b91c5c',
  '#7c5a10',
  '#0e7490',
  '#6d28d9',
  '#4d7c0f',
]

export const DEFAULT_DEGREES: DegreeDef[] = [
  { level: 1, label: '軽い', description: '遊びや冗談の中での発言、切実さは低い' },
  { level: 2, label: '中程度', description: '一定の感情や意図がこもっている' },
  { level: 3, label: '切実', description: '強い感情・切迫感を伴う発言' },
]

export const DEGREE_WIDTH: Record<Degree, number> = { 1: 2, 2: 4, 3: 7 }

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}
