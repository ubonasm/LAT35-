'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type Format = 'png' | 'jpg' | 'pdf' | 'svg'

const SVG_STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
  'visibility',
] as const

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|\s]+/g, '_')
}

function stamp() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function trigger(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

/**
 * Serialises the chart's own <svg> with computed styles inlined, so the file stays
 * real vector graphics that Illustrator / Inkscape / Word can edit (html-to-image's
 * SVG output wraps HTML in <foreignObject>, which those tools can't render).
 */
function nativeSvg(svg: SVGSVGElement, background: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const src = [svg, ...svg.querySelectorAll('*')]
  const dst = [clone, ...clone.querySelectorAll('*')]
  src.forEach((el, i) => {
    const cs = getComputedStyle(el)
    const target = dst[i] as SVGElement
    const style = SVG_STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';')
    target.setAttribute('style', style)
    target.removeAttribute('class')
  })
  const box = svg.viewBox.baseVal
  const w = box && box.width ? box.width : svg.clientWidth
  const h = box && box.height ? box.height : svg.clientHeight
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${w} ${h}`)
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bg.setAttribute('x', String(box?.x ?? 0))
  bg.setAttribute('y', String(box?.y ?? 0))
  bg.setAttribute('width', String(w))
  bg.setAttribute('height', String(h))
  bg.setAttribute('fill', background)
  clone.insertBefore(bg, clone.firstChild)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`
}

export function ExportableFigure({
  filename,
  className,
  children,
}: {
  filename: string
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<Format | null>(null)
  const [error, setError] = useState<string | null>(null)
  const t = useT()

  const exportAs = async (format: Format) => {
    const node = ref.current
    if (!node) return
    setBusy(format)
    setError(null)
    try {
      const { toJpeg, toPng, toSvg } = await import('html-to-image')
      const backgroundColor = getComputedStyle(node).backgroundColor
      const opts = { pixelRatio: 2, backgroundColor, cacheBust: true }
      const base = `${safeName(filename)}_${stamp()}`
      if (format === 'png') {
        trigger(await toPng(node, opts), `${base}.png`)
      } else if (format === 'jpg') {
        trigger(await toJpeg(node, { ...opts, quality: 0.95 }), `${base}.jpg`)
      } else if (format === 'svg') {
        const svgs = [...node.querySelectorAll<SVGSVGElement>('svg')].filter(
          (s) => !s.parentElement?.closest('svg') && s.clientWidth > 120,
        )
        if (svgs.length === 1) {
          const blob = new Blob([nativeSvg(svgs[0], backgroundColor)], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)
          trigger(url, `${base}.svg`)
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } else {
          trigger(await toSvg(node, opts), `${base}.svg`)
        }
      } else {
        const dataUrl = await toPng(node, opts)
        const { jsPDF } = await import('jspdf')
        const w = node.offsetWidth
        const h = node.offsetHeight
        const pdf = new jsPDF({ orientation: w >= h ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
        const pageW = pdf.internal.pageSize.getWidth()
        const pageH = pdf.internal.pageSize.getHeight()
        const margin = 36
        const scale = Math.min((pageW - margin * 2) / w, (pageH - margin * 2) / h)
        const iw = w * scale
        const ih = h * scale
        pdf.addImage(dataUrl, 'PNG', (pageW - iw) / 2, (pageH - ih) / 2, iw, ih)
        pdf.save(`${base}.pdf`)
      }
    } catch {
      setError(t('図の書き出しに失敗しました。もう一度お試しください。'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Download className="size-3.5" aria-hidden />
          {t('図を保存')}
        </span>
        {(['png', 'jpg', 'pdf', 'svg'] as Format[]).map((f) => (
          <Button key={f} size="sm" variant="outline" className="h-7 px-2.5 font-mono text-xs uppercase" disabled={busy !== null} onClick={() => exportAs(f)}>
            {busy === f ? '…' : f}
          </Button>
        ))}
      </div>
      {error && <p className="text-right text-xs text-destructive">{error}</p>}
      <div ref={ref} className={cn('rounded-lg border border-border bg-card p-3', className)}>
        {children}
      </div>
    </div>
  )
}
