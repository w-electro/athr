import { Link } from 'react-router-dom'
import SiteArt from './SiteArt.jsx'
import { CATEGORIES, formatDuration } from '../data/sites.js'

/** بطاقة موقع في قائمة الاستكشاف. */
export default function SiteCard({ site }) {
  const category = CATEGORIES[site.category]

  return (
    <Link
      to={`/site/${site.id}`}
      className="card block overflow-hidden animate-fade-up active:scale-[0.99] transition"
    >
      <SiteArt site={site} height="h-40">
        {site.unesco && (
          <span className="absolute top-3 start-3 chip bg-gold text-night-800 shadow">
            <span aria-hidden="true">🏛</span>
            تراث عالمي · يونسكو
          </span>
        )}
        <div className="absolute bottom-3 start-4 end-4">
          <h3 className="text-lg font-extrabold text-white drop-shadow">{site.name}</h3>
          <p className="text-xs text-white/80">{site.subtitle}</p>
        </div>
      </SiteArt>

      <div className="space-y-3 p-4">
        <p className="text-sm leading-relaxed text-night-500">{site.tagline}</p>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="chip bg-sand-100 text-night-600">
            <span aria-hidden="true">{category.icon}</span>
            {category.label}
          </span>
          <span className="chip bg-sand-100 text-night-600">
            <span aria-hidden="true">⏱</span>
            {formatDuration(site.durationMinutes)}
          </span>
          <span className="chip bg-sand-100 text-night-600">
            <span aria-hidden="true">📍</span>
            <span className="num">{site.distanceFromHailKm}</span> كم من حائل
          </span>
        </div>
      </div>
    </Link>
  )
}
