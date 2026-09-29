'use client'

import { useMemo } from 'react'
import type { Matrix } from '@/lib/qda/analysis'
import { classicalMDS, hclust, PALETTE } from '@/lib/qda/stats'
import { ScatterMap, type MapPoint } from './scatter-map'
import { useT } from '@/lib/i18n'

export type MdsColor = 'cluster' | 'own' | 'none'

const GRAYS = ['var(--mono-g1)', 'var(--mono-g4)', 'var(--mono-g2)', 'var(--mono-g5)', 'var(--mono-g3)', 'var(--mono-g6)']

export function MdsMap({ matrix, clusters, color = 'cluster' }: { matrix: Matrix; clusters: number; color?: MdsColor }) {
  const t = useT()
  const res = useMemo(() => {
    if (matrix.labels.length < 3) return null
    const dist = matrix.values.map((row, i) => row.map((v, j) => (i === j ? 0 : 1 - Math.max(0, Math.min(1, v)))))
    return { mds: classicalMDS(dist), cl: hclust(dist, clusters) }
  }, [matrix, clusters])

  if (!res) return <p className="p-6 text-sm text-muted-foreground">{t('多次元尺度構成法には3つ以上の対象が必要です。')}</p>

  const own = color === 'own' && !!matrix.colors
  const mono = color === 'none'
  const clusterColor = (c: number) => (mono ? GRAYS[c % GRAYS.length] : PALETTE[c % PALETTE.length])
  const maxW = Math.max(1, ...matrix.weights)
  const points: MapPoint[] = matrix.labels.map((label, i) => ({
    x: res.mds.coords[i][0],
    y: res.mds.coords[i][1],
    label,
    kind: 'row',
    color: own ? matrix.colors![i] : clusterColor(res.cl[i]),
    size: 4 + 10 * Math.sqrt(matrix.weights[i] / maxW),
  }))
  const clusterIds = [...new Set(res.cl)].sort((a, b) => a - b)
  const legend = own
    ? undefined
    : clusterIds.map((c) => ({ color: clusterColor(c), label: t('クラスター {n}', { n: String(c + 1).padStart(2, '0') }), shape: 'circle' as const }))
  const [e1, e2] = res.mds.explained
  const colorNote = own
    ? t('色＝コードの色')
    : t('{v}＝平均連結法によるクラスター {n}', { v: t(mono ? '濃淡' : '色'), n: clusterIds.length })

  return (
    <div className="flex flex-col gap-1">
      <ScatterMap
        points={points}
        xLabel={t('次元{d}（{p}%）', { d: 1, p: (e1 * 100).toFixed(1) })}
        yLabel={t('次元{d}（{p}%）', { d: 2, p: (e2 * 100).toFixed(1) })}
        legend={legend}
        mono={mono}
      />
      <p className="px-1 font-mono text-[11px] text-muted-foreground">
        {t('N {n} ・ 古典的MDS（距離＝1−類似度） ・ Kruskal Stress-1 {s} ・ 累積寄与率（次元1–2） {c}% ・ {note} ・ 円の大きさ＝出現数', { n: matrix.labels.length, s: (res.mds.stress ?? 0).toFixed(3), c: ((e1 + e2) * 100).toFixed(1), note: colorNote })}
      </p>
    </div>
  )
}
