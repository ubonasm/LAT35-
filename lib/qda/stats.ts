export interface Edge {
  a: number
  b: number
  v: number
}

export type EdgeMode = 'top' | 'threshold'

/** Jacobi eigenvalue decomposition for a symmetric matrix. Returns eigenpairs sorted descending. */
export function symEig(input: number[][]) {
  const n = input.length
  const a = input.map((r) => [...r])
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j]
    if (off < 1e-18) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = c * akp - s * akq
          a[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = c * apk - s * aqk
          a[q][k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p]
          const vkq = v[k][q]
          v[k][p] = c * vkp - s * vkq
          v[k][q] = s * vkp + c * vkq
        }
      }
    }
  }
  return Array.from({ length: n }, (_, i) => ({ value: a[i][i], vector: v.map((row) => row[i]) })).sort(
    (x, y) => y.value - x.value,
  )
}

export function selectEdges(values: number[][], mode: EdgeMode, top: number, threshold: number): Edge[] {
  const all: Edge[] = []
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) if (values[i][j] > 0) all.push({ a: i, b: j, v: values[i][j] })
  all.sort((x, y) => y.v - x.v)
  if (mode === 'top') {
    const cut = all[Math.min(top, all.length) - 1]?.v ?? 0
    return all.filter((e, k) => k < top || e.v === cut)
  }
  return all.filter((e) => e.v >= threshold)
}

/** Maximum spanning tree (Kruskal) over the given edges: keeps the strongest link that connects each node. */
export function spanningTree(n: number, edges: Edge[]) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  const keep: Edge[] = []
  for (const e of [...edges].sort((x, y) => y.v - x.v)) {
    const ra = find(e.a)
    const rb = find(e.b)
    if (ra !== rb) {
      parent[ra] = rb
      keep.push(e)
    }
  }
  return keep
}

/** Greedy modularity maximisation (Clauset–Newman–Moore) on a weighted graph. */
export function communities(n: number, edges: Edge[]) {
  const comm = Array.from({ length: n }, (_, i) => i)
  const m2 = edges.reduce((s, e) => s + 2 * e.v, 0)
  if (m2 === 0) return comm
  const w = new Map<string, number>()
  const key = (x: number, y: number) => (x < y ? `${x}:${y}` : `${y}:${x}`)
  const deg = new Array(n).fill(0)
  for (const e of edges) {
    w.set(key(e.a, e.b), (w.get(key(e.a, e.b)) ?? 0) + e.v)
    deg[e.a] += e.v
    deg[e.b] += e.v
  }
  const tot = [...deg]
  for (;;) {
    let best = 0
    let pair: [number, number] | null = null
    for (const [k, eij] of w) {
      const [x, y] = k.split(':').map(Number)
      const dq = 2 * (eij / m2 - (tot[x] / m2) * (tot[y] / m2))
      if (dq > best) {
        best = dq
        pair = [x, y]
      }
    }
    if (!pair) break
    const [keepC, dropC] = pair
    for (let i = 0; i < n; i++) if (comm[i] === dropC) comm[i] = keepC
    tot[keepC] += tot[dropC]
    tot[dropC] = 0
    const next = new Map<string, number>()
    for (const [k, eij] of w) {
      let [x, y] = k.split(':').map(Number)
      if (x === dropC) x = keepC
      if (y === dropC) y = keepC
      if (x === y) continue
      next.set(key(x, y), (next.get(key(x, y)) ?? 0) + eij)
    }
    w.clear()
    for (const [k, v] of next) w.set(k, v)
  }
  const ids = new Map<number, number>()
  const sizes = new Map<number, number>()
  for (const c of comm) sizes.set(c, (sizes.get(c) ?? 0) + 1)
  const order = [...sizes.entries()].sort((x, y) => y[1] - x[1]).map(([c]) => c)
  order.forEach((c, i) => ids.set(c, i))
  return comm.map((c) => ids.get(c)!)
}

/** Classical (Torgerson) MDS from a dissimilarity matrix. */
export function classicalMDS(dist: number[][]) {
  const n = dist.length
  if (n < 3) return { coords: dist.map((_, i) => [i, 0] as [number, number]), explained: [1, 0] as [number, number] }
  const d2 = dist.map((r) => r.map((x) => x * x))
  const rowMean = d2.map((r) => r.reduce((s, x) => s + x, 0) / n)
  const all = rowMean.reduce((s, x) => s + x, 0) / n
  const b = d2.map((r, i) => r.map((x, j) => -0.5 * (x - rowMean[i] - rowMean[j] + all)))
  const eig = symEig(b)
  const positive = eig.filter((e) => e.value > 0).reduce((s, e) => s + e.value, 0) || 1
  const [e1, e2] = eig
  const coords = Array.from({ length: n }, (_, i) => [
    e1.vector[i] * Math.sqrt(Math.max(0, e1.value)),
    e2.vector[i] * Math.sqrt(Math.max(0, e2.value)),
  ]) as [number, number][]
  const stress = kruskalStress(dist, coords)
  return { coords, explained: [Math.max(0, e1.value) / positive, Math.max(0, e2.value) / positive] as [number, number], stress }
}

