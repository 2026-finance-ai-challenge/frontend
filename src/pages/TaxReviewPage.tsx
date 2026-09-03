import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiBlob } from '../api'
import { Header } from '../components/Layout'
import { LoadingSkeleton } from '../components/LoadingSkeleton'
import { RemoteState } from '../components/RemoteState'
import { useProfile, useRemote } from '../hooks/useRemote'
import { useLocale } from '../state/LocaleContext'
import { openTaxEligibility } from '../agentEvents'
import { ReadOnlyPdf } from '../components/ReadOnlyPdf'

type ReviewPackage = { documents: { id: string; documentType: string; mediaType: string }[]; correctionPdfPath: string }
export function TaxReviewPage() {
  const { locale } = useLocale()
  const profile = useProfile()
  const state = useRemote(signal => profile?.taxVerificationStatus === 'VERIFIED' ? api<ReviewPackage>('/api/v1/me/tax-review-package', { signal }) : Promise.resolve(null), [profile?.id, profile?.taxVerificationStatus])
  const labels: Record<string, string> = locale === 'ko'
    ? { RESIDENCY_CERTIFICATE: '거주자증명서', APOSTILLE: '아포스티유', REDUCED_TAX_APPLICATION: '제한세율 적용신청서' }
    : { RESIDENCY_CERTIFICATE: 'Certificate of residence', APOSTILLE: 'Apostille', REDUCED_TAX_APPLICATION: 'Application for reduced tax rate' }
  return <><Header white /><main className="page-shell tax-review-page">
    <h1>{locale === 'ko' ? '검증 완료 문서' : 'Verified documents'}</h1>
    <p>{locale === 'ko' ? '투자자가 금융사에 제출하기 전 확인하는 읽기 전용 사전 점검 자료입니다. 세무 신고·접수 또는 금융사의 최종 승인을 의미하지 않습니다.' : 'Read-only pre-submission materials for your financial institution. Verification does not mean a tax filing, receipt, or final approval by the institution.'}</p>
    {!profile ? <Link className="login-button" to="/login?returnTo=%2Ftax%2Freview">{locale === 'ko' ? '로그인' : 'Log in'}</Link> : profile.taxVerificationStatus !== 'VERIFIED' ? <p>{locale === 'ko' ? '세 가지 서류의 검증과 비교를 완료하면 표시됩니다.' : 'Available after verification and comparison of all three documents.'}</p> : <RemoteState {...state}>{value => value && <>
      <section className="tax-review-documents">{value.documents.map(doc => <SecurePreview key={doc.id} path={`/api/v1/me/tax-documents/${doc.id}/original`} title={labels[doc.documentType] || doc.documentType} />)}</section>
      <section><h2>{locale === 'ko' ? '예상 작성 경정청구서' : 'Estimated draft correction request'}</h2>
        <p>{locale === 'ko' ? '검증된 성명·납세자번호·거주국만 반영했습니다. 배당·원천징수 내역, 청구 금액 및 금융사 정보는 미확인이므로 비워 두었습니다. 금융사의 확인과 보완이 필요하며 서명·제출되지 않은 예상 초안입니다.' : 'Only verified name, taxpayer ID, and residence country are populated. Dividend and withholding records, claim amount, and institution details remain blank because they are unverified. This unsigned, unsubmitted draft requires completion by your institution.'}</p>
        <SecurePreview path={value.correctionPdfPath} title={locale === 'ko' ? '예상 작성 경정청구서 PDF' : 'Estimated correction request PDF'} large />
      </section>
    </>}</RemoteState>}
    <button className="login-button" type="button" onClick={openTaxEligibility}>{locale === 'ko' ? '세무 채팅 열기' : 'Open tax conversation'}</button>
  </main></>
}
function SecurePreview({ path, title, large = false }: { path: string; title: string; large?: boolean }) {
  const { locale } = useLocale()
  const [value, setValue] = useState<{ url: string; type: string; blob: Blob } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController(); let url: string | undefined
    setValue(null); setFailed(false)
    void apiBlob(path, { signal: controller.signal }).then(blob => {
      if (controller.signal.aborted) return
      url = URL.createObjectURL(blob); setValue({ url, type: blob.type, blob })
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url) }
  }, [path])
  return <article className={`tax-review-document${large ? ' is-large' : ''}`}><h3>{title}</h3>{failed ? <p role="alert">{locale === 'ko' ? '문서를 불러오지 못했습니다.' : 'Unable to load document.'}</p> : !value ? <LoadingSkeleton lines={6} /> : value.type.startsWith('image/') ? <img src={value.url} alt={title} /> : <ReadOnlyPdf blob={value.blob} title={title} />}</article>
}
