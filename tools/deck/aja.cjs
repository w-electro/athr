/**
 * تسليم هاكاثون AJA AI — القالب الموحّد مبنيًّا بوربوينت ومملوءًا.
 *
 * القالب الأصلي ملفّ Keynote، ولا تُكتب الـ‎.key برمجيًّا: صيغةٌ مغلقة
 * نصُّها بروتوبَف مضغوط، وأنماطُ حروفها مربوطةٌ بمواضع الأحرف — فأيّ
 * نصٍّ أطول من موضعه يكسرها. ومحوّل ليبر أوفيس يقرؤها ويُتلف تدرّجاتها.
 *
 * فأُعيد بناء المظهر هنا من أصول القالب نفسها (انظر art/aja-backgrounds.py)،
 * بترتيب شرائحه وأقسامه الستّة — وهي معايير التحكيم.
 *
 *   python tools/deck/art/aja-backgrounds.py   # الخلفيّتان والشعاران
 *   node   tools/deck/aja.cjs                  # athr-aja-submission.pptx
 */
const pptxgen = require('pptxgenjs')
const fs = require('node:fs')
const path = require('node:path')

const HERE = __dirname
const REPO = path.resolve(HERE, '..', '..')
const A = path.join(HERE, 'assets', 'aja')

const img = (f) => {
  const p = path.join(A, f)
  const mime = f.endsWith('.png') ? 'image/png' : 'image/jpeg'
  return mime + ';base64,' + fs.readFileSync(p).toString('base64')
}

const BG_DARK = img('bg-dark.jpg')
const BG_LIGHT = img('bg-light.jpg')
const LOGO_AJA = img('logo-aja.png')
const LOGO_YEAR = fs.existsSync(path.join(A, 'logo-year.png')) ? img('logo-year.png') : null

const W = 13.333
const H = 7.5
const M = 0.95

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — تسليم هاكاثون AJA AI'

/* ألوان مأخوذةً من القالب لا مخمّنة */
const SLATE = '255174'     // عناوين الأقسام
const BODYC = '3C4C60'     // نصّ المحتوى
const GHOST = 'DCE5F0'     // الرقم الكبير الباهت
const VIOLET = '8357F6'    // شريط الغلاف
const WHITE = 'FFFFFF'

const BODY = 'Tajawal'
const LAT = 'Calibri'

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })
const bullet = (t) => '‏·  ' + t   // RLM: وإلا وقعت النقطة يسارًا

function darkPage() {
  const s = pres.addSlide()
  s.background = { color: '061223' }
  s.addImage({ data: BG_DARK, x: 0, y: 0, w: W, h: H })
  if (LOGO_YEAR) s.addImage({ data: LOGO_YEAR, x: 0.5, y: 0.42, w: 1.5, h: 1.0 })
  s.addImage({ data: LOGO_AJA, x: W - 1.75, y: 0.35, w: 1.25, h: 1.23 })
  return s
}

function lightPage() {
  const s = pres.addSlide()
  s.background = { color: 'F9FAFC' }
  s.addImage({ data: BG_LIGHT, x: 0, y: 0, w: W, h: H })
  return s
}

/* ══ ١ · الغلاف ═════════════════════════════════════════════════ */
{
  const s = darkPage()
  /*
    «هاكاثون AJA AI» كتلةٌ واحدة متمركزة.

    العربية يمينًا واللاتينية يسارًا، وحافّتاهما الداخليّتان تلتقيان
    عند منتصف الشريحة — فلا تتباعد الكلمتان كأنّهما عنوانان.
  */
  s.addText('هاكاثون', ar({
    x: W / 2 + 0.12, y: 2.95, w: 2.3, h: 0.9, fontSize: 40, bold: true, color: WHITE,
  }))
  s.addText('AJA AI', {
    x: W / 2 - 2.42, y: 2.98, w: 2.3, h: 0.85, align: 'left',
    fontFace: LAT, fontSize: 40, bold: true, color: WHITE, charSpacing: 6, margin: 0,
  })
  s.addShape(pres.ShapeType.rect, {
    x: W / 2 - 2.42, y: 4.26, w: 1.7, h: 0.1, fill: { color: VIOLET }, line: { width: 0 },
  })
  s.addText('فريق أَثَر', ar({
    x: W / 2 - 0.5, y: 4.06, w: 2.92, h: 0.5, fontSize: 21, color: WHITE,
  }))
  s.addNotes('اكتب أسماء أعضاء الفريق هنا إن طلبها المحكّمون.')
}

