import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  MODEL_ID,
  MODEL_DTYPE,
  SIMILARITY_THRESHOLD,
  MIN_MARGIN,
  CROP_LADDER,
  matchVector,
  decideFromFrames,
} from '../lib/recognition.local.js'
import { PANELS, isPanelId, siteIdOfPanel } from '../data/panels.js'
import { getAllSites } from '../data/sites.js'

/**
 * حارس فهرس التعرّف المشحون.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا يحتاج الفهرس حارسًا
 * ══════════════════════════════════════════════════════════════════════
 * فشلُه صامتٌ تمامًا. فهرسٌ بُني بنموذجٍ غير الذي يستعمله التطبيق يُرفض في
 * وقت التشغيل بتحذيرٍ في الطرفيّة لا يراه أحد، ثم يتراجع التطبيق إلى حساب
 * المتجهات في المتصفح — فيصير بطيئًا ويعتمد على صور المواقع القليلة بدل
 * مئتي صورة مرجعية. يعمل، لكنه يعمل أسوأ بكثير، ولا شيء يقول ذلك.
 *
 * وكذلك تسميةٌ في الفهرس لا يعرفها التطبيق: يتعرّف النموذج عليها بنجاح ثم
 * لا تجد الشاشةُ ما تعرضه.
 */

const here = dirname(fileURLToPath(import.meta.url))
const INDEX_PATH = resolve(here, '../../public/reference-index.json')

const hasIndex = existsSync(INDEX_PATH)
const index = hasIndex ? JSON.parse(readFileSync(INDEX_PATH, 'utf8')) : null

describe('فهرس التعرّف', () => {
  it('موجود في public/', () => {
    expect(hasIndex, 'شغّل: python scripts/build-reference-index.py').toBe(true)
  })

  /**
   * البصمة. هذا هو الفحص الذي يمنع أسوأ عطبٍ صامت في المشروع كلّه:
   * فهرسٌ ومتصفّحٌ يتحدّثان لغتين مختلفتين.
   */
  it('بُني بنفس النموذج والدقّة اللذين يستعملهما التطبيق', () => {
    expect(index.model).toBe(MODEL_ID)
    expect(index.dtype).toBe(MODEL_DTYPE)
  })

  it('يحمل متجهات بالطول نفسه المعلن', () => {
    expect(index.dims).toBeGreaterThan(0)
    for (const entry of index.entries) {
      expect(entry.vector, `${entry.siteId}/${entry.photo}`).toHaveLength(index.dims)
    }
  })

  it('متجهاته مطبَّعة — وإلا لم يكن الضرب النقطي تشابهًا', () => {
    for (const entry of index.entries.slice(0, 20)) {
      const magnitude = Math.sqrt(entry.vector.reduce((sum, v) => sum + v * v, 0))
      expect(magnitude, `${entry.siteId}/${entry.photo}`).toBeCloseTo(1, 2)
    }
  })

  /** كل تسمية في الفهرس يجب أن يعرفها التطبيق، وإلا تعرّفَ على مجهول. */
  it('كل تسمياته تُقابل موقعًا أو لوحة موجودة', () => {
    const siteIds = new Set(getAllSites('ar').map((site) => site.id))
    const panelIds = new Set(PANELS.map((panel) => panel.id))

    for (const label of new Set(index.entries.map((entry) => entry.siteId))) {
      const known = isPanelId(label) ? panelIds.has(label) : siteIds.has(label)
      expect(known, `تسمية مجهولة في الفهرس: ${label}`).toBe(true)

      // ولوحةٌ يجب أن ينتمي معرّفها إلى موقعٍ حقيقي
      if (isPanelId(label)) expect(siteIds.has(siteIdOfPanel(label))).toBe(true)
    }
  })

  it('يعطي كل تسمية عدّة صور مرجعية لا صورة واحدة', () => {
    const counts = {}
    for (const entry of index.entries) {
      counts[entry.siteId] = (counts[entry.siteId] ?? 0) + 1
    }
    for (const [label, count] of Object.entries(counts)) {
      // صورة واحدة تعني التعرّف من زاوية واحدة فقط
      expect(count, `${label}: ${count} صورة فقط`).toBeGreaterThanOrEqual(5)
    }
  })

  /**
   * الدقّة المسجَّلة وقت البناء. لا نحسبها هنا — تحتاج النموذج — لكننا
   * نرفض شحن فهرسٍ يعرف عن نفسه أنه ضعيف.
   */
  it('يسجّل دقّة مقبولة وقت بنائه', () => {
    expect(index.accuracy).toBeGreaterThan(0.85)
  })
})

