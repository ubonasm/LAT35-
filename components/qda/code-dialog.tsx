'use client'

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { blankCode, useActiveProject, useProjects } from '@/lib/qda/store'
import { CODE_COLORS, DEGREE_WIDTH, type Code, type CodeKind, type Degree } from '@/lib/qda/types'
import { NativeSelect } from './native-select'
import { useT } from '@/lib/i18n'

function treeOrder(codes: Code[]) {
  const ids = new Set(codes.map((c) => c.id))
  const out: { code: Code; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const c of codes) {
      const p = c.parentId && ids.has(c.parentId) ? c.parentId : null
      if (p !== parentId) continue
      out.push({ code: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

type Draft = Omit<Code, 'id'>

function descendants(codes: Code[], id: string): Set<string> {
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

export function CodeDialog({
  open,
  onOpenChange,
  codeId,
  defaultParentId,
  defaultKind = 'code',
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  codeId: string | null
  defaultParentId?: string | null
  defaultKind?: CodeKind
}) {
  const project = useActiveProject()
  if (!project || !open) return null
  const existing = codeId ? project.codes.find((c) => c.id === codeId) : undefined
  const initial: Draft = existing
    ? { ...existing, kind: existing.kind ?? 'code', degrees: existing.degrees.map((d) => ({ ...d })) }
    : { ...blankCode(project.codes), parentId: defaultParentId ?? null, kind: defaultKind }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <CodeForm key={codeId ?? 'new'} codeId={codeId} initial={initial} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CodeForm({ codeId, initial, onDone }: { codeId: string | null; initial: Draft; onDone: () => void }) {
  const project = useActiveProject()!
  const { addCode, updateCode, deleteCode, autoCode, activeDocId } = useProjects()
  const [draft, setDraft] = useState<Draft>(initial)
  const [kw, setKw] = useState(initial.keywords.join('、'))
  const [autoDegree, setAutoDegree] = useState<Degree>(1)
  const [autoScope, setAutoScope] = useState<'doc' | 'all'>('all')
  const [autoMsg, setAutoMsg] = useState<string | null>(null)
  const t = useT()
  const isCat = draft.kind === 'category'

  const excluded = codeId ? descendants(project.codes, codeId) : new Set<string>()
  const ordered = treeOrder(project.codes).filter(({ code }) => !excluded.has(code.id))
  const parentCategories = ordered.filter(({ code }) => code.kind === 'category')
  const parentCodes = isCat ? [] : ordered.filter(({ code }) => code.kind !== 'category')
  const setKind = (k: CodeKind) => {
    const parent = project.codes.find((c) => c.id === draft.parentId)
    const parentInvalid = k === 'category' && parent && parent.kind !== 'category'
    setDraft({ ...draft, kind: k, parentId: parentInvalid ? null : draft.parentId })
  }
  const children = codeId ? project.codes.filter((c) => c.parentId === codeId) : []

  const keywords = kw
    .split(/[、,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const save = () => {
    const data = { ...draft, name: draft.name.trim(), keywords }
    if (!data.name) return
    if (codeId) updateCode(codeId, data)
    else addCode(data)
    onDone()
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {t(codeId ? (isCat ? 'カテゴリを編集' : 'コードを編集') : isCat ? '新しいカテゴリ' : '新しいコード')}
        </DialogTitle>
        <DialogDescription>
          {t(isCat
            ? 'カテゴリ名・カテゴリを説明する文章・上位カテゴリーを設定します。含むコードは、各コードの上位にこのカテゴリを指定します。'
            : 'コード名・定義・カテゴリー関係・度合い（3段階）を設定します。')}
        </DialogDescription>
      </DialogHeader>

      <div role="radiogroup" aria-label={t('種類')} className="flex w-fit rounded-md bg-muted p-0.5">
        {(
          [
            ['code', 'コード'],
            ['category', 'カテゴリ'],
          ] as [CodeKind, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={(draft.kind ?? 'code') === k}
            onClick={() => setKind(k)}
            className="rounded-sm px-3 py-1 text-xs text-muted-foreground aria-checked:bg-card aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-sm"
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="cname">{t(isCat ? 'カテゴリ名' : 'コード名')}</Label>
          <Input
            id="cname"
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t(isCat ? '例：社会的問題' : '例：制止・拒否')}
          />
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">{t('色')}</legend>
          <div className="flex gap-1">
            {CODE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={t('色 {c}', { c })}
                aria-pressed={draft.color === c}
                onClick={() => setDraft({ ...draft, color: c })}
                className="size-6 rounded-sm ring-offset-2 ring-offset-popover aria-pressed:ring-2 aria-pressed:ring-foreground"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cdef">{t(isCat ? 'カテゴリの説明（定義）' : '定義')}</Label>
        <Textarea
          id="cdef"
          rows={isCat ? 5 : 3}
          value={draft.definition}
          onChange={(e) => setDraft({ ...draft, definition: e.target.value })}
          placeholder={t(
            isCat
              ? '下位のコード群から、このカテゴリが何を表すかを説明する文章'
              : 'このコードを付す基準、含む／含まない例など',
          )}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cparent">{t('上位カテゴリー')}</Label>
          <NativeSelect
            id="cparent"
            value={draft.parentId ?? ''}
            onChange={(e) => setDraft({ ...draft, parentId: e.target.value || null })}
          >
            <option value="">{t('（なし：最上位）')}</option>
            {parentCategories.length > 0 && (
              <optgroup label={t('■ カテゴリ')}>
                {parentCategories.map(({ code, depth }) => (
                  <option key={code.id} value={code.id}>
                    {'　'.repeat(depth) + t('カテ：{name}', { name: code.name })}
                  </option>
                ))}
              </optgroup>
            )}
            {parentCodes.length > 0 && (
              <optgroup label={t('● コード')}>
                {parentCodes.map(({ code, depth }) => (
                  <option key={code.id} value={code.id}>
                    {'　'.repeat(depth) + t('コード：{name}', { name: code.name })}
                  </option>
                ))}
              </optgroup>
            )}
          </NativeSelect>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(isCat ? 'カテゴリの上位にはカテゴリのみ指定できます。' : 'カテゴリ（カテ：）またはコード（コード：）を指定できます。')}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t(isCat ? '含むコード' : '下位カテゴリー')}</span>
          <p className="min-h-8 rounded-md bg-muted px-2 py-1.5 text-sm text-muted-foreground">
            {children.length ? children.map((c) => c.name).join('、') : t('なし（下位コードの編集画面で上位に指定）')}
          </p>
        </div>
      </div>

      {!isCat && (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t('度合い（同じ語でも発言の奥行きを区別）')}</legend>
        {draft.degrees.map((d, i) => (
          <div key={d.level} className="flex items-start gap-3">
            <div className="flex h-8 w-10 shrink-0 items-stretch justify-center rounded-sm bg-muted py-1">
              <span
                aria-hidden
                className="rounded-full"
                style={{ width: DEGREE_WIDTH[d.level], backgroundColor: draft.color }}
              />
            </div>
            <div className="grid flex-1 gap-2 sm:grid-cols-[8rem_1fr]">
              <Input
                aria-label={t('度合い{n}のラベル', { n: d.level })}
                value={d.label}
                onChange={(e) => {
                  const degrees = [...draft.degrees]
                  degrees[i] = { ...d, label: e.target.value }
                  setDraft({ ...draft, degrees })
                }}
              />
              <Input
                aria-label={t('度合い{n}の説明', { n: d.level })}
                value={d.description}
                onChange={(e) => {
                  const degrees = [...draft.degrees]
                  degrees[i] = { ...d, description: e.target.value }
                  setDraft({ ...draft, degrees })
                }}
              />
            </div>
          </div>
        ))}
      </fieldset>
      )}

      {!isCat && (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ckw">{t('自動コーディング用の語（読点・カンマ区切り）')}</Label>
        <Input id="ckw" value={kw} onChange={(e) => setKw(e.target.value)} placeholder={t('例：やめて、やめろ、いやだ')} />
      </div>
      )}

      {codeId && !isCat && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2">
          <Wand2 className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm">{t('自動コーディング')}</span>
          <NativeSelect
            aria-label={t('対象')}
            value={autoScope}
            onChange={(e) => setAutoScope(e.target.value as 'doc' | 'all')}
          >
            <option value="all">{t('全文書')}</option>
            <option value="doc">{t('表示中の文書')}</option>
          </NativeSelect>
          <NativeSelect
            aria-label={t('初期の度合い')}
            value={autoDegree}
            onChange={(e) => setAutoDegree(Number(e.target.value) as Degree)}
          >
            {draft.degrees.map((d) => (
              <option key={d.level} value={d.level}>
                {t('度合い{n}：{label}', { n: d.level, label: t(d.label) })}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={keywords.length === 0}
            onClick={() => {
              updateCode(codeId, { keywords })
              const ids = autoScope === 'all' ? project.documents.map((d) => d.id) : activeDocId ? [activeDocId] : []
              const n = autoCode(codeId, ids, autoDegree)
              setAutoMsg(t('{n}件を付与しました。度合いは各箇所で見直してください。', { n }))
            }}
          >
            {t('実行')}
          </Button>
          {autoMsg && <p className="w-full text-xs text-muted-foreground">{autoMsg}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {codeId ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (
                confirm(
                  t(isCat
                    ? 'このカテゴリを削除しますか？（含むコードは一つ上の階層に移動し、コード自体は残ります）'
                    : 'このコードと付与箇所をすべて削除しますか？'),
                )
              ) {
                deleteCode(codeId)
                onDone()
              }
            }}
          >
            {t('削除')}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('キャンセル')}
          </Button>
          <Button type="submit" disabled={!draft.name.trim()}>
            {t('保存')}
          </Button>
        </div>
      </div>
    </form>
  )
}
