import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { LANGUAGES, getLanguage, searchLanguages } from '../i18n/languages.js'
import Petroglyph from '../components/Petroglyph.jsx'

/**
 * شاشة اختيار اللغة — أول ما يراه الزائر.
 *
 * ── قرارات التصميم ───────────────────────────────────────────────────
 * 1) لغة الجهاز مُختارة سلفًا ومُعلَّمة بوضوح. السائح الذي يفتح التطبيق
 *    أمام النقش لا يريد أن يبحث؛ يريد أن يضغط "ابدأ".
 * 2) كل لغة مكتوبة باسمها هي — لا "Japanese" بل "日本語". من يبحث عن
 *    لغته يبحث عن شكلها لا عن ترجمتها الإنجليزية.
 * 3) لا أعلام دول. اللغة ليست دولة: العربية ليست علمًا واحدًا، والإنجليزية
 *    ليست بريطانيا. الأعلام تُقصي أكثر مما تُرحّب.
 * 4) الخلفية صورة حقيقية من منطقة حائل عند الغروب — أطروحة التصميم كلها
 *    في صورة واحدة: الليل أرضية، والضوء الدافئ هو البطل.
 */
export default function WelcomeScreen({ onDone }) {
  const { t, setLanguage, completeOnboarding, deviceLanguage, language } = useI18n()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(language || deviceLanguage)

  const results = useMemo(() => searchLanguages(query), [query])
  const detected = getLanguage(deviceLanguage)
  const selectedMeta = getLanguage(selected)

  function choose(code) {
    setSelected(code)
    // نطبّق فورًا حتى تنقلب الواجهة أمام المستخدم ويرى أثر اختياره
    setLanguage(code)
  }

  function start() {
    setLanguage(selected)
    completeOnboarding()
    onDone?.()
  }

  return (
    // ارتفاع ثابت لا أدنى: الشاشة كلها بلا تمرير، والقائمة وحدها هي التي
    // تُمرَّر داخليًا — وإلا اختفى زر "ابدأ" أسفل الصفحة.
    <div
      className="grain relative mx-auto flex h-[100dvh] w-full max-w-[26rem] flex-col overflow-hidden bg-basalt"
      dir={selectedMeta?.dir || 'rtl'}
    >
      {/* الخلفية: غروب في جبال منطقة حائل */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={`${import.meta.env?.BASE_URL ?? '/'}photos/musamma-01.jpg`}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-basalt/55 via-basalt/85 to-basalt" />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6 pt-10">
        <header className="mb-6 shrink-0">
          <Petroglyph
            shape="ibex"
            className="mb-4 h-20 w-32 text-terracotta-bright"
            strokeWidth={3}
            duration={2.8}
            loop
            title="أثر"
          />
          {/* العلامة تبقى بالعربية دائمًا (اسم علم لا يُترجم)، لكن قارئ
              الشاشة ينطقها باسمها في لغة المستخدم بدل تهجئة حروف عربية */}
          <h1 aria-label={t('welcome.title')} className="font-display text-monument leading-none text-sand">
            أثر
          </h1>
          <p className="mt-3 max-w-[21rem] text-body text-sand-dim">{t('welcome.subtitle')}</p>
        </header>

        {/* لغة الجهاز — الطريق السريع */}
        {detected && (
          <button
            type="button"
            onClick={() => choose(detected.code)}
            className={`mb-5 flex shrink-0 items-center justify-between gap-3 rounded-2xl border p-4 text-start transition-all duration-200 ease-athr ${
              selected === detected.code
                ? 'border-terracotta bg-terracotta/12 shadow-glow'
                : 'border-night-500 bg-night-800/70'
            }`}
          >
            <span className="min-w-0">
              <span className="eyebrow block">{t('welcome.detected')}</span>
              <span className="mt-1.5 block truncate font-display text-title text-sand">
                {detected.native}
              </span>
            </span>
            <Check on={selected === detected.code} />
          </button>
        )}

        <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-sand-dim">{t('welcome.choose')}</h2>
          <span className="num text-eyebrow text-sand-faint">
            {t('welcome.count', { count: LANGUAGES.length })}
          </span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('welcome.search')}
          aria-label={t('welcome.search')}
          className="mb-3 w-full shrink-0 rounded-xl border border-night-500 bg-night-800/80 px-4 py-3
                     text-body text-sand placeholder:text-sand-faint focus:border-terracotta focus:outline-none"
        />

        <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {results.length === 0 ? (
            <p className="py-8 text-center text-body text-sand-faint">{t('welcome.noResults')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 pb-2">
              {results.map((entry) => {
                const on = selected === entry.code
                return (
                  <li key={entry.code}>
                    <button
                      type="button"
                      onClick={() => choose(entry.code)}
                      lang={entry.code}
                      dir={entry.dir}
                      aria-pressed={on}
                      className={`h-full w-full rounded-xl border px-3 py-3 text-start transition-all duration-200 ease-athr ${
                        on
                          ? 'border-terracotta bg-terracotta/12'
                          : 'border-night-600 bg-night-800/60 active:border-night-400'
                      }`}
                    >
                      <span
                        className={`block truncate text-[0.9375rem] font-semibold ${
                          on ? 'text-sand' : 'text-sand-dim'
                        }`}
                      >
                        {entry.native}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-sand-faint">
                        {entry.sample}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 pt-4">
          <button type="button" onClick={start} className="btn-primary">
            {t('welcome.start')}
          </button>
          <p className="mt-2.5 text-center text-[0.6875rem] text-sand-faint">
            {t('welcome.changeHint')}
          </p>
        </div>
      </div>
    </div>
  )
}

function Check({ on }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
        on ? 'border-terracotta bg-terracotta text-basalt' : 'border-night-400'
      }`}
      aria-hidden="true"
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}
