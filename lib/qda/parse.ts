import Papa from 'papaparse'
import { uid, type Utterance } from './types'

export async function readFileText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, '')
  } catch {
    return new TextDecoder('shift_jis').decode(buf)
  }
}

const NUM_KEYS = ['発言番号', '番号', 'no', 'no.', 'id', 'number', '#', '通し番号']
const SPEAKER_KEYS = ['発言者', '話者', 'speaker', '名前', 'name', '氏名']
const TEXT_KEYS = ['発言内容', '発言', '内容', 'text', 'content', 'utterance', 'テキスト']

function findCol(header: string[], keys: string[]) {
  return header.findIndex((h) => keys.includes(h.trim().toLowerCase()))
}

export function parseCsv(text: string): Utterance[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true })
  const rows = result.data.filter((r) => r.some((c) => c && c.trim()))
  if (rows.length === 0) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  let iNum = findCol(header, NUM_KEYS)
  let iSpk = findCol(header, SPEAKER_KEYS)
  let iTxt = findCol(header, TEXT_KEYS)
  let body = rows.slice(1)
  if (iNum < 0 && iSpk < 0 && iTxt < 0) {
    body = rows
    const n = rows[0].length
    if (n >= 3) [iNum, iSpk, iTxt] = [0, 1, 2]
    else if (n === 2) [iNum, iSpk, iTxt] = [-1, 0, 1]
    else [iNum, iSpk, iTxt] = [-1, -1, 0]
  }
  if (iTxt < 0) iTxt = rows[0].length - 1
  return body.map((r, i) => ({
    id: uid('u'),
    number: iNum >= 0 ? (r[iNum] ?? '').trim() || String(i + 1) : String(i + 1),
    speaker: iSpk >= 0 ? (r[iSpk] ?? '').trim() : '',
    text: (r[iTxt] ?? '').trim(),
  }))
}

// Supports "12 田中：内容", "12\t田中\t内容", "田中：内容", or plain lines.
export function parseTxt(text: string): Utterance[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.map((line, i) => {
    const tabs = line.split('\t')
    if (tabs.length >= 3) {
      return { id: uid('u'), number: tabs[0].trim(), speaker: tabs[1].trim(), text: tabs.slice(2).join(' ').trim() }
    }
    if (tabs.length === 2) {
      return { id: uid('u'), number: String(i + 1), speaker: tabs[0].trim(), text: tabs[1].trim() }
    }
    const m = line.match(/^(?:(\d+)[\s.．、:：)]*)?\s*([^：:「」]{1,20})[：:]\s*(.+)$/)
    if (m) {
      return { id: uid('u'), number: m[1] ?? String(i + 1), speaker: m[2].trim(), text: m[3].trim() }
    }
    const n = line.match(/^(\d+)[\s.．、]+(.+)$/)
    if (n) return { id: uid('u'), number: n[1], speaker: '', text: n[2].trim() }
    return { id: uid('u'), number: String(i + 1), speaker: '', text: line }
  })
}

export async function parseFile(file: File): Promise<Utterance[]> {
  const text = await readFileText(file)
  return /\.csv$/i.test(file.name) ? parseCsv(text) : parseTxt(text)
}
