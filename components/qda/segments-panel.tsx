'use client'

import { FolderTree, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { codedText } from '@/lib/qda/analysis'
import { descendantIds, isCategory, sortCodings, treeOrder } from '@/lib/qda/hierarchy'
import { useActiveProject, useProjects, useUI } from '@/lib/qda/store'
import { DEGREE_WIDTH, type Code, type Coding, type Degree, type Project } from '@/lib/qda/types'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { NativeSelect } from './native-select'

function DegreePicker({ code, value, onChange }: { code: Code; value: Degree; onChange: (d: Degree) => void }) {
  const t = useT()
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={t('度合い')}>
      {([1, 2, 3] as Degree[]).map((d) => {
        const def = code.degrees.find((x) => x.level === d)
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={value === d}
            title={def ? `${t(def.label)}：${t(def.description)}` : undefined}
            onClick={() => onChange(d)}
            className="flex h-6 items-center gap-1 rounded-sm border border-border px-1.5 text-[11px] aria-checked:border-primary aria-checked:bg-secondary"
          >
            <span aria-hidden className="h-3.5 rounded-full" style={{ width: DEGREE_WIDTH[d], backgroundColor: code.color }} />
            {def ? t(def.label) : d}
          </button>
        )
      })}
    </div>
  )
}

