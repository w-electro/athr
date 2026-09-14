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
import { NOT_A_PANEL } from '../data/panels.js'

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

/* ─────────────────────── المسح الحيّ المتّصل ─────────────────────── */

/**
 * ══════════════════════════════════════════════════════════════════════
 *  قرار المسح المتّصل: الهيمنة لا الحظّ
 * ══════════════════════════════════════════════════════════════════════
 * المسح الحيّ يقلب حساب الأخطاء. عتبة 0.91 عُوِيرت على **محاولةٍ واحدة**:
 * صورةٌ تُرفع فتُقارن مرّة. أمّا المسح فأربعون محاولة بزوايا وقصّاتٍ
 * مختلفة — وأربعون فرصةً لتجاوز العتبة، للرمل كما للّوحة.
 *
 * وقد قيس ذلك لا خُمِّن. جُرّبت قاعدتان قبل هذه:
 *
 *   «إطارٌ واحد يكفي»   → تسرّبت سالبة عند الإطار الأول
 *   «إطاران قويّان»      → تسرّبت السالبة نفسها، وهبط التعرّف
 *   «ثمانية عشر إطارًا» → ظهرت إجابةٌ خاطئة واحدة
 *
 * فالعلّة ليست في ارتفاع العتبة بل في **شكل القاعدة**: «أيّ إطارين
 * يتجاوزان» يكافئ الحظّ، إذ يكفي أن تصادف قصّتان محظوظتان.
 *
 * ── الهيمنة ───────────────────────────────────────────────────────────
 * فنطلب من اللوحة أن تتصدّر أغلب النافذة، لا أن تنجح مرّتين. ومسحٌ
 * حسابيّ على 48 إعدادًا أعطى **صفر إجابة خاطئة في كلّها** — أي أنّ شكل
 * القاعدة هو ما حسم، لا ضبط أرقامها.
 *
 * والأرقام المختارة قيست على المشاهد نفسها التي يقيس عليها المسح
 * باللقطة الواحدة:
 *
 *   لقطة واحدة (المشحون)  49/66 صحيح · 0 خاطئ · 1/53 سالبة
 *   الهيمنة (هذه)         51/66 صحيح · 0 خاطئ · 1/53 سالبة
 *
 * أي تعرّفٌ أعلى بلا زيادةٍ في السوالب. والسالبة المتسرّبة هي نفسها في
 * الحالتين (IMG_E0575، وفيها نقوشٌ ظاهرة في يسارها فليست سالبةً نقيّة).
 *
 * ── وما لا يقيسه هذا كلّه ──────────────────────────────────────────────
 * المحاكاة تقصّ صورةً واحدة بزوايا مختلفة، فإن فشلت الصورة فشلت إطاراتها
 * كلّها. أمّا المستخدم فيحرّك يده فيرى اللوحةَ من مواضع جديدة فعلًا. فالفائدة
 * الحقيقية فوق هذه الأرقام، لا فيها — لكنّي لا أستطيع قياسها هنا، فلا
 * أنسبها إلى القياس.
 */

/** حجم النافذة المتحرّكة */
const LIVE_WINDOW = 8

/** لا حكم قبل هذا العدد من الإطارات */
const LIVE_MIN_FRAMES = 4

/** أقلّ حصّةٍ من النافذة يجب أن تتصدّرها اللوحة */
const LIVE_DOMINANCE = 0.6

