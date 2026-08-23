import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StockPage } from './pages/StockPage'
import { NewsDetailPage, NewsPage } from './pages/NewsPage'
import { DisclosureDetailPage, DisclosurePage } from './pages/DisclosurePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/stocks/:stockCode" element={<StockPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/news/:newsId" element={<NewsDetailPage />} />
      <Route path="/disclosures" element={<DisclosurePage />} />
      <Route path="/disclosures/:disclosureId" element={<DisclosureDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
