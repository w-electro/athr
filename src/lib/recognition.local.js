/**
 * التعرّف المحلي على المواقع — داخل متصفح الزائر، بلا خادم وبلا تكلفة.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  كيف يعمل، بلا مصطلحات
 * ══════════════════════════════════════════════════════════════════════
 *
 * لا نُدرّب نموذجًا هنا. نستخدم نموذجًا مُدرَّبًا مسبقًا (DINOv3) يحوّل أي
 * صورة إلى قائمة أرقام تصف "شكلها" — تُسمى المتجه (embedding).
 *
 * صورتان لنفس الواجهة الصخرية تعطيان متجهين متقاربين، حتى لو اختلفت
 * الزاوية والإضاءة. فيصير السؤال «ما هذا الموقع؟» مجرّد: أيّ متجه مرجعي
 * أقرب إلى متجه صورة الكاميرا؟
 *
 * ولهذا الاختيار سبب عملي لا نظري: إضافة موقع خامس = إضافة صوره فقط.
 * لا إعادة تدريب، ولا شيء يُكسر. لو دربنا مصنِّفًا لاحتاج تدريبًا كاملًا
 * كلّما أضفت موقعًا — وهو ما لا يحتمله مشروع ينمو موقعًا بعد موقع.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  من أين تأتي المتجهات المرجعية
 * ══════════════════════════════════════════════════════════════════════
 *
 * من مسارين، بهذا الترتيب:
 *
 *  1. فهرس جاهز في public/reference-index.json — يبنيه دفتر Kaggle
 *     (notebooks/build-reference-index.ipynb). هذا هو المسار الموصى به:
 *     المتصفح لا يُنزّل صور المرجع إطلاقًا، بل ملف أرقام صغير، فيبدأ
 *     التعرّف فورًا.
 *
 *  2. وإن لم يوجد الفهرس: نحسب المتجهات في المتصفح من site.photos وقت
 *     التشغيل. يعمل، لكنه أبطأ ويُنزّل كل صور المرجع.
 *
 * ⚠️ شرط لا يُخالف: الفهرس وصورة الكاميرا يجب أن يمرّا بالنموذج نفسه
 *    وبالدقّة نفسها. لو بنيتَ الفهرس بنموذج وقارنتَ بآخر، فالأرقام
 *    ببساطة لا تعني الشيء نفسه والنتائج ستكون عشوائية. لذلك يتحقّق الكود
 *    أدناه من بصمة النموذج المحفوظة داخل الفهرس ويرفضه إن اختلفت.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  التفعيل
 * ══════════════════════════════════════════════════════════════════════
 *   npm install @huggingface/transformers
 *   VITE_RECOGNITION_PROVIDER=local   في ملف .env
 */

import { getAllSites } from '../data/sites.js'

/**
 * النموذج والدقّة — يجب أن يطابقا ما في دفتر Kaggle حرفًا بحرف.
 *
 * DINOv3 ViT-S/16: صغير (~22 ميغابايت بدقّة q8) وممتاز في تمييز "هل هذا
 * نفس الجسم الفعلي؟" — وهو سؤالنا بالضبط.
 *
 * ملاحظة ترخيص: DINOv3 يصدر برخصة Meta الخاصة به لا Apache-2.0. إن أردت
 * ترخيصًا أكثر تساهلًا فبدّل السطر التالي إلى:
 *   'onnx-community/dinov2-small'   (Apache-2.0)
 * ثم أعد بناء الفهرس بالنموذج الجديد — وإلا فسدت المطابقة.
 */
export const MODEL_ID = 'onnx-community/dinov3-vits16-pretrain-lvd1689m-ONNX'
export const MODEL_DTYPE = 'q8'

/** أقل تشابه نعتبره تعرّفًا ناجحًا. اضبطه بالدفتر بعد تجربة صورك. */
export const SIMILARITY_THRESHOLD = 0.62

/**
 * أقل فارق مطلوب بين الأول والثاني.
 *
 * لماذا لا يكفي التشابه وحده: لو تشابهت واجهتان صخريتان، قد يعطي النموذج
 * 0.71 للأولى و0.70 للثانية. التشابه عالٍ لكن الاختيار بينهما عشوائي
 * عمليًا. فنطلب فارقًا واضحًا، وإلا أقررنا بعدم المعرفة — وهو أفضل بكثير
 * من إجابة واثقة خاطئة أمام لجنة تحكيم.
 */
export const MIN_MARGIN = 0.04

const INDEX_URL = `${import.meta.env?.BASE_URL ?? '/'}reference-index.json`

let extractorPromise = null
let indexPromise = null

/* ────────────────────────────── النموذج ────────────────────────────── */

async function getExtractor(onProgress) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers')
      return pipeline('image-feature-extraction', MODEL_ID, {
        dtype: MODEL_DTYPE,
        progress_callback: onProgress,
      })
    })()
  }
  return extractorPromise
}

