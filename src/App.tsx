import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StockPage } from './pages/StockPage'
import { NewsDetailPage, NewsPage } from './pages/NewsPage'
import { DisclosureDetailPage, DisclosurePage } from './pages/DisclosurePage'
import { TaxPage } from './pages/TaxPage'
import { MyPage } from './pages/MyPage'
import { LoginPage, SignupPage } from './pages/AuthPage'
import { SearchPage } from './pages/SearchPage'
import { KAgentFloating } from './components/KAgentFloating'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stocks/:stockCode" element={<StockPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:newsId" element={<NewsDetailPage />} />
        <Route path="/disclosures" element={<DisclosurePage />} />
        <Route path="/disclosures/:disclosureId" element={<DisclosureDetailPage />} />
        <Route path="/tax" element={<TaxPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <KAgentFloating />
    </>
  )
}
