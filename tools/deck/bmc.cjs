/**
 * نموذج العمل — Business Model Canvas بالقوالب التسعة.
 *
 * أفقي A4 كي تتسع الأعمدة الخمسة. والترتيب من اليمين: شرائح العملاء
 * أولا كما يقرأ العربي، لا كما يرسم القالب الإنجليزي.
 *
 *   node tools/deck/bmc.cjs
 *   python tools/deck/build-bmc.py     # ثم athr-bmc-ar.pdf
 */
const pptxgen = require('pptxgenjs')
const path = require('node:path')

const REPO = path.resolve(__dirname, '..', '..')

const W = 11.69
const H = 8.27
const M = 0.42

const pres = new pptxgen()
pres.defineLayout({ name: 'A4_LANDSCAPE', width: W, height: H })
pres.layout = 'A4_LANDSCAPE'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — نموذج العمل'

const INK = '16202E'
const MUTED = '4A5568'
const FAINT = '8E97A6'
const TERRA = 'B4663A'
const TINT = 'F7F3ED'
const HEAD = 'EDE4D8'
const RULE = 'D8D2C8'

const BODY = 'Tajawal'
const DISP = 'Reem Kufi'
const LAT = 'Calibri'

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })


const s = pres.addSlide()
s.background = { color: 'FFFFFF' }

s.addText('أثر', ar({
  fontFace: DISP, x: W - M - 1.2, y: 0.3, w: 1.2, h: 0.5, fontSize: 22, bold: true, color: TERRA,
}))
s.addText('نموذج العمل', ar({
  x: M, y: 0.34, w: W - M * 2 - 1.3, h: 0.42, fontSize: 19, bold: true, color: INK,
}))
s.addText('Business Model Canvas', {
  x: M, y: 0.74, w: W - M * 2 - 1.3, h: 0.3, align: 'right',
  fontFace: LAT, fontSize: 11, color: FAINT, margin: 0,
})

/* ── الشبكة ─────────────────────────────────────────────────────
   خمسة أعمدة فوق، وصفان تحت. والترتيب من اليمين إلى اليسار. */
const GRID_Y = 1.22
const TOP_H = 4.55
const BOT_Y = GRID_Y + TOP_H + 0.12
const BOT_H = 1.86
const GAP = 0.09
const CW = (W - M * 2 - GAP * 4) / 5
const colX = (i) => W - M - CW - i * (CW + GAP)   // 0 = أقصى اليمين

function block(x, y, w, h, title, items, accent) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: accent ? HEAD : TINT },
    line: { color: RULE, width: 0.75 },
  })
  s.addText(title, ar({
    x: x + 0.14, y: y + 0.12, w: w - 0.28, h: 0.3,
    fontSize: 10.5, bold: true, color: accent ? TERRA : INK,
  }))
  s.addShape(pres.ShapeType.rect, {
    x: x + 0.14, y: y + 0.44, w: w - 0.28, h: 0.012,
    fill: { color: RULE }, line: { width: 0 },
  })
  s.addText(
    items.map((t, i) => ({
      text: t,
      options: { rtlMode: true, breakLine: i < items.length - 1, paraSpaceAfter: 7 },
    })),
    ar({
      x: x + 0.14, y: y + 0.54, w: w - 0.28, h: h - 0.68,
      fontSize: 8.5, color: MUTED, lineSpacing: 12.5, valign: 'top',
    }),
  )
}

/* العمود ١ — شرائح العملاء (أقصى اليمين: أول ما يقرأ) */
block(colX(0), GRID_Y, CW, TOP_H, 'شرائح العملاء', [
  'سياح جبة والشويمس — محليون ودوليون',
  'هيئة التراث ومركز الزوار',
  'الرحلات المدرسية والجامعية',
  'المرشدون السياحيون كأداة مساندة',
  'المنشآت المحلية: مطاعم ومقاهي وفنادق ومحميات سياحية تريد الوصول إلى السائح',
])

