import { useState } from 'react'
import { Link } from 'react-router-dom'
import { INTERESTS, formatDuration } from '../data/sites.js'
import {
  buildItinerary,
  PACES,
  DURATION_OPTIONS,
  renderReason,
  formatClockFor,
} from '../lib/itinerary.js'
import { fetchForecast } from '../lib/weather.js'
import Petroglyph from '../components/Petroglyph.jsx'
import { useI18n } from '../i18n/index.jsx'

/**
 * شاشة "رحلتي" — مخطّط الرحلة التفاعلي.
 *
 * ثلاث مراحل: أسئلة ← فحص الطقس ← المسار.
 * كل منطق التخطيط في lib/itinerary.js كدوال خالصة، فهذه الشاشة لا تحتوي
 * قرارًا واحدًا — حالة واجهة وعرض فقط.
 */

const STEPS = { form: 'form', checking: 'checking', plan: 'plan' }
const CHECK_STEPS = ['prefs', 'weather', 'order']

export default function TripScreen() {
  const { t, language, contentLanguage } = useI18n()
  const [step, setStep] = useState(STEPS.form)
  const [interests, setInterests] = useState(['history'])
  const [days, setDays] = useState(2)
  const [pace, setPace] = useState('balanced')
  const [itinerary, setItinerary] = useState(null)
  const [checkStage, setCheckStage] = useState(0)

  function toggleInterest(id) {
    setInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function generate() {
    setStep(STEPS.checking)
    setCheckStage(0)

    const timers = [
      setTimeout(() => setCheckStage(1), 450),
      setTimeout(() => setCheckStage(2), 950),
    ]

    const forecast = await fetchForecast(days)
    timers.forEach(clearTimeout)

    // language لصيغة الساعة، وcontentLanguage لأسماء المواقع
    setItinerary(buildItinerary({ interests, days, pace, language: contentLanguage }, forecast))
    setStep(STEPS.plan)
  }

  return (
    <div className="screen-pad">
      <header className="mb-6">
        <h1 className="font-display text-hero text-sand">{t('trip.title')}</h1>
        <p className="mt-1.5 text-body text-sand-dim">{t('trip.subtitle')}</p>
      </header>

      {step === STEPS.form && (
        <Form
          interests={interests}
          days={days}
          pace={pace}
          onToggle={toggleInterest}
          onDays={setDays}
          onPace={setPace}
          onSubmit={generate}
        />
      )}

      {step === STEPS.checking && <Checking stage={checkStage} />}

      {step === STEPS.plan && itinerary && (
        <Plan itinerary={itinerary} onRestart={() => setStep(STEPS.form)} />
      )}
    </div>
  )
}

/* ─────────────────────────────── الأسئلة ─────────────────────────────── */

function Form({ interests, days, pace, onToggle, onDays, onPace, onSubmit }) {
  const { t } = useI18n()

  return (
    <div className="stagger space-y-8">
      <fieldset>
        <Legend hint={t('trip.q1hint')}>{t('trip.q1')}</Legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const on = interests.includes(interest.id)
            return (
              <button
                key={interest.id}
                type="button"
                onClick={() => onToggle(interest.id)}
                aria-pressed={on}
                className={`px-4 py-2.5 text-body ${on ? 'chip-on' : 'chip-quiet'}`}
              >
                <span aria-hidden="true">{interest.icon}</span>
                {t(`interest.${interest.id}`)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <Legend>{t('trip.q2')}</Legend>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => onDays(option.days)}
              aria-pressed={days === option.days}
              className={`rounded-xl border px-3 py-4 text-[0.8125rem] font-semibold transition-all duration-200 ease-athr ${
                days === option.days
                  ? 'border-terracotta bg-terracotta/12 text-sand'
                  : 'border-night-600 bg-night-800 text-sand-dim'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <Legend>{t('trip.q3')}</Legend>
        <div className="space-y-2">
          {Object.values(PACES).map((option) => {
            const on = pace === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPace(option.id)}
                aria-pressed={on}
                className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-start transition-all duration-200 ease-athr ${
                  on ? 'border-terracotta bg-terracotta/12' : 'border-night-600 bg-night-800'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] font-semibold text-sand">
                    {t(`pace.${option.id}`)}
                  </span>
                  <span className="mt-0.5 block text-micro text-sand-faint">
                    {t(`pace.${option.id}Hint`)}
                  </span>
                </span>
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${
                    on ? 'border-terracotta bg-terracotta' : 'border-night-400'
                  }`}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      </fieldset>

      <button type="button" onClick={onSubmit} className="btn-primary">
        {t('trip.build')}
      </button>
    </div>
  )
}

function Legend({ children, hint }) {
  return (
    <legend className="mb-3.5 w-full">
      <span className="block font-display text-title text-sand">{children}</span>
      {hint && <span className="mt-1 block text-micro text-sand-faint">{hint}</span>}
      <span className="stratum-rule mt-2.5 block" aria-hidden="true" />
    </legend>
  )
}

/* ──────────────────────────── فحص الطقس ──────────────────────────── */

function Checking({ stage }) {
  const { t } = useI18n()

  return (
    <div className="surface grain flex flex-col items-center gap-6 p-8 text-center">
      <Petroglyph shape="human" className="h-24 w-28 text-terracotta" loop duration={2} />
      <p className="font-display text-title text-sand">{t('trip.building')}</p>

      <ul className="w-full space-y-2.5 text-start">
        {CHECK_STEPS.map((key, index) => {
          const done = index < stage
          const active = index === stage
          return (
            <li
              key={key}
              className={`flex items-center gap-3 text-body transition-colors duration-300 ${
                done ? 'text-sand-dim' : active ? 'text-sand' : 'text-sand-faint/40'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                  done
                    ? 'bg-terracotta text-basalt'
                    : active
                      ? 'border border-terracotta'
                      : 'border border-night-500'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              {t(`trip.step.${key}`)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ──────────────────────────── عرض المسار ──────────────────────────── */

function Plan({ itinerary, onRestart }) {
  const { t, language, contentDir } = useI18n()
  const total = itinerary.days.reduce((sum, day) => sum + day.stops.length, 0)

  return (
    <div className="animate-rise-in space-y-8">
      <div className="surface flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-display text-[1.0625rem] text-sand">{t('trip.ready')}</p>
          <p className="mt-0.5 text-micro text-sand-faint">
            {t('trip.sitesCount', { count: total })} ·{' '}
            {itinerary.days.length === 1
              ? t('trip.acrossOne')
              : t('trip.across', { count: itinerary.days.length })}
          </p>
        </div>
        <button type="button" onClick={onRestart} className="chip-quiet shrink-0">
          {t('trip.edit')}
        </button>
      </div>

      {itinerary.days.map((day) => (
        <section key={day.day}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-title text-sand">{t('trip.day', { n: day.day })}</h2>
            {day.weather && (
              <span className="chip-quiet">
                <span aria-hidden="true">{day.weather.icon}</span>
                {t(day.weather.labelKey)} · <span className="num">{day.weather.highC}</span>°
              </span>
            )}
          </div>

          {day.weather && (
            <p className="mb-5 rounded-xl border-s-2 border-gold bg-gold/[0.07] p-3.5 text-micro leading-relaxed text-sand-dim">
              <span className="font-semibold text-gold-bright">{t('trip.weather')}: </span>
              {t(day.weather.advice.key, day.weather.advice.vars)}
            </p>
          )}

          <ol className="relative space-y-3 ps-6">
            <span className="absolute inset-y-3 start-[5px] w-px bg-night-500" aria-hidden="true" />
            {day.stops.map((stop) => (
              <li key={stop.site.id} className="relative">
                <span
                  className="absolute -start-6 top-6 h-[11px] w-[11px] rounded-full border-2 border-basalt bg-terracotta"
                  aria-hidden="true"
                />

                {stop.travelMinutes > 0 && (
                  <p className="mb-2 text-[0.6875rem] text-sand-faint">
                    {t('trip.travel', { minutes: stop.travelMinutes })}
                  </p>
                )}

                <Link
                  to={`/site/${stop.site.id}`}
                  className="surface block p-4 transition-transform duration-200 ease-athr active:scale-[0.99]"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="font-display text-[1.0625rem] text-sand" dir={contentDir}>
                      {stop.site.name}
                    </h3>
                    <span className="num shrink-0 rounded-md bg-night-600 px-2 py-1 text-[0.6875rem] text-sand">
                      {formatClockFor(stop.startMinutes, language)}
                    </span>
                  </div>

                  <p className="mb-3 text-micro text-sand-faint">
                    {formatDuration(stop.site.durationMinutes, t)} ·{' '}
                    {t('trip.until', { time: formatClockFor(stop.endMinutes, language) })}
                  </p>

                  <p className="rounded-lg bg-night-900 px-3 py-2.5 text-micro leading-relaxed text-sand-dim">
                    {renderReason(stop.reason, t)}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {itinerary.excluded.length > 0 && (
        <section className="surface p-4">
          <h2 className="font-display text-[0.9375rem] text-sand">{t('trip.excluded')}</h2>
          <p className="mb-3 mt-1 text-micro text-sand-faint">{t('trip.excludedHint')}</p>
          <ul className="space-y-2">
            {itinerary.excluded.map((site) => (
              <li key={site.id}>
                <Link
                  to={`/site/${site.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-night-900 px-3 py-2.5 text-body text-sand-dim"
                >
                  <span dir={contentDir}>{site.name}</span>
                  <span className="shrink-0 text-[0.6875rem] text-sand-faint">
                    {formatDuration(site.durationMinutes, t)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-[0.625rem] text-sand-faint">{t('trip.note')}</p>
    </div>
  )
}