/* ══ ٢ · نبذة عنّا ══════════════════════════════════════════════ */
{
  const s = lightPage()
  s.addText('نبذة عنّا', ar({
    x: M, y: 0.72, w: W - M * 2, h: 0.6, fontSize: 30, bold: true, color: SLATE,
  }))
  s.addShape(pres.ShapeType.rect, {
    x: W - M - 2.0, y: 1.42, w: 2.0, h: 0.06, fill: { color: VIOLET }, line: { width: 0 },
  })
  s.addText([
    { text: 'أثر دليل تراثي ذكي لمنطقة حائل، يعمل بدون إنترنت.', options: { breakLine: true, bold: true } },
    { text: '', options: { breakLine: true } },
    { text: 'يوجّه الزائر كاميرا جوّاله على النقش الصخري، فيتعرّف التطبيق على اللوحة بعينها، ويروي قصّتها مسموعةً بلغته — تسع وعشرون لغة.', options: { breakLine: true } },
    { text: '', options: { breakLine: true } },
    { text: 'وكلّ شيء داخل الجوّال: لا خادم، ولا اشتراك، ولا إنترنت بعد أوّل تحميل.', options: {} },
  ], ar({
    x: M, y: 1.95, w: W - M * 2, h: 2.4, fontSize: 18, color: BODYC, lineSpacing: 34,
  }))
  s.addText('الفريق:  [تُكتب أسماء الأعضاء وأدوارهم]', ar({
    x: M, y: 5.0, w: W - M * 2, h: 0.5, fontSize: 15, italic: true, color: '8794A6',
  }))
}

/* ══ الأقسام الستّة ═════════════════════════════════════════════ */
const SECTIONS = [
  ['01', 'الابتكار والأصالة', [
    'التعرّف على مستوى اللوحة لا الموقع: عشر لوحات موثّقة في جبل أُمّ سِنمان، لكلّ واحدة اسمٌ وقصّةٌ وزمن.',
    'يعمل بلا إنترنت بالكامل — النموذج نفسه، اثنان وعشرون ميغابايت، داخل المتصفّح لا على خادم.',
    'يتعلّم من الزائر على جهازه: تصحيحه يدخل الفهرس فورًا فيصيب في المسح التالي، ويتعلّم الرفض أيضًا.',
    'دليلٌ يقرأ النقش نفسه، لا لافتةً عند المدخل.',
  ]],
  ['02', 'توظيف الذكاء الاصطناعي', [
    'نموذج الرؤية DINOv3 من Meta، مفتوح المصدر — تعلّمَ أشكال الأشياء من ملايين الصور بلا وسمٍ بشري.',
    'وبنينا فوقه طبقة التعرّف: فهرس بصمات ٢٠١ صورة ميدانية، وسلّم قصٍّ يعالج اختلاف الإطار، وطبقة قرار تقول «لا أعرف» بدل أن تخمّن، وجمعُ أدلّة عدّة لقطات.',
    'تعلّمٌ انتقاليّ بالأمثلة على الجهاز — لا ضبط لأوزان الشبكة.',
    'وذكاءٌ اصطناعي ثانٍ: توليد الرواية الصوتية بتسع وعشرين لغة بنماذج نطق مفتوحة.',
  ]],
  ['03', 'حاجة السوق والقيمة المقدَّمة', [
    'جبة موقع تراث عالمي لليونسكو، وفيه مئات اللوحات — والزائر يقف أمام الصخرة ولا يعرف ما أمامه.',
    'ولا تغطية شبكة في الموقع، فكلّ حلٍّ يعتمد على السحابة يسقط هناك.',
    'وزوّاره من كلّ مكان: تسع وعشرون لغة، ولكلّ لغة رواية مسموعة.',
    'والقيمة للجهة المشغّلة: تجربة زائرٍ أفضل بصفر تكلفة تشغيل.',
  ]],
  ['04', 'جودة الحلّ والنموذج الأولي MVP', [
    'تطبيقٌ يعمل الآن على الويب، ويُفتح من الرابط بلا تنزيل: w-electro.github.io/athr',
    'ستّة مواقع وعشر لوحات موثّقة، وتسع وعشرون لغة، ومئةٌ وأربعةٌ وسبعون مقطعًا صوتيًّا.',
    'ستّمئة وثلاثة وستّون اختبارًا آليًّا تعمل مع كلّ تعديل.',
    'الدقّة على صورةٍ جديدة من يومٍ وجهازٍ آخرين: ٧٩٫٣٪ — وصفر إجابة خاطئة على ٥٣ صورة رملٍ وسماء.',
  ]],
  ['05', 'نموذج العمل والجدوى', [
    'التطبيق مجّانيّ للزائر دائمًا، ووجهته التالية متجرا آبل وجوجل بلاي.',
    'شركاء محلّيّون: مطاعم ومقاهٍ وفنادق في حائل تُدرَج مواقعها في «رحلتي» برسمٍ سنويّ — الزائر جائعٌ بعد ساعتين في الموقع، والمطعم يريد أن يعرف به.',
    'وترخيصٌ سنويّ للجهة المشغّلة عن كلّ موقع، ورسوم إعدادٍ لكلّ موقعٍ جديد، ونسخةٌ بيضاء لمتاحف أخرى.',
    'والتكلفة الحدّية للزائر الإضافي صفر: لا خوادم ولا واجهات مدفوعة — فزائرٌ واحد وزائرٌ مليون سواءٌ في الكلفة.',
  ]],
  ['06', 'قابلية النمو', [
    'إضافة موقعٍ جديد = تصويرٌ ومحتوًى وترجمة. لا إعادة تدريب، ولا بنية تحتية تُبنى.',
    'والفهرس يتوسّع بلا حدّ: النموذج لم يُدرَّب على جبة أصلًا، فهو لا يعرفها أكثر ممّا سيعرف غيرها.',
    'قابلٌ للنقل إلى أيّ موقعٍ تراثي في المملكة — العُلا، والأحساء، وبقيّة مواقع حائل.',
    'ويتحسّن من نفسه: كلّ زائرٍ يصحّح يزيد دقّة الفهرس لمن بعده.',
  ]],
]