/* العمود ٢ — العلاقة ثم القنوات */
block(colX(1), GRID_Y, CW, 2.16, 'علاقة العملاء', [
  'خدمة ذاتية بالكامل — بلا تسجيل ولا حساب',
  'يتحسن بتصحيح السائح نفسه',
  'لا دعم فني مطلوب: لا خادم يتعطل',
])
block(colX(1), GRID_Y + 2.28, CW, TOP_H - 2.28, 'القنوات', [
  'متجرا آبل وجوجل بلاي — الوجهة التالية',
  'الويب اليوم: يفتح من الرابط بلا تنزيل',
  'رمز استجابة عند المدخل وبجوار النقوش',
  'مركز الزوار ومكاتب السياحة، والمرشدون يوصون به',
])

/* العمود ٣ — القيمة المقدمة (القلب) */
block(colX(2), GRID_Y, CW, TOP_H, 'القيمة المقدمة', [
  'يعرف بالنقش بعينه، لا بالموقع كله',
  'يعمل بلا إنترنت — حيث لا تغطية أصلا',
  'تسع وعشرون لغة، ولكل لغة رواية مسموعة',
  'صفر تكلفة لكل سائح إضافي',
  'يتحسن كلما استعمله أحد: تصحيح السائح يدخل الفهرس',
  'لا تنزيل من متجر: يفتح من الرابط في ثوان',
  'وجدول الحروف الثمودية بين يدي السائح، وقراءتها قيد التطوير',
], true)

/* العمود ٤ — الأنشطة ثم الموارد */
block(colX(3), GRID_Y, CW, 2.16, 'الأنشطة الرئيسية', [
  'التصوير الميداني وبناء فهرس التعرف',
  'كتابة المحتوى التراثي وترجمته وتوليد صوته',
  'إصدار نسختي آيفون وأندرويد',
  'ضم الشركاء المحليين إلى المسار',
])
block(colX(3), GRID_Y + 2.28, CW, TOP_H - 2.28, 'الموارد الرئيسية', [
  'فهرس 201 صورة مرجعية من الموقع',
  'محتوى 10 نقوش و6 مواقع في 29 لغة',
  'نموذج DINOv3 مفتوح المصدر',
  'الشيفرة نفسها — مفتوحة وقابلة للنقل',
])

/* العمود ٥ — الشركاء */
block(colX(4), GRID_Y, CW, TOP_H, 'الشركاء الرئيسيون', [
  'Meta — نموذج DINOv3 مفتوح المصدر، وعليه يقوم التعرف كله',
  'Hugging Face — استضافة أوزان النموذج وتسليمها للمتصفح',
  'هيئة التراث: المرجع العلمي للنقوش',
  'هيئة السياحة وأمانة منطقة حائل',
  'مطاعم ومقاهي وفنادق حائل، والمحميات السياحية — شركاء المسار',
  'ويكيميديا كومنز: الصور برخص حرة',
])

/* ── الصف الأسفل: الإيراد يمينا والتكلفة يسارا ── */
const halfW = (W - M * 2 - GAP) / 2
block(W - M - halfW, BOT_Y, halfW, BOT_H, 'مصادر الإيراد', [
  'رسوم إدراج للمطاعم والمقاهي والفنادق والمحميات السياحية في مسار رحلتي',
  'خصم مقابل المسح: يدفع الشريك رسما ثابتا عند استخدام رمز الخصم فقط',
  'عمولة الحجوزات: نسبة من كل جولة أو تخييم أو رحلة برية تحجز من التطبيق',
  'ترخيص سنوي للجهة المشغلة، ونسخة بيضاء لمتاحف ومواقع أخرى',
], true)
block(M, BOT_Y, halfW, BOT_H, 'هيكل التكاليف', [
  'صفر تكلفة تشغيل: لا خوادم، ولا واجهات برمجية مدفوعة',
  'التكلفة كلها إعداد لمرة واحدة عن كل موقع: تصوير وفهرسة ومحتوى وترجمة',
  'سائح واحد ومليون سائح، كلهم سواء في الكلفة',
])

s.addText(
  'الميزة البنيوية: التكلفة الحدية للسائح الإضافي صفر — لأن التعرف والصوت والمحتوى كلها داخل جهازه، لا على خادم نملكه.',
  ar({
    x: M, y: BOT_Y + BOT_H + 0.16, w: W - M * 2, h: 0.3,
    align: 'center', fontSize: 10, italic: true, color: TERRA,
  }),
)

const out = process.argv[2] || path.join(REPO, 'athr-bmc-ar.pptx')
pres.writeFile({ fileName: out }).then(() => console.log('bmc written:', out))
