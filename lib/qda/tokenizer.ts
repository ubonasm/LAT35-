'use client'

import type { DictEntry, TextSettings } from './types'

export interface Token {
  surface: string
  base: string
  pos: string
}

export type TokenizeFn = (text: string) => Token[]

interface RawToken {
  surface: string
  base: string
  pos: string
  detail: string
  start: number
}

type RawTokenizeFn = (text: string) => RawToken[]

interface KuromojiToken {
  surface_form: string
  basic_form: string
  pos: string
  pos_detail_1: string
  word_position: number
}

interface KuromojiGlobal {
  builder: (opts: { dicPath: string }) => {
    build: (cb: (err: unknown, tokenizer: { tokenize: (t: string) => KuromojiToken[] }) => void) => void
  }
}

// Served from /public: kuromoji runs dicPath through path.join, which mangles "https://" URLs.
const KUROMOJI_SRC = '/kuromoji/kuromoji.js'
const DICT_PATH = '/kuromoji/dict/'

export interface TokenizerEngine {
  raw: RawTokenizeFn
  engine: 'kuromoji' | 'segmenter'
}

let loader: Promise<TokenizerEngine> | null = null

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.crossOrigin = 'anonymous'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('script load failed'))
    document.head.appendChild(s)
  })
}

function segmenterTokenize(): RawTokenizeFn {
  const seg = new Intl.Segmenter('ja', { granularity: 'word' })
  return (text) => {
    const out: RawToken[] = []
    for (const s of seg.segment(text)) {
      if (!s.isWordLike) continue
      const w = s.segment
      let pos = 'その他'
      if (/^[\p{Script=Han}\p{Script=Katakana}ー]+$/u.test(w) || /^[A-Za-z0-9]+$/.test(w)) pos = '名詞'
      else if (/^[\p{Script=Hiragana}]+$/u.test(w)) pos = w.length >= 3 ? '動詞' : 'その他'
      out.push({ surface: w, base: w, pos, detail: pos === '名詞' ? '一般' : '*', start: s.index })
    }
    return out
  }
}

