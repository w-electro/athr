import { NavLink, Outlet } from 'react-router-dom'

/**
 * الهيكل العام: منطقة المحتوى + شريط تنقّل سفلي ثابت.
 *
 * ملاحظة RTL: نستخدم `start`/`end` بدل `left`/`right` في كل مكان،
 * فيتكيّف التخطيط تلقائيًا مع اتجاه الصفحة دون CSS مزدوج.
 */

const TABS = [
  { to: '/explore', label: 'استكشاف', icon: CompassIcon },
  { to: '/scan', label: 'مسح', icon: ScanIcon },
  { to: '/trip', label: 'رحلتي', icon: RouteIcon },
]

export default function AppShell() {
  return (
    <div className="app-frame relative">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <nav
        aria-label="التنقّل الرئيسي"
        className="sticky bottom-0 z-30 border-t border-night-100 bg-white/95 backdrop-blur"
      >
        <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition',
                    isActive ? 'text-terracotta' : 'text-night-300',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon active={isActive} />
                    <span>{tab.label}</span>
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

/* أيقونات SVG مضمّنة — بلا مكتبة خارجية، حجم أصغر وتحكّم كامل باللون */

function CompassIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.5 8.5l-2 5-5 2 2-5 5-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

function ScanIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M4 9V6a2 2 0 012-2h3M20 9V6a2 2 0 00-2-2h-3M4 15v3a2 2 0 002 2h3M20 15v3a2 2 0 01-2 2h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill={active ? 'currentColor' : 'none'} />
    </svg>
  )
}

function RouteIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.8" fill={active ? 'currentColor' : 'none'} />
      <circle cx="17.5" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" fill={active ? 'currentColor' : 'none'} />
      <path
        d="M6.5 8.5v4a3 3 0 003 3h5a3 3 0 013 3v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
