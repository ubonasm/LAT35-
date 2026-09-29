'use client'

import { useMemo } from 'react'
import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { useT } from '@/lib/i18n'

export interface MapPoint {
  x: number
  y: number
  label: string
  kind: 'row' | 'col'
  color: string
  size?: number
}

interface LabelNode extends SimulationNodeDatum {
  k: number
  ax: number
  ay: number
  half: number
}

const W = 760
const H = 600
const M = { l: 64, r: 24, t: 20, b: 52 }

function niceTicks(min: number, max: number, count = 6) {
  const span = max - min || 1
  const step0 = span / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= step0) ?? step0
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)))
  return out
}

export function ScatterMap({
  points,
  xLabel,
  yLabel,
  legend,
  mono,
}: {
  points: MapPoint[]
  xLabel: string
  yLabel: string
  mono?: boolean
  legend?: { color: string; label: string; shape: 'circle' | 'square' }[]
}) {
  const t = useT()
  const layout = useMemo(() => {
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const pad = (a: number[]) => {
      const lo = Math.min(...a, 0)
      const hi = Math.max(...a, 0)
      const d = (hi - lo || 1) * 0.08
      return [lo - d, hi + d] as [number, number]
    }
    const [x0, x1] = pad(xs)
    const [y0, y1] = pad(ys)
    const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r)
    const sy = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b)
    const labels: LabelNode[] = points.map((p, k) => {
      const ax = sx(p.x)
      const ay = sy(p.y)
      return { k, ax, ay, x: ax, y: ay - 12, half: p.label.length * 6 + 3 }
    })
    const sim = forceSimulation(labels)
      .force('x', forceX<LabelNode>((d) => d.ax).strength(0.25))
      .force('y', forceY<LabelNode>((d) => d.ay - 12).strength(0.25))
      .force('collide', forceCollide<LabelNode>().radius((d) => Math.max(9, d.half * 0.62)).iterations(3))
      .stop()
    for (let i = 0; i < 260; i++) sim.tick()
    for (const l of labels) {
      l.x = Math.max(M.l + l.half, Math.min(W - M.r - l.half, l.x ?? l.ax))
      l.y = Math.max(M.t + 10, Math.min(H - M.b - 4, l.y ?? l.ay))
    }
    return { sx, sy, labels, xt: niceTicks(x0, x1), yt: niceTicks(y0, y1), x0, x1, y0, y1 }
  }, [points])

  const { sx, sy, labels, xt, yt, x0, x1, y0, y1 } = layout
  if (points.length === 0) return <p className="p-6 text-sm text-muted-foreground">{t('表示する対象がありません。')}</p>

  return (
    <svg viewBox={`0 0 ${W + (legend ? 150 : 0)} ${H}`} className="h-auto w-full font-sans" style={{ maxHeight: '78vh' }} role="img" aria-label={`${xLabel} × ${yLabel}`}>
      <rect width={W + (legend ? 150 : 0)} height={H} fill="var(--card)" />
      <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} stroke="var(--foreground)" />
      <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} stroke="var(--foreground)" />
      {x0 < 0 && x1 > 0 && <line x1={sx(0)} x2={sx(0)} y1={M.t} y2={H - M.b} stroke="var(--network-edge-weak)" strokeDasharray="4 4" />}
      {y0 < 0 && y1 > 0 && <line x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)} stroke="var(--network-edge-weak)" strokeDasharray="4 4" />}
      {xt.map((t) => (
        <g key={`x${t}`} transform={`translate(${sx(t)},${H - M.b})`}>
          <line y2={5} stroke="var(--foreground)" />
          <text y={18} textAnchor="middle" className="fill-foreground text-[11px]">
            {t}
          </text>
        </g>
      ))}
      {yt.map((t) => (
        <g key={`y${t}`} transform={`translate(${M.l},${sy(t)})`}>
          <line x2={-5} stroke="var(--foreground)" />
          <text x={-8} y={4} textAnchor="end" className="fill-foreground text-[11px]">
            {t}
          </text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 12} textAnchor="middle" className="fill-foreground text-[12px]">
        {xLabel}
      </text>
      <text transform={`translate(16,${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-foreground text-[12px]">
        {yLabel}
      </text>

      {labels.map((l) => {
        const dist = Math.hypot((l.x ?? 0) - l.ax, (l.y ?? 0) - l.ay)
        return dist > 22 ? (
          <line key={`lead${l.k}`} x1={l.ax} y1={l.ay} x2={l.x} y2={(l.y ?? 0) + 4} stroke="var(--network-edge-weak)" strokeWidth={0.6} />
        ) : null
      })}
      {points.map((p, k) => {
        const x = sx(p.x)
        const y = sy(p.y)
        const r = p.size ?? 4
        return p.kind === 'col' ? (
          <rect key={k} x={x - r} y={y - r} width={r * 2} height={r * 2} fill="var(--card)" stroke={p.color} strokeWidth={1.6}>
            <title>{`${p.label} (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`}</title>
          </rect>
        ) : (
          <circle
            key={k}
            cx={x}
            cy={y}
            r={r}
            fill={p.color}
            fillOpacity={mono ? 1 : 0.85}
            stroke={mono ? 'var(--mono-stroke)' : 'var(--network-node-stroke)'}
            strokeWidth={mono ? 0.8 : 0.5}
          >
            <title>{`${p.label} (${p.x.toFixed(3)}, ${p.y.toFixed(3)})`}</title>
          </circle>
        )
      })}
      {labels.map((l) => {
        const p = points[l.k]
        return (
          <text
            key={`t${l.k}`}
            x={l.x}
            y={(l.y ?? 0) + 4}
            textAnchor="middle"
            className={p.kind === 'col' ? 'text-[12px] font-semibold' : 'fill-foreground text-[12px]'}
            fill={p.kind === 'col' ? (mono ? 'var(--foreground)' : 'var(--ca-column)') : undefined}
            paintOrder="stroke"
            stroke="var(--card)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          >
            {p.label}
          </text>
        )
      })}
      {legend && (
        <g transform={`translate(${W + 8},${M.t + 10})`} className="text-[11px]">
          {legend.map((it, k) => (
            <g key={k} transform={`translate(0,${k * 18})`}>
              {it.shape === 'square' ? (
                <rect y={-9} width={11} height={11} fill="var(--card)" stroke={it.color} strokeWidth={1.6} />
              ) : (
                <circle
                  cx={5.5}
                  cy={-3.5}
                  r={5.5}
                  fill={it.color}
                  stroke={mono ? 'var(--mono-stroke)' : 'var(--network-node-stroke)'}
                  strokeWidth={mono ? 0.8 : 0.5}
                />
              )}
              <text x={17} className="fill-foreground">
                {it.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}
