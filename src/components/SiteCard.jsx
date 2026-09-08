import { Link } from 'react-router-dom'
import SiteArt from './SiteArt.jsx'
import { CATEGORIES, formatDuration } from '../data/sites.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * بطاقة موقع.
 *
 * البنية مقصودة: التسمية العلوية (eyebrow) تحمل الحقبة الزمنية — معلومة
 * حقيقية تفرّق بين نقش عمره عشرة آلاف عام وقلعة عمرها ثمانون. ليست زخرفة
 * ولا ترقيمًا اعتباطيًا: الزمن هو المحور الذي تُقرأ به هذه المواقع.
 */
export default function SiteCard({ site, priority = false }) {
  const { t } = useI18n()
  const category = CATEGORIES[site.category]

  return (
    <Link
      to={`/site/${site.id}`}
      className="surface group block overflow-hidden transition-transform duration-300 ease-athr active:scale-[0.985]"
    >
      <SiteArt site={site} height="h-52" priority={priority}>
        {site.unesco && (
          <span className="absolute top-3 start-3 chip border border-gold/40 bg-basalt/70 text-gold-bright backdrop-blur-sm">
            <span aria-hidden="true">◈</span>
            {t('site.unesco')}
          </span>
        )}

        <div className="absolute bottom-0 start-0 end-0 p-4">
          <span className="eyebrow mb-1.5 block text-gold/80">{site.era}</span>
          <h3 className="font-display text-title text-sand">{site.name}</h3>
          <p className="mt-1 line-clamp-1 text-micro text-sand-dim">{site.subtitle}</p>
        </div>
      </SiteArt>

      <div className="space-y-3 border-t border-night-600 p-4">
        <p className="text-body text-sand-dim">{site.tagline}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem] text-sand-faint">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-terracotta">
              {category.icon}
            </span>
            {t(`category.${site.category}`)}
          </span>
          <span className="flex items-center gap-1.5">
            <Dot />
            {formatDuration(site.durationMinutes, t)}
          </span>
          <span className="flex items-center gap-1.5">
            <Dot />
            <span className="num">{site.distanceFromHailKm}</span> km
          </span>
        </div>
      </div>
    </Link>
  )
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-night-400" aria-hidden="true" />
}
