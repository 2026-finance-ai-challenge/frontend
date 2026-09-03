import { useLayoutEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StockPage } from './pages/StockPage'
import { NewsDetailPage, NewsPage } from './pages/NewsPage'
import { DisclosureDetailPage, DisclosurePage } from './pages/DisclosurePage'
import { MyPage } from './pages/MyPage'
import { LoginPage, SignupPage } from './pages/AuthPage'
import { SearchPage } from './pages/SearchPage'
import { LegalPage } from './pages/LegalPage'
import { ForeignLimitsPage } from './pages/ForeignLimitsPage'
import { KAgentFloating } from './components/KAgentFloating'
import { TaxDocumentPage } from './pages/TaxDocumentPage'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stocks/:stockCode" element={<StockPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:newsId" element={<NewsDetailPage />} />
        <Route path="/disclosures" element={<DisclosurePage />} />
        <Route path="/disclosures/:disclosureId" element={<DisclosureDetailPage />} />
        <Route path="/foreign-limits" element={<ForeignLimitsPage />} />
        <Route path="/tax" element={<HomePage />} />
        <Route path="/tax-documents/:documentId" element={<TaxDocumentPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/legal/terms" element={<LegalPage document="terms" />} />
        <Route path="/legal/privacy" element={<LegalPage document="privacy" />} />
        <Route path="/legal/fsc-disclaimer" element={<LegalPage document="fsc" />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <KAgentFloating />
    </>
  )
}

function ScrollToTop() {
  const { key, pathname } = useLocation()

  useLayoutEffect(() => {
    // 새 화면을 그리기 전에 즉시 초기화하여 이전 위치나 이동 애니메이션을 노출하지 않는다.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [key, pathname])

  return null
}