describe('عتبات القرار', () => {
  /**
   * قيست على 198 صورة و53 سالبة، بعد إعادة بناء الفهرس بمحرّك المتصفح
   * نفسه. وأقوى سالبة سجّلت 0.896، فالعتبة يجب أن تعلوها — وإلا أعطت
   * صورةُ رملٍ اسمَ لوحة. هذا الاختبار يمنع العودة إلى رقمٍ مخمَّن.
   */
  it('العتبة أعلى من أقوى صورة سالبة قيست', () => {
    const strongestNegative = 0.896
    expect(SIMILARITY_THRESHOLD).toBeGreaterThan(strongestNegative)
  })

  it('الهامش موجب — فالتقارب بين لوحتين يعني «لا أعرف»', () => {
    expect(MIN_MARGIN).toBeGreaterThan(0)
  })

  /** عتبة فوق أضعف صورة صحيحة بكثير تعني رفض معظم الصور الحقيقية. */
  it('العتبة لا ترتفع إلى حدّ رفض أغلب الصور الصحيحة', () => {
    const medianPositive = 0.954
    expect(SIMILARITY_THRESHOLD).toBeLessThan(medianPositive)
  })
})

/**
 * تحقّق متقاطع بين بايثون والمتصفح.
 *
 * الفهرس بُني وقيست دقّته في بايثون، والمطابقة تجري في المتصفح
 * بجافاسكربت. ولو اختلف المنطقان — في ترتيبٍ أو عتبةٍ أو هامش — لظهر
 * التطبيق أسوأ مما قاسه السكربت، ولا شيء يقول ذلك.
 *
 * فنعيد هنا تجربة «ترك واحدة» على الفهرس المشحون، بمنطق التطبيق نفسه:
 * أعلى درجة لكل تسمية، ثم عتبة، ثم هامش.
 */
describe('سلوك المطابقة على الفهرس المشحون', () => {
  /*
   * نستدعي matchVector المشحونة بدل إعادة كتابة المطابقة هنا.
   *
   * النسخة السابقة كانت تكرّر المنطق، فلو تغيّر في المصدر بقي الاختبار
   * يقيس النسخة القديمة ويمرّ — حارسٌ يحرس نفسه لا الشيفرة.
   */
  function classify(queryIndex) {
    const query = index.entries[queryIndex].vector
    const pool = index.entries.filter((_, j) => j !== queryIndex) // الصورة نفسها مخفيّة
    const { topSiteId, topScore, margin } = matchVector(query, pool)
    return topScore >= SIMILARITY_THRESHOLD && margin >= MIN_MARGIN ? topSiteId : null
  }

  const results = index.entries.map((entry, i) => ({
    expected: entry.siteId,
    got: classify(i),
  }))

  /**
   * الشرط الذي لا يُتنازل عنه: لا إجابة واثقة خاطئة. «لم أتعرّف» إزعاج
   * يُحلّ بضغطة، واسمُ لوحةٍ خاطئ أمام لجنة تحكيم عطبٌ لا يُنسى.
   */
  it('لا يعطي إجابة واثقة خاطئة على أي صورة مرجعية', () => {
    const wrong = results.filter((r) => r.got !== null && r.got !== r.expected)
    expect(wrong.map((r) => `${r.expected} → ${r.got}`)).toEqual([])
  })

  it('يتعرّف على أغلب الصور المرجعية', () => {
    const recognised = results.filter((r) => r.got === r.expected).length
    expect(recognised / results.length).toBeGreaterThan(0.9)
  })

  /**
   * ══════════════════════════════════════════════════════════════════
   *  القياس الأمين: لقطة جديدة، لا أختها من اللقطة نفسها
   * ══════════════════════════════════════════════════════════════════
   * الاختبار أعلاه متساهل، ولا بدّ من قول ذلك صراحةً وإلا خدعنا أنفسنا
   * مرّةً أخرى: كلّ الصور المرجعية من جلسةٍ ميدانية واحدة، فالصورتان
   * المتتابعتان في الترقيم شبه متطابقتين. فهو يسأل «هل تطابق الصورةُ
   * أختَها؟» لا «هل تُعرَف اللوحة من صورةٍ جديدة؟».
   *
   * والفرق قيس: التشابه ينحدر مع تباعد اللقطتين —
   *
   *   متتابعتان (1-2)   وسيط 0.928   63% فوق العتبة
   *   متباعدتان (11-20) وسيط 0.868   27% فوق العتبة
   *
   * وحين تُحجب لقطات الجلسة القريبة كلّها، يهبط التعرّف من 96.5% إلى
   * 68.4% على المتجهات وحدها (و79.3% بسلّم القصّ على الصور الحقيقية).
   *
   * وهذا الحارس يُبقي الرقم الأمين مرئيًا، فلا يُضبط شيءٌ على الرقم
   * المتساهل بعد اليوم.
   */
  it('يقيس التعرّف على لقطة جديدة لا على أختها من اللقطة نفسها', () => {
    const numbered = index.entries.map((e) => ({
      ...e,
      num: Number((e.photo.match(/(\d+)/) || [0, 0])[1]),
    }))

    let ok = 0
    let total = 0
    for (const q of numbered) {
      // نحجب كلّ لقطة لنفس اللوحة ضمن ±5 من الترقيم: أي جوارها في الجلسة
      const pool = numbered.filter(
        (r) => r.siteId !== q.siteId || Math.abs(r.num - q.num) > 5,
      )
      if (!pool.some((r) => r.siteId === q.siteId)) continue

      total += 1
      const { topSiteId, topScore, margin } = matchVector(q.vector, pool)
      if (topSiteId === q.siteId && topScore >= SIMILARITY_THRESHOLD && margin >= MIN_MARGIN) {
        ok += 1
      }
    }

    expect(total).toBeGreaterThan(150)
    // أرضيّة، لا هدف: انحدارٌ تحتها يعني أنّ الفهرس صار يحفظ اللقطات
    expect(ok / total).toBeGreaterThan(0.6)
  })
})