/**
 * ══════════════════════════════════════════════════════════════════════
 *  حدٌّ ثنائيّ: الدرجة والهامش معًا لا كلٌّ على حدة
 * ══════════════════════════════════════════════════════════════════════
 * عتبةٌ ثابتة للدرجة تسأل السؤال الخطأ. فتطابقٌ عند 0.895 يتقدّم على
 * تاليه بـ0.053 أوثقُ من تطابقٍ عند 0.92 يتقدّم بـ0.01 — والقاعدة
 * الثابتة تقبل الثاني وترفض الأول، وهو عكس الصواب.
 *
 * وهذا ما ظهر في أوّل تجربةٍ حقيقية في متصفّح: صورةٌ لم يرها الفهرس قطّ
 * للوحة p7 أعطت «jubbah-p7 · 0.895 · Δ0.053» — اللوحة الصحيحة بهامشٍ
 * مريح، ثم رُفضت لأنّ 0.895 دون 0.91.
 *
 * فصارت الدرجةُ المطلوبة تنخفض بقدر الهامش:
 *
 *     المطلوب = LIVE_SCORE_BASE − min(الهامش، LIVE_MARGIN_CAP)
 *
 *   هامش 0.04 → يكفي 0.90
 *   هامش 0.06 → يكفي 0.88
 *
 * ── والأرقام مقيسة على إطاراتٍ تشبه الكاميرا ──────────────────────────
 * 49 مشهدًا صحيحًا و53 سالبًا، بدقّة 720 بكسل وبضبابٍ في ثلث الإطارات —
 * لا على صور المرجع عالية الدقّة كما كان يُقاس قبل اليوم. ومن 360
 * إعدادًا:
 *
 *   أفضل حدٍّ ثابت        24/49   صفر خطأ · صفر سوالب
 *   الحدّ الثنائي (هذا)   33/49   صفر خطأ · صفر سوالب
 *
 * أي زيادةٌ في التعرّف بالثلث تقريبًا، بلا أيّ تنازلٍ عن الشرط الذي لا
 * يُتنازل عنه: لا اسمَ لوحةٍ خاطئ، ولا قبولَ رملٍ أو صخرةٍ عابرة.
 */

/**
 * ══════════════════════════════════════════════════════════════════════
 *  ولماذا طبقةٌ ثانية اسمها «الأرجح»
 * ══════════════════════════════════════════════════════════════════════
 * صوّر وليد صورةً عشوائية لملك جبة، فقالت القراءة الحيّة «jubbah-p2» طوال
 * المسح تقريبًا، ثم انتهى المسح إلى: «لم نتعرّف على الموقع».
 *
 * وهذا أسوأ ما يمكن أن يفعله النظام: أن يعرف ويأبى القول. فالصمت ليس
 * حيادًا — هو ادّعاء جهلٍ كاذب، والمستخدم يرى على شاشته أنّه كاذب.
 *
 * فصار للقرار طبقتان:
 *
 *   يقين  — يتجاوز البوّابة: يُقال بلا تحفّظ
 *   أرجح  — لوحةٌ تتصدّر أغلب النافذة بدرجةٍ معقولة: تُقال موسومةً
 *
 * ── وما تكلّفه الطبقة الثانية، مقيسًا ─────────────────────────────────
 * عند حدّ 0.80، على 49 مشهدًا صحيحًا و53 صورة رملٍ وسماء و59 نقشًا آخر
 * من جبة:
 *
 *   تُسمّى صحيحةً   40/49
 *   تُسمّى خاطئةً    3/49
 *   رملٌ يُسمّى       5/53
 *   نقشٌ آخر يُسمّى   8/59
 *
 * فالثمن معلن: بضع تسمياتٍ خاطئة — لكنّها **موسومةٌ بالترجيح لا باليقين**،
 * ومعها درجة الثقة وزرُّ إعادة المحاولة. وهذا أصدق من صمتٍ يُخفي معرفةً
 * قائمة، وأنفع لواقفٍ أمام صخرةٍ يريد أن يعرف.
 */

/**
 * ── قرار وليد: تُقال اللوحة المتصدّرة، صحّت أو لم تصحّ ──────────────────
 *
 * كانت للترجيح عتبتان (درجة 0.80 وهامش 0.02) فيصمت دونهما. وطلب وليد
 * صراحةً — ومرّتين — أن يقولها النظام على كلّ حال: «ليس شرطًا أن يكون
 * صحيحًا، فقط دعه يقول».
 *
 * وله وجهٌ متين: المستخدم يرى القراءة الحيّة على شاشته، فيرى النظام
 * يقول jubbah-p2 عشرين إطارًا ثم ينكر معرفته. والصمت حينئذٍ لا يحمي
 * أحدًا، إنما يُظهر التطبيق مُعطَّلًا وهو عارف.
 *
 * فلم يبقَ إلا شرطٌ واحد: أن تكون هناك لوحةٌ متصدّرة فعلًا — كي يُقال
 * اسمٌ واحد لا اسمٌ يتقلّب مع كلّ إطار. ولا عتبة درجةٍ بعد اليوم.
 *
 * والثمن معلن ومقبولٌ عن قصد: التصويب على رملةٍ سيُخرج اسم لوحة. ولهذا
 * يبقى الوسم البصريّ فارقًا — «؟» بلون الذهب لا «✓» بلون الطين — ومعه
 * درجة الثقة وزرّ إعادة المحاولة.
 *
 * وللرجوع: أعِد الشرطين إلى decideFromFrames.
 */

