'use client'

import { useState } from 'react'
import { BarChart3, Check, FolderKanban, PenLine, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useActiveProject, useProjects, useUI, type PanelTab } from '@/lib/qda/store'
import { cn } from '@/lib/utils'
import { AnalysisView } from './analysis-view'
import { CodeTree } from './code-tree'
import { DocumentList } from './document-list'
import { DocumentViewer } from './document-viewer'
import { KwicPanel } from './kwic-panel'
import { downloadProject, ProjectDialog } from './project-dialog'
import { CodingDetail, SegmentsPanel } from './segments-panel'

type MobilePane = 'nav' | 'text' | 'panel'

const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: 'kwic', label: 'KWIC検索' },
  { id: 'segments', label: 'コード箇所' },
  { id: 'detail', label: '詳細' },
]

export function Workbench() {
  const hydrated = useProjects((s) => s.hydrated)
  const project = useActiveProject()
  const { view, setView, panelTab, setPanelTab } = useUI()
  const [projectOpen, setProjectOpen] = useState(false)
  const [pane, setPane] = useState<MobilePane>('text')

  if (!hydrated) {
    return <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">読み込み中…</div>
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex h-5 items-stretch gap-0.5">
            <span className="w-0.5 rounded-full bg-primary" />
            <span className="w-1 rounded-full bg-primary" />
            <span className="w-1.5 rounded-full bg-primary" />
          </span>
          <span className="hidden text-sm font-bold tracking-tight sm:inline">Kotoba Lens</span>
        </div>
        <Button variant="ghost" size="sm" className="min-w-0 max-w-64" onClick={() => setProjectOpen(true)}>
          <FolderKanban data-icon="inline-start" />
          <span className="truncate">{project?.name ?? 'プロジェクトを選択'}</span>
        </Button>
        {project && (
          <>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex" title="作業内容はこのブラウザ内に自動保存されています">
              <Check className="size-3.5" aria-hidden />
              自動保存済み
            </span>
            <Button variant="outline" size="sm" onClick={() => downloadProject(project)} title="プロジェクトファイル（.qda.json）として保存">
              <Save data-icon="inline-start" />
              <span className="hidden sm:inline">ファイルに保存</span>
              <span className="sr-only sm:hidden">ファイルに保存</span>
            </Button>
          </>
        )}
        <nav aria-label="表示切替" className="ml-auto flex rounded-md bg-muted p-0.5">
          <button
            type="button"
            aria-pressed={view === 'coding'}
            onClick={() => setView('coding')}
            className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            <PenLine className="size-3.5" aria-hidden />
            コーディング
          </button>
          <button
            type="button"
            aria-pressed={view === 'analysis'}
            onClick={() => setView('analysis')}
            className="flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            <BarChart3 className="size-3.5" aria-hidden />
            可視化
          </button>
        </nav>
      </header>

      {!project ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">プロジェクトを作成するか、読み込んでください。</p>
          <Button onClick={() => setProjectOpen(true)}>プロジェクトを開く</Button>
        </main>
      ) : view === 'analysis' ? (
        <AnalysisView />
      ) : (
        <>
          <div className="flex border-b border-border bg-card lg:hidden" role="tablist" aria-label="表示ペイン">
            {(
              [
                ['nav', '文書・コード'],
                ['text', '本文'],
                ['panel', '検索・箇所'],
              ] as [MobilePane, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={pane === id}
                onClick={() => setPane(id)}
                className="flex-1 border-b-2 border-transparent py-2 text-xs text-muted-foreground aria-selected:border-primary aria-selected:font-medium aria-selected:text-foreground"
              >
                {label}
              </button>
            ))}
          </div>
          <main className="flex min-h-0 flex-1">
            <aside
              className={cn(
                'min-h-0 w-full flex-col gap-6 overflow-y-auto border-r border-border bg-sidebar p-3 lg:flex lg:w-64 lg:shrink-0',
                pane === 'nav' ? 'flex' : 'hidden',
              )}
            >
              <DocumentList />
              <CodeTree />
            </aside>
            <section
              aria-label="本文"
              className={cn('min-h-0 min-w-0 flex-1 flex-col bg-card lg:flex', pane === 'text' ? 'flex' : 'hidden')}
            >
              <DocumentViewer />
            </section>
            <aside
              className={cn(
                'min-h-0 w-full flex-col gap-3 border-l border-border bg-sidebar p-3 lg:flex lg:w-80 lg:shrink-0 xl:w-96',
                pane === 'panel' ? 'flex' : 'hidden',
              )}
            >
              <div role="tablist" aria-label="パネル" className="flex rounded-md bg-muted p-0.5">
                {PANEL_TABS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={panelTab === t.id}
                    onClick={() => setPanelTab(t.id)}
                    className="flex-1 rounded-sm py-1 text-xs text-muted-foreground aria-selected:bg-card aria-selected:font-medium aria-selected:text-foreground aria-selected:shadow-sm"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {panelTab === 'kwic' && <KwicPanel />}
                {panelTab === 'segments' && <SegmentsPanel />}
                {panelTab === 'detail' && <CodingDetail />}
              </div>
            </aside>
          </main>
        </>
      )}
      <ProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
    </div>
  )
}
