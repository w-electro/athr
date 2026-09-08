import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import ExploreScreen from './screens/ExploreScreen.jsx'
import SiteDetailScreen from './screens/SiteDetailScreen.jsx'
import ScanScreen from './screens/ScanScreen.jsx'
import TripScreen from './screens/TripScreen.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import { useI18n } from './i18n/index.jsx'

/**
 * البوابة والتنقّل.
 *
 * شاشة اللغة تسبق كل شيء عند أول تشغيل. بعد الاختيار يُحفظ في المتصفح،
 * فلا تظهر مرة أخرى — إلا إذا طلبها المستخدم من مسار /language.
 */
export default function App() {
  const { onboarded, completeOnboarding } = useI18n()

  if (!onboarded) {
    return <WelcomeScreen onDone={completeOnboarding} />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExploreScreen />} />
        <Route path="/scan" element={<ScanScreen />} />
        <Route path="/trip" element={<TripScreen />} />
      </Route>
      <Route path="/site/:siteId" element={<SiteDetailScreen />} />
      <Route path="/language" element={<LanguageRoute />} />
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Routes>
  )
}

/** تغيير اللغة بعد الإعداد الأول — الشاشة نفسها، لكنها تعود للاستكشاف. */
function LanguageRoute() {
  const navigate = useNavigate()
  return <WelcomeScreen onDone={() => navigate('/explore', { replace: true })} />
}
