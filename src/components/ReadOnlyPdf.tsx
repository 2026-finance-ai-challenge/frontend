import { useEffect, useRef, useState } from 'react'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { LoadingSkeleton } from './LoadingSkeleton'
import { useLocale } from '../state/LocaleContext'

export function ReadOnlyPdf({ blob, title }: { blob: Blob; title: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const { locale } = useLocale()
  useEffect(() => {
    let stopped = false
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | undefined
    const host = container.current!
    setLoading(true); setFailed(false)
    void (async () => {
      const pdfjs = await import('pdfjs-dist')
      const data = new Uint8Array(await blob.arrayBuffer())
      if (stopped) return
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      // 문서의 스크립트·폼·외부 링크를 실행하지 않고 페이지 그림만 표시한다.
      task = pdfjs.getDocument({ data, enableXfa: false })
      const pdf = await task.promise
      for (let pageNumber = 1; pageNumber <= pdf.numPages && !stopped; pageNumber++) {
        const page = await pdf.getPage(pageNumber)
        if (stopped) break
        const viewport = page.getViewport({ scale: 1.8 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        canvas.setAttribute('role', 'img')
        canvas.setAttribute('aria-label', `${title} · ${pageNumber}`)
        await page.render({ canvas, viewport }).promise
        if (!stopped) host.append(canvas)
      }
      if (!stopped) setLoading(false)
    })().catch(() => { if (!stopped) { setFailed(true); setLoading(false) } })
    return () => { stopped = true; void task?.destroy(); host.replaceChildren() }
  }, [blob, title])
  return <>{loading ? <LoadingSkeleton lines={6} /> : null}{failed ? <p role="alert">{locale === 'ko' ? 'PDF를 표시하지 못했습니다.' : 'Unable to display PDF.'}</p> : null}<div ref={container} className="readonly-pdf" aria-busy={loading} /></>
}
