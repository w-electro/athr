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

/**
 * أقل تشابه نعتبره تعرّفًا ناجحًا.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  الرقم مقيس لا مقدَّر
 * ══════════════════════════════════════════════════════════════════════
 * قيس على 198 صورة مرجعية لعشر لوحات في جبة، و53 صورة سالبة (رمل، سماء،
 * صخر بلا نقش). والأرقام من scripts/build-reference-index.mjs:
 *
 *   الصور الصحيحة : أدنى 0.802 · وسيط 0.954
 *   الصور السالبة : أعلى 0.896 · وسيط 0.666
 *
 * لاحظ التداخل: أضعف صورة صحيحة (0.802) أدنى من أقوى صورة سالبة (0.896).
 * ففصلٌ تامّ مستحيل، والسؤال أيّ الخطأين نحتمل.
 *
 * ── لماذا 0.91 ───────────────────────────────────────────────────────
 * كانت 0.62 تخمينًا كُتب قبل وجود صورٍ أصلًا. وبمسح العتبات على الفهرس
 * الحالي — مع سلّم القصّ مفعّلًا كما يعمل في المتصفح — 0.91 هي أدنى قيمة
 * تعطي **صفر** سوالب مقبولة:
 *
 *   0.87 → 195 صحيحة · 1 خاطئة · 3 سوالب مقبولة
 *   0.89 → 193 صحيحة · 0 خاطئة · 2 سوالب مقبولة
 *   0.90 → 192 صحيحة · 0 خاطئة · 1 سالبة مقبولة
 *   0.91 → 191 صحيحة · 0 خاطئة · 0 سالبة مقبولة  ←
 *
 * أي 96.5% تعرّف مقابل صفر إجابة خاطئة.
 *
 * ── ولماذا لا تُخفَّض بعد سلّم القصّ ─────────────────────────────────────
 * قبل السلّم كانت 0.90 تعطي صفر سوالب أيضًا، فبدت خفضًا مجّانيًا. لكنّ
 * السلّم يجرّب ثلاث لقطات، وثلاث محاولات تعني ثلاث فرصٍ لتجاوز العتبة —
 * للسالبة كما للصحيحة. فعادت 0.90 تسرّب سالبة، و0.87 ثلاثًا.
 *
 * أي أنّ السلّم اشترى متانةً أمام الإطار، لا رخصةً بخفض العتبة. والقياس
 * هو ما أظهر ذلك: الحدس وحده كان سيخفضها.
 *
 * والمقايضة مقصودة: «لم أتعرّف، جرّب مرّة أخرى» إزعاجٌ صغير يُحلّ بضغطة،
 * أمّا اسمُ لوحةٍ خاطئ يُقال بثقة أمام لجنة تحكيم تختبر النظام بتصوير
 * الرمل فهو العطب الذي لا يُنسى.
 */
export const SIMILARITY_THRESHOLD = 0.91

/**
 * أقل فارق مطلوب بين الأول والثاني.
 *
 * لماذا لا يكفي التشابه وحده: لو تشابهت واجهتان صخريتان، قد يعطي النموذج
 * 0.96 للأولى و0.95 للثانية. التشابه عالٍ لكن الاختيار بينهما عشوائي
 * عمليًا. فنطلب فارقًا واضحًا، وإلا أقررنا بعدم المعرفة — وهو أفضل بكثير
 * من إجابة واثقة خاطئة أمام لجنة تحكيم.
 *
 * ── والقياس يقول إنّ الهامش أهمّ من العتبة ────────────────────────────
 * على صور جبة، رفعُ الهامش من صفر إلى 0.02 يُلغي **كلّ** الإجابات الخاطئة
 * عند أيّ عتبة — حتى عند 0.62. وأخطاؤنا الأربعة كلّها من هذا النوع:
 * لوحتان متجاورتان على الصخرة نفسها (p3 تلتبس بـ p2 ثلاث مرّات)، والفرق
 * بين درجتيهما ضئيل.
 *
 * و0.04 لا يضيف أمانًا فوق 0.02، لكنه يُسقط أربع صور صحيحة إضافية —
 * فاخترنا 0.02.
 */
export const MIN_MARGIN = 0.02

/**
 * سلّم القصّ: نسبٌ من الكادر نجرّبها كلّها ونأخذ أفضلها.
 *
 * ── العلّة التي يعالجها ────────────────────────────────────────────────
 * DINOv3 يلخّص الكادر كلّه في متجه واحد. فإن لم تملأ اللوحة الكادر —
 * وقف السائح بعيدًا، أو دخل في الصورة رملٌ وسماءٌ وصخرٌ مجاور — انزاح
 * المتجه كلّه، لا طرفه فحسب.
 *
 * والقياس قاسٍ: على jubbah-p2، حشوُ 20% حول اللوحة يُسقط التشابه من
 * 0.944 إلى 0.790. أي أنّ إطارًا يسيرًا — أقلّ ممّا يحدث في أيّ لقطة
 * حقيقية — يكفي لإسقاط الصورة تحت أيّ عتبة صالحة. وعند 45% صار 0.599،
 * وعند 30% أخطأ اللوحة أصلًا.
 *
 * ── العلاج ────────────────────────────────────────────────────────────
 * المراجع مقصوصة على اللوحة. فحين يكون الاستعلام أوسع، نقرّبه بالقصّ من
 * المركز ونجرّب عدّة نسب:
 *
 *   حصّة اللوحة   بلا سلّم   بسلّم القصّ
 *      80%          0.790  →  0.949
 *      60%          0.776  →  0.938
 *      45%          0.599  →  0.901
 *
 * ── لماذا هذه النسب الثلاث ─────────────────────────────────────────────
 * 1 للّقطة المضبوطة، و0.7 و0.5 تغطّيان البُعد المعتاد. وكلّ نسبة إضافية
 * تعني استدلالًا كاملًا آخر على جوّال السائح، ولا تشتري شيئًا بعد 0.5 —
 * إذ تصير اللوحة أصغر من أن يبقى فيها تفصيل.
 */