/**
 * حارس لعلّة تُسقط العرض كلّه: الإطار.
 *
 * DINOv3 يلخّص الكادر كاملًا، فحشوُ 20% حول اللوحة يُسقط التشابه من 0.944
 * إلى 0.790 — أي أنّ سائحًا يقف خطوةً أبعد ممّا ينبغي لا يُتعرَّف عليه.
 * سلّم القصّ يعالج ذلك، وحذفُه يعيد العلّة صامتةً: الاختبارات على الصور
 * المرجعية تبقى خضراء لأنّها كلّها مصوّرة عن قرب.
 */
describe('سلّم القصّ', () => {
  it('يبدأ باللقطة الكاملة — فاللقطة المضبوطة لا تدفع ثمن السلّم', () => {
    expect(CROP_LADDER[0]).toBe(1)
  })

  it('يضيّق تدريجيًا ولا يتجاوز نصف الكادر', () => {
    expect(CROP_LADDER.length).toBeGreaterThan(1)
    for (let i = 1; i < CROP_LADDER.length; i += 1) {
      expect(CROP_LADDER[i]).toBeLessThan(CROP_LADDER[i - 1])
    }
    // أضيق من النصف يترك اللوحة بلا تفصيل يُطابَق
    expect(Math.min(...CROP_LADDER)).toBeGreaterThanOrEqual(0.5)
  })

  it('يقصّ من المركز بالنسبة المطلوبة', async () => {
    const { centerCrop } = await import('../lib/recognition.local.js')
    const fake = {
      width: 1000,
      height: 800,
      crop: ([x0, y0, x1, y1]) => ({ box: [x0, y0, x1, y1] }),
    }

    expect(await centerCrop(fake, 1)).toBe(fake) // بلا عمل زائد
    expect((await centerCrop(fake, 0.5)).box).toEqual([250, 200, 749, 599])
  })
})

/**
 * matchVector تختار أعلى تشابه لكل موقع لا لكل صورة.
 *
 * ولو اختارت لكل صورة، فاز الموقع صاحب أكثر الصور بحكم العدد وحده: p2
 * له 34 صورة وp5 له 9، فتميل المطابقة إلى p2 في كلّ استعلام قريب.
 */
