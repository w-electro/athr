/**
 * نطق السرد بصوت حقيقي — عبر Web Speech API المدمجة في المتصفح.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا هذه الطريقة تحديدًا
 * ══════════════════════════════════════════════════════════════════════
 *
 * خدمات تحويل النص إلى كلام (TTS) تُحاسب بالحرف عادةً. أما `speechSynthesis`
 * فهي جزء من المتصفح نفسه:
 *
 *   • مجانية بلا حدود ولا مفاتيح ولا حساب
 *   • تعمل بلا إنترنت على أغلب الأجهزة (الأصوات مثبّتة في نظام التشغيل)
 *   • لا تُرسل نصًّا إلى أي خادم
 *   • تدعم عشرات اللغات جاهزةً
 *
 * وهذا يحوّل "مشغّل السرد" من محاكاة إلى دليل صوتي حقيقي — وهو بالضبط ما
 * يحتاجه زائر واقف أمام النقش لا يريد أن يقرأ.
 *
 * ── الحدود، بصراحة ────────────────────────────────────────────────────
 * الأصوات المتاحة تخصّ جهاز الزائر لا التطبيق. هاتف قد يملك صوتًا عربيًا
 * ممتازًا وآخر لا يملك أي صوت تاميلي. لذلك نتحقّق أولًا، وإن لم نجد صوتًا
 * مناسبًا نعود إلى العرض النصّي المتزامن بدل أن ننطق بلكنة خاطئة.
 */

/**
 * تحويل رموز لغات التطبيق إلى رموز BCP-47 التي تفهمها المتصفحات.
 * أغلبها متطابق؛ الصينية وحدها تحتاج تحديد البلد لا الكتابة.
 */
const SPEECH_LANG = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
}

export function toSpeechLang(code) {
  return SPEECH_LANG[code] ?? code
}

/** هل يدعم هذا المتصفح النطق أصلًا؟ */
export function isSpeechSupported() {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'
}

/**
 * كلمات في أسماء الأصوات تدلّ على جودة أعلى.
 *
 * الأنظمة تشحن عادةً صوتين لكل لغة: صوتًا مضغوطًا صغيرًا يُثبَّت افتراضيًا،
 * وصوتًا عصبيًا أفضل بكثير يحمل في اسمه إحدى هذه الكلمات. الفرق بينهما
 * في الأذن كبير — وهو الفرق بين "دليل صوتي" و"صوت آلة قديمة".
 */
const QUALITY_HINTS = [
  'premium',
  'enhanced',
  'neural',
  'natural',
  'siri',
  'google',
  'wavenet',
  'multilingual',
]

/** كلمات تدلّ على الصوت المضغوط منخفض الجودة. */
const LOW_QUALITY_HINTS = ['compact', 'eloquence', 'espeak']

function normalizeLang(voice) {
  return (voice.lang || '').toLowerCase().replace('_', '-')
}

/**
 * يعطي الصوت درجة تقريبية للجودة.
 *
 * ── تصحيح مهم ──
 * كانت النسخة الأولى تُفضّل الصوت المحلي (localService) دائمًا بحجّة أنه
 * يعمل بلا إنترنت. وكان ذلك خطأً مسموعًا: على أندرويد وiOS الصوتُ المحلي
 * الافتراضي هو غالبًا الصوت المضغوط الرديء، بينما الصوت الجيّد شبكيّ أو
 * يحتاج تنزيلًا. فالنتيجة أننا كنا نختار الأسوأ عمدًا.
 *
 * الآن: الجودة تتقدّم ما دمنا متصلين، والاتصال المفقود وحده يفرض المحلي.
 */
export function rankVoice(voice, wanted, { requireOffline = false } = {}) {
  const name = (voice.name || '').toLowerCase()
  const lang = normalizeLang(voice)

  /*
   * null تعني "مستبعد"، لا "رديء".
   *
   * التفريق ضروري: كان الاستبعاد يعتمد على درجةٍ سالبة، فكان الصوت
   * المضغوط الوحيد على الجهاز يسقط تمامًا ويحصل المستخدم على صمت بدل
   * صوتٍ متواضع. الرداءة تُنزِّل الترتيب، ولا تُخرج من القائمة.
   */
  if (requireOffline && !voice.localService) return null

  let score = 0
  if (lang === wanted) score += 6 // مطابقة تامة للبلد
  if (QUALITY_HINTS.some((hint) => name.includes(hint))) score += 5
  if (LOW_QUALITY_HINTS.some((hint) => name.includes(hint))) score -= 4
  if (voice.localService) score += 1 // ترجيح خفيف: يعمل بلا إنترنت
  if (voice.default) score += 1

  return score
}

/**
 * كل الأصوات المتاحة للغة، مرتّبة من الأفضل إلى الأقلّ.
 *
 * نعرضها للمستخدم لأن الحكم النهائي أذنه: هاتفٌ قد يحمل ثلاثة أصوات عربية
 * تختلف جودتها اختلافًا كبيرًا، ولا توجد قاعدة برمجية تعرف أيّها أطيب
 * على جهازٍ بعينه.
 */
export function listVoices(voices, speechLang, options = {}) {
  if (!voices?.length || !speechLang) return []

  const wanted = speechLang.toLowerCase()
  const base = wanted.split('-')[0]

  return voices
    .filter((voice) => {
      const lang = normalizeLang(voice)
      return lang === wanted || lang.startsWith(`${base}-`) || lang === base
    })
    .map((voice) => ({ voice, score: rankVoice(voice, wanted, options) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.voice)
}

/**
 * يختار أنسب صوت للغة المطلوبة، أو null إن لم يوجد.
 *
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} speechLang - رمز BCP-47
 * @param {{ requireOffline?: boolean }} options
 */
export function pickVoice(voices, speechLang, options = {}) {
  const ranked = listVoices(voices, speechLang, options)
  if (ranked.length > 0) return ranked[0]

  // بلا اتصال ولم نجد صوتًا محليًا: نقبل أي صوت باللغة بدل الصمت
  if (options.requireOffline) return listVoices(voices, speechLang)[0] ?? null
  return null
}

/**
 * يجلب الأصوات المتاحة.
 *
 * getVoices() تُرجع مصفوفة فارغة أول مرة في بعض المتصفحات لأن القائمة
 * تُحمّل غير متزامنة، ثم يُطلق حدث voiceschanged. لذلك ننتظره — مع مهلة
 * قصوى حتى لا نعلّق الواجهة على متصفح لا يُطلق الحدث إطلاقًا.
 */
export function loadVoices(timeoutMs = 1200) {
  if (!isSpeechSupported()) return Promise.resolve([])

  const synth = window.speechSynthesis
  const immediate = synth.getVoices()
  if (immediate.length > 0) return Promise.resolve(immediate)

  return new Promise((resolve) => {
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      synth.removeEventListener?.('voiceschanged', finish)
      resolve(synth.getVoices())
    }

    synth.addEventListener?.('voiceschanged', finish)
    setTimeout(finish, timeoutMs)
  })
}

/** يوقف أي نطق جارٍ. آمن للاستدعاء دائمًا. */
export function cancelSpeech() {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // بعض المتصفحات ترمي عند الإلغاء وقت عدم وجود نطق — لا يضرّ
  }
}
