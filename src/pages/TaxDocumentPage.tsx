import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiBlob } from '../api'
import { useLocale } from '../state/LocaleContext'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function TaxDocumentPage() {
  const { documentId } = useParams()
  const { locale } = useLocale()
  const [document, setDocument] = useState<{ url: string; type: string } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let url: string | undefined
    setDocument(null); setFailed(false)
    // 새 탭에서도 소유자 인증을 거쳐 원본을 읽고 탭 종료 시 임시 URL을 해제한다.
    void apiBlob(`/api/v1/me/tax-documents/${encodeURIComponent(documentId || '')}/original`, { signal: controller.signal }).then(blob => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(blob)
      setDocument({ url, type: blob.type })
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [documentId])
  return <main className="tax-document-viewer">
    {failed ? <p role="alert">{locale === 'ko' ? '문서가 삭제되었거나 열 수 없습니다.' : 'This document was removed or cannot be opened.'}</p>
      : !document ? <LoadingSkeleton lines={6} />
      : document.type.startsWith('image/') ? <img src={document.url} alt={locale === 'ko' ? '업로드한 문서' : 'Uploaded document'} />
      : <iframe title="PDF" src={document.url} />}
  </main>
}