/**
 * ── تشتّت المرشّحين: فكرة وليد ─────────────────────────────────────────
 *
 * لاحظ وليد وهو يحرّك الكاميرا أنّ التصويب على شيءٍ عابر يُخرج أسماءً
 * متفرّقة — p1 ثم p3 ثم p4 — بينما اللوحة الحقيقية تُخرج مجموعةً ضيّقة
 * كـ p2 وp3، وهما لوحتان متجاورتان على الصخرة نفسها.
 *
 * والفكرة أدقّ من عتبة درجة: هي تسأل **هل تتّفق الأدلّة مع نفسها**، لا
 * كم بلغ رقمٌ واحد. فالتباسُ لوحتين متجاورتين اشتباهٌ معقول، أمّا القفز
 * بين لوحاتٍ لا رابط بينها فبحثٌ عن شبهٍ غير موجود.
 *
 * ── وما قيس ──────────────────────────────────────────────────────────
 * عدد الأسماء المختلفة في ثماني إطارات:
 *
 *   اسمٌ واحد   : 63% من المشاهد الصحيحة · 34% من الرمل
 *   ثلاثة فأكثر :  4% من المشاهد الصحيحة · 13% من الرمل · 17% من نقوشٍ أخرى
 *
 * فاشتراطُ اسمين فأقلّ يكلّف 4% من الصحيح ويمنع سُبعَ السوالب تقريبًا.
 *
 * والقياس هنا أضعف ممّا يستحقّ: محاكاتي تقصّ صورةً واحدة، فلا تُنتج
 * التفرّق الذي يراه من يمسح غرفةً بكاميرته. وملاحظة وليد الميدانية أصدق
 * في هذه الحالة من أرقامي، ولذلك بُني الشرط عليها.
 */
const LIVE_MAX_DISTINCT = 2

/** أدنى حصّةٍ من النافذة تجعل اللوحة «متصدّرة» فيُقال اسمها */
const LIVE_PROBABLE_SHARE = 0.5

/** الدرجة المطلوبة حين يكون الهامش عند أرضيّته */
const LIVE_SCORE_BASE = 0.94

/** أدنى هامشٍ مقبول مهما علت الدرجة — تقاربُ لوحتين يعني «لا أعرف» */
const LIVE_MARGIN_FLOOR = 0.04

/** الحدّ الذي يتوقّف عنده خصمُ الهامش، فلا يُشترى القبول بهامشٍ وحده */
const LIVE_MARGIN_CAP = 0.06

/**
 * قاعدة القبول، منفصلةً عن الكاميرا كي تُختبر كما تُشحن.
 *
 * تأخذ نتائج الإطارات الأخيرة وتُرجع حكمًا أو null، ولا تعرف شيئًا عن
 * الفيديو ولا عن النموذج — فتُقاس على إطاراتٍ محسوبةٍ مسبقًا بلا كاميرا،
 * وهو ما عُوِيرت به أرقامها أعلاه.
 */
