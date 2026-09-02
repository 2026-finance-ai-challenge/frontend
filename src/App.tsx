import { useEffect } from 'react'
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
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
