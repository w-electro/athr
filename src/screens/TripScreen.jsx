import { useState } from 'react'
import { Link } from 'react-router-dom'
import { INTERESTS, formatDuration } from '../data/sites.js'
import { buildItinerary, PACES, DURATION_OPTIONS } from '../lib/itinerary.js'
import { fetchForecast } from '../lib/weather.js'

/**
 * شاشة "رحلتي" — مخطّط الرحلة التفاعلي.
 *
 * ثلاث مراحل: أسئلة ← فحص الطقس ← المسار.
 * فصل بناء المسار في lib/itinerary.js (دوال خالصة) يعني أن هذه الشاشة
 * لا تحتوي منطق تخطيط إطلاقًا — فقط حالة الواجهة والعرض.
 */

const STEPS = { form: 'form', checking: 'checking', plan: 'plan' }

export default function TripScreen() {
  const [step, setStep] = useState(STEPS.form)
  const [interests, setInterests] = useState(['history'])
  const [days, setDays] = useState(2)
  const [pace, setPace] = useState('balanced')
  const [forecast, setForecast] = useState(null)
  const [itinerary, setItinerary] = useState(null)
  const [checkStage, setCheckStage] = useState(0)

  function toggleInterest(id) {
    setInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function generatePlan() {
    setStep(STEPS.checking)
    setCheckStage(0)

    const stageTimers = [
      setTimeout(() => setCheckStage(1), 450),
      setTimeout(() => setCheckStage(2), 950),
    ]

    const weather = await fetchForecast(days)
    stageTimers.forEach(clearTimeout)

    setForecast(weather)
    setItinerary(buildItinerary({ interests, days, pace }, weather))
    setStep(STEPS.plan)
  }

  function restart() {
    setStep(STEPS.form)
    setItinerary(null)
    setForecast(null)
  }

  return (
    <div className="screen-pad">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-night-700">رحلتي</h1>
        <p className="mt-1 text-sm text-night-400">
          أجب عن ثلاثة أسئلة، ويبني "أثر" مسارك في حائل حسب اهتمامك والطقس.
        </p>
      </header>

      {step === STEPS.form && (
        <PreferencesForm
          interests={interests}
          days={days}
          pace={pace}
          onToggleInterest={toggleInterest}
          onSetDays={setDays}
          onSetPace={setPace}
          onSubmit={generatePlan}
        />
      )}

      {step === STEPS.checking && <WeatherCheck stage={checkStage} />}

      {step === STEPS.plan && itinerary && (
        <PlanView itinerary={itinerary} forecast={forecast} onRestart={restart} />
      )}
    </div>
  )
}

/* ─────────────────────────────── الأسئلة ─────────────────────────────── */

function PreferencesForm({
  interests,
  days,
  pace,
  onToggleInterest,
  onSetDays,
  onSetPace,
  onSubmit,
}) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="section-title mb-1">ما الذي يهمّك؟</legend>
        <p className="mb-3 text-xs text-night-400">اختر واحدًا أو أكثر</p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const active = interests.includes(interest.id)
            return (
              <button
                key={interest.id}
                type="button"
                onClick={() => onToggleInterest(interest.id)}
                aria-pressed={active}
                className={`chip border px-4 py-2.5 text-sm ${
                  active
                    ? 'border-terracotta bg-terracotta text-white'
                    : 'border-night-100 bg-white text-night-500'
                }`}
              >
                <span aria-hidden="true">{interest.icon}</span>
                {interest.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="section-title mb-3">كم يومًا لديك؟</legend>
        <div className="grid grid-cols-3 gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => onSetDays(option.days)}
              aria-pressed={days === option.days}
              className={`rounded-2xl border px-3 py-4 text-sm font-bold transition ${
                days === option.days
                  ? 'border-terracotta bg-terracotta text-white'
                  : 'border-night-100 bg-white text-night-500'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="section-title mb-3">إيقاع الرحلة</legend>
        <div className="space-y-2">
          {Object.values(PACES).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSetPace(option.id)}
              aria-pressed={pace === option.id}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-start transition ${
                pace === option.id
                  ? 'border-terracotta bg-terracotta-50'
                  : 'border-night-100 bg-white'
              }`}
            >
              <span>
                <span className="block text-sm font-bold text-night-700">{option.label}</span>
                <span className="block text-xs text-night-400">{option.hint}</span>
              </span>
              <span
                className={`h-4 w-4 rounded-full border-2 ${
                  pace === option.id ? 'border-terracotta bg-terracotta' : 'border-night-200'
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={onSubmit} className="btn-primary">
        <span aria-hidden="true">✨</span>
        ابنِ مساري
      </button>
    </div>
  )
}

/* ──────────────────────────── فحص الطقس ──────────────────────────── */

const CHECK_STAGES = [
  'قراءة اهتماماتك ومدة الرحلة',
  'فحص توقّعات الطقس في حائل',
  'ترتيب المواقع حسب الوقت المثالي',
]

function WeatherCheck({ stage }) {
  return (
    <div className="card space-y-5 p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sand-100">
        <span className="animate-pulse text-4xl" aria-hidden="true">
          🌤
        </span>
      </div>
      <p className="text-sm font-bold text-night-700">نبني مسارك…</p>

      <ul className="space-y-2.5 text-start">
        {CHECK_STAGES.map((label, index) => {
          const done = index < stage
          const active = index === stage
          return (
            <li
              key={label}
              className={`flex items-center gap-3 text-sm transition ${
                done ? 'text-night-400' : active ? 'font-bold text-night-700' : 'text-night-200'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  done
                    ? 'bg-terracotta text-white'
                    : active
                      ? 'border-2 border-terracotta'
                      : 'border border-night-100'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              {label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ──────────────────────────── عرض المسار ──────────────────────────── */

function PlanView({ itinerary, forecast, onRestart }) {
  const totalStops = itinerary.days.reduce((sum, day) => sum + day.stops.length, 0)

  return (
    <div className="animate-fade-up space-y-6">
      <div className="card flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-bold text-night-700">
            مسارك جاهز · <span className="num">{totalStops}</span> مواقع
          </p>
          <p className="text-xs text-night-400">
            على مدى <span className="num">{itinerary.days.length}</span>{' '}
            {itinerary.days.length === 1 ? 'يوم' : 'أيام'}
          </p>
        </div>
        <button type="button" onClick={onRestart} className="btn-ghost">
          تعديل
        </button>
      </div>

      {itinerary.days.map((day) => (
        <section key={day.day}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="section-title">{day.dayLabel}</h2>
            {day.weather && (
              <span className="chip bg-sand-100 text-night-600">
                <span aria-hidden="true">{day.weather.icon}</span>
                {day.weather.label} · <span className="num">{day.weather.highC}</span>°
              </span>
            )}
          </div>

          {day.weather && (
            <p className="mb-4 rounded-2xl border-s-4 border-gold bg-gold-100/60 p-3.5 text-xs leading-relaxed text-night-600">
              <span className="font-bold">فحص الطقس: </span>
              {day.weather.advice}
            </p>
          )}

          <ol className="relative space-y-3 ps-6">
            <span
              className="absolute inset-y-2 start-[7px] w-0.5 bg-sand-200"
              aria-hidden="true"
            />
            {day.stops.map((stop) => (
              <li key={stop.site.id} className="relative">
                <span
                  className="absolute -start-6 top-5 h-4 w-4 rounded-full border-4 border-white bg-terracotta shadow"
                  aria-hidden="true"
                />

                {stop.travelMinutes > 0 && (
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-night-300">
                    <span aria-hidden="true">🚗</span>
                    تنقّل <span className="num">{stop.travelMinutes}</span> دقيقة
                  </p>
                )}

                <Link to={`/site/${stop.site.id}`} className="card block p-4 active:scale-[0.99]">
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <h3 className="font-bold text-night-700">{stop.site.name}</h3>
                    <span className="num chip shrink-0 bg-night-700 text-[11px] text-white">
                      {stop.startLabel}
                    </span>
                  </div>

                  <p className="mb-2.5 text-xs text-night-400">
                    {formatDuration(stop.site.durationMinutes)} · حتى {stop.endLabel}
                  </p>

                  <p className="rounded-xl bg-sand-100 px-3 py-2 text-xs leading-relaxed text-night-500">
                    <span aria-hidden="true">💡 </span>
                    {stop.reason}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {itinerary.excluded.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-bold text-night-700">لم تتسع لها الرحلة</h2>
          <p className="mb-3 text-xs text-night-400">
            زِد عدد الأيام أو غيّر الإيقاع إلى "مكثّف" لتشملها.
          </p>
          <ul className="space-y-1.5">
            {itinerary.excluded.map((site) => (
              <li key={site.id}>
                <Link
                  to={`/site/${site.id}`}
                  className="flex items-center justify-between rounded-xl bg-sand-100 px-3 py-2.5 text-sm text-night-600"
                >
                  {site.name}
                  <span className="text-xs text-night-300">{formatDuration(site.durationMinutes)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-[11px] text-night-300">
        توقّعات الطقس محاكاة توضيحية · <span className="num">{forecast?.length ?? 0}</span> أيام
      </p>
    </div>
  )
}