/**
 * يحوّل مخرجات النموذج إلى متجه واحد مطبَّع.
 *
 * النماذج تُرجع أشكالًا مختلفة: بعضها pooler_output جاهز، وبعضها
 * last_hidden_state وهو متجه لكل رقعة من الصورة. في الحالة الثانية نأخذ
 * الرمز الأول (CLS) الذي يلخّص الصورة كلها. نتعامل مع الحالتين حتى لا
 * ينكسر الكود عند تبديل النموذج.
 */
function toVector(output) {
  const tensor = output?.pooler_output ?? output?.last_hidden_state ?? output
  const data = Array.from(tensor.data ?? tensor)
  const dims = tensor.dims

  // [batch, tokens, hidden] → نأخذ رمز CLS (أول رمز)
  if (dims?.length === 3) {
    const hidden = dims[2]
    return normalize(data.slice(0, hidden))
  }
  return normalize(data)
}

/** يجعل طول المتجه 1، فيصبح الضرب النقطي = تشابه جيب التمام مباشرة. */
function normalize(vector) {
  let sum = 0
  for (const value of vector) sum += value * value
  const magnitude = Math.sqrt(sum) || 1
  return vector.map((value) => value / magnitude)
}

function dot(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i]
  return sum
}

/* ────────────────────────────── الفهرس ────────────────────────────── */

/**
 * يجلب الفهرس الجاهز إن وُجد، وإلا يبنيه في المتصفح من صور المواقع.
 * يُرجع: [{ siteId, vector }]
 */
async function getIndex(extractor) {
  if (!indexPromise) {
    indexPromise = (async () => {
      const prebuilt = await fetchPrebuiltIndex()
      if (prebuilt) return prebuilt
      return buildIndexInBrowser(extractor)
    })()
  }
  return indexPromise
}

async function fetchPrebuiltIndex() {
  try {
    const response = await fetch(INDEX_URL)
    if (!response.ok) return null

    const payload = await response.json()

    // التحقّق من بصمة النموذج — فهرسٌ بُني بنموذج آخر أسوأ من لا فهرس
    if (payload.model !== MODEL_ID || payload.dtype !== MODEL_DTYPE) {
      console.warn(
        `[أثر] فهرس المرجع بُني بـ ${payload.model}/${payload.dtype} ` +
          `بينما التطبيق يستخدم ${MODEL_ID}/${MODEL_DTYPE}. ` +
          `أعد بناء الفهرس بالدفتر. سنتجاهله الآن ونحسب المتجهات في المتصفح.`,
      )
      return null
    }

    return payload.entries.map((entry) => ({
      siteId: entry.siteId,
      vector: normalize(entry.vector),
    }))
  } catch {
    return null // لا فهرس — نكمل بالمسار الاحتياطي
  }
}

async function buildIndexInBrowser(extractor) {
  const entries = []
  for (const site of getAllSites()) {
    for (const photo of site.photos ?? []) {
      try {
        const output = await extractor(photo)
        entries.push({ siteId: site.id, vector: toVector(output) })
      } catch {
        // صورة مفقودة أو تالفة لا توقف البقية
      }
    }
  }
  return entries
}

/** يمسح الذاكرة — استخدمه بعد تحديث الصور أو الفهرس. */
export function clearReferenceIndex() {
  indexPromise = null
}

/* ─────────────────────────── نقطة الدخول ─────────────────────────── */

/**
 * @param {{ imageBase64?: string, imageUrl?: string, onProgress?: Function }} input
 */
export async function localVisionProvider(input = {}) {
  const started = Date.now()
  const source =
    input.imageUrl || (input.imageBase64 ? `data:image/jpeg;base64,${input.imageBase64}` : null)

  if (!source) throw new Error('localVisionProvider يحتاج صورة')

  const extractor = await getExtractor(input.onProgress)
  const index = await getIndex(extractor)

  if (index.length === 0) {
    return {
      status: 'no-match',
      siteId: null,
      confidence: 0,
      provider: 'local',
      elapsedMs: Date.now() - started,
      evidence: [
        'لا توجد متجهات مرجعية بعد. ابنِ الفهرس بدفتر Kaggle، أو أضف صورًا في photos داخل sites.js',
      ],
    }
  }

  const queryVector = toVector(await extractor(source))

  // أعلى تشابه لكل موقع لا لكل صورة، وإلا فاز الموقع الذي له صور أكثر
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
  const margin = topScore - runnerUp

  const confident = topScore >= SIMILARITY_THRESHOLD && margin >= MIN_MARGIN

  if (!confident) {
    return {
      status: 'no-match',
      siteId: null,
      confidence: Math.max(0, topScore),
      provider: 'local',
      elapsedMs: Date.now() - started,
    }
  }

  return {
    status: 'match',
    siteId: topSiteId,
    confidence: topScore,
    provider: 'local',
    elapsedMs: Date.now() - started,
  }
}
