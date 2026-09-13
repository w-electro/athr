/**
 * الوصول إلى ملفات السرد المولّدة مسبقًا.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا نولّد الصوت مسبقًا بدل تركيبه على الهاتف
 * ══════════════════════════════════════════════════════════════════════
 * نصّ السرد ثابت: ستّة مواقع في تسعٍ وعشرين لغة. وما دام ثابتًا فلا
 * سبب يدعو الهاتف إلى حمل نموذج نطق وتشغيله في كل مرة:
 *
 *   • الجودة  — نولّد على الحاسوب بأفضل نموذج لكل لغة، بلا قيود الهاتف.
 *   • الحجم   — الزائر ينزّل مقطعًا بحجم ~٣٠٠ كيلوبايت، لا نموذجًا بحجم
 *               عشرات الميغابايت.
 *   • التزامن — نقيس مدّة كل جملة وقت التوليد، فيصير إبراز النص مطابقًا
 *               للصوت تمامًا لا تقديرًا.
 *   • الاتساق — كل لغة لها صوت فعلي، ولا تعتمد على ما ثبّته صانع الهاتف.
 *
 * وحين لا يوجد ملف للغةٍ ما يتراجع المشغّل إلى نطق المتصفح كما كان،
 * فالإضافة لا تكسر شيئًا: غيابُ الملفات يعني سلوك اليوم نفسه.
 */

const MANIFEST_PATH = 'audio/manifest.json'

/** نداء واحد للفهرس مهما تعدّدت الشاشات التي تطلبه. */
let manifestPromise = null

function manifestUrl() {
  const base = import.meta.env?.BASE_URL ?? '/'
  return `${base}${MANIFEST_PATH}`
}

/**
 * يقرأ فهرس المقاطع.
 *
 * لا يرمي أبدًا: غياب الفهرس حالة متوقّعة تمامًا (قبل تشغيل مولّد الصوت)،
 * وليست خطأً يستحقّ إفساد الشاشة.
 */
export function loadAudioManifest() {
  if (manifestPromise) return manifestPromise

  manifestPromise = fetch(manifestUrl())
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data && typeof data.clips === 'object' ? data.clips : {}))
    .catch(() => ({}))

  return manifestPromise
}

/** للاختبارات، ولإعادة القراءة بعد توليد جديد. */
export function clearAudioManifest() {
  manifestPromise = null
}

export function clipKey(language, siteId) {
  return `${language}/${siteId}`
}

/**
 * يبحث عن مقطع للغة وموقع.
 *
 * يعيد null بلا ضجيج حين لا يوجد — وهو ما يدفع المشغّل إلى وضع النطق.
 */
export async function findClip(language, siteId) {
  if (!language || !siteId) return null

  const clips = await loadAudioManifest()
  const entry = clips[clipKey(language, siteId)]
  if (!entry?.file) return null

  const base = import.meta.env?.BASE_URL ?? '/'
  return {
    url: `${base}audio/${entry.file}`,
    seconds: Number(entry.seconds) || 0,
    // بدايات الجمل بالثواني كما قيست وقت التوليد
    offsets: Array.isArray(entry.offsets) ? entry.offsets : [],
    voice: entry.voice ?? null,
    engine: entry.engine ?? null,
  }
}

/**
 * يحوّل الوقت الحالي إلى (فهرس الجملة، نسبة التقدّم داخلها).
 *
 * دالّة خالصة حتى تُختبر وحدها — مزامنة النص بالصوت هي أكثر ما يُلاحظه
 * الزائر، فلا نتركها بلا اختبار.
 */
export function locateSegment(currentTime, offsets, totalSeconds) {
  if (!offsets.length) return { index: 0, fraction: 0 }

  let index = 0
  while (index + 1 < offsets.length && currentTime >= offsets[index + 1]) index += 1

  const start = offsets[index]
  const end = offsets[index + 1] ?? totalSeconds ?? start + 1
  const span = Math.max(0.001, end - start)

  return {
    index,
    fraction: Math.min(1, Math.max(0, (currentTime - start) / span)),
  }
}
