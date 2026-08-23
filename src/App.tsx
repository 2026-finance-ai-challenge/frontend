import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { StockPage } from './pages/StockPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/stocks/:stockCode" element={<StockPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
