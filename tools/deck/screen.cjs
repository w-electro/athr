/**
 * شاشة العرض الرأسية — رمزُ الموقع، ثم نقوش جبة.
 *
 * لشاشةٍ قائمة في جناح المعرض: تبدأ برمز الاستجابة كبيرًا ليمسحه المارّ،
 * ثمّ تعرض لوحات جبة العشر واحدةً واحدة.
 *
 *   node tools/deck/screen.cjs          # يكتب athr-screen-ar.pptx
 *   python tools/deck/autoplay.py       # تكرارٌ عند آخر شريحة (بلا توقيت)
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

/*
  المقاس من الشاشة لا من العادة.

  كان 9:16 (7.5×13.333) والشاشة 1504×2256 أي 2:3 — أعرضُ نسبيًّا، فكان
  باوربوينت يُدخل الشريحة في الشاشة ويحشو الباقي شريطين جانبيين. والنسبة
  هنا مشتقّةٌ من أرقام الشاشة نفسها كي لا تنفصل عنها لاحقًا.
*/
const SCREEN_W = 1504
const SCREEN_H = 2256
const W = 7.5
const H = +(W * SCREEN_H / SCREEN_W).toFixed(4)   // 11.25

const pres = new pptxgen()
pres.defineLayout({ name: 'ATHR_SCREEN', width: W, height: H })
pres.layout = 'ATHR_SCREEN'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — شاشة العرض'

const BASALT = '0B0F17'
const TERRA = 'C97A4A'
const TERRA_BRIGHT = 'DD8C58'
const SAND = 'E8DCC8'
const SAND_DIM = 'A2977F'
const SAND_FAINT = '6E6757'

const DISP = 'Reem Kufi'
const BODY = 'Tajawal'
const LAT = 'Calibri'

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })
const mark = (o = {}) => ar({ fontFace: DISP, bold: true, ...o })

const PANELS = [
  'jubbah-p1', 'jubbah-p2', 'jubbah-p3', 'jubbah-p4', 'jubbah-p5',
  'jubbah-p6', 'jubbah-p7', 'jubbah-p8', 'jubbah-p9', 'jubbah-p10',
]

/* ── ١ · الرمز ────────────────────────────────────────────────── */
{
  const s = pres.addSlide()
  s.background = { color: BASALT }

  s.addText('أثر', mark({
    x: 0, y: 0.85, w: W, h: 1.7, align: 'center', fontSize: 92, color: TERRA,
  }))
  s.addText('دليلك إلى نقوش حائل', ar({
    x: 0, y: 2.6, w: W, h: 0.55, align: 'center', fontSize: 24, bold: true, color: SAND,
  }))

  // الرمز على أرضيةٍ بيضاء: القارئات تخطئ مع المعكوس
  const card = 5.0
  const cx = (W - card) / 2
  s.addShape(pres.ShapeType.roundRect, {
    x: cx, y: 3.5, w: card, h: card, rectRadius: 0.16,
    fill: { color: 'FFFFFF' }, line: { width: 0 },
  })
  s.addImage({ data: QR, x: cx + 0.42, y: 3.92, w: card - 0.84, h: card - 0.84 })

  s.addText('امسح الرمز', ar({
    x: 0, y: 8.75, w: W, h: 0.55, align: 'center', fontSize: 28, bold: true, color: TERRA_BRIGHT,
  }))
  s.addText('w-electro.github.io/athr', {
    x: 0, y: 9.35, w: W, h: 0.45, align: 'center',
    fontFace: LAT, fontSize: 18, color: SAND_DIM, margin: 0,
  })
  s.addText('يعمل بدون إنترنت، وبتسع وعشرين لغة', ar({
    x: 0, y: 9.9, w: W, h: 0.45, align: 'center', fontSize: 16, color: SAND_DIM,
  }))
  s.addText('نقوش جبة · جبل أُمّ سِنمان · حائل', ar({
    x: 0, y: 10.5, w: W, h: 0.38, align: 'center', fontSize: 12.5, color: SAND_FAINT,
  }))
}

/* ── ٢..١١ · اللوحات ──────────────────────────────────────────── */
PANELS.forEach((id) => {
  const s = pres.addSlide()
  s.background = { color: BASALT }

  /*
    الصورة وحدها، بلا اسمٍ ولا حقبة.

    الشاشة تجذب، والتطبيق يخبر. واسمٌ مكتوبٌ تحت النقش يسبق السائح إلى
    الجواب، فيسقط سببُ مسح الرمز أصلًا.
  */
  s.addImage({ data: jpg(path.join(A, 'screen', id + '.jpg')), x: 0, y: 0, w: W, h: H })
})

const out = process.argv[2] || path.join(REPO, 'athr-screen-ar.pptx')
pres.writeFile({ fileName: out }).then(() => console.log('screen deck written:', out))
