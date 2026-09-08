import { useParams, useNavigate, Link } from 'react-router-dom'
import SiteArt from '../components/SiteArt.jsx'
import AudioPlayer from '../components/AudioPlayer.jsx'
import { getSiteById, CATEGORIES, formatDuration } from '../data/sites.js'
import { bestTimeLabel } from '../lib/itinerary.js'

/**
 * شاشة تفاصيل الموقع.
 *
 * ترتيب المحتوى مقصود: الغلاف ← الحقائق السريعة ← المشغّل الصوتي ← القصة.
 * المشغّل قبل النص لأن الزائر الواقف أمام الأثر يريد أن يسمع لا أن يقرأ؛
 * القصة المكتوبة تبقى لمن يقرأ قبل الزيارة أو بعدها.
 */
export default function SiteDetailScreen() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const site = getSiteById(siteId)

  if (!site) {
    return (
      <div className="app-frame items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-bold text-night-600">لم نجد هذا الموقع</p>
        <Link to="/explore" className="btn-ghost">
          العودة إلى الاستكشاف
        </Link>
      </div>
    )
  }

  const category = CATEGORIES[site.category]

  return (
    <div className="app-frame">
      <div className="relative">
        <SiteArt site={site} height="h-64">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="رجوع"
            className="absolute top-4 start-4 flex h-10 w-10 items-center justify-center rounded-full
                       bg-night-900/45 text-white backdrop-blur transition active:scale-90"
          >
            {/* في RTL يشير سهم الرجوع إلى اليمين */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {site.unesco && (
            <span className="absolute top-4 end-4 chip bg-gold text-night-800 shadow">
              <span aria-hidden="true">🏛</span>
              يونسكو <span className="num">2015</span>
            </span>
          )}

          <div className="absolute bottom-4 start-5 end-5">
            <h1 className="text-2xl font-extrabold text-white drop-shadow">{site.name}</h1>
            <p className="mt-1 text-sm text-white/85">{site.subtitle}</p>
          </div>
        </SiteArt>
      </div>

      <div className="screen-pad space-y-6">
        <p className="text-[15px] font-medium leading-relaxed text-night-600">{site.tagline}</p>

        <div className="grid grid-cols-2 gap-3">
          <QuickFact icon="⏱" label="مدة الزيارة" value={formatDuration(site.durationMinutes)} />
          <QuickFact icon="🌤" label="أفضل وقت" value={bestTimeLabel(site.bestTime)} />
          <QuickFact icon="📍" label="المسافة" value={`${site.distanceFromHailKm} كم من حائل`} />
          <QuickFact icon={category.icon} label="التصنيف" value={category.label} />
        </div>

        <AudioPlayer narration={site.narration} siteName={site.shortName} />

        <section>
          <h2 className="section-title mb-3">القصة</h2>
          <div className="space-y-5">
            {site.story.map((chapter) => (
              <article key={chapter.heading}>
                <h3 className="mb-1.5 flex items-center gap-2 text-base font-bold text-terracotta-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
                  {chapter.heading}
                </h3>
                <p className="text-[15px] leading-[1.9] text-night-500">{chapter.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title mb-3">معلومات سريعة</h2>
          <dl className="card divide-y divide-night-50 overflow-hidden">
            {site.facts.map((fact) => (
              <div key={fact.label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-night-400">{fact.label}</dt>
                <dd className="text-sm font-bold text-night-700">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="section-title mb-3">نصائح الزيارة</h2>
          <ul className="space-y-2.5">
            {site.tips.map((tip) => (
              <li key={tip} className="flex gap-3 rounded-2xl bg-sand-100 p-3.5">
                <span aria-hidden="true" className="text-base leading-6">
                  💡
                </span>
                <span className="text-sm leading-relaxed text-night-600">{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-3 p-4">
          <p className="text-sm text-night-400">{site.ticket}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${site.coords.lat},${site.coords.lng}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            <span aria-hidden="true">🧭</span>
            افتح الموقع على الخريطة
          </a>
          <Link to="/trip" className="btn-ghost w-full">
            أضِف حائل إلى مخطّط رحلتي
          </Link>
        </section>
      </div>
    </div>
  )
}

function QuickFact({ icon, label, value }) {
  return (
    <div className="card p-3.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-night-300">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="text-sm font-bold text-night-700">{value}</p>
    </div>
  )
}
