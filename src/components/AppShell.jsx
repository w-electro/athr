import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'

/**
 * الهيكل العام: منطقة المحتوى + شريط تنقّل سفلي.
 *
 * ملاحظة RTL: نستخدم `start`/`end` بدل `left`/`right` في كل مكان،
 * فيتكيّف التخطيط مع الـ28 لغة (أربع منها من اليمين لليسار) بلا CSS مزدوج.
 *
 * الشريط السفلي داكن بحافة علوية ذهبية رفيعة — "طبقة" تفصل الملاحة عن
 * المحتوى، امتدادًا لفكرة الطبقات الصخرية في بقية التصميم.
 */

const TABS = [
  { to: '/explore', key: 'nav.explore', Icon: CompassIcon },
  { to: '/scan', key: 'nav.scan', Icon: ScanIcon },
  { to: '/trip', key: 'nav.trip', Icon: RouteIcon },
]

export default function AppShell() {
  const { t } = useI18n()
  const location = useLocation()

  return (
    <div className="app-frame">
      {/* المفتاح على المسار: كل انتقال بين التبويبات يعيد تشغيل حركة الدخول */}
      <main key={location.pathname} className="flex-1 animate-slide-up-fade overflow-y-auto">
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.explore')}
        className="sticky bottom-0 z-30 border-t border-night-600 bg-basalt/92 backdrop-blur-lg"
      >
        <span className="stratum-rule absolute inset-x-0 top-0" aria-hidden="true" />
        <ul className="mx-auto flex max-w-[26rem] items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.375rem)] pt-2">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  [
                    'group flex flex-col items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors duration-200',
                    isActive ? 'text-terracotta-bright' : 'text-sand-faint',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.Icon active={isActive} />
                    <span className="text-[0.6875rem] font-semibold">{t(tab.key)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

/* أيقونات مضمّنة — بلا مكتبة خارجية: حجم أصغر وتحكّم كامل باللون والحركة */

function CompassIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M15.5 8.5l-2 5-5 2 2-5 5-2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        className="transition-all duration-300"
      />
    </svg>
  )
}

function ScanIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
      <path
        d="M4 9V6a2 2 0 012-2h3M20 9V6a2 2 0 00-2-2h-3M4 15v3a2 2 0 002 2h3M20 15v3a2 2 0 01-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
        fill={active ? 'currentColor' : 'none'}
        className="transition-all duration-300"
      />
    </svg>
  )
}

function RouteIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
      <circle
        cx="6.5"
        cy="6"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        fill={active ? 'currentColor' : 'none'}
      />
      <circle
        cx="17.5"
        cy="18"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
        fill={active ? 'currentColor' : 'none'}
      />
      <path
        d="M6.5 8.5v4a3 3 0 003 3h5a3 3 0 013 3v-3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}
