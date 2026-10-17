import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { LANGUAGES, getLanguage } from '../i18n/languages.js'
import Petroglyph from '../components/Petroglyph.jsx'

/**
 * شاشة اختيار اللغة — أول ما يراه الزائر.
 *
 * ── قرارات التصميم ───────────────────────────────────────────────────
 * 1) لغة الجهاز مُختارة سلفًا في الشبكة (بلا بطاقة منفصلة ولا بحث): الشبكة
 *    كلها تسع الشاشة، والسائح أمام النقش يريد أن يضغط "ابدأ" لا أن يبحث.
 * 2) كل لغة مكتوبة باسمها هي — لا "Japanese" بل "日本語". من يبحث عن
 *    لغته يبحث عن شكلها لا عن ترجمتها الإنجليزية.
 * 3) لا أعلام دول. اللغة ليست دولة: العربية ليست علمًا واحدًا، والإنجليزية
 *    ليست بريطانيا. الأعلام تُقصي أكثر مما تُرحّب.
 * 4) الخلفية صورة حقيقية من منطقة حائل عند الغروب — أطروحة التصميم كلها
 *    في صورة واحدة: الليل أرضية، والضوء الدافئ هو البطل.
 */
export default function WelcomeScreen({ onDone }) {
  const { t, setLanguage, completeOnboarding, deviceLanguage, language } = useI18n()
  const [selected, setSelected] = useState(language || deviceLanguage)

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

      <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6 pt-7">
        <header className="mb-5 shrink-0">
          <Petroglyph
            shape="ibex"
            className="mb-3 h-14 w-24 text-terracotta-bright"
            strokeWidth={3}
            duration={2.8}
            loop
            title="أثر"
          />
          {/* العلامة تبقى بالعربية دائمًا (اسم علم لا يُترجم)، لكن قارئ
              الشاشة ينطقها باسمها في لغة المستخدم بدل تهجئة حروف عربية */}
          <h1 aria-label={t('welcome.title')} className="font-display text-hero leading-none text-sand">
            أثر
          </h1>
          <p className="mt-2 max-w-[21rem] text-body text-sand-dim">{t('welcome.subtitle')}</p>
        </header>

        <div className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-sand-dim">{t('welcome.choose')}</h2>
          <span className="num text-eyebrow text-sand-faint">
            {t('welcome.count', { count: LANGUAGES.length })}
          </span>
        </div>

        <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <ul className="grid grid-cols-2 gap-2 pb-2">
            {LANGUAGES.map((entry) => {
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
