import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MarketPage from './pages/MarketPage'
import AdminPage from './pages/AdminPage'
import SlotDetailPage from './pages/SlotDetailPage'
import MyPage from './pages/MyPage'
import LandingPage from './pages/LandingPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/slot/:id" element={<SlotDetailPage />} />
        <Route path="/wallet" element={<MyPage />} />
        <Route path="/wallet/:address" element={<MyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