describe('اختيار الأفضل لكل موقع', () => {
  it('لا يرجّح الموقع الأكثر صورًا لمجرّد كثرتها', () => {
    const pool = [
      { siteId: 'a', vector: [1, 0] },
      ...Array.from({ length: 20 }, () => ({ siteId: 'b', vector: [0.7, 0.7] })),
    ]
    const { topSiteId } = matchVector([1, 0], pool)
    expect(topSiteId).toBe('a')
  })

  it('يحسب الهامش بين الموقعين الأولين', () => {
    const pool = [
      { siteId: 'a', vector: [1, 0] },
      { siteId: 'b', vector: [0.6, 0.8] },
    ]
    const { topScore, margin } = matchVector([1, 0], pool)
    expect(topScore).toBeCloseTo(1, 5)
    expect(margin).toBeCloseTo(0.4, 5)
  })
})

/**
 * حرّاس المسح المتّصل.
 *
 * المسح الحيّ يقلب حساب الأخطاء: عتبة 0.91 عُوِيرت على محاولةٍ واحدة،
 * والمسح أربعون محاولة. فأربعون فرصة لتجاوزها — للرمل كما للّوحة. وقد
 * قيس ذلك فعلًا: بقاعدة «إطارٌ واحد يكفي» تسرّبت صورة سالبة عند الإطار
 * الأول، وهي لم تتسرّب قطّ في المسح باللقطة الواحدة.
 */
describe('قرار المسح المتّصل', () => {
  const frame = (siteId, score, margin = 0.06) => ({
    topSiteId: siteId, topScore: score, margin,
  })
  const repeat = (n, f) => Array.from({ length: n }, () => f)

  /*
    شكل القاعدة هو ما حسم، لا ضبط أرقامها.

    «أيّ إطارين يتجاوزان العتبة» كافأ الحظّ: يكفي أن تصادف قصّتان
    محظوظتان من صخرةٍ عابرة فتُقبل. والهيمنة تطلب أن تتصدّر اللوحةُ
    أغلبَ النافذة — وهو ما لا يصادفه الحظّ.
  */
  it('لا يقبل إطارًا واحدًا مهما علت درجته', () => {
    expect(decideFromFrames([frame('jubbah-p1', 0.99)])).toBeNull()
  })

  it('لا يحكم قبل اكتمال أدنى عدد من الإطارات', () => {
    expect(decideFromFrames(repeat(3, frame('jubbah-p1', 0.97)))).toBeNull()
  })

  it('يقبل لوحةً تهيمن على النافذة بدرجةٍ وهامشٍ كافيين', () => {
    const d = decideFromFrames(repeat(4, frame('jubbah-p6', 0.92)))
    expect(d?.siteId).toBe('jubbah-p6')
    expect(d?.confidence).toBeCloseTo(0.92, 5)
  })

  /*
    من يصوّب على الرمل يحصل على إطاراتٍ متّسقة أيضًا — فالإصرار وحده
    ليس دليلًا. ولهذا تُشترط الدرجة مع الهيمنة.
  */
  it('لا يقبل الإصرار وحده حين تكون الدرجات منخفضة', () => {
    expect(decideFromFrames(repeat(6, frame('jubbah-p1', 0.72)))).toBeNull()
  })

  it('لا يقبل هامشًا ضيّقًا ولو هيمنت وعلت الدرجة', () => {
    // لوحتان متجاورتان على الصخرة نفسها: الدرجة عالية والاختيار بينهما عشوائي
    expect(decideFromFrames(repeat(6, frame('jubbah-p6', 0.96, 0.005)))).toBeNull()
  })

  it('لا يقبل حين تتقاسم لوحتان النافذة بلا متصدّرٍ واضح', () => {
    const split = [
      ...repeat(3, frame('jubbah-p6', 0.95)),
      ...repeat(3, frame('jubbah-p7', 0.94)),
    ]
    expect(decideFromFrames(split)).toBeNull()
  })

  it('يتجاهل إطارًا شاذًّا واحدًا ما دامت الهيمنة قائمة', () => {
    const mostly = [
      ...repeat(5, frame('jubbah-p2', 0.93)),
      frame('jubbah-p9', 0.99),
    ]
    expect(decideFromFrames(mostly)?.siteId).toBe('jubbah-p2')
  })
})
