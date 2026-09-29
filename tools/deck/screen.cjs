/**
 * شاشة العرض الرأسية — رمزُ الموقع، ثم نقوش جبة.
 *
 * لشاشةٍ قائمة في جناح المعرض: تبدأ برمز الاستجابة كبيرًا ليمسحه المارّ،
 * ثمّ تعرض لوحات جبة العشر واحدةً واحدة، ثمّ تعود إلى الرمز.
 *
 * المقاس 7.5 × 13.333 بوصة — أي 9:16 بعينها، وهي نسبة الشاشة الرأسية
 * ونسبة الصور الأصلية معًا، فلا قصّ ولا حشو.
 *
 *   node tools/deck/screen.cjs        # يكتب athr-screen-ar.pptx
 *   python tools/deck/autoplay.py     # يضيف التقدّم التلقائي والتكرار
 */
const pptxgen = require('pptxgenjs')
const fs = require('node:fs')
const path = require('node:path')

const HERE = __dirname
const REPO = path.resolve(HERE, '..', '..')
const A = path.join(HERE, 'assets')

const jpg = (f) => 'image/jpeg;base64,' + fs.readFileSync(f).toString('base64')
const png = (f) => 'image/png;base64,' + fs.readFileSync(path.join(A, f)).toString('base64')

const QR = png('qr.png')

const pres = new pptxgen()
// المقاس الرأسي: عرضٌ 7.5 وارتفاعٌ 13.333 — مقلوب LAYOUT_WIDE
pres.defineLayout({ name: 'PORTRAIT_9_16', width: 7.5, height: 13.333 })
pres.layout = 'PORTRAIT_9_16'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — شاشة العرض'

const BASALT = '0B0F17'
const TERRA = 'C97A4A'
const TERRA_BRIGHT = 'DD8C58'
const GOLD = 'EFAE6E'
const SAND = 'E8DCC8'
const SAND_DIM = 'A2977F'
const SAND_FAINT = '6E6757'

const DISP = 'Reem Kufi'
const BODY = 'Tajawal'
const LAT = 'Calibri'

const W = 7.5
const H = 13.333

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })
const mark = (o = {}) => ar({ fontFace: DISP, bold: true, ...o })

/** وصفُ الحقبة كما في طبقة اللوحات */
const ERA = {
  neolithic: 'العصر الحجري الحديث · قبل نحو عشرة آلاف سنة',
  later: 'بعد تدجين الجمل · قبل نحو ثلاثة آلاف سنة',
  thamudic: 'نقوش ثمودية · قرونٌ قبل الإسلام',
}

const PANELS = [
  { id: 'jubbah-p1', name: 'قافلة الجِمال', era: 'later' },
  { id: 'jubbah-p2', name: 'مَلِك جبة', era: 'neolithic' },
  { id: 'jubbah-p3', name: 'الوعل ذو القرنين الطويلين', era: 'neolithic' },
  { id: 'jubbah-p4', name: 'الجمل المفرد', era: 'later' },
  { id: 'jubbah-p5', name: 'الشكل الذي لم يُحسَم', era: 'neolithic' },
  { id: 'jubbah-p6', name: 'الأسد ومروّضه', era: 'neolithic' },
  { id: 'jubbah-p7', name: 'الجِمال الثلاثة والراكب', era: 'thamudic' },
  { id: 'jubbah-p8', name: 'الرامي والبقرة', era: 'neolithic' },
  { id: 'jubbah-p9', name: 'جملٌ وكتابة', era: 'thamudic' },
  { id: 'jubbah-p10', name: 'سِرب النعام', era: 'thamudic' },
]

/* ── ١ · الرمز ────────────────────────────────────────────────── */
{
  const s = pres.addSlide()
  s.background = { color: BASALT }

  s.addText('أثر', mark({
    x: 0, y: 1.35, w: W, h: 2.0, align: 'center', fontSize: 108, color: TERRA,
  }))
  s.addText('دليلك إلى نقوش حائل', ar({
    x: 0, y: 3.5, w: W, h: 0.6, align: 'center', fontSize: 26, bold: true, color: SAND,
  }))

  // الرمز على أرضيةٍ بيضاء: القارئات تخطئ مع المعكوس
  const card = 5.3
  const cx = (W - card) / 2
  s.addShape(pres.ShapeType.roundRect, {
    x: cx, y: 4.85, w: card, h: card, rectRadius: 0.16,
    fill: { color: 'FFFFFF' }, line: { width: 0 },
  })
  s.addImage({ data: QR, x: cx + 0.45, y: 5.3, w: card - 0.9, h: card - 0.9 })

  s.addText('امسح الرمز', ar({
    x: 0, y: 10.35, w: W, h: 0.6, align: 'center', fontSize: 30, bold: true, color: TERRA_BRIGHT,
  }))
  s.addText('w-electro.github.io/athr', {
    x: 0, y: 11.05, w: W, h: 0.5, align: 'center',
    fontFace: LAT, fontSize: 19, color: SAND_DIM, margin: 0,
  })
  s.addText('يعمل بدون إنترنت، وبتسع وعشرين لغة', ar({
    x: 0, y: 11.72, w: W, h: 0.5, align: 'center', fontSize: 17, color: SAND_DIM,
  }))
  s.addText('نقوش جبة · جبل أُمّ سِنمان · حائل', ar({
    x: 0, y: 12.35, w: W, h: 0.4, align: 'center', fontSize: 13, color: SAND_FAINT,
  }))
}

/* ── ٢..١١ · اللوحات ──────────────────────────────────────────── */
PANELS.forEach((p) => {
  const s = pres.addSlide()
  s.background = { color: BASALT }

  /*
    الصورة تملأ الشريحة بلا إطار.

    والظلّ أسفلها مخبوزٌ في ملفّ الصورة لا مرسومٌ هنا: pptxgenjs لا يعرف
    التدرّجات، ومستطيلٌ نصف شفّاف يُظهر حدًّا أفقيًّا واضحًا فوق النصّ.
  */
  s.addImage({ data: jpg(path.join(A, 'screen', p.id + '.jpg')), x: 0, y: 0, w: W, h: H })

  s.addText(p.name, ar({
    x: 0.7, y: 10.72, w: W - 1.4, h: 0.85, fontSize: 34, bold: true, color: SAND,
  }))
  s.addText(ERA[p.era], ar({
    x: 0.7, y: 11.6, w: W - 1.4, h: 0.45, fontSize: 15, color: GOLD,
  }))
  s.addText('جبل أُمّ سِنمان · جبة', ar({
    x: 0.7, y: 12.14, w: W - 1.4, h: 0.4, fontSize: 12.5, color: SAND_FAINT,
  }))
})

const out = process.argv[2] || path.join(REPO, 'athr-screen-ar.pptx')
pres.writeFile({ fileName: out }).then(() => console.log('screen deck written:', out))
