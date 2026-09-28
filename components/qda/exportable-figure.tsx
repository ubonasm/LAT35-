'use client'

import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Format = 'png' | 'jpg' | 'pdf'

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

  const exportAs = async (format: Format) => {
    const node = ref.current
    if (!node) return
    setBusy(format)
    setError(null)
    try {
      const { toJpeg, toPng } = await import('html-to-image')
      const backgroundColor = getComputedStyle(node).backgroundColor
      const opts = { pixelRatio: 2, backgroundColor, cacheBust: true }
      const base = `${safeName(filename)}_${stamp()}`
      if (format === 'png') {
        trigger(await toPng(node, opts), `${base}.png`)
      } else if (format === 'jpg') {
        trigger(await toJpeg(node, { ...opts, quality: 0.95 }), `${base}.jpg`)
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
      setError('図の書き出しに失敗しました。もう一度お試しください。')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Download className="size-3.5" aria-hidden />
          図を保存
        </span>
        {(['png', 'jpg', 'pdf'] as Format[]).map((f) => (
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
