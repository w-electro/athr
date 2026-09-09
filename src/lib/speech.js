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
 * يختار أنسب صوت للغة المطلوبة.
 *
 * الترتيب: مطابقة تامة (ar-SA) ← مطابقة الجزء الأساسي (ar) ← لا شيء.
 * ونفضّل الصوت المحلي (localService) لأنه يعمل بلا إنترنت — وهو شرط
 * جوهري لتطبيق يُستخدم في موقع أثري بلا تغطية.
 *
 * @param {SpeechSynthesisVoice[]} voices
 * @param {string} speechLang - رمز BCP-47
 */
export function pickVoice(voices, speechLang) {
  if (!voices?.length || !speechLang) return null

  const wanted = speechLang.toLowerCase()
  const base = wanted.split('-')[0]

  const candidates = voices.filter((voice) => {
    const lang = (voice.lang || '').toLowerCase().replace('_', '-')
    return lang === wanted || lang.startsWith(`${base}-`) || lang === base
  })

  if (candidates.length === 0) return null

  // الصوت المحلي أولًا: يعمل بلا إنترنت
  const offline = candidates.filter((voice) => voice.localService)
  const pool = offline.length > 0 ? offline : candidates

  // ثم المطابقة التامة على الجزء الأساسي والبلد
  const exact = pool.find((voice) => (voice.lang || '').toLowerCase().replace('_', '-') === wanted)
  return exact ?? pool[0]
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
