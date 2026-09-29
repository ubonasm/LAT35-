'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useProjects } from '@/lib/qda/store'
import { compoundCandidates, DICT_POS_OPTIONS, loadTokenizer } from '@/lib/qda/tokenizer'
import type { DictEntry, Project } from '@/lib/qda/types'
import { NativeSelect } from './native-select'
import { useT } from '@/lib/i18n'

function splitWords(s: string) {
  return s
    .split(/[\s、,，]+/)
    .map((w) => w.trim())
    .filter(Boolean)
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const t = useT()
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-medium">{t(title)}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{t(hint)}</p>
      </div>
      {children}
    </section>
  )
}

export function DictionaryDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const update = useProjects((s) => s.updateProjectMeta)
  const dict = project.dictionary ?? []
  const excluded = project.excludedWords ?? []
  const [word, setWord] = useState('')
  const [pos, setPos] = useState<string>('名詞')
  const [ex, setEx] = useState('')
  const [scan, setScan] = useState(false)
  const t = useT()
  const { data: engine } = useSWR(open ? 'tokenizer-engine' : null, loadTokenizer, { revalidateOnFocus: false })

  const candidates =
    scan && engine
      ? compoundCandidates(
          engine,
          project.documents.flatMap((d) => d.utterances.map((u) => u.text)),
          dict,
        ).slice(0, 60)
      : []

  const addEntries = (entries: DictEntry[]) => {
    const known = new Set(dict.map((d) => d.word))
    const fresh = entries.filter((e) => e.word && !known.has(e.word))
    if (fresh.length) update({ dictionary: [...dict, ...fresh] })
  }

  const submitWord = (e: React.FormEvent) => {
    e.preventDefault()
    addEntries(splitWords(word).map((w) => ({ word: w, pos })))
    setWord('')
  }

  const submitExcluded = (e: React.FormEvent) => {
    e.preventDefault()
    const next = [...new Set([...excluded, ...splitWords(ex)])]
    update({ excludedWords: next })
    setEx('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-5 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('語の取り扱い（ユーザー辞書）')}</DialogTitle>
          <DialogDescription>
            {t('このプロジェクトだけに適用され、プロジェクトファイルにも保存されます。変更後は「可視化する」を押し直してください。')}
          </DialogDescription>
        </DialogHeader>

        <label className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={project.compoundNouns ?? false}
            onCheckedChange={(v) => update({ compoundNouns: v === true })}
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">{t('連続する名詞を複合語としてまとめる')}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {t('例：「日本」＋「人」→「日本人」、「太平洋」＋「戦争」→「太平洋戦争」。すべての連続名詞が対象になるため、必要な語だけ登録したい場合は下の候補から選んでください。')}
            </span>
          </span>
        </label>

        <Section title="強制抽出する語" hint="分割されてほしくない語を登録します。空白や読点で区切ると複数を一度に登録できます。">
          <form onSubmit={submitWord} className="flex gap-2">
            <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder={t('例：日本人、満州事変')} className="h-8" aria-label={t('登録する語')} />
            <NativeSelect value={pos} onChange={(e) => setPos(e.target.value)} className="h-8 w-28" aria-label={t('品詞')}>
              {DICT_POS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {t(p)}
                </option>
              ))}
            </NativeSelect>
            <Button type="submit" size="sm" disabled={!word.trim()}>
              <Plus data-icon="inline-start" />
              {t('登録')}
            </Button>
          </form>
          {dict.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {dict.map((d) => (
                <li key={d.word} className="flex items-center gap-1 rounded-md border border-border bg-card py-0.5 pr-1 pl-2 text-sm">
                  {d.word}
                  <span className="text-xs text-muted-foreground">{d.pos}</span>
                  <button
                    type="button"
                    aria-label={t('{name}を削除', { name: d.word })}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => update({ dictionary: dict.filter((x) => x.word !== d.word) })}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t('まだ登録されていません。')}</p>
          )}
        </Section>

        <Section title="複合語の候補" hint="全文書から「名詞＋名詞」の並びを探し、よく出るものから表示します。">
          <div>
            <Button size="sm" variant="outline" onClick={() => setScan(true)} disabled={scan && !engine}>
              <Search data-icon="inline-start" />
              {t(scan && !engine ? '形態素解析器を準備中…' : scan ? '再検索' : '候補を探す')}
            </Button>
          </div>
          {scan && engine && (
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              {candidates.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">{t('候補は見つかりませんでした。')}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-2 py-1 text-left font-medium">{t('候補')}</th>
                      <th className="px-2 py-1 text-left font-medium">{t('現在の分割')}</th>
                      <th className="px-2 py-1 text-right font-medium">{t('回数')}</th>
                      <th className="px-2 py-1">
                        <span className="sr-only">{t('登録')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.word} className="border-b border-border/60 last:border-b-0">
                        <td className="px-2 py-1">{c.word}</td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">{c.parts}</td>
                        <td className="px-2 py-1 text-right font-mono">{c.freq}</td>
                        <td className="px-2 py-1 text-right">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => addEntries([{ word: c.word, pos: '名詞' }])}>
                            {t('登録')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Section>

        <Section title="使用しない語" hint="分析から除外する語（基本形）を登録します。「思う」「ええ」など、分析に不要な語に使います。">
          <form onSubmit={submitExcluded} className="flex gap-2">
            <Input value={ex} onChange={(e) => setEx(e.target.value)} placeholder={t('例：思う ええ てる')} className="h-8" aria-label={t('除外する語')} />
            <Button type="submit" size="sm" variant="outline" disabled={!ex.trim()}>
              <Plus data-icon="inline-start" />
              {t('追加')}
            </Button>
          </form>
          {excluded.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {excluded.map((w) => (
                <li key={w} className="flex items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 text-sm text-muted-foreground">
                  {w}
                  <button
                    type="button"
                    aria-label={t('{w}を除外リストから削除', { w })}
                    className="rounded p-0.5 hover:bg-card hover:text-foreground"
                    onClick={() => update({ excludedWords: excluded.filter((x) => x !== w) })}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </DialogContent>
    </Dialog>
  )
}
