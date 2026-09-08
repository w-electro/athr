import { useMemo, useState } from 'react'
import SiteCard from '../components/SiteCard.jsx'
import { getAllSites, CATEGORIES } from '../data/sites.js'

/**
 * شاشة الاستكشاف — الواجهة الأولى للتطبيق.
 *
 * البحث والتصفية يتمّان في الذاكرة عبر useMemo: القائمة صغيرة (4 مواقع)
 * والفلترة فورية بلا شبكة. حين تكبر القائمة لاحقًا، هذه هي النقطة الوحيدة
 * التي تُستبدل بنداء API أو فهرس بحث.
 */
export default function ExploreScreen() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const sites = getAllSites()

  const filtered = useMemo(() => {
    const needle = query.trim()
    return sites.filter((site) => {
      const matchesCategory = activeCategory === 'all' || site.category === activeCategory
      const matchesQuery =
        needle === '' ||
        site.name.includes(needle) ||
        site.tagline.includes(needle) ||
        site.city.includes(needle) ||
        site.subtitle.includes(needle)
      return matchesCategory && matchesQuery
    })
  }, [sites, query, activeCategory])

  const categoryTabs = [
    { id: 'all', label: 'الكل', icon: '✦' },
    ...Object.values(CATEGORIES),
  ]

  return (
    <div className="screen-pad">
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight text-night-700">أثر</h1>
            <p className="mt-1 text-sm text-night-400">دليلك الذكي لتراث منطقة حائل</p>
          </div>
          <span className="chip mt-1 bg-terracotta-50 text-terracotta-700">
            <span aria-hidden="true">📍</span>
            حائل
          </span>
        </div>
      </header>

      <div className="relative mb-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-night-300"
        >
          🔍
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث عن موقع، أو نوع تجربة…"
          aria-label="بحث في المواقع"
          className="w-full rounded-2xl border border-night-100 bg-white py-3.5 ps-11 pe-4 text-sm
                     text-night-700 placeholder:text-night-300 focus:border-terracotta focus:outline-none
                     focus:ring-2 focus:ring-terracotta/20"
        />
      </div>

      <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              aria-pressed={isActive}
              className={`chip shrink-0 border ${
                isActive
                  ? 'border-terracotta bg-terracotta text-white'
                  : 'border-night-100 bg-white text-night-500'
              }`}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="section-title">المواقع التراثية</h2>
        <span className="text-xs text-night-400">
          <span className="num">{filtered.length}</span> من{' '}
          <span className="num">{sites.length}</span>
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="card p-6 text-center text-sm text-night-400">
          لا توجد نتائج مطابقة. جرّب كلمة أخرى أو أزل التصفية.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      )}
    </div>
  )
}
