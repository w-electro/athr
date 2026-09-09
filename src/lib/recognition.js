/**
 * طبقة التعرّف على المواقع من الصور.
 *
 * ── لماذا هذا الملف موجود ──────────────────────────────────────────────
 * شاشة المسح لا تعرف شيئًا عن كيفية التعرّف. هي تنادي `recognizeSite(input)`
 * فقط وتنتظر نتيجة بشكل ثابت (RecognitionResult). أسفل هذه الدالة يوجد
 * "سجل مزوّدين" (providers registry):
 *
 *   mock  → محاكاة محلية للعرض والتطوير (لا تحتاج إنترنت ولا مفاتيح)
 *   local → تعرّف حقيقي بـ DINOv3 داخل متصفح الزائر — مجاني وبلا خادم
 *
 * للانتقال إلى التعرّف الحقيقي:
 *   1) npm install @huggingface/transformers
 *   2) ابنِ فهرس المرجع بدفتر Kaggle (انظر notebooks/README.md)
 *   3) اضبط VITE_RECOGNITION_PROVIDER=local في .env
 * لا يحتاج أي كومبوننت إلى تعديل.
 *
 * ولإضافة مزوّد خارجي لاحقًا: أضف دالة إلى PROVIDERS تُرجع الشكل الموحّد
 * أدناه. لا شيء آخر في التطبيق يتغيّر.
 *
 * ── شكل النتيجة الموحّد ────────────────────────────────────────────────
 * {
 *   status: 'match' | 'no-match',
 *   siteId: string | null,  // المعرّف فقط — لا نص
 *   confidence: number,     // 0..1
 *   label?: string,         // نص جاهز، من مزوّد حيّ يولّده بلغة المستخدم
 *   evidence?: string[],    // المثل
 *   provider: string,
 *   elapsedMs: number,
 * }
 *
 * ── قاعدة مهمة: هذا الملف لا يُنتج نصًا بشريًا ──────────────────────────
 * المحاكاة تُرجع siteId فقط، والواجهة هي التي تقرأ الاسم والأدلة من بيانات
 * الموقع بلغة المستخدم. لو أعاد هذا الملف نصًا جاهزًا لظهرت نتيجة المسح
 * بالعربية دائمًا مهما كانت لغة الواجهة — وهو خطأ وقعنا فيه فعلًا وأصلحناه.
 *
 * الاستثناء الوحيد: مزوّد يولّد وصفًا حرًّا بلغة المستخدم (نموذج لغوي مثلًا)
 * له أن يملأ label/evidence مباشرة. الواجهة تفضّل نصّه إن وُجد.
 */

import { getAllSites, getSiteById } from '../data/sites.js'

/** مراحل التحليل المعروضة للمستخدم أثناء الانتظار (تجعل الانتظار مفهومًا لا فارغًا). */
export const ANALYSIS_STAGES = [
  { id: 'capture', label: 'التقاط الإطار', ms: 500 },
  { id: 'features', label: 'استخراج الملامح البصرية', ms: 900 },
  { id: 'match', label: 'مطابقة مع قاعدة المواقع التراثية', ms: 1000 },
  { id: 'verify', label: 'التحقق من السياق التاريخي', ms: 700 },
]

export const TOTAL_ANALYSIS_MS = ANALYSIS_STAGES.reduce((sum, s) => sum + s.ms, 0)

/* ────────────────────────────── مزوّد المحاكاة ────────────────────────────── */

/**
 * محاكاة تعرّف. تختار موقعًا بناءً على تلميح نصي إن وُجد، وإلا تدور
 * على المواقع بالترتيب حتى تبدو النتائج متنوعة أثناء العرض.
 */
let mockCursor = 0

async function mockProvider(input = {}) {
  const started = nowMs()
  await delay(input.instant ? 0 : TOTAL_ANALYSIS_MS)

  const site = pickMockSite(input)

  if (!site) {
    return {
      status: 'no-match',
      siteId: null,
      confidence: 0.31,
      provider: 'mock',
      elapsedMs: nowMs() - started,
    }
  }

  // المعرّف ودرجة الثقة فقط — الاسم والأدلة تقرأهما الواجهة بلغة المستخدم
  return {
    status: 'match',
    siteId: site.id,
    confidence: site.scan.confidence,
    provider: 'mock',
    elapsedMs: nowMs() - started,
  }
}

function pickMockSite(input) {
  const sites = getAllSites()

  // تلميح صريح (يُستخدم في العرض التوضيحي وفي الاختبارات)
  if (input.siteId) return getSiteById(input.siteId) ?? null

  // مطابقة بالكلمات المفتاحية إن أعطى المستخدم وصفًا نصيًا
  if (input.hint) {
    const hint = String(input.hint).trim()
    if (hint === '__none__') return null
    const found = sites.find((site) =>
      site.scan.keywords.some((keyword) => hint.includes(keyword)),
    )
    if (found) return found
  }

  // وإلا: دوران متسلسل حتى لا تتكرر النتيجة نفسها في كل تجربة
  const site = sites[mockCursor % sites.length]
  mockCursor += 1
  return site
}

/** تصفير مؤشر الدوران — تستخدمه الاختبارات لضمان نتائج ثابتة. */
export function resetMockCursor() {
  mockCursor = 0
}

/* ──────────────────────────── السجل والواجهة ──────────────────────────── */

/**
 * مزوّد التعرّف المحلي (DINOv3 في المتصفح) — مجاني وبلا خادم.
 * يُحمَّل ديناميكيًا حتى لا تدخل مكتبة النماذج في الحزمة إلا عند استخدامه.
 */
async function localProvider(input = {}) {
  const { localVisionProvider } = await import('./recognition.local.js')
  return localVisionProvider(input)
}

const PROVIDERS = {
  mock: mockProvider,
  local: localProvider,
}

/** المزوّد الافتراضي من متغيرات البيئة، مع الرجوع إلى المحاكاة. */
export function getActiveProviderName() {
  const configured = import.meta.env?.VITE_RECOGNITION_PROVIDER
  return configured && PROVIDERS[configured] ? configured : 'mock'
}

/**
 * نقطة الدخول الوحيدة للواجهة.
 * @param {object} input - { imageBase64?, hint?, siteId?, instant?, signal? }
 * @param {object} options - { provider?: 'mock' | 'local' }
 */
export async function recognizeSite(input = {}, options = {}) {
  const name = options.provider || getActiveProviderName()
  const provider = PROVIDERS[name]
  if (!provider) throw new Error(`مزوّد تعرّف غير معروف: ${name}`)

  try {
    return await provider(input)
  } catch (error) {
    // فشل الشبكة أو الخادم لا يكسر العرض. رسالة الخطأ التقنية تبقى كما هي
    // (ليست نصًا للمستخدم بل تشخيصًا)، والواجهة تعرض عنوانًا مترجمًا فوقها.
    return {
      status: 'no-match',
      siteId: null,
      confidence: 0,
      evidence: [error.message || 'unknown error'],
      provider: name,
      elapsedMs: 0,
      error: true,
    }
  }
}

/* ─────────────────────────────── أدوات ─────────────────────────────── */

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}
