'use client'

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useUI } from '@/lib/qda/store'
import { DEGREE_WIDTH, type Project } from '@/lib/qda/types'
import { useT } from '@/lib/i18n'

export function DegreeTimeline({ project, docIds, codeIds }: { project: Project; docIds: string[]; codeIds: string[] }) {
  const jumpTo = useUI((s) => s.jumpTo)
  const t = useT()
  const docs = project.documents.filter((d) => docIds.includes(d.id))
  const codes = project.codes.filter((c) => codeIds.includes(c.id))

  const chartData = docs.map((d) => {
    const row: Record<string, string | number | null> = { name: d.name }
    for (const c of codes) {
      const list = project.codings.filter((x) => x.docId === d.id && x.codeId === c.id)
      row[c.id] = list.length ? Number((list.reduce((s, x) => s + x.degree, 0) / list.length).toFixed(2)) : null
    }
    return row
  })

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">{t('コードライン（発言の流れに沿った度合い）')}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('横軸は発言の順序、縦棒の太さと高さが度合い（1〜3）です。棒をクリックすると本文へ移動します。')}
        </p>
        {docs.map((d) => {
          const n = d.utterances.length
          return (
            <div key={d.id} className="flex flex-col gap-1">
              <p className="text-xs font-medium">{d.name}</p>
              <div className="flex flex-col rounded-md border border-border bg-card">
                {codes.map((c) => {
                  const list = project.codings.filter((x) => x.docId === d.id && x.codeId === c.id)
                  return (
                    <div key={c.id} className="flex items-center border-b border-border/60 last:border-b-0">
                      <span className="flex w-28 shrink-0 items-center gap-1.5 truncate px-2 py-1 text-xs">
                        <span aria-hidden className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      <div className="relative h-9 flex-1 border-l border-border/60">
                        {list.map((x) => (
                          <button
                            key={x.id}
                            type="button"
                            onClick={() => jumpTo(d.id, x.start.u)}
                            title={t('#{n} 度合い{d}', { n: d.utterances[x.start.u]?.number ?? '', d: x.degree })}
                            aria-label={t('#{n} 度合い{d}', { n: d.utterances[x.start.u]?.number ?? '', d: x.degree })}
                            className="absolute bottom-1 -translate-x-1/2 rounded-full"
                            style={{
                              left: `${((x.start.u + 0.5) / n) * 100}%`,
                              width: DEGREE_WIDTH[x.degree],
                              height: `${x.degree * 30}%`,
                              backgroundColor: c.color,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between pl-28 font-mono text-[10px] text-muted-foreground">
                <span>#{d.utterances[0]?.number}</span>
                <span>#{d.utterances[n - 1]?.number}</span>
              </div>
            </div>
          )
        })}
      </section>

      {docs.length > 1 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{t('文書（回）ごとの平均度合い')}</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis domain={[1, 3]} ticks={[1, 2, 3]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: 'var(--border)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {codes.map((c) => (
                  <Line key={c.id} type="monotone" dataKey={c.id} name={c.name} stroke={c.color} strokeWidth={2} connectNulls dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
