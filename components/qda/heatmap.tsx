'use client'

import type { Matrix } from '@/lib/qda/analysis'

export function Heatmap({ matrix, mono }: { matrix: Matrix; mono?: boolean }) {
  const n = matrix.labels.length
  if (n === 0) return <p className="p-6 text-sm text-muted-foreground">表示する対象がありません。</p>
  const cell = n > 25 ? 18 : n > 15 ? 24 : 34
  const labelW = 96
  const size = labelW + n * cell
  const offDiag = matrix.values.flatMap((r, i) => r.filter((_, j) => i !== j))
  const max = Math.max(0.0001, ...offDiag)

  return (
    <div className="overflow-auto">
      <svg
        width={size + 8}
        height={size + 8}
        role="img"
        aria-label="類似度ヒートマップ"
        className="font-sans"
      >
        {matrix.labels.map((l, i) => (
          <g key={`l${i}`}>
            <text x={labelW - 6} y={labelW + i * cell + cell / 2} textAnchor="end" dominantBaseline="middle" className="fill-foreground text-[11px]">
              {l}
            </text>
            <text
              transform={`translate(${labelW + i * cell + cell / 2}, ${labelW - 6}) rotate(-55)`}
              textAnchor="start"
              dominantBaseline="middle"
              className="fill-foreground text-[11px]"
            >
              {l}
            </text>
            {matrix.colors && !mono && (
              <rect x={labelW - 4} y={labelW + i * cell + 3} width={3} height={cell - 6} fill={matrix.colors[i]} />
            )}
          </g>
        ))}
        {matrix.values.map((row, i) =>
          row.map((v, j) => {
            const t = i === j ? 0 : v / max
            return (
              <g key={`${i}-${j}`}>
                <rect
                  x={labelW + j * cell}
                  y={labelW + i * cell}
                  width={cell - 1}
                  height={cell - 1}
                  rx={2}
                  className={i === j ? (mono ? '' : 'fill-muted') : mono ? '' : 'fill-primary'}
                  fill={mono ? (i === j ? 'var(--mono-g5)' : 'var(--mono-g1)') : undefined}
                  fillOpacity={i === j ? 1 : (mono ? 0.03 : 0.06) + t * (mono ? 0.9 : 0.94)}
                  stroke={mono && i === j ? 'var(--mono-g3)' : undefined}
                  strokeWidth={mono && i === j ? 0.5 : undefined}
                >
                  <title>{`${matrix.labels[i]} × ${matrix.labels[j]}: ${v.toFixed(3)}`}</title>
                </rect>
                {cell >= 34 && i !== j && (
                  <text
                    x={labelW + j * cell + cell / 2}
                    y={labelW + i * cell + cell / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`pointer-events-none font-mono text-[9px] ${t > 0.55 ? (mono ? 'fill-card' : 'fill-primary-foreground') : mono ? 'fill-foreground' : 'fill-muted-foreground'}`}
                  >
                    {v.toFixed(2).replace(/^0/, '')}
                  </text>
                )}
              </g>
            )
          }),
        )}
      </svg>
    </div>
  )
}
