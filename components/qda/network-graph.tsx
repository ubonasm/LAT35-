'use client'

import { useMemo } from 'react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Matrix } from '@/lib/qda/analysis'
import { communities, PALETTE, selectEdges, spanningTree, type EdgeMode } from '@/lib/qda/stats'
import { useT } from '@/lib/i18n'

export type ColorBy = 'community' | 'own' | 'none'

export interface NetworkOptions {
  mode: EdgeMode
  top: number
  threshold: number
  mst: boolean
  hideIsolated: boolean
  colorBy: ColorBy
}

interface Node extends SimulationNodeDatum {
  i: number
  r: number
  half: number
}
interface Link {
  source: number | Node
  target: number | Node
  v: number
}

const LEGEND_W = 150

export function NetworkGraph({ matrix, options }: { matrix: Matrix; options: NetworkOptions }) {
  const t = useT()
  const layout = useMemo(() => {
    const n = matrix.labels.length
    let edges = selectEdges(matrix.values, options.mode, options.top, options.threshold)
    if (options.mst) edges = spanningTree(n, edges)
    const comm = communities(n, edges)
    const connected = new Set(edges.flatMap((e) => [e.a, e.b]))
    const visible = matrix.labels.map((_, i) => i).filter((i) => !options.hideIsolated || connected.has(i))
    const maxW = Math.max(1, ...visible.map((i) => matrix.weights[i]))
    const nodes: Node[] = visible.map((i) => ({
      i,
      r: 8 + 20 * Math.sqrt(matrix.weights[i] / maxW),
      half: 0,
    }))
    for (const nd of nodes) nd.half = Math.max(nd.r, matrix.labels[nd.i].length * 6.5)
    const index = new Map(nodes.map((nd, k) => [nd.i, k]))
    const links: Link[] = edges
      .filter((e) => index.has(e.a) && index.has(e.b))
      .map((e) => ({ source: index.get(e.a)!, target: index.get(e.b)!, v: e.v }))
    const vMin = Math.min(...links.map((l) => l.v), 1)
    const vMax = Math.max(...links.map((l) => l.v), 0)
    const norm = (v: number) => (vMax > vMin ? (v - vMin) / (vMax - vMin) : 1)

    const sameComm = (l: Link) => comm[(l.source as Node).i] === comm[(l.target as Node).i]
    // Seed nodes of each community around a ring so groups start apart instead of collapsing into one ball.
    const commIds = [...new Set(nodes.map((nd) => comm[nd.i]))]
    const ringR = 60 + 40 * Math.sqrt(nodes.length)
    const center = new Map(
      commIds.map((c, k) => {
        const a = (2 * Math.PI * k) / Math.max(1, commIds.length)
        return [c, commIds.length > 1 ? [Math.cos(a) * ringR, Math.sin(a) * ringR] : [0, 0]] as const
      }),
    )
    nodes.forEach((nd, k) => {
      const [cx, cy] = center.get(comm[nd.i])!
      nd.x = cx + Math.cos(k * 2.4) * (10 + k)
      nd.y = cy + Math.sin(k * 2.4) * (10 + k)
    })

    const sim = forceSimulation(nodes)
      .force('charge', forceManyBody<Node>().strength(-650).distanceMax(700))
      .force(
        'link',
        forceLink<Node, Link>(links)
          .distance(
            (l) =>
              60 +
              60 * (1 - norm(l.v)) +
              ((l.source as Node).half + (l.target as Node).half) * 0.7 +
              (sameComm(l) ? 0 : 70),
          )
          .strength((l) => (sameComm(l) ? 0.7 : 0.12)),
      )
      .force('x', forceX<Node>((d) => center.get(comm[d.i])![0] * 0.6).strength(0.03))
      .force('y', forceY<Node>((d) => center.get(comm[d.i])![1] * 0.6).strength(0.04))
      .force('collide', forceCollide<Node>().radius((d) => d.half + 12).strength(1).iterations(4))
      .stop()
    for (let k = 0; k < 600; k++) sim.tick()

    const pad = 24
    const xs = nodes.flatMap((nd) => [(nd.x ?? 0) - nd.half, (nd.x ?? 0) + nd.half])
    const ys = nodes.flatMap((nd) => [(nd.y ?? 0) - nd.r, (nd.y ?? 0) + nd.r + 16])
    const minX = Math.min(...xs) - pad
    const minY = Math.min(...ys) - pad
    const w = Math.max(...xs) - minX + pad
    const h = Math.max(...ys) - minY + pad
    const commCount = new Set(nodes.map((nd) => comm[nd.i])).size
    const density = nodes.length > 1 ? (2 * links.length) / (nodes.length * (nodes.length - 1)) : 0
    return { nodes, links, comm, norm, minX, minY, w, h, commCount, density, maxW }
  }, [matrix, options.mode, options.top, options.threshold, options.mst, options.hideIsolated])

  const { nodes, links, comm, norm, minX, minY, w, h, commCount, density, maxW } = layout
  if (nodes.length === 0)
    return <p className="p-6 text-sm text-muted-foreground">{t('表示できる線がありません。描画する線の数を増やすか、閾値を下げてください。')}</p>

  const fillOf = (i: number) => {
    if (options.colorBy === 'own' && matrix.colors) return matrix.colors[i]
    if (options.colorBy === 'community') return PALETTE[comm[i] % PALETTE.length]
    return 'var(--mono-node)'
  }
  const mono = options.colorBy === 'none'
  const dashed = options.colorBy !== 'own'
  const nodeStroke = mono ? 'var(--mono-stroke)' : 'var(--network-node-stroke)'
  const legendH = Math.max(h, 320)
  const sizeSteps = [0.25, 0.5, 1].map((f) => Math.max(1, Math.round(maxW * f)))
  const communityIds = [...new Set(nodes.map((nd) => comm[nd.i]))].sort((a, b) => a - b).slice(0, 12)

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`${minX} ${minY} ${w + LEGEND_W} ${legendH}`}
        className="h-auto w-full font-sans"
        style={{ maxHeight: '78vh' }}
        role="img"
        aria-label={t('共起ネットワーク')}
      >
        <rect x={minX} y={minY} width={w + LEGEND_W} height={legendH} fill="var(--card)" />
        {links.map((l, k) => {
          const s = l.source as Node
          const t = l.target as Node
          const same = !dashed || comm[s.i] === comm[t.i]
          return (
            <line
              key={k}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke={mono ? (same ? 'var(--mono-edge)' : 'var(--mono-edge-weak)') : same ? 'var(--network-edge)' : 'var(--network-edge-weak)'}
              strokeWidth={same ? 1 + 3 * norm(l.v) : 1}
              strokeDasharray={same ? undefined : '2 3'}
            >
              <title>{`${matrix.labels[s.i]} — ${matrix.labels[t.i]}: ${l.v.toFixed(3)}`}</title>
            </line>
          )
        })}
        {nodes.map((nd) => (
          <g key={nd.i} transform={`translate(${nd.x},${nd.y})`}>
            <circle r={nd.r} fill={fillOf(nd.i)} fillOpacity={mono ? 1 : 0.9} stroke={nodeStroke} strokeWidth={1} />
            <text
              y={4}
              textAnchor="middle"
              className="fill-foreground text-[12px] font-medium"
              paintOrder="stroke"
              stroke="var(--card)"
              strokeWidth={2.5}
              strokeLinejoin="round"
            >
              {matrix.labels[nd.i]}
            </text>
            <title>{`${matrix.labels[nd.i]}（${matrix.weights[nd.i]}）`}</title>
          </g>
        ))}

        <g transform={`translate(${minX + w + 10},${minY + 20})`} className="text-[11px]">
          {options.colorBy === 'community' && (
            <>
              <text className="fill-foreground font-medium">{t('グループ')}</text>
              {communityIds.map((c, k) => (
                <g key={c} transform={`translate(${(k % 2) * 60},${16 + Math.floor(k / 2) * 17})`}>
                  <rect width={12} height={12} y={-10} rx={2} fill={PALETTE[c % PALETTE.length]} stroke="var(--network-node-stroke)" strokeWidth={0.5} />
                  <text x={17} className="fill-foreground">
                    {String(c + 1).padStart(2, '0')}
                  </text>
                </g>
              ))}
            </>
          )}
          <g transform={`translate(0,${options.colorBy === 'community' ? 36 + Math.ceil(communityIds.length / 2) * 17 : 0})`}>
            <text className="fill-foreground font-medium">{t('頻度')}</text>
            {sizeSteps.map((v, k) => {
              const r = 8 + 20 * Math.sqrt(v / maxW)
              const y = 18 + k * 52 + r
              return (
                <g key={k}>
                  <circle cx={30} cy={y} r={r} fill="none" stroke={nodeStroke} />
                  <text x={66} y={y + 4} className="fill-foreground">
                    {v}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>
      <p className="px-1 font-mono text-[11px] text-muted-foreground">
        {`N ${nodes.length}, E ${links.length}, D ${density.toFixed(3)}`}
        {dashed && t(' ・ グループ {n}（modularity） ・ 実線＝同じグループ内、点線＝グループ間', { n: commCount })}
      </p>
    </div>
  )
}
