'use client'

import { useRef, useState } from 'react'
import { Download, FolderOpen, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useT } from '@/lib/i18n'
import { useProjects } from '@/lib/qda/store'
import type { Project } from '@/lib/qda/types'

export function downloadProject(p: Project) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${p.name.replace(/[\\/:*?"<>|]/g, '_')}.qda.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function ProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { projects, activeProjectId, createProject, openProject, deleteProject, importProject } = useProjects()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const t = useT()

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Project
      if (!Array.isArray(data.documents) || !Array.isArray(data.codes) || !Array.isArray(data.codings)) {
        throw new Error('invalid')
      }
      importProject(data)
      setError(null)
      onOpenChange(false)
    } catch {
      setError(t('プロジェクトファイル（.qda.json）を読み込めませんでした。'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('プロジェクト')}</DialogTitle>
          <DialogDescription>
            {t('作業内容はこのブラウザ内に自動保存されます。別のPCで続ける・他の人に渡すときは、書き出したプロジェクトファイル（.qda.json）を相手が「プロジェクトを読み込む」で開いてください。')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground">{t('保存済みプロジェクト')}</h3>
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
                    p.id === activeProjectId ? 'border-primary bg-secondary' : 'border-border bg-card'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {t('文書 {d} ・ コード {c} ・ 付与 {n}', { d: p.documents.length, c: p.codes.length, n: p.codings.length })}
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t('開く')}
                    onClick={() => {
                      openProject(p.id)
                      onOpenChange(false)
                    }}
                  >
                    <FolderOpen />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={t('書き出し')} onClick={() => downloadProject(p)}>
                    <Download />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={t('削除')}
                    onClick={() => {
                      if (confirm(t('「{name}」を削除しますか？この操作は取り消せません。', { name: p.name }))) deleteProject(p.id)
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
              {projects.length === 0 && <li className="text-sm text-muted-foreground">{t('まだプロジェクトがありません。')}</li>}
            </ul>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload data-icon="inline-start" />
              {t('プロジェクトを読み込む')}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>

          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!name.trim()) return
              createProject(name.trim(), desc.trim())
              setName('')
              setDesc('')
              onOpenChange(false)
            }}
          >
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground">{t('新規プロジェクト')}</h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pname">{t('名前')}</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('例：小学校4年 総合の授業')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pdesc">{t('説明・研究課題')}</Label>
              <Textarea id="pdesc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} />
            </div>
            <Button type="submit" disabled={!name.trim()}>
              <Plus data-icon="inline-start" />
              {t('作成する')}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