function SegmentItem({ project, coding, code }: { project: Project; coding: Coding; code: Code }) {
  const { updateCoding } = useProjects()
  const { jumpTo, selectCoding, selectedCodingId } = useUI()
  const doc = project.documents.find((d) => d.id === coding.docId)
  const u0 = doc?.utterances[coding.start.u]
  const u1 = doc?.utterances[coding.end.u]
  return (
    <li
      className={cn(
        'flex gap-2 border-b border-border/60 px-2 py-2 last:border-b-0',
        selectedCodingId === coding.id && 'bg-secondary',
      )}
    >
      <span aria-hidden className="shrink-0 rounded-full" style={{ width: DEGREE_WIDTH[coding.degree], backgroundColor: code.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          className="text-left text-[13px] leading-relaxed hover:text-primary"
          onClick={() => {
            jumpTo(coding.docId, coding.start.u)
            selectCoding(coding.id)
          }}
        >
          {codedText(project, coding)}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="font-mono text-[11px] text-muted-foreground">
            {doc?.name} #{u0?.number}
            {u1 && u1 !== u0 && `–${u1.number}`} {u0?.speaker}
          </span>
          <DegreePicker code={code} value={coding.degree} onChange={(degree) => updateCoding(coding.id, { degree })} />
        </div>
      </div>
    </li>
  )
}

export function SegmentsPanel() {
  const project = useActiveProject()
  const { focusCodeId, setFocusCode } = useUI()
  const t = useT()
  if (!project) return null
  const code = project.codes.find((c) => c.id === focusCodeId)
  if (code && isCategory(code)) return <CategoryPanel project={project} category={code} />
  const docOrder = new Map(project.documents.map((d, i) => [d.id, i]))
  const list = project.codings
    .filter((c) => (code ? c.codeId === code.id : true) && docOrder.has(c.docId))
    .sort((a, b) => docOrder.get(a.docId)! - docOrder.get(b.docId)! || a.start.u - b.start.u || a.start.o - b.start.o)
  const codeMap = new Map(project.codes.map((c) => [c.id, c]))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <CodeFilter project={project} />
      {code && (
        <div className="flex flex-col gap-1 rounded-md bg-muted p-2 text-xs leading-relaxed">
          <p className="text-foreground">{code.definition || t('（定義未設定）')}</p>
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {code.degrees.map((d) => (
              <li key={d.level} className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 shrink-0 rounded-full" style={{ width: DEGREE_WIDTH[d.level], backgroundColor: code.color }} />
                <span className="font-medium text-foreground">{t(d.label)}</span>
                <span className="truncate">{t(d.description)}</span>
                <span className="ml-auto font-mono">
                  {list.filter((c) => c.degree === d.level).length}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-card">
        {list.map((c) => {
          const cd = codeMap.get(c.codeId)
          return cd ? <SegmentItem key={c.id} project={project} coding={c} code={cd} /> : null
        })}
        {list.length === 0 && <li className="p-3 text-xs text-muted-foreground">{t('コード付与された箇所はまだありません。')}</li>}
      </ul>
    </div>
  )
}

function CodeFilter({ project }: { project: Project }) {
  const { focusCodeId, setFocusCode } = useUI()
  const t = useT()
  return (
    <NativeSelect aria-label={t('コードで絞り込み')} value={focusCodeId ?? ''} onChange={(e) => setFocusCode(e.target.value || null)}>
      <option value="">{t('すべてのコード')}</option>
      {treeOrder(project.codes).map(({ code: c, depth }) => (
        <option key={c.id} value={c.id}>
          {'　'.repeat(depth)}
          {isCategory(c) ? t('［カテゴリ］{name}', { name: c.name }) : c.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function CategoryPanel({ project, category }: { project: Project; category: Code }) {
  const { setFocusCode } = useUI()
  const t = useT()
  const scope = descendantIds(project.codes, category.id)
  const members = treeOrder(project.codes).filter(({ code }) => scope.has(code.id) && code.id !== category.id)
  const baseDepth = members[0]?.depth ?? 0
  const direct = sortCodings(project, project.codings.filter((c) => c.codeId === category.id))
  const total = project.codings.filter((c) => scope.has(c.codeId)).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <CodeFilter project={project} />
      <div className="flex flex-col gap-1.5 rounded-md bg-muted p-2.5 text-xs leading-relaxed">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <FolderTree aria-hidden className="size-4" style={{ color: category.color }} />
          {category.name}
          <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">
            {t('コード {c} ・ 付与 {n}', { c: members.filter((m) => !isCategory(m.code)).length, n: total })}
          </span>
        </p>
        <p className="whitespace-pre-wrap text-foreground">{category.definition || t('（カテゴリの説明が未設定です。鉛筆アイコンから入力できます）')}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {direct.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-medium text-muted-foreground">{t('カテゴリに直接付与（{n}）', { n: direct.length })}</h3>
            <ul className="rounded-md border border-border bg-card">
              {direct.map((c) => (
                <SegmentItem key={c.id} project={project} coding={c} code={category} />
              ))}
            </ul>
          </section>
        )}
        {members.map(({ code: m, depth }) => {
          const list = sortCodings(project, project.codings.filter((c) => c.codeId === m.id))
          return (
            <section key={m.id} className="flex flex-col gap-1" style={{ paddingLeft: (depth - baseDepth) * 10 }}>
              <h3 className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-1.5 font-medium hover:text-primary"
                  onClick={() => setFocusCode(m.id)}
                  title={m.definition}
                >
                  {isCategory(m) ? (
                    <FolderTree aria-hidden className="size-3.5 shrink-0" style={{ color: m.color }} />
                  ) : (
                    <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: m.color }} />
                  )}
                  <span className="truncate">{m.name}</span>
                </button>
                <span className="ml-auto font-mono text-muted-foreground">{list.length}</span>
              </h3>
              {m.definition && !isCategory(m) && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">{m.definition}</p>
              )}
              {list.length > 0 ? (
                <ul className="rounded-md border border-border bg-card">
                  {list.map((c) => (
                    <SegmentItem key={c.id} project={project} coding={c} code={m} />
                  ))}
                </ul>
              ) : (
                !isCategory(m) && <p className="text-[11px] text-muted-foreground">{t('付与箇所なし')}</p>
              )}
            </section>
          )
        })}
        {members.length === 0 && direct.length === 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('含むコードがありません。コードの編集画面で「上位カテゴリー」にこのカテゴリを指定してください。')}
          </p>
        )}
      </div>
    </div>
  )
}

export function CodingDetail() {
  const project = useActiveProject()
  const { updateCoding, deleteCoding } = useProjects()
  const { selectedCodingId, selectCoding, setPanelTab } = useUI()
  const t = useT()
  const coding = project?.codings.find((c) => c.id === selectedCodingId)
  const code = project?.codes.find((c) => c.id === coding?.codeId)
  if (!project || !coding || !code) {
    return <p className="p-2 text-xs leading-relaxed text-muted-foreground">{t('本文左の縦棒をクリックすると、その付与箇所の詳細を表示・編集できます。')}</p>
  }
  const doc = project.documents.find((d) => d.id === coding.docId)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span aria-hidden className="mt-1 size-3 shrink-0 rounded-sm" style={{ backgroundColor: code.color }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{code.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {doc?.name} #{doc?.utterances[coding.start.u]?.number}
            {coding.end.u !== coding.start.u && `–${doc?.utterances[coding.end.u]?.number}`}
          </p>
        </div>
      </div>
      <blockquote className="border-l-2 border-border pl-3 text-[13px] leading-relaxed">{codedText(project, coding)}</blockquote>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">{t('度合い')}</span>
        <DegreePicker code={code} value={coding.degree} onChange={(degree) => updateCoding(coding.id, { degree })} />
        <p className="text-xs text-muted-foreground">{t(code.degrees.find((d) => d.level === coding.degree)?.description ?? '')}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cmemo" className="text-xs text-muted-foreground">
          {t('コードの付け替え')}
        </label>
        <NativeSelect id="cmemo-code" value={coding.codeId} onChange={(e) => updateCoding(coding.id, { codeId: e.target.value })}>
          {project.codes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cmemo" className="text-xs text-muted-foreground">
          {t('メモ（判断の根拠など）')}
        </label>
        <Textarea id="cmemo" rows={4} value={coding.memo} onChange={(e) => updateCoding(coding.id, { memo: e.target.value })} />
      </div>
      <Button
        variant="outline"
        className="text-destructive"
        onClick={() => {
          deleteCoding(coding.id)
          selectCoding(null)
          setPanelTab('segments')
        }}
      >
        <Trash2 data-icon="inline-start" />
        {t('このコード付与を削除')}
      </Button>
    </div>
  )
}
