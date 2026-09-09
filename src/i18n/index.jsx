import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LOCALES } from './locales/index.js'
import {
  DEFAULT_LANGUAGE,
  FULL_CONTENT_LANGUAGES,
  detectDeviceLanguage,
  getLanguage,
} from './languages.js'

const STORAGE_KEY = 'athr.language'

/**
 * مفتاح منفصل عن اللغة عن قصد.
 *
 * "اختار لغة" و"أنهى شاشة الترحيب" حدثان مختلفان: المستخدم قد يجرّب عدة
 * لغات ويرى الواجهة تنقلب أمامه قبل أن يضغط "ابدأ". لو ربطناهما بمفتاح
 * واحد لاختفت الشاشة عند أول ضغطة على أي لغة.
 */
const ONBOARDED_KEY = 'athr.onboarded'

const I18nContext = createContext(null)

/** يقرأ قيمة متداخلة بمفتاح منقّط: get(obj, 'scan.title') */
function get(source, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), source)
}

/**
 * يترجم مفتاحًا مع سلسلة تراجع صريحة.
 *
 * اللغة المختارة ← الإنجليزية ← العربية ← المفتاح نفسه.
 * إظهار المفتاح بدل نص فارغ مقصود: مفتاح ناقص يجب أن يكون مرئيًا في
 * التطوير لا أن يختفي بصمت.
 */
function translate(locale, key, vars) {
  const chain = [LOCALES[locale], LOCALES.en, LOCALES.ar]

  let value
  for (const source of chain) {
    value = get(source, key)
    if (value !== undefined) break
  }
  if (value === undefined) return key
  if (typeof value !== 'string') return value

  if (!vars) return value
  // استبدال {name} بالقيم الممرّرة
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] !== undefined ? String(vars[name]) : match,
  )
}

/**
 * خطوط الكتابات التي تحتاج ملفًا خاصًا بها.
 *
 * لا نُحمّلها كلها في index.html: الخطوط العربية والفارسية والأردية تغطي
 * النطاق اليونيكودي نفسه، فلو أدرجناها جميعًا لحمّل كل قارئ عربي أربعة
 * خطوط لا يحتاج منها إلا واحدًا. نحمّل ما يلزم عند اختيار اللغة فقط.
 */
const SCRIPT_FONTS = {
  fa: 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700&display=swap',
  ur: 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;700&display=swap',
}

function ensureScriptFont(code) {
  const href = SCRIPT_FONTS[code]
  if (!href || typeof document === 'undefined') return
  if (document.querySelector(`link[data-script-font="${code}"]`)) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.scriptFont = code
  document.head.appendChild(link)
}

function readStored(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null // وضع التصفح الخاص قد يمنع التخزين
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // تجاهل: التخزين غير متاح، الاختيار يبقى لهذه الجلسة فقط
  }
}

export function I18nProvider({ children, initialLanguage }) {
  // ترتيب الأولوية: قيمة ممرّرة (للاختبارات) ← اختيار محفوظ ← لغة الجهاز
  const [language, setLanguageState] = useState(() => initialLanguage || readStored(STORAGE_KEY) || null)

  // تمرير initialLanguage يعني أن الإعداد تمّ — يفيد الاختبارات والتضمين
  const [onboarded, setOnboarded] = useState(
    () => Boolean(initialLanguage) || readStored(ONBOARDED_KEY) === 'true',
  )

  const deviceLanguage = useMemo(() => detectDeviceLanguage() || DEFAULT_LANGUAGE, [])

  // اللغة الفعّالة: المختارة، وإلا لغة الجهاز مؤقتًا حتى يختار المستخدم
  const active = language || deviceLanguage
  const meta = getLanguage(active) || getLanguage(DEFAULT_LANGUAGE)

  // مزامنة اتجاه الصفحة ولغتها — يؤثر على التخطيط والقارئات الصوتية معًا
  useEffect(() => {
    const root = document.documentElement
    root.lang = meta.code
    root.dir = meta.dir
    ensureScriptFont(meta.code)
  }, [meta])

  const setLanguage = useCallback((code) => {
    setLanguageState(code)
    writeStored(STORAGE_KEY, code)
  }, [])

  const completeOnboarding = useCallback(() => {
    setOnboarded(true)
    writeStored(ONBOARDED_KEY, 'true')
  }, [])

  const value = useMemo(
    () => ({
      language: active,
      meta,
      dir: meta.dir,
      isRtl: meta.dir === 'rtl',
      /** هل اختار المستخدم لغة صراحةً؟ */
      hasChosen: Boolean(language),
      /** هل أنهى شاشة الترحيب؟ هذا وحده ما يحدد إخفاءها. */
      onboarded,
      completeOnboarding,
      deviceLanguage,
      setLanguage,
      t: (key, vars) => translate(active, key, vars),
      /** هل تتوفر القصص الكاملة بهذه اللغة، أم ستُعرض بلغة بديلة؟ */
      hasFullContent: FULL_CONTENT_LANGUAGES.includes(active),
      /** اللغة التي ستُعرض بها القصص فعليًا. */
      contentLanguage: FULL_CONTENT_LANGUAGES.includes(active) ? active : 'en',
      /**
       * اتجاه نص المحتوى — قد يخالف اتجاه الواجهة.
       *
       * قارئ أردي يرى واجهةً من اليمين لليسار بينما القصص بالإنجليزية من
       * اليسار لليمين. بدون تحديد هذا الاتجاه على عناصر المحتوى، يضع
       * المتصفح النقطة في أول الجملة الإنجليزية لا في آخرها.
       */
      contentDir: FULL_CONTENT_LANGUAGES.includes(active) && active === 'ar' ? 'rtl' : 'ltr',
    }),
    [active, meta, language, onboarded, completeOnboarding, deviceLanguage, setLanguage],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n يجب أن يُستخدم داخل I18nProvider')
  return context
}

export { STORAGE_KEY, ONBOARDED_KEY }
