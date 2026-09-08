import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import ExploreScreen from './screens/ExploreScreen.jsx'
import SiteDetailScreen from './screens/SiteDetailScreen.jsx'
import ScanScreen from './screens/ScanScreen.jsx'
import TripScreen from './screens/TripScreen.jsx'

/**
 * خريطة التنقّل.
 *
 * ثلاث شاشات رئيسية في الشريط السفلي + شاشة تفاصيل تُفتح فوقها.
 * شاشة التفاصيل تُخفي الشريط السفلي (fullBleed) لأنها تجربة قراءة مركّزة.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/scan" element={<ScanScreen />} />
        <Route path="/trip" element={<TripScreen />} />
      </Route>
      <Route path="/site/:siteId" element={<SiteDetailScreen />} />
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Routes>
  )
}
