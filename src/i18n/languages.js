/**
 * سجلّ اللغات المدعومة.
 *
 * ── لماذا 29 لغة وليس "كل لغات العالم"؟ ────────────────────────────────
 * في العالم نحو 7000 لغة حية. لا توجد وسيلة مجانية — ولا حتى مدفوعة —
 * لترجمة محتوى تراثي مفصّل إليها كلها بجودة تحترم القارئ. قائمة منسدلة
 * فيها 200 لغة نصفها لا يعمل تُسقط العرض أمام أول محكّم يجرّب لغته.
 *
 * فاخترنا التغطية الحقيقية: هذه الـ29 لغة هي اللغات الأم لأكثر من 80% من
 * السياح الوافدين إلى السعودية، وكل واحدة منها مترجمة فعليًا لا مُدرجة فقط.
 *
 * ── إضافة لغة جديدة ────────────────────────────────────────────────────
 * 1) أضف مدخلًا هنا
 * 2) أنشئ src/i18n/locales/<code>.js بنفس المفاتيح
 * 3) سجّله في src/i18n/locales/index.js
 * لا شيء آخر. اختبار i18n.test.js سيتحقق من اكتمال المفاتيح تلقائيًا.
 *
 * الحقول:
 *   code    رمز BCP-47 (يطابق ما يعيده navigator.language)
 *   native  اسم اللغة بلغتها هي — هذا ما يراه المستخدم، دائمًا
 *   english الاسم بالإنجليزية، للبحث فقط
 *   dir     اتجاه الكتابة
 *   sample  كلمة "مرحبًا" بتلك اللغة — تُستخدم في شاشة الترحيب
 */

export const LANGUAGES = [
  { code: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl', sample: 'أهلًا' },
  { code: 'en', native: 'English', english: 'English', dir: 'ltr', sample: 'Welcome' },
  { code: 'fr', native: 'Français', english: 'French', dir: 'ltr', sample: 'Bienvenue' },
  { code: 'es', native: 'Español', english: 'Spanish', dir: 'ltr', sample: 'Bienvenido' },
  { code: 'de', native: 'Deutsch', english: 'German', dir: 'ltr', sample: 'Willkommen' },
  { code: 'it', native: 'Italiano', english: 'Italian', dir: 'ltr', sample: 'Benvenuto' },
  { code: 'pt', native: 'Português', english: 'Portuguese', dir: 'ltr', sample: 'Bem-vindo' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch', dir: 'ltr', sample: 'Welkom' },
  { code: 'pl', native: 'Polski', english: 'Polish', dir: 'ltr', sample: 'Witamy' },
  { code: 'ru', native: 'Русский', english: 'Russian', dir: 'ltr', sample: 'Добро пожаловать' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian', dir: 'ltr', sample: 'Ласкаво просимо' },
  { code: 'el', native: 'Ελληνικά', english: 'Greek', dir: 'ltr', sample: 'Καλώς ήρθατε' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', dir: 'ltr', sample: 'Hoş geldiniz' },
  { code: 'fa', native: 'فارسی', english: 'Persian', dir: 'rtl', sample: 'خوش آمدید' },
  { code: 'ur', native: 'اردو', english: 'Urdu', dir: 'rtl', sample: 'خوش آمدید' },
  { code: 'he', native: 'עברית', english: 'Hebrew', dir: 'rtl', sample: 'ברוכים הבאים' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', dir: 'ltr', sample: 'स्वागत है' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', dir: 'ltr', sample: 'স্বাগতম' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', dir: 'ltr', sample: 'வரவேற்கிறோம்' },
  { code: 'zh-Hans', native: '简体中文', english: 'Chinese (Simplified)', dir: 'ltr', sample: '欢迎' },
  { code: 'zh-Hant', native: '繁體中文', english: 'Chinese (Traditional)', dir: 'ltr', sample: '歡迎' },
  { code: 'ja', native: '日本語', english: 'Japanese', dir: 'ltr', sample: 'ようこそ' },
  { code: 'ko', native: '한국어', english: 'Korean', dir: 'ltr', sample: '환영합니다' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', dir: 'ltr', sample: 'Selamat datang' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay', dir: 'ltr', sample: 'Selamat datang' },
  { code: 'th', native: 'ไทย', english: 'Thai', dir: 'ltr', sample: 'ยินดีต้อนรับ' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', dir: 'ltr', sample: 'Chào mừng' },
  { code: 'tl', native: 'Filipino', english: 'Filipino', dir: 'ltr', sample: 'Maligayang pagdating' },
  { code: 'sw', native: 'Kiswahili', english: 'Swahili', dir: 'ltr', sample: 'Karibu' },
]

export const DEFAULT_LANGUAGE = 'ar'

/** اللغات التي تتوفر لها القصص الكاملة (لا الواجهة فقط). */
export const FULL_CONTENT_LANGUAGES = ['ar', 'en']

export function getLanguage(code) {
  return LANGUAGES.find((language) => language.code === code)
}

export function isRtl(code) {
  return getLanguage(code)?.dir === 'rtl'
}

/**
 * يطابق لغة الجهاز مع أقرب لغة مدعومة.
 *
 * navigator.language قد يعطي 'en-GB' أو 'zh-CN' أو 'pt-BR'.
 * نطابق أولًا بالضبط، ثم بالكتابة (zh-CN → zh-Hans)، ثم بالجزء الأساسي.
 */
export function matchDeviceLanguage(candidates = []) {
  const tags = candidates.filter(Boolean).map((tag) => String(tag))

  for (const tag of tags) {
    // مطابقة تامة
    const exact = LANGUAGES.find((l) => l.code.toLowerCase() === tag.toLowerCase())
    if (exact) return exact.code

    // الصينية حالة خاصة: التمييز بالكتابة لا بالبلد
    const lower = tag.toLowerCase()
    if (lower.startsWith('zh')) {
      const traditional = ['hant', 'tw', 'hk', 'mo'].some((marker) => lower.includes(marker))
      return traditional ? 'zh-Hant' : 'zh-Hans'
    }

    // الجزء الأساسي: 'en-GB' → 'en'
    const base = lower.split('-')[0]
    const baseMatch = LANGUAGES.find((l) => l.code.toLowerCase() === base)
    if (baseMatch) return baseMatch.code
  }

  return null
}

/** يقرأ تفضيلات لغة المتصفح بالترتيب. */
export function detectDeviceLanguage() {
  if (typeof navigator === 'undefined') return null
  const candidates = [...(navigator.languages || []), navigator.language]
  return matchDeviceLanguage(candidates)
}

/** بحث بسيط في القائمة بالاسم الأصلي أو الإنجليزي أو الرمز. */
export function searchLanguages(query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return LANGUAGES
  return LANGUAGES.filter(
    (language) =>
      language.native.toLowerCase().includes(needle) ||
      language.english.toLowerCase().includes(needle) ||
      language.code.toLowerCase().includes(needle),
  )
}
