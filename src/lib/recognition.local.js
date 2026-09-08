/**
 * مزوّد التعرّف المحلي — يعمل داخل متصفح الزائر، بلا خادم وبلا تكلفة.
 *
 * ── لماذا هذا هو المسار الموصى به لـ "أثر" ──────────────────────────────
 * 1) مجاني تمامًا: transformers.js مفتوح المصدر (Apache-2.0)، والنموذج
 *    يُحمّل من Hugging Face مجانًا. لا مفاتيح API ولا فواتير استهلاك.
 * 2) يعمل بلا إنترنت بعد التحميل الأول — وهذه ميزة جوهرية لا تجميلية:
 *    جبة تبعد 95 كم عن حائل والتغطية فيها ضعيفة. سائح واقف أمام النقوش
 *    بلا شبكة سيظل قادرًا على استخدام التطبيق.
 * 3) خصوصية: الصورة لا تغادر جهاز المستخدم إطلاقًا.
 *
 * ── كيف يعمل ──────────────────────────────────────────────────────────
 * نموذج CLIP يحوّل أي صورة إلى متجه أرقام (embedding) يمثّل محتواها.
 * نحسب متجهات صورك المرجعية من كل موقع مرة واحدة ونخزّنها، ثم نقارن
 * صورة الكاميرا بها بحساب "تشابه جيب التمام" (cosine similarity).
 * أعلى تشابه يتجاوز العتبة = الموقع المتعرَّف عليه.
 *
 * ── التفعيل ───────────────────────────────────────────────────────────
 *   npm install @huggingface/transformers
 *   ضع صورك في public/reference/<siteId>/ وسجّلها في photos داخل sites.js
 *   VITE_RECOGNITION_PROVIDER=local في ملف .env
 *
 * ملاحظة: الاستيراد ديناميكي (import داخل الدالة) حتى لا تُحمّل المكتبة
 * ولا يزيد حجم الحزمة ما لم يُستخدم هذا المزوّد فعلًا.
 */

import { getAllSites } from '../data/sites.js'

const MODEL_ID = 'Xenova/clip-vit-base-patch32'

/** أقل تشابه نعتبره تعرّفًا ناجحًا. اضبطه بعد تجربة صورك الحقيقية. */
export const SIMILARITY_THRESHOLD = 0.75

let extractorPromise = null
let referenceIndex = null

/** يحمّل النموذج مرة واحدة ويعيد استخدامه. */
async function getExtractor(onProgress) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return pipeline('image-feature-extraction', MODEL_ID, {
        dtype: 'q8', // نسخة مكمّمة أصغر وأسرع على الجوال
        progress_callback: onProgress,
      })
    })()
  }
  return extractorPromise
}

/** يبني فهرس المتجهات لكل صورة مرجعية مسجّلة في sites.js. */
async function buildReferenceIndex(extractor) {
  if (referenceIndex) return referenceIndex

  const entries = []
  for (const site of getAllSites()) {
    for (const photo of site.photos ?? []) {
      const output = await extractor(photo)
      entries.push({ siteId: site.id, vector: normalize(Array.from(output.data)) })
    }
  }

  referenceIndex = entries
  return entries
}

/** يمسح الفهرس — استخدمه بعد إضافة صور مرجعية جديدة. */
export function clearReferenceIndex() {
  referenceIndex = null
}

/**
 * @param {{ imageBase64?: string, imageUrl?: string, onProgress?: Function }} input
 */
export async function localVisionProvider(input = {}) {
  const started = Date.now()
  const source = input.imageUrl || (input.imageBase64 ? `data:image/jpeg;base64,${input.imageBase64}` : null)

  if (!source) throw new Error('localVisionProvider يحتاج صورة')

  const extractor = await getExtractor(input.onProgress)
  const index = await buildReferenceIndex(extractor)

  if (index.length === 0) {
    return {
      status: 'no-match',
      siteId: null,
      label: 'لا توجد صور مرجعية بعد',
      confidence: 0,
      evidence: [
        'أضف صورًا في public/reference/<siteId>/ وسجّلها في حقل photos داخل sites.js',
      ],
      provider: 'local',
      elapsedMs: Date.now() - started,
    }
  }

  const output = await extractor(source)
  const queryVector = normalize(Array.from(output.data))

  // نجمع أعلى تشابه لكل موقع، لا لكل صورة، حتى لا يفوز موقع لديه صور أكثر
  const bestPerSite = new Map()
  for (const entry of index) {
    const score = dot(queryVector, entry.vector)
    if (!bestPerSite.has(entry.siteId) || score > bestPerSite.get(entry.siteId)) {
      bestPerSite.set(entry.siteId, score)
    }
  }

  const ranked = [...bestPerSite.entries()].sort((a, b) => b[1] - a[1])
  const [topSiteId, topScore] = ranked[0]
  const runnerUp = ranked[1]?.[1] ?? 0
  const site = getAllSites().find((s) => s.id === topSiteId)

  if (topScore < SIMILARITY_THRESHOLD) {
    return {
      status: 'no-match',
      siteId: null,
      label: 'لم نتعرّف على الموقع بثقة كافية',
      confidence: topScore,
      evidence: [
        `أقرب تطابق: ${site?.name ?? '—'} بنسبة ${(topScore * 100).toFixed(0)}%`,
        'جرّب الاقتراب أكثر من النقش أو التصوير في إضاءة أفضل',
      ],
      provider: 'local',
      elapsedMs: Date.now() - started,
    }
  }

  return {
    status: 'match',
    siteId: topSiteId,
    label: site.scan.matchLabel,
    confidence: topScore,
    evidence: [
      `تشابه بصري ${(topScore * 100).toFixed(0)}% مع الصور المرجعية للموقع`,
      `فارق واضح عن أقرب منافس (${(runnerUp * 100).toFixed(0)}%)`,
      'التحليل تمّ على جهازك — لم تُرفع الصورة إلى أي خادم',
    ],
    provider: 'local',
    elapsedMs: Date.now() - started,
  }
}

/* ─────────────────────────── حساب المتجهات ─────────────────────────── */

/** تطبيع المتجه إلى طول 1، فيصبح الضرب النقطي = تشابه جيب التمام. */
function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / magnitude)
}

function dot(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i]
  return sum
}
