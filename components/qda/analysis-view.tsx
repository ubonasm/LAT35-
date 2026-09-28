'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { BookText, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  analyzeCodes,
  analyzeWords,
  buildCATable,
  type CAColumn,
  type CodeMeasure,
  type Measure,
  type WordAnalysisOptions,
} from '@/lib/qda/analysis'
import { correspondenceAnalysis, formatP } from '@/lib/qda/stats'
import { useActiveProject } from '@/lib/qda/store'
import { buildTokenizer, loadTokenizer, POS_OPTIONS } from '@/lib/qda/tokenizer'
import type { Project } from '@/lib/qda/types'
import { DegreeTimeline } from './degree-timeline'
import { DictionaryDialog } from './dictionary-dialog'
import { ExportableFigure } from './exportable-figure'
import { Heatmap } from './heatmap'
import { MdsMap, type MdsColor } from './mds-map'
import { NativeSelect } from './native-select'
import { NetworkGraph, type NetworkOptions } from './network-graph'
import { ScatterMap, type MapPoint } from './scatter-map'

type Tab = 'words' | 'ca' | 'codes' | 'degree'
type Display = 'network' | 'mds' | 'heatmap'

const DISPLAY_LABEL: Record<Display, string> = { network: '共起ネットワーク', mds: '多次元尺度構成法', heatmap: 'ヒートマップ' }

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function splitWords(s: string) {
  return s
    .split(/[\s、,，]+/)
    .map((w) => w.trim())
    .filter(Boolean)
}

function useTokenize(project: Project) {
  const { data: engine, isLoading } = useSWR('tokenizer-engine', loadTokenizer, { revalidateOnFocus: false })
  const tokenize = useMemo(
    () =>
      engine
        ? buildTokenizer(engine, {
            dictionary: project.dictionary,
            excludedWords: project.excludedWords,
            compoundNouns: project.compoundNouns,
          })
        : null,
    [engine, project.dictionary, project.excludedWords, project.compoundNouns],
  )
  return { engine, tokenize, isLoading }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground">{label}</legend>
      {children}
    </fieldset>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  title,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max?: number
  title?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground" title={title}>
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(Math.min(max ?? Infinity, Math.max(min, n)))
        }}
        className="h-8"
      />
    </label>
  )
}