SECTIONS.forEach(([num, title, bullets]) => {
  /* شريحة الفاصل: رقمٌ كبيرٌ باهت يسارًا، والعنوان يمينًا */
  const d = lightPage()
  d.addText(num, {
    x: 0.7, y: 2.1, w: 5.2, h: 3.3, align: 'left',
    fontFace: LAT, fontSize: 170, bold: true, color: GHOST, margin: 0,
  })
  d.addText(title, ar({
    x: 5.6, y: 3.05, w: W - 5.6 - M, h: 1.4, fontSize: 38, bold: true, color: SLATE,
  }))

  /* شريحة المحتوى */
  const s = lightPage()
  s.addText(title, ar({
    x: M, y: 0.72, w: W - M * 2, h: 0.55, fontSize: 26, bold: true, color: SLATE,
  }))
  s.addShape(pres.ShapeType.rect, {
    x: W - M - 1.7, y: 1.36, w: 1.7, h: 0.06, fill: { color: VIOLET }, line: { width: 0 },
  })
  s.addText(
    bullets.map((t, i) => ({
      text: bullet(t),
      options: { breakLine: i < bullets.length - 1, paraSpaceAfter: 14 },
    })),
    ar({
      x: M, y: 1.85, w: W - M * 2, h: 4.6, fontSize: 16, color: BODYC,
      lineSpacing: 28, valign: 'top',
    }),
  )
})

/* ══ ١٥ · الختام ════════════════════════════════════════════════ */
{
  const s = darkPage()
  s.addText('شكرًا لكم', ar({
    x: W / 2 - 1.6, y: 3.05, w: 3.2, h: 0.9, align: 'center', fontSize: 38, bold: true, color: WHITE,
  }))
  s.addShape(pres.ShapeType.rect, {
    x: W / 2 - 0.95, y: 4.12, w: 1.9, h: 0.1, fill: { color: VIOLET }, line: { width: 0 },
  })
  s.addText('w-electro.github.io/athr', {
    x: 0, y: 4.5, w: W, h: 0.45, align: 'center',
    fontFace: LAT, fontSize: 15, color: 'A9B6C8', margin: 0,
  })
}

const out = process.argv[2] || path.join(REPO, 'athr-aja-submission.pptx')
pres.writeFile({ fileName: out }).then(() => console.log('aja submission written:', out))
