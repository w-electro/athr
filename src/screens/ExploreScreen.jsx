import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteCard from '../components/SiteCard.jsx'
import { getAllSites, CATEGORIES } from '../data/sites.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * شاشة الاستكشاف.
 *
 * البحث والتصفية في الذاكرة عبر useMemo: القائمة صغيرة والفلترة فورية.
 * حين تكبر لاحقًا، هذه هي النقطة الوحيدة التي تُستبدل بنداء API.
 */
export default function ExploreScreen() {
  const { t, contentLanguage, meta } = useI18n()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  // contentLanguage لا language: الأخيرة قد تكون لغةً لم يُترجم محتواها بعد
  // (الأردية مثلًا)، فتُعرض بيانات المواقع بالعربية بدل الإنجليزية.
  const sites = useMemo(() => getAllSites(contentLanguage), [contentLanguage])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sites.filter((site) => {
      const matchesCategory = activeCategory === 'all' || site.category === activeCategory
      const haystack = `${site.name} ${site.tagline} ${site.city} ${site.subtitle}`.toLowerCase()
      return matchesCategory && (needle === '' || haystack.includes(needle))
    })
  }, [sites, query, activeCategory])

  const tabs = [{ id: 'all', icon: '✦' }, ...Object.values(CATEGORIES)]

  return (
    <div className="screen-pad">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 aria-label={t('welcome.title')} className="font-display text-hero text-sand">
            أثر
          </h1>
          <p className="mt-1 text-body text-sand-dim">{t('app.tagline')}</p>
        </div>
        <Link
          to="/language"
          aria-label={t('common.changeLanguage')}
          className="chip-quiet shrink-0 gap-2"
        >
          <GlobeIcon />
          <span className="max-w-[6rem] truncate">{meta.native}</span>
        </Link>
      </header>

      <div className="relative mb-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-sand-faint"
        >
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('explore.search')}
          aria-label={t('explore.searchLabel')}
          className="w-full rounded-xl border border-night-600 bg-night-800 py-3.5 ps-11 pe-4 text-body
                     text-sand placeholder:text-sand-faint focus:border-terracotta focus:outline-none"
        />
      </div>

      <div className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5">
        {tabs.map((tab) => {
          const on = activeCategory === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              aria-pressed={on}
              className={`shrink-0 ${on ? 'chip-on' : 'chip-quiet'}`}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.id === 'all' ? t('explore.all') : t(`category.${tab.id}`)}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-title text-sand">{t('explore.heading')}</h2>
        <span className="num text-eyebrow text-sand-faint">
          {t('explore.showing', { shown: filtered.length, total: sites.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="font-display text-title text-sand">{t('explore.empty')}</p>
          <p className="mt-2 text-body text-sand-dim">{t('explore.emptyHint')}</p>
        </div>
      ) : (
        <div className="stagger space-y-4">
          {filtered.map((site, index) => (
            <SiteCard key={site.id} site={site} priority={index === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 010 18a15 15 0 010-18" />
    </svg>
  )
}