function kruskalStress(dist: number[][], coords: [number, number][]) {
  let num = 0
  let den = 0
  for (let i = 0; i < dist.length; i++)
    for (let j = i + 1; j < dist.length; j++) {
      const dh = Math.hypot(coords[i][0] - coords[j][0], coords[i][1] - coords[j][1])
      num += (dist[i][j] - dh) ** 2
      den += dist[i][j] ** 2
    }
  return den === 0 ? 0 : Math.sqrt(num / den)
}

/** Average-linkage hierarchical clustering, cut into k clusters. */
export function hclust(dist: number[][], k: number) {
  const n = dist.length
  let clusters = Array.from({ length: n }, (_, i) => [i])
  const target = Math.max(1, Math.min(k, n))
  while (clusters.length > target) {
    let best = Infinity
    let bi = 0
    let bj = 1
    for (let i = 0; i < clusters.length; i++)
      for (let j = i + 1; j < clusters.length; j++) {
        let s = 0
        for (const x of clusters[i]) for (const y of clusters[j]) s += dist[x][y]
        const avg = s / (clusters[i].length * clusters[j].length)
        if (avg < best) {
          best = avg
          bi = i
          bj = j
        }
      }
    clusters[bi] = [...clusters[bi], ...clusters[bj]]
    clusters = clusters.filter((_, idx) => idx !== bj)
  }
  const label = new Array(n).fill(0)
  clusters
    .sort((x, y) => y.length - x.length)
    .forEach((c, ci) => c.forEach((i) => (label[i] = ci)))
  return label as number[]
}

export interface CAResult {
  rows: [number, number][]
  cols: [number, number][]
  inertia: [number, number]
  explained: [number, number]
  totalInertia: number
  chi2: number
  df: number
  p: number
  total: number
}

/** Regularized upper incomplete gamma Q(a, x) (Numerical Recipes: series for x < a+1, continued fraction otherwise). */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1
  const lnGamma = (z: number) => {
    const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]
    let y = z
    const t = z + 5.5 - (z + 0.5) * Math.log(z + 5.5)
    let s = 1.000000000190015
    for (const c of g) s += c / ++y
    return -t + Math.log((2.5066282746310005 * s) / z)
  }
  const gln = lnGamma(a)
  if (x < a + 1) {
    let ap = a
    let sum = 1 / a
    let del = sum
    for (let n = 0; n < 500; n++) {
      del *= x / ++ap
      sum += del
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break
    }
    return Math.max(0, 1 - sum * Math.exp(-x + a * Math.log(x) - gln))
  }
  let b = x + 1 - a
  let c = 1 / 1e-300
  let d = 1 / b
  let h = d
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = b + an / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return Math.min(1, Math.exp(-x + a * Math.log(x) - gln) * h)
}

export function formatP(p: number) {
  return p < 0.001 ? 'p < .001' : `p = ${p.toFixed(3).replace(/^0/, '')}`
}

/** Simple correspondence analysis of a contingency table (rows × cols), symmetric map (principal coords). */
export function correspondenceAnalysis(table: number[][]): CAResult | null {
  const R = table.length
  const C = table[0]?.length ?? 0
  const total = table.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0)
  if (R < 2 || C < 3 || total === 0) return null
  const r = table.map((row) => row.reduce((a, b) => a + b, 0) / total)
  const c = Array.from({ length: C }, (_, j) => table.reduce((s, row) => s + row[j], 0) / total)
  if (r.some((x) => x === 0) || c.some((x) => x === 0)) return null
  const S = table.map((row, i) => row.map((x, j) => (x / total - r[i] * c[j]) / Math.sqrt(r[i] * c[j])))
  const StS = Array.from({ length: C }, (_, a) =>
    Array.from({ length: C }, (_, b) => S.reduce((s, row) => s + row[a] * row[b], 0)),
  )
  const eig = symEig(StS)
  const totalInertia = eig.reduce((s, e) => s + Math.max(0, e.value), 0) || 1
  const dims = eig.slice(0, 2)
  const sig = dims.map((e) => Math.sqrt(Math.max(0, e.value)))
  const cols = Array.from({ length: C }, (_, j) => dims.map((e, k) => (e.vector[j] * sig[k]) / Math.sqrt(c[j])) as [number, number])
  const rows = S.map(
    (row, i) =>
      dims.map((e, k) => {
        if (sig[k] === 0) return 0
        const u = row.reduce((s, x, j) => s + x * e.vector[j], 0) / sig[k]
        return (u * sig[k]) / Math.sqrt(r[i])
      }) as [number, number],
  )
  const phi2 = S.reduce((s, row) => s + row.reduce((a, x) => a + x * x, 0), 0)
  const chi2 = phi2 * total
  const df = (R - 1) * (C - 1)
  return {
    rows,
    cols,
    inertia: [dims[0].value, dims[1]?.value ?? 0],
    explained: [Math.max(0, dims[0].value) / totalInertia, Math.max(0, dims[1]?.value ?? 0) / totalInertia],
    totalInertia: phi2,
    chi2,
    df,
    p: gammaQ(df / 2, chi2 / 2),
    total,
  }
}

export const PALETTE = [
  '#8dd3c7',
  '#fdd97a',
  '#bebada',
  '#fb8072',
  '#80b1d3',
  '#fdb462',
  '#b3de69',
  '#fccde5',
  '#d9d9d9',
  '#bc80bd',
  '#ccebc5',
  '#ffed6f',
]
