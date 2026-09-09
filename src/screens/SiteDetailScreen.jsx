import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import SiteArt from '../components/SiteArt.jsx'
import AudioPlayer from '../components/AudioPlayer.jsx'
import { getSiteById, CATEGORIES, formatDuration } from '../data/sites.js'
import { bestTimeKey } from '../lib/itinerary.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * شاشة تفاصيل الموقع.
 *
 * الترتيب مقصود: الغلاف ← الحقائق ← المشغّل الصوتي ← القصة.
 * المشغّل قبل النص لأن الزائر الواقف أمام الأثر يريد أن يسمع لا أن يقرأ؛
 * القصة المكتوبة لمن يقرأ قبل الزيارة أو بعدها.
 *
 * الغلاف يتحرك بالتوازي (parallax) مع التمرير: الصورة تنزلق أبطأ من النص
 * فوقها. حركة واحدة هادئة تعطي إحساس العمق دون أن تسرق الانتباه.
 */
export default function SiteDetailScreen() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const { t, contentLanguage, contentDir, hasFullContent, language, isRtl } = useI18n()
  const site = getSiteById(siteId, contentLanguage)

  const scrollRef = useRef(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return undefined
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setOffset(node.scrollTop))
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      node.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  if (!site) {
    return (
      <div className="app-frame items-center justify-center gap-5 p-8 text-center">
        <p className="font-display text-title text-sand">{t('site.notFound')}</p>
        <Link to="/explore" className="btn-quiet w-auto px-6">
          {t('site.back')}
        </Link>
      </div>
    )
  }

  const category = CATEGORIES[site.category]
  const credit = site.photoCredit

  return (
    <div ref={scrollRef} className="app-frame overflow-y-auto">
      <div className="relative h-[19rem] shrink-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ transform: `translate3d(0, ${offset * 0.4}px, 0)` }}
        >
          <SiteArt site={site} height="h-[19rem]" priority />
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('site.back')}
          className="absolute top-4 start-4 flex h-10 w-10 items-center justify-center rounded-full
                     border border-sand/15 bg-basalt/60 text-sand backdrop-blur-md transition active:scale-90"
        >
          {/* سهم الرجوع يشير إلى يمين الشاشة في RTL ويسارها في LTR.
              نقلبه من الجافاسكربت لا من CSS حتى لا نعتمد على متغيّر اتجاه. */}
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${isRtl ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {site.unesco && (
          <span className="absolute top-4 end-4 chip border border-gold/40 bg-basalt/70 text-gold-bright backdrop-blur-sm">
            <span aria-hidden="true">◈</span>
            {t('site.unesco')} <span className="num">2015</span>
          </span>
        )}

        <div className="absolute bottom-0 start-0 end-0 p-5" dir={contentDir}>
          <span className="eyebrow mb-2 block text-gold/80">{site.era}</span>
          <h1 className="font-display text-hero text-sand">{site.name}</h1>
          <p className="mt-1.5 text-body text-sand-dim">{site.subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 -mt-4 rounded-t-3xl bg-basalt">
        <div className="screen-pad space-y-8 pt-6">
          <p className="text-read font-medium text-sand" dir={contentDir}>
            {site.tagline}
          </p>

          {!hasFullContent && (
            <p className="rounded-xl border border-night-600 bg-night-800 p-3.5 text-micro text-sand-faint">
              {t('site.translationNote')}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Fact label={t('site.duration')} value={formatDuration(site.durationMinutes, t)} />
            <Fact label={t('site.bestTime')} value={t(bestTimeKey(site.bestTime))} />
            {/* لا mono هنا: النص يحوي كلمات لا أرقامًا فقط */}
            <Fact label={t('site.distance')} value={t('site.km', { km: site.distanceFromHailKm })} />
            <Fact label={t('site.category')} value={t(`category.${site.category}`)} icon={category.icon} />
          </div>

          <AudioPlayer narration={site.narration} siteName={site.shortName} />

          <section>
            <SectionHead>{t('site.story')}</SectionHead>
            <div className="space-y-7" dir={contentDir}>
              {site.story.map((chapter, index) => (
                <article key={chapter.heading}>
                  <div className="mb-2 flex items-baseline gap-2.5">
                    <span className="num text-eyebrow text-terracotta">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-[1.0625rem] text-sand">{chapter.heading}</h3>
                  </div>
                  <p className="text-read text-sand-dim">{chapter.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <SectionHead>{t('site.facts')}</SectionHead>
            <dl className="overflow-hidden rounded-xl border border-night-600" dir={contentDir}>
              {site.facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    index % 2 ? 'bg-night-900' : 'bg-night-800'
                  }`}
                >
                  <dt className="text-micro text-sand-faint">{fact.label}</dt>
                  <dd className="text-end text-[0.8125rem] font-semibold text-sand">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <SectionHead>{t('site.tips')}</SectionHead>
            <ul className="space-y-2.5" dir={contentDir}>
              {site.tips.map((tip) => (
                <li key={tip} className="flex gap-3 rounded-xl border border-night-600 bg-night-800 p-3.5">
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-terracotta">
                    ◆
                  </span>
                  <span className="text-body text-sand-dim">{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <p className="text-micro text-sand-faint">{site.ticket}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${site.coords.lat},${site.coords.lng}`}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              {t('site.map')}
            </a>
            <Link to="/trip" className="btn-quiet">
              {t('site.plan')}
            </Link>
          </section>

          {credit && (
            <p className="text-[0.625rem] leading-relaxed text-sand-faint">
              {t('site.photoCredit')}: {credit.author} · {credit.license} · {credit.source}
              {credit.note && (
                <>
                  {' — '}
                  {language === 'ar' ? credit.note : credit.noteEn}
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ children }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-title text-sand">{children}</h2>
      <span className="stratum-rule mt-2.5 block" aria-hidden="true" />
    </div>
  )
}

function Fact({ label, value, mono = false, icon }) {
  return (
    <div className="rounded-xl border border-night-600 bg-night-800 p-3.5">
      <span className="eyebrow block">{label}</span>
      <p className={`mt-1.5 text-[0.8125rem] font-semibold text-sand ${mono ? 'num' : ''}`}>
        {icon && (
          <span aria-hidden="true" className="me-1.5 text-terracotta">
            {icon}
          </span>
        )}
        {value}
      </p>
    </div>
  )
}