export function decideFromFrames(recent) {
  if (recent.length < LIVE_MIN_FRAMES) return null

  const byPanel = new Map()
  for (const f of recent) {
    if (!byPanel.has(f.topSiteId)) byPanel.set(f.topSiteId, [])
    byPanel.get(f.topSiteId).push(f)
  }

  // المتصدّر عددًا، وعند التساوي أعلاهما درجة
  const ranked = [...byPanel.entries()].sort(
    (a, b) => b[1].length - a[1].length
      || Math.max(...b[1].map((h) => h.topScore)) - Math.max(...a[1].map((h) => h.topScore)),
  )
  const [siteId, hits] = ranked[0]

  /*
    تصدُّرُ الصنف السلبيّ جوابٌ لا فراغ.

    فحين يقول الزائرون إنّ ما يشبه هذا ليس نقشًا، يصير «لم أتعرّف» حكمًا
    مبنيًّا على أمثلة — لا عجزًا عن بلوغ عتبة.
  */
  if (siteId === NOT_A_PANEL) return null

  if (hits.length / recent.length < LIVE_DOMINANCE) return null

  const meanScore = hits.reduce((a, h) => a + h.topScore, 0) / hits.length
  const meanMargin = hits.reduce((a, h) => a + h.margin, 0) / hits.length

  const required = LIVE_SCORE_BASE - Math.min(meanMargin, LIVE_MARGIN_CAP)

  if (meanMargin >= LIVE_MARGIN_FLOOR && meanScore >= required) {
    return { status: 'match', siteId, confidence: meanScore }
  }

  /*
    دون اليقين: نقول المتصدّرة موسومةً بالترجيح.

    ولا نحكم قبل امتلاء النافذة: أوّل إطارين قد يلتقطان زاويةً رديئة،
    والانتظار حتى تمتلئ يكلّف ثوانيَ ويشتري اسمًا أفضل.
  */
  /*
    التشتّت يؤجّل الحكم ولا يُعجّله.

    فحين تتفرّق الأسماء نُرجع null، فيستمرّ المسح ويأخذ وقتًا أطول —
    وهو المطلوب: مزيدٌ من الأدلّة لا قرارٌ متسرّع. وإن بقي التفرّق حتى
    آخر إطار، فالصمت هو الجواب الصادق.
  */
  const distinct = byPanel.size

  if (
    recent.length >= LIVE_WINDOW
    && hits.length / recent.length >= LIVE_PROBABLE_SHARE
    && distinct <= LIVE_MAX_DISTINCT
  ) {
    return { status: 'probable', siteId, confidence: meanScore }
  }

  return null
}

/**
 * كم مشهدًا نستخرجه من صورةٍ مرفوعة.
 *
 * الصورة الساكنة لا تعطي إطاراتٍ جديدة كما تفعل الكاميرا، لكنّها تعطي
 * **مشاهد** مختلفة: قصّاتٌ بمقاساتٍ ومواضعَ متعدّدة. وهو ما يجعل قرار
 * الرفع يمرّ بالمنطق نفسه الذي يمرّ به المسح الحيّ — لا بمسارٍ ثانٍ
 * ينحرف عنه بصمت.
 */
const STILL_VIEWS = 10

/** مشهدٌ من صورةٍ ساكنة: قصّةٌ دوّارة المقاس والموضع، كاهتزاز يدٍ محسوب */
async function stillView(image, i) {
  const frac = Math.min(1, CROP_LADDER[i % CROP_LADDER.length] * (0.94 + 0.04 * ((i * 7) % 3)))
  const w = Math.round(image.width * frac)
  const h = Math.round(image.height * frac)
  const mx = image.width - w
  const my = image.height - h
  const x = Math.max(0, Math.min(mx, Math.round(mx / 2 + mx * 0.2 * Math.sin(i * 1.7))))
  const y = Math.max(0, Math.min(my, Math.round(my / 2 + my * 0.2 * Math.cos(i * 2.3))))
  return image.crop([x, y, x + w - 1, y + h - 1])
}

/**
 * مسح صورةٍ مرفوعة بعدّة مشاهد، بقرار المسح الحيّ نفسه.
 *
 * كان الرفع يقارن مرّةً واحدة، فيخضع لحظّ قصّةٍ واحدة. والآن يجمع أدلّة
 * عشرة مشاهد ويحتكم إلى decideFromFrames — فيتساوى المساران في السلوك،
 * ولا يبقى للمستخدم مسارٌ «ذكيّ» وآخر ساذج.
 *
 * onProgress(done, total) لتحريك الواجهة، فالانتظار هنا مقصود.
 */
export async function scanStillImage(input = {}, onProgress) {
  const started = Date.now()
  const source =
    input.imageUrl || (input.imageBase64 ? `data:image/jpeg;base64,${input.imageBase64}` : null)
  if (!source) throw new Error('scanStillImage يحتاج صورة')

  const extractor = await getExtractor(input.onModelProgress)
  const index = await getIndex(extractor)
  if (index.length === 0) {
    return { status: 'no-match', siteId: null, confidence: 0, provider: 'local', elapsedMs: 0 }
  }

  const { RawImage } = await import('@huggingface/transformers')
  const image = await RawImage.read(source)

  const recent = []
  let best = 0
  let bestId = null
  const viewVectors = []

  for (let i = 0; i < STILL_VIEWS; i += 1) {
    const queryVector = toVector(await extractor(await stillView(image, i)))
    const r = matchVector(queryVector, index)
    recent.push(r)
    if (recent.length > LIVE_WINDOW) recent.shift()
    viewVectors.push(queryVector)
    if (r.topScore > best) { best = r.topScore; bestId = r.topSiteId }

    onProgress?.(i + 1, STILL_VIEWS, r)

    // اليقين يوقف البحث مبكّرًا؛ الترجيح ينتظر كلّ المشاهد
    const early = decideFromFrames(recent)
    if (early?.status === 'match') {
      return { ...early, provider: 'local', elapsedMs: Date.now() - started, views: i + 1, queryVectors: viewVectors.slice() }
    }
  }

  const decided = decideFromFrames(recent)
  if (decided) {
    return { ...decided, provider: 'local', elapsedMs: Date.now() - started, views: STILL_VIEWS, queryVectors: viewVectors.slice() }
  }
  return {
    status: 'no-match',
    siteId: null,
    confidence: best,
    bestId,
    provider: 'local',
    elapsedMs: Date.now() - started,
    queryVectors: viewVectors.slice(),
  }
}

