import { useEffect, useRef, useState } from 'react'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { LoadingSkeleton } from './LoadingSkeleton'
import { useLocale } from '../state/LocaleContext'

export type PdfPreviewField = { key: string; label: string; value: string | null; page: number; x: number; y: number; width: number; height: number }
const noFields: PdfPreviewField[] = []
export function ReadOnlyPdf({ blob, title, fields = noFields }: { blob: Blob; title: string; fields?: PdfPreviewField[] }) {
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
        if (!stopped) {
          const wrapper = document.createElement('div')
          wrapper.className = 'readonly-pdf-page'
          wrapper.append(canvas)
          const original = page.getViewport({ scale: 1 })
          for (const field of fields.filter(item => item.page === pageNumber && item.value)) {
            const input = document.createElement('input')
            input.readOnly = true; input.value = field.value!; input.title = field.label
            input.setAttribute('aria-label', field.label)
            input.style.left = `${field.x / original.width * 100}%`
            input.style.bottom = `${field.y / original.height * 100}%`
            input.style.width = `${field.width / original.width * 100}%`
            input.style.height = `${field.height / original.height * 100}%`
            wrapper.append(input)
          }
          host.append(wrapper)
        }
      }
      if (!stopped) setLoading(false)
    })().catch(() => { if (!stopped) { setFailed(true); setLoading(false) } })
    return () => { stopped = true; void task?.destroy(); host.replaceChildren() }
  }, [blob, title, fields])
  return <>{loading ? <LoadingSkeleton lines={6} /> : null}{failed ? <p role="alert">{locale === 'ko' ? 'PDF를 표시하지 못했습니다.' : 'Unable to display PDF.'}</p> : null}<div ref={container} className="readonly-pdf" aria-busy={loading} /></>
}