export const CROP_LADDER = [1, 0.7, 0.5]

/**
 * إن كانت اللقطة الكاملة واثقة بما يكفي، لا نُتعب الجوّال ببقيّة السلّم.
 *
 * وسيط الصور الصحيحة 0.954، فنصفُ اللقطات المضبوطة تخرج من أوّل محاولة
 * بزمنٍ كما كان، ولا يدفع ثمن السلّم إلا من احتاجه فعلًا.
 */
const EARLY_EXIT = 0.95

/** يقتصّ من المركز بنسبة من الكادر. frac = 1 يُرجع الصورة كما هي. */
export async function centerCrop(image, frac) {
  if (frac >= 1) return image
  const w = Math.round(image.width * frac)
  const h = Math.round(image.height * frac)
  const x = Math.round((image.width - w) / 2)
  const y = Math.round((image.height - h) / 2)
  return image.crop([x, y, x + w - 1, y + h - 1])
}

/**
 * يقارن متجه استعلام واحد بالفهرس.
 *
 * أعلى تشابه لكل موقع لا لكل صورة، وإلا فاز الموقع الذي له صور أكثر.
 * مُصدَّر كي تختبره أدوات التحقّق على الشيفرة المشحونة نفسها، لا على نسخة
 * منها تتقادم بصمت.
 */
export function matchVector(queryVector, index) {
  const bestPerSite = new Map()
  for (const entry of index) {
    const score = dot(queryVector, entry.vector)
    if (!bestPerSite.has(entry.siteId) || score > bestPerSite.get(entry.siteId)) {
      bestPerSite.set(entry.siteId, score)
    }
  }

  const ranked = [...bestPerSite.entries()].sort((a, b) => b[1] - a[1])
  const [topSiteId, topScore] = ranked[0]
  return { topSiteId, topScore, margin: topScore - (ranked[1]?.[1] ?? 0) }
}

const INDEX_URL = `${import.meta.env?.BASE_URL ?? '/'}reference-index.json`

let extractorPromise = null
let indexPromise = null

/* ────────────────────────────── النموذج ────────────────────────────── */

export async function getExtractor(onProgress) {
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
export function toVector(output) {
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
export function normalize(vector) {
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

    /*
      siteId قد يحمل معرّف لوحة لا موقع.

      الاسم موروث من حين كان التعرّف على مستوى الموقع وحده. والفهرس اليوم
      يخلط الاثنين في مساحة معرّفات واحدة: `jubbah` موقع، و`jubbah-p2`
      لوحةٌ فيه — والفرق يُعرف من الاسم نفسه عبر isPanelId في data/panels.js،
      فلا جدول ربط ولا حقل إضافي.
    */
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

  const { RawImage } = await import('@huggingface/transformers')
  const image = await RawImage.read(source)

  /*
   * كلّ درجة من السلّم استعلامٌ قائم بذاته: لها عتبتها وهامشها.
   *
   * ولا نجمع الدرجات في مجموعة واحدة ثم نحسب الهامش عليها، لأنّ ذلك يخلط
   * أدلّة مشاهد مختلفة: قد تُرجّح اللقطة الكاملة لوحةً والقصّة الضيّقة
   * أخرى، فيخرج هامشٌ عريض لا يقابله يقين. فنُبقي كلّ مشهد متّسقًا مع
   * نفسه، ونقبل أوثق مشهدٍ اجتاز الشرطين معًا.
   */
  let best = null
  let highestSeen = 0

  for (const frac of CROP_LADDER) {
    const view = await centerCrop(image, frac)
    const { topSiteId, topScore, margin } = matchVector(
      toVector(await extractor(view)),
      index,
    )

    if (topScore > highestSeen) highestSeen = topScore

    if (topScore >= SIMILARITY_THRESHOLD && margin >= MIN_MARGIN) {
      if (!best || topScore > best.confidence) {
        best = { siteId: topSiteId, confidence: topScore, crop: frac }
      }
      // لقطة مضبوطة: لا داعي لإتعاب الجوّال ببقيّة السلّم
      if (topScore >= EARLY_EXIT) break
    }
  }

  if (!best) {
    return {
      status: 'no-match',
      siteId: null,
      confidence: Math.max(0, highestSeen),
      provider: 'local',
      elapsedMs: Date.now() - started,
    }
  }

  return {
    status: 'match',
    siteId: best.siteId,
    confidence: best.confidence,
    crop: best.crop,
    provider: 'local',
    elapsedMs: Date.now() - started,
  }
}