export function createScanSession() {
  const recent = []
  let frames = 0
  let viewVectors = []
  const startedAt = Date.now()

  return {
    get frames() { return frames },

    /** يُرجع {status:'searching'|'match', ...} */
    async push(input) {
      const extractor = await getExtractor()
      const index = await getIndex(extractor)
      if (index.length === 0) return { status: 'searching', frames, best: null }

      const { RawImage } = await import('@huggingface/transformers')
      const image = await RawImage.read(
        input.imageUrl || `data:image/jpeg;base64,${input.imageBase64}`,
      )

      const frac = CROP_LADDER[frames % CROP_LADDER.length]
      frames += 1

      const queryVector = toVector(await extractor(await centerCrop(image, frac)))
      const { topSiteId, topScore, margin } = matchVector(queryVector, index)

      // نحتفظ بمتجهات آخر نافذة: هي ما يُحفظ إن صحّح المستخدم النتيجة
      viewVectors.push(queryVector)
      if (viewVectors.length > LIVE_WINDOW) viewVectors.shift()

      recent.push({ topSiteId, topScore, margin })
      if (recent.length > LIVE_WINDOW) recent.shift()

      const decided = decideFromFrames(recent)
      if (decided) {
        /*
          نُكمل الحقول التي تعرضها الشاشة. وبدونها كانت تقول «المزوّد: ·
          زمن التحليل NaN ms» — وهو ما ظهر في أوّل تجربةٍ حقيقية في متصفّح.
        */
        return {
          ...decided,
          frames,
          via: 'dominance',
          provider: 'local',
          elapsedMs: Date.now() - startedAt,
          queryVectors: viewVectors.slice(),
        }
      }

      /*
        نُرجع أقرب لوحةٍ وهامشها لا الدرجة وحدها.

        فحين يقول المستخدم «لا يتعرّف» يكون السؤال: أهي 0.88 قريبةً من
        العتبة، أم 0.35 فيكون شيءٌ آخر معطوبًا؟ والفرق بين الجوابين هو
        الفرق بين معايرةٍ وإصلاحِ عطب.
      */
      return { status: 'searching', frames, best: topScore, bestId: topSiteId, margin }
    },
  }
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
      const prebuilt = (await fetchPrebuiltIndex()) ?? (await buildIndexInBrowser(extractor))

      /*
        التصحيحات المتعلَّمة تُضَمّ إلى الفهرس المشحون.

        وهي أثمن ما فيه: المشحون كلّه من زيارةٍ ميدانية واحدة، وكلّ
        تصحيحٍ صورةٌ للّوحة نفسها من يومٍ آخر وجهازٍ آخر — أي التنوّع
        الذي ينقص الفهرس أصلًا، وسببُ ضعفه أمام الصور الغريبة عنه.
      */
      const { loadLearned } = await import('./learning.js')
      const learned = await loadLearned()
      return learned.length ? [...prebuilt, ...learned] : prebuilt
    })()
  }
  return indexPromise
}

/**
 * يُنسي الفهرسَ نسخته المخبّأة فيُعاد بناؤه بالتصحيح الجديد.
 *
 * بدونه لا يظهر أثر التصحيح إلا بعد إعادة تحميل الصفحة — والمستخدم
 * الذي صحّح للتوّ ينتظر أن يعمل الآن، لا في الجلسة القادمة.
 */
export function refreshIndex() {
  indexPromise = null
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
