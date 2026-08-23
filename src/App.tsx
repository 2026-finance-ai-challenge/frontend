import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StockPage } from './pages/StockPage'
import { NewsDetailPage, NewsPage } from './pages/NewsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/stocks/:stockCode" element={<StockPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/news/:newsId" element={<NewsDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