function CheckList<T extends string>({
  items,
  value,
  onChange,
  render,
}: {
  items: T[]
  value: T[]
  onChange: (v: T[]) => void
  render?: (v: T) => React.ReactNode
}) {
  return (
    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
      {items.map((it) => (
        <label key={it} className="flex items-center gap-2 text-sm">
          <Checkbox checked={value.includes(it)} onCheckedChange={() => onChange(toggle(value, it))} />
          <span className="flex min-w-0 items-center gap-1.5 truncate">{render ? render(it) : it}</span>
        </label>
      ))}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T
  onChange: (v: T) => void
  items: [T, string][]
  label: string
}) {
  return (
    <div className="flex rounded-md bg-muted p-0.5" role="radiogroup" aria-label={label}>
      {items.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className="rounded-sm px-2.5 py-1 text-xs text-muted-foreground aria-checked:bg-card aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-sm"
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function DocChecks({ project, value, onChange }: { project: Project; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <CheckList
      items={project.documents.map((d) => d.id)}
      value={value}
      onChange={onChange}
      render={(id) => project.documents.find((d) => d.id === id)?.name}
    />
  )
}

function CodeChecks({ project, value, onChange }: { project: Project; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <CheckList
      items={project.codes.map((c) => c.id)}
      value={value}
      onChange={onChange}
      render={(id) => {
        const c = project.codes.find((x) => x.id === id)!
        return (
          <>
            <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} />
            {c.name}
          </>
        )
      }}
    />
  )
}

const DEFAULT_NET: NetworkOptions = {
  mode: 'top',
  top: 60,
  threshold: 0.2,
  mst: false,
  hideIsolated: true,
  colorBy: 'community',
}

function NetworkControls({
  value,
  onChange,
  allowOwnColor,
}: {
  value: NetworkOptions
  onChange: (v: NetworkOptions) => void
  allowOwnColor?: boolean
}) {
  const set = (patch: Partial<NetworkOptions>) => onChange({ ...value, ...patch })
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-3 py-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        描画する線
        <NativeSelect value={value.mode} onChange={(e) => set({ mode: e.target.value as NetworkOptions['mode'] })} className="h-8 w-40">
          <option value="top">類似度の上位から</option>
          <option value="threshold">閾値以上のみ</option>
        </NativeSelect>
      </label>
      {value.mode === 'top' ? (
        <div className="w-24">
          <NumberField label="線の本数" value={value.top} min={1} max={500} onChange={(v) => set({ top: v })} />
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          閾値
          <span className="flex h-8 items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={value.threshold}
              onChange={(e) => set({ threshold: Number(e.target.value) })}
              className="w-32 accent-primary"
              aria-label="線を引く閾値"
            />
            <span className="w-8 font-mono text-foreground">{value.threshold.toFixed(2)}</span>
          </span>
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        色分け
        <NativeSelect value={value.colorBy} onChange={(e) => set({ colorBy: e.target.value as NetworkOptions['colorBy'] })} className="h-8 w-44">
          <option value="community">グループ別</option>
          {allowOwnColor && <option value="own">コードの色</option>}
          <option value="none">なし（白黒・論文用）</option>
        </NativeSelect>
      </label>
      <label className="flex h-8 items-center gap-2 text-xs">
        <Checkbox checked={value.mst} onCheckedChange={(v) => set({ mst: v === true })} />
        最小スパニング・ツリーのみ
      </label>
      <label className="flex h-8 items-center gap-2 text-xs">
        <Checkbox checked={value.hideIsolated} onCheckedChange={(v) => set({ hideIsolated: v === true })} />
        孤立した語を隠す
      </label>
    </div>
  )
}

export function AnalysisView() {
  const project = useActiveProject()!
  const [tab, setTab] = useState<Tab>('words')
  const [dictOpen, setDictOpen] = useState(false)
  const tabs: [Tab, string][] = [
    ['words', '語の共起・類似度'],
    ['ca', '対応分析'],
    ['codes', 'コードの類似・近接'],
    ['degree', '度合いの推移'],
  ]
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-card pr-3">
        <div role="tablist" aria-label="分析" className="flex flex-1 gap-4 overflow-x-auto px-4">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="shrink-0 border-b-2 border-transparent py-2.5 text-sm text-muted-foreground aria-selected:border-primary aria-selected:font-medium aria-selected:text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setDictOpen(true)}>
          <BookText data-icon="inline-start" />
          語の取り扱い（辞書）
          {(project.dictionary?.length ?? 0) > 0 && (
            <span className="font-mono text-xs text-muted-foreground">{project.dictionary!.length}</span>
          )}
        </Button>
      </div>
      {tab === 'words' && <WordAnalysis project={project} />}
      {tab === 'ca' && <CorrespondenceView project={project} />}
      {tab === 'codes' && <CodeAnalysis project={project} />}
      {tab === 'degree' && <DegreeAnalysis project={project} />}
      <DictionaryDialog project={project} open={dictOpen} onOpenChange={setDictOpen} />
    </main>
  )
}

function Layout({ controls, children }: { controls: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <aside className="flex flex-col gap-5 border-b border-border bg-sidebar p-4 lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
        {controls}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:overflow-y-auto">{children}</section>
    </div>
  )
}

function EngineNote({ engine }: { engine?: { engine: string } }) {
  if (!engine) return null
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {engine.engine === 'kuromoji'
        ? '形態素解析：kuromoji（IPA辞書）＋プロジェクトのユーザー辞書'
        : '形態素解析：簡易分割（kuromojiを読み込めなかったため、品詞は推定です）'}
    </p>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  )
}

const MEASURE_LABEL: Record<Measure, string> = {
  jaccard: 'Jaccard係数（共起）',
  'cosine-tfidf': 'コサイン類似度（TF-IDF重み）',
  'cosine-tf': 'コサイン類似度（出現頻度）',
}

function WordAnalysis({ project }: { project: Project }) {
  const { engine, tokenize, isLoading } = useTokenize(project)
  const [docIds, setDocIds] = useState(project.documents.map((d) => d.id))
  const speakers = useMemo(
    () => [...new Set(project.documents.filter((d) => docIds.includes(d.id)).flatMap((d) => d.utterances.map((u) => u.speaker)))],
    [project, docIds],
  )
  const [spk, setSpk] = useState<string[] | null>(null)
  const [pos, setPos] = useState<string[]>(['名詞', '動詞', '形容詞'])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minFreq, setMinFreq] = useState(2)
  const [topN, setTopN] = useState(40)
  const [windowSize, setWindowSize] = useState(1)
  const [measure, setMeasure] = useState<Measure>('jaccard')
  const [focus, setFocus] = useState<string[]>([])
  const [focusInput, setFocusInput] = useState('')
  const [display, setDisplay] = useState<Display>('network')
  const [net, setNet] = useState<NetworkOptions>(DEFAULT_NET)
  const [clusters, setClusters] = useState(5)
  const [params, setParams] = useState<WordAnalysisOptions | null>(null)

  const result = useMemo(() => (tokenize && params ? analyzeWords(project, tokenize, params) : null), [project, tokenize, params])

  const [figColor, setFigColor] = useState<MdsColor>('cluster')
  const run = (focusWords = focus) => {
    const f = Number(from)
    const t = Number(to)
    setParams({
      docIds,
      range: from || to ? [f || 1, t || Number.MAX_SAFE_INTEGER] : null,
      speakers: spk,
      pos,
      minFreq,
      topN,
      window: windowSize,
      measure,
      focus: focusWords,
      excluded: project.excludedWords ?? [],
    })
  }

  const addFocus = (e: React.FormEvent) => {
    e.preventDefault()
    setFocus((f) => [...new Set([...f, ...splitWords(focusInput)])])
    setFocusInput('')
  }

  return (
    <Layout
      controls={
        <>
          <Field label="対象の文書">
            <DocChecks project={project} value={docIds} onChange={setDocIds} />
          </Field>
          <Field label="発言番号の区間（行番号）">
            <div className="flex items-center gap-2">
              <Input aria-label="開始" type="number" min={1} placeholder="最初" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
              <span className="text-muted-foreground">{'〜'}</span>
              <Input aria-label="終了" type="number" min={1} placeholder="最後" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
            </div>
          </Field>
          <Field label="発言者">
            <CheckList items={speakers} value={spk ?? speakers} onChange={(v) => setSpk(v.length === speakers.length ? null : v)} />
          </Field>
          <Field label="品詞">
            <CheckList items={[...POS_OPTIONS]} value={pos} onChange={setPos} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="最小頻度" value={minFreq} min={1} onChange={setMinFreq} />
            <NumberField label="上位語数" value={topN} min={3} max={120} onChange={setTopN} />
            <NumberField label="単位(発言)" value={windowSize} min={1} onChange={setWindowSize} title="何発言をひとまとまりとして共起を数えるか" />
          </div>
          <Field label="注目語（指定すると、その語だけで図を作ります）">
            <form onSubmit={addFocus} className="flex gap-2">
              <Input
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                placeholder="例：戦争 日本人 やめる"
                className="h-8"
                aria-label="注目語を追加"
              />
              <Button type="submit" size="sm" variant="outline" disabled={!focusInput.trim()}>
                追加
              </Button>
            </form>
            {focus.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {focus.map((w) => (
                  <span key={w} className="flex items-center gap-1 rounded-md bg-accent py-0.5 pr-1 pl-2 text-sm text-accent-foreground">
                    {w}
                    <button type="button" aria-label={`${w}を注目語から外す`} className="rounded p-0.5 hover:bg-card" onClick={() => setFocus(focus.filter((x) => x !== w))}>
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
                <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setFocus([])}>
                  すべて外す
                </button>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">下の頻出語の表をクリックしても追加できます。</p>
          </Field>
          <Field label="類似度の指標">
            <NativeSelect value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
              {(Object.keys(MEASURE_LABEL) as Measure[]).map((m) => (
                <option key={m} value={m}>
                  {MEASURE_LABEL[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button onClick={() => run()} disabled={isLoading || !tokenize || docIds.length === 0 || pos.length === 0}>
            <Play data-icon="inline-start" />
            {isLoading ? '形態素解析器を準備中…' : '可視化する'}
          </Button>
          <EngineNote engine={engine} />
        </>
      }
    >
      {!result ? (
        <Empty>
          <p>条件を選んで「可視化する」を押してください。</p>
          <p className="text-xs">発言（または指定した発言数のまとまり）を単位に、語同士の共起・類似度を計算します。</p>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {MEASURE_LABEL[params!.measure]} ・ {result.utteranceCount}発言 ・ {result.unitCount}単位 ・ 異なり語数 {result.stats.length}
              {params!.focus.length > 0 && ` ・ 注目語 ${result.matrix.labels.length}語`}
            </p>
            <Segmented label="表示形式" value={display} onChange={setDisplay} items={Object.entries(DISPLAY_LABEL) as [Display, string][]} />
          </div>
          {result.missingFocus.length > 0 && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {`見つからなかった注目語：${result.missingFocus.join('、')}（語の分割のされ方は「語の取り扱い（辞書）」で調整できます）`}
            </p>
          )}
          {display === 'network' && <NetworkControls value={net} onChange={setNet} />}
          {display !== 'network' && (
            <div className="flex flex-wrap items-end gap-4">
              <FigureColorSelect
                value={figColor}
                onChange={setFigColor}
                options={[['cluster', display === 'mds' ? 'クラスター別' : 'カラー'], ['none', MONO_LABEL]]}
              />
              {display === 'mds' && (
                <div className="w-32">
                  <NumberField label="クラスター数" value={clusters} min={1} max={12} onChange={setClusters} />
                </div>
              )}
            </div>
          )}
          <ExportableFigure filename={`語_${DISPLAY_LABEL[display]}_${params!.measure}`}>
            {display === 'network' && <NetworkGraph matrix={result.matrix} options={net} />}
            {display === 'mds' && <MdsMap matrix={result.matrix} clusters={clusters} color={figColor} />}
            {display === 'heatmap' && <Heatmap matrix={result.matrix} mono={figColor === 'none'} />}
          </ExportableFigure>
          <FrequencyTable
            stats={result.stats.slice(0, 100)}
            focus={focus}
            onToggle={(w) => {
              const next = toggle(focus, w)
              setFocus(next)
            }}
          />
        </>
      )}
    </Layout>
  )
}

function FrequencyTable({
  stats,
  focus,
  onToggle,
}: {
  stats: ReturnType<typeof analyzeWords>['stats']
  focus: string[]
  onToggle: (w: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <caption className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
          頻出語（上位100） ・ 行をクリックで注目語に追加／解除 → 「可視化する」で反映
        </caption>
        <thead>
          <tr className="border-y border-border text-xs text-muted-foreground">
            <th className="w-8 px-3 py-1.5">
              <span className="sr-only">注目語</span>
            </th>
            <th className="px-3 py-1.5 text-left font-medium">語</th>
            <th className="px-3 py-1.5 text-left font-medium">品詞</th>
            <th className="px-3 py-1.5 text-right font-medium">出現頻度</th>
            <th className="px-3 py-1.5 text-right font-medium">出現単位数</th>
            <th className="px-3 py-1.5 text-right font-medium">TF-IDF</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.word} className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/50" onClick={() => onToggle(s.word)}>
              <td className="px-3 py-1">
                <Checkbox checked={focus.includes(s.word)} aria-label={`${s.word}を注目語にする`} onClick={(e) => e.stopPropagation()} onCheckedChange={() => onToggle(s.word)} />
              </td>
              <td className="px-3 py-1">{s.word}</td>
              <td className="px-3 py-1 text-muted-foreground">{s.pos}</td>
              <td className="px-3 py-1 text-right font-mono">{s.freq}</td>
              <td className="px-3 py-1 text-right font-mono">{s.df}</td>
              <td className="px-3 py-1 text-right font-mono">{s.tfidf.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CA_COLUMN_LABEL: Record<CAColumn, string> = {
  code: 'コード（コード付けされた箇所の語）',
  'code-degree': 'コード×度合い',
  speaker: '発言者',
  document: '文書',
}

function CorrespondenceView({ project }: { project: Project }) {
  const { engine, tokenize, isLoading } = useTokenize(project)
  const [docIds, setDocIds] = useState(project.documents.map((d) => d.id))
  const [codeIds, setCodeIds] = useState(project.codes.map((c) => c.id))
  const [column, setColumn] = useState<CAColumn>('code')
  const [caColor, setCaColor] = useState<MdsColor>('cluster')
  const [pos, setPos] = useState<string[]>(['名詞', '動詞', '形容詞'])
  const [minFreq, setMinFreq] = useState(2)
  const [topN, setTopN] = useState(60)
  const [weightDegree, setWeightDegree] = useState(false)
  const [runKey, setRunKey] = useState(0)

  const result = useMemo(() => {
    if (!tokenize || runKey === 0) return null
    const table = buildCATable(project, tokenize, {
      docIds,
      codeIds,
      column,
      pos,
      excluded: project.excludedWords ?? [],
      minFreq,
      topN,
      weightDegree,
    })
    return { table, ca: correspondenceAnalysis(table.table) }
    // Recompute only when the user presses the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenize, runKey])

  const usesCodes = column === 'code' || column === 'code-degree'

  return (
    <Layout
      controls={
        <>
          <Field label="外部変数（列）">
            <NativeSelect value={column} onChange={(e) => setColumn(e.target.value as CAColumn)}>
              {(Object.keys(CA_COLUMN_LABEL) as CAColumn[]).map((c) => (
                <option key={c} value={c}>
                  {CA_COLUMN_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="対象の文書">
            <DocChecks project={project} value={docIds} onChange={setDocIds} />
          </Field>
          {usesCodes && (
            <Field label="コード（クラスターとして扱う）">
              <CodeChecks project={project} value={codeIds} onChange={setCodeIds} />
            </Field>
          )}
          <Field label="品詞">
            <CheckList items={[...POS_OPTIONS]} value={pos} onChange={setPos} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="最小頻度" value={minFreq} min={1} onChange={setMinFreq} />
            <NumberField label="上位語数" value={topN} min={3} max={150} onChange={setTopN} />
          </div>
          {usesCodes && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" checked={weightDegree} onCheckedChange={(v) => setWeightDegree(v === true)} />
              <span className="leading-relaxed">度合い（1〜3）で語の出現を重み付けする</span>
            </label>
          )}
          <Button onClick={() => setRunKey((k) => k + 1)} disabled={isLoading || !tokenize || pos.length === 0}>
            <Play data-icon="inline-start" />
            {isLoading ? '形態素解析器を準備中…' : '対応分析を実行'}
          </Button>
          <EngineNote engine={engine} />
        </>
      }
    >
      {!result ? (
        <Empty>
          <p>「対応分析を実行」を押してください。</p>
          <p className="text-xs">語 × コード（または発言者・文書）の集計表から、両者の対応関係を2次元に配置します。</p>
        </Empty>
      ) : !result.ca ? (
        <Empty>
          <p>対応分析には、語が2つ以上、列（コードなど）が3つ以上必要です。</p>
          <p className="text-xs">
            {`現在：語 ${result.table.rowLabels.length} ・ 列 ${result.table.colLabels.length}。コード付けを増やすか、最小頻度を下げてください。`}
          </p>
        </Empty>
      ) : (
        <CAFigure
          result={result as { table: ReturnType<typeof buildCATable>; ca: NonNullable<typeof result.ca> }}
          column={column}
          mono={caColor === 'none'}
          colorControl={
            <FigureColorSelect value={caColor} onChange={setCaColor} options={[['cluster', 'カラー'], ['none', MONO_LABEL]]} />
          }
        />
      )}
    </Layout>
  )
}

function CAFigure({
  result,
  column,
  mono,
  colorControl,
}: {
  result: { table: ReturnType<typeof buildCATable>; ca: NonNullable<ReturnType<typeof correspondenceAnalysis>> }
  column: CAColumn
  mono: boolean
  colorControl: React.ReactNode
}) {
  const { table, ca } = result
  const maxF = Math.max(1, ...table.rowFreq)
  const rowColor = mono ? 'var(--mono-g3)' : 'var(--ca-row)'
  const colColor = (j: number) => (mono ? 'var(--mono-stroke)' : table.colColors[j] || 'var(--ca-column)')
  const points: MapPoint[] = [
    ...table.rowLabels.map((label, i) => ({
      x: ca.rows[i][0],
      y: ca.rows[i][1],
      label,
      kind: 'row' as const,
      color: rowColor,
      size: 2.5 + 6 * Math.sqrt(table.rowFreq[i] / maxF),
    })),
    ...table.colLabels.map((label, j) => ({
      x: ca.cols[j][0],
      y: ca.cols[j][1],
      label,
      kind: 'col' as const,
      color: colColor(j),
      size: 5,
    })),
  ]
  const [i1, i2] = ca.inertia
  const [e1, e2] = ca.explained
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {`${CA_COLUMN_LABEL[column]} ・ 語 ${table.rowLabels.length} × 列 ${table.colLabels.length} ・ ●＝語（大きさ＝出現数）、□＝${column.startsWith('code') ? 'コード' : '外部変数'}`}
        </p>
        {colorControl}
      </div>
      <ExportableFigure filename={`対応分析_${column}${mono ? '_白黒' : ''}`}>
        <div className="flex flex-col gap-1">
          <ScatterMap
            points={points}
            xLabel={`成分1（${i1.toFixed(4)}, ${(e1 * 100).toFixed(2)}%）`}
            yLabel={`成分2（${i2.toFixed(4)}, ${(e2 * 100).toFixed(2)}%）`}
            mono={mono}
            legend={
              mono
                ? [
                    { color: rowColor, label: '抽出語', shape: 'circle' },
                    { color: colColor(0), label: column.startsWith('code') ? 'コード' : '外部変数', shape: 'square' },
                  ]
                : [
                    { color: rowColor, label: '抽出語', shape: 'circle' },
                    ...table.colLabels.slice(0, 20).map((l, j) => ({ color: colColor(j), label: l, shape: 'square' as const })),
                  ]
            }
          />
          <p className="px-1 font-mono text-[11px] text-muted-foreground">
            {`語 ${table.rowLabels.length} × 列 ${table.colLabels.length}, 総度数 ${ca.total} ・ 総慣性 ${ca.totalInertia.toFixed(4)} ・ 累積寄与率（成分1–2） ${((e1 + e2) * 100).toFixed(2)}% ・ χ²(${ca.df}) = ${ca.chi2.toFixed(2)}, ${formatP(ca.p)}`}
          </p>
        </div>
      </ExportableFigure>
    </>
  )
}

const MONO_LABEL = 'なし（白黒・論文用）'

function FigureColorSelect({
  value,
  onChange,
  options,
}: {
  value: MdsColor
  onChange: (v: MdsColor) => void
  options: [MdsColor, string][]
}) {
  const current = options.some(([v]) => v === value) ? value : options[0][0]
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      色
      <NativeSelect value={current} onChange={(e) => onChange(e.target.value as MdsColor)} className="h-8 w-44">
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

const CODE_MEASURE_LABEL: Record<CodeMeasure, string> = {
  jaccard: 'Jaccard係数（同じ発言での重なり）',
  'cosine-degree': 'コサイン類似度（度合いで重み付け）',
  proximity: '近接度（前後n発言以内に出現）',
}

function CodeAnalysis({ project }: { project: Project }) {
  const [docIds, setDocIds] = useState(project.documents.map((d) => d.id))
  const [codeIds, setCodeIds] = useState(project.codes.map((c) => c.id))
  const [measure, setMeasure] = useState<CodeMeasure>('jaccard')
  const [windowSize, setWindowSize] = useState(3)
  const [minDegree, setMinDegree] = useState(1)
  const [display, setDisplay] = useState<Display>('network')
  const [net, setNet] = useState<NetworkOptions>({ ...DEFAULT_NET, mode: 'threshold', threshold: 0.05, colorBy: 'own', hideIsolated: false })
  const [clusters, setClusters] = useState(3)
  const [figColor, setFigColor] = useState<MdsColor>('own')

  const matrix = useMemo(
    () => analyzeCodes(project, { docIds, codeIds, measure, window: windowSize, minDegree }),
    [project, docIds, codeIds, measure, windowSize, minDegree],
  )

  return (
    <Layout
      controls={
        <>
          <Field label="対象の文書">
            <DocChecks project={project} value={docIds} onChange={setDocIds} />
          </Field>
          <Field label="コード">
            <CodeChecks project={project} value={codeIds} onChange={setCodeIds} />
          </Field>
          <Field label="指標">
            <NativeSelect value={measure} onChange={(e) => setMeasure(e.target.value as CodeMeasure)}>
              {(Object.keys(CODE_MEASURE_LABEL) as CodeMeasure[]).map((m) => (
                <option key={m} value={m}>
                  {CODE_MEASURE_LABEL[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {measure === 'proximity' && <NumberField label="前後n発言" value={windowSize} min={0} onChange={setWindowSize} />}
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              度合いの下限
              <NativeSelect value={minDegree} onChange={(e) => setMinDegree(Number(e.target.value))}>
                <option value={1}>1以上（すべて）</option>
                <option value={2}>2以上</option>
                <option value={3}>3のみ</option>
              </NativeSelect>
            </label>
          </div>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{CODE_MEASURE_LABEL[measure]} ・ 円の大きさ＝コードが付された発言数</p>
        <Segmented label="表示形式" value={display} onChange={setDisplay} items={Object.entries(DISPLAY_LABEL) as [Display, string][]} />
      </div>
      {display === 'network' && <NetworkControls value={net} onChange={setNet} allowOwnColor />}
      {display !== 'network' && (
        <div className="flex flex-wrap items-end gap-4">
          <FigureColorSelect
            value={figColor}
            onChange={setFigColor}
            options={
              display === 'mds'
                ? [['own', 'コードの色'], ['cluster', 'クラスター別'], ['none', MONO_LABEL]]
                : [['own', 'カラー'], ['none', MONO_LABEL]]
            }
          />
          {display === 'mds' && figColor !== 'own' && (
            <div className="w-32">
              <NumberField label="クラスター数" value={clusters} min={1} max={12} onChange={setClusters} />
            </div>
          )}
        </div>
      )}
      <ExportableFigure filename={`コード_${DISPLAY_LABEL[display]}_${measure}`}>
        {display === 'network' && <NetworkGraph matrix={matrix} options={net} />}
        {display === 'mds' && <MdsMap matrix={matrix} clusters={clusters} color={figColor} />}
        {display === 'heatmap' && <Heatmap matrix={matrix} mono={figColor === 'none'} />}
      </ExportableFigure>
    </Layout>
  )
}

function DegreeAnalysis({ project }: { project: Project }) {
  const [docIds, setDocIds] = useState(project.documents.map((d) => d.id))
  const [codeIds, setCodeIds] = useState(project.codes.map((c) => c.id))
  return (
    <Layout
      controls={
        <>
          <Field label="対象の文書（並び順＝時系列）">
            <DocChecks project={project} value={docIds} onChange={setDocIds} />
          </Field>
          <Field label="コード">
            <CodeChecks project={project} value={codeIds} onChange={setCodeIds} />
          </Field>
        </>
      }
    >
      <ExportableFigure filename="度合いの推移" className="p-4">
        <DegreeTimeline project={project} docIds={docIds} codeIds={codeIds} />
      </ExportableFigure>
    </Layout>
  )
}