export function loadTokenizer() {
  if (loader) return loader
  loader = (async () => {
    try {
      await loadScript(KUROMOJI_SRC)
      const kuromoji = (window as unknown as { kuromoji?: KuromojiGlobal }).kuromoji
      if (!kuromoji) throw new Error('kuromoji missing')
      const tokenizer = await Promise.race([
        new Promise<{ tokenize: (t: string) => KuromojiToken[] }>((resolve, reject) =>
          kuromoji.builder({ dicPath: DICT_PATH }).build((err, t) => (err ? reject(err) : resolve(t))),
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
      ])
      const raw: RawTokenizeFn = (text) =>
        tokenizer.tokenize(text).map((t) => ({
          surface: t.surface_form,
          base: t.basic_form && t.basic_form !== '*' ? t.basic_form : t.surface_form,
          pos: t.pos,
          detail: t.pos_detail_1,
          start: t.word_position - 1,
        }))
      return { raw, engine: 'kuromoji' as const }
    } catch {
      return { raw: segmenterTokenize(), engine: 'segmenter' as const }
    }
  })()
  return loader
}

const COMPOUND_HEAD = new Set(['一般', '固有名詞', 'サ変接続', '形容動詞語幹', '副詞可能'])
const COMPOUND_TAIL = new Set([...COMPOUND_HEAD, '接尾'])
const USER = 'ユーザー辞書'

function applyDictionary(text: string, tokens: RawToken[], dict: DictEntry[]): RawToken[] {
  if (dict.length === 0) return tokens
  const sorted = [...dict].filter((d) => d.word).sort((a, b) => b.word.length - a.word.length)
  const out: RawToken[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    let merged = false
    for (const d of sorted) {
      if (!text.startsWith(d.word, t.start)) continue
      const end = t.start + d.word.length
      let j = i
      while (j < tokens.length && tokens[j].start + tokens[j].surface.length < end) j++
      if (j < tokens.length && tokens[j].start + tokens[j].surface.length === end) {
        out.push({ surface: d.word, base: d.word, pos: d.pos, detail: USER, start: t.start })
        i = j
        merged = true
        break
      }
    }
    if (!merged) out.push(t)
  }
  return out
}

function joinCompounds(tokens: RawToken[]): RawToken[] {
  const out: RawToken[] = []
  let run: RawToken[] = []
  const flush = () => {
    if (run.length === 1) out.push(run[0])
    else if (run.length > 1) {
      const surface = run.map((r) => r.surface).join('')
      out.push({ surface, base: surface, pos: '名詞', detail: '複合語', start: run[0].start })
    }
    run = []
  }
  for (const t of tokens) {
    const isNoun = t.pos === '名詞' && t.detail !== USER
    const contiguous = run.length > 0 && run[run.length - 1].start + run[run.length - 1].surface.length === t.start
    if (isNoun && run.length > 0 && contiguous && COMPOUND_TAIL.has(t.detail)) run.push(t)
    else {
      flush()
      if (isNoun && COMPOUND_HEAD.has(t.detail)) run.push(t)
      else out.push(t)
    }
  }
  flush()
  return out
}

function finalize(t: RawToken): Token {
  const pos =
    t.pos === '名詞' && ['非自立', '代名詞', '数', '接尾'].includes(t.detail) ? '名詞(非自立)' : t.pos
  return { surface: t.surface, base: t.base, pos }
}

export function buildTokenizer(engine: TokenizerEngine, settings: TextSettings): TokenizeFn {
  const dict = settings.dictionary ?? []
  const compound = settings.compoundNouns ?? false
  const cache = new Map<string, Token[]>()
  return (text) => {
    let hit = cache.get(text)
    if (!hit) {
      let tokens = applyDictionary(text, engine.raw(text), dict)
      if (compound) tokens = joinCompounds(tokens)
      hit = tokens.map(finalize)
      cache.set(text, hit)
    }
    return hit
  }
}

export function compoundCandidates(engine: TokenizerEngine, texts: string[], dict: DictEntry[]) {
  const known = new Set(dict.map((d) => d.word))
  const counts = new Map<string, { freq: number; parts: string }>()
  for (const text of texts) {
    const raw = applyDictionary(text, engine.raw(text), dict)
    const joined = joinCompounds(raw)
    let k = 0
    for (const t of joined) {
      if (t.detail === '複合語' && !known.has(t.surface)) {
        const parts: string[] = []
        while (k < raw.length && raw[k].start < t.start + t.surface.length) {
          if (raw[k].start >= t.start) parts.push(raw[k].surface)
          k++
        }
        const prev = counts.get(t.surface)
        counts.set(t.surface, { freq: (prev?.freq ?? 0) + 1, parts: parts.join(' + ') })
      }
    }
  }
  return [...counts.entries()]
    .map(([word, v]) => ({ word, ...v }))
    .sort((a, b) => b.freq - a.freq || b.word.length - a.word.length)
}

export const STOPWORDS = new Set([
  'する', 'いる', 'ある', 'なる', 'れる', 'られる', 'こと', 'もの', 'よう', 'それ', 'これ', 'あれ', 'ここ', 'そこ',
  'の', 'ん', 'さん', 'くん', 'ちゃん', 'やる', 'くる', '来る', 'いう', '言う', 'ない', 'いい', 'みる', 'しまう',
  'じゃ', 'じゃあ', 'です', 'ます', 'だ', 'ね', 'よ', 'な', 'ー',
])

export const POS_OPTIONS = ['名詞', '動詞', '形容詞', '副詞', '感動詞', 'その他'] as const
export const DICT_POS_OPTIONS = ['名詞', '動詞', '形容詞', '副詞', '感動詞'] as const
