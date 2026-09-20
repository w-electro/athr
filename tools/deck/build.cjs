const pptxgen = require('pptxgenjs')
const fs = require('fs')

const path = require('node:path')

const HERE = __dirname
const REPO = path.resolve(HERE, '..', '..')
const A = path.join(HERE, 'assets') + path.sep
const png = (f) => 'image/png;base64,' + fs.readFileSync(A + f).toString('base64')
const jpg = (f) => 'image/jpeg;base64,' + fs.readFileSync(f).toString('base64')

const COVER = jpg(A + 'cover.jpg')
const FIELD = jpg(path.join(REPO, 'public', 'photos', 'jubbah-01.jpg'))   // 800×600
const IBEX = png('glyph-ibex.png')            // 760×482
const WHICH = png('ic-whichpanel.png')        // 201×164
const LANGS = png('ic-languages.png')         // 188×174
const NONET = png('ic-nonet.png')             // 160×187
const THUMB_CAM = jpg(A + 'thumb-camera.jpg')  // 640×480
const THUMB_IDX = jpg(A + 'thumb-index.jpg')   // 640×480
const APP_WELCOME = png('app-welcome.png')
const APP_SITE = png('app-site.png')
const QR = png('qr.png')

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر'

const BASALT = '0B0F17'
const CARD = '151D2C'
const CARD_HI = '232D42'
const TERRA = 'C97A4A'
const TERRA_BRIGHT = 'DD8C58'
const GOLD = 'EFAE6E'
const SAND = 'E8DCC8'
const SAND_DIM = 'A2977F'
const SAND_FAINT = '6E6757'

const DISP = 'Reem Kufi'   // خط الشعار في الموقع
const BODY = 'Tajawal'     // خط النص العربي في الموقع
const LAT = 'Calibri'

const W = 13.333, H = 7.5, M = 0.75
const CW = W - M * 2

const dark = (s) => { s.background = { color: BASALT } }
const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })
const hd = (o = {}) => ar({ bold: true, ...o })
const mark = (o = {}) => ar({ fontFace: DISP, bold: true, ...o })

function title(slide, text, y = 0.55) {
  slide.addText(text, hd({ x: M, y, w: CW, h: 0.95, fontSize: 38, color: SAND }))
}

function card(slide, o) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fill: { color: o.fill || CARD }, rectRadius: 0.1,
    line: { color: CARD_HI, width: 1 },
  })
}

/** صورة داخل إطار له ظل — للقطات التطبيق وصور الميدان */
function framed(slide, data, x, y, w, h) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: x - 0.07, y: y - 0.07, w: w + 0.14, h: h + 0.14,
    fill: { color: '2A3244' }, rectRadius: 0.12, line: { width: 0 },
    shadow: { type: 'outer', color: '000000', blur: 22, offset: 6, angle: 90, opacity: 0.6 },
  })
  slide.addImage({ data, x, y, w, h })
}

/* ── ١ · الغلاف ───────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  // نقوش جبة نفسها، والتدرّج نحو اليمين مخبوز في الصورة
  s.addImage({ data: COVER, x: 0, y: 0, w: W, h: H })
  s.addText('أثر', mark({ x: 5.9, y: 1.9, w: 6.7, h: 2.2, fontSize: 130, color: TERRA_BRIGHT }))
  s.addText('دليلك إلى نقوش حائل', hd({
    x: 4.6, y: 4.2, w: 8, h: 0.7, fontSize: 30, color: SAND,
  }))
  s.addText('يعمل بدون إنترنت، وبتسع وعشرين لغة', ar({
    x: 4.6, y: 4.95, w: 8, h: 0.5, fontSize: 17, color: SAND_DIM,
  }))
  s.addText('نقوش جبة — حائل', ar({
    x: 4.6, y: 6.5, w: 8, h: 0.35, fontSize: 12, color: SAND_FAINT,
  }))
  s.addNotes('ابدأ بالمكان لا بالتقنية: ما خلفي نقوش جبة، على بعد ساعة من حائل، وعمر بعضها عشرة آلاف سنة.')
}

/* ── ٢ · المشكلة ──────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  title(s, 'زائر يقف أمام نقش')
  s.addText('ويريد أن يعرف: ما هذا؟ وكم عمره؟ ولماذا يختلف عن جاره؟', ar({
    x: M, y: 1.5, w: CW, h: 0.5, fontSize: 19, color: SAND_DIM,
  }))

  const items = [
    [WHICH, 201 / 164, 'أي لوحة هذه؟',
      'جدار واحد يحمل مئات اللوحات، ولكل واحدة قصتها وزمنها.'],
    [LANGS, 188 / 174, 'وبأي لغة؟',
      'زوار جبة من كل مكان، والقصة تصل حين يسمعها الزائر بلغته.'],
    [NONET, 160 / 187, 'وبلا شبكة',
      'الموقع في الصحراء المفتوحة، فأي حل يعتمد على الإنترنت يتوقف.'],
  ]
  items.forEach(([data, ratio, h, b], i) => {
    const x = W - M - 3.9 - i * 4.05
    card(s, { x, y: 2.3, w: 3.9, h: 3.35 })
    const ih = 1.2
    s.addImage({ data, x: x + 3.9 - 0.45 - ih * ratio, y: 2.6, w: ih * ratio, h: ih })
    s.addText(h, hd({ x: x + 0.4, y: 3.98, w: 3.1, h: 0.5, fontSize: 21, color: TERRA_BRIGHT }))
    s.addText(b, ar({ x: x + 0.4, y: 4.58, w: 3.1, h: 0.95, fontSize: 14, color: SAND_DIM, lineSpacing: 23 }))
  })
  s.addText('أقرب جواب هو خادم في السحابة — وهو الجواب الذي لا يعمل هنا.', ar({
    x: M, y: 6.0, w: CW, h: 0.5, fontSize: 17, italic: true, color: GOLD,
  }))
  s.addNotes('ثلاثة أسئلة يحملها الزائر، وثلاثتها تُجاب في الشريحة التالية: أي لوحة، وبأي لغة، وبلا شبكة.')
}

/* ── ٣ · ما يفعله ─────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  title(s, 'وجّه الكاميرا، واسمع القصة')

  framed(s, APP_WELCOME, 0.75, 1.75, 4.55 * (412 / 860), 4.55)
  framed(s, APP_SITE, 3.35, 1.75, 4.55 * (412 / 860), 4.55)

  /*
    لا أقواس زاوية هنا.

    «...» تنقلب في النص ثنائي الاتجاه: القوس الفاتح يظهر مكان المغلق
    حين تجاوره كلمة لاتينية أو رقم. والجملة تستغني عنها بإعادة صياغة.
  */
  const steps = [
    ['حرّك', 'المسح مستمر وأنت تحرك يدك أمام النقش، فلا تحتاج لقطة مثالية.'],
    ['يتعرّف', 'يقول لك اسم اللوحة التي أمامك بعينها، لا أنها نقوش صخرية فقط.'],
    ['اسمع', 'تسمع قصتها بصوت، بلغتك أنت، ومعها تاريخ الموقع.'],
  ]
  steps.forEach(([h, b], i) => {
    const y = 1.8 + i * 1.18
    s.addText(h, hd({ x: 6.3, y, w: 6.3, h: 0.42, fontSize: 22, color: TERRA_BRIGHT }))
    s.addText(b, ar({ x: 6.3, y: y + 0.46, w: 6.3, h: 0.65, fontSize: 13.5, color: SAND_DIM, lineSpacing: 21 }))
  })

  card(s, { x: 6.3, y: 5.35, w: 6.3, h: 1.25 })
  s.addText('٢٩', hd({ x: 11.2, y: 5.55, w: 1.2, h: 0.85, align: 'center', fontSize: 38, color: TERRA_BRIGHT }))
  s.addText('لغة', ar({ x: 9.85, y: 5.8, w: 1.15, h: 0.4, fontSize: 15, color: SAND_DIM }))
  s.addText('١٠', hd({ x: 8.5, y: 5.55, w: 1.2, h: 0.85, align: 'center', fontSize: 38, color: GOLD }))
  s.addText('لوحات موثقة', ar({ x: 6.6, y: 5.8, w: 1.75, h: 0.4, fontSize: 13, color: SAND_DIM }))
  s.addNotes('اعرض هنا مباشرة على جوالك. ولا تشرح البنية أثناء العرض — دعهم يرونه يعمل.')
}

/* ── ٤ · النموذج ──────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  title(s, 'كيف طوّعنا DINOv3 لنقوش جبة')

  card(s, { x: 4.55, y: 1.7, w: 8.05, h: 4.65 })
  s.addText('DINOv3  ViT-S/16', {
    x: 6.75, y: 1.98, w: 5.45, h: 0.5, align: 'right',
    fontFace: LAT, fontSize: 24, bold: true, color: TERRA_BRIGHT, margin: 0,
  })
  // ثلاثة أسئلة لا قائمة أرقام: الرقم يقنع من فهم، والكلمة تُفهِم أولا
  const qa = [
    ['الأساس', 'شبكة رؤية مفتوحة تعلّمت الأشكال والملمس من ملايين الصور دون وسوم بشرية — تعلّم ذاتي الإشراف.'],
    ['ما بنيناه فوقه', 'فهرس بصمات من تصويرنا الميداني، وعليه طبقة قرار تقارن وتحكم — تعلّم انتقالي بالأمثلة.'],
    ['والفرق', 'لم نغيّر أوزان الشبكة، بل غيّرنا ما تعرفه. فصار النموذج العام خبيرا بلوحات جبة.'],
  ]
  qa.forEach(([q, a], i) => {
    const y = 2.62 + i * 1.22
    s.addText(q, hd({ x: 6.75, y, w: 5.45, h: 0.38, fontSize: 17, color: GOLD }))
    s.addText(a, ar({ x: 6.75, y: y + 0.42, w: 5.45, h: 0.72, fontSize: 14, color: SAND_DIM, lineSpacing: 23 }))
  })
  /*
    مخطّطُ ما يجري، لا رسمًا يزيّن.

    الصورتان من ملفٍّ واحد بقصّين مختلفين: لقطةٌ أقرب وأميل مقابل مرجعٍ
    أوسع. وذاك هو العمل نفسه — مطابقةُ لوحةٍ واحدة عبر لقطتين غير
    متطابقتين — فالمخطّط يقوله بالصورة قبل أن يقوله النصّ.
  */
  const DX = 4.68, DW = 1.92           // العمود الأيسر داخل البطاقة
  const tw = 1.35, th = 1.01
  const tx = DX + (DW - tw) / 2

  const step = (y, data, ring) => {
    s.addShape(pres.ShapeType.roundRect, {
      x: tx - 0.05, y: y - 0.05, w: tw + 0.1, h: th + 0.1, rectRadius: 0.08,
      fill: { color: ring ? TERRA : '2A3244' }, line: { width: 0 },
    })
    s.addImage({ data, x: tx, y, w: tw, h: th })
  }
  const cap = (y, t) => s.addText(t, ar({
    x: DX - 0.06, y, w: DW + 0.12, h: 0.24, align: 'center', fontSize: 9.5, color: SAND_FAINT,
  }))
  const arrow = (y) => s.addText('▼', {
    x: DX, y, w: DW, h: 0.22, align: 'center',
    fontFace: LAT, fontSize: 11, color: TERRA, margin: 0,
  })

  step(1.95, THUMB_CAM, false)
  cap(3.00, 'ما تراه الكاميرا')
  arrow(3.26)
  // العرض نفسه الذي لإطارَي الصورتين، فلا تتعرّج حافّة العمود
  s.addShape(pres.ShapeType.roundRect, {
    x: tx - 0.05, y: 3.52, w: tw + 0.1, h: 0.72, rectRadius: 0.08,
    fill: { color: CARD_HI }, line: { width: 0 },
  })
  // سطران بلا محرف سطرٍ داخل النصّ: pptxgenjs يكسر السطر بـbreakLine
  s.addText([
    { text: '0.417  0.902', options: { breakLine: true } },
    { text: '0.773  0.264', options: { breakLine: true } },
    { text: '0.115  0.658' },
  ], {
    x: tx, y: 3.6, w: tw, h: 0.58, align: 'center',
    fontFace: 'Courier New', fontSize: 9.5, color: GOLD, lineSpacing: 12, margin: 0,
  })
  cap(4.28, '٣٨٤ رقما — بصمة الصورة')
  arrow(4.54)
  step(4.82, THUMB_IDX, true)
  cap(5.87, 'أقرب لوحة في الفهرس')

  // أربعتها من صنعنا، لا من النموذج
  const caps = [
    ['فهرس من الميدان', '٢٠١ صورة من جبة، صارت بصمات'],
    ['سلّم القصّ', 'نجرّب كل لقطة بثلاثة مقاسات'],
    ['طبقة القرار', 'يقول: لا أعرف، بدل أن يخمّن'],
    ['مسح حيّ', 'يجمع أدلة من عدة لقطات قبل الحكم'],
  ]
  caps.forEach(([h, b], i) => {
    const y = 1.7 + i * 1.2
    card(s, { x: M, y, w: 3.55, h: 1.05, fill: CARD_HI })
    s.addText(h, hd({ x: M + 0.28, y: y + 0.13, w: 2.99, h: 0.4, fontSize: 16, color: GOLD }))
    s.addText(b, ar({ x: M + 0.28, y: y + 0.57, w: 2.99, h: 0.38, fontSize: 12, color: SAND_DIM }))
  })
  s.addNotes('النموذج DINOv3 من Meta، مفتوح المصدر. وكن دقيقا لو سُئلت: لم نضبط أوزان الشبكة (no fine-tuning). ما بنيناه هو طبقة التعرّف فوقها: الفهرس الميداني، وسلّم القصّ الذي يعالج اختلاف الإطار، وطبقة العتبة والهامش المعايرة على ٥٣ صورة سالبة، وجمع أدلة اللقطات في المسح الحي، والتعلّم من تصحيح الزائر. وهذا هو التعلّم الانتقالي بالأمثلة، وهو ما تفعله محركات البحث بالصور.')
}

/* ── ٥ · داخل الجوّال ─────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  title(s, 'كل شيء داخل جوالك')
  s.addText('لا خادم، ولا اشتراك، ولا إنترنت بعد أول تحميل', ar({
    x: M, y: 1.5, w: CW, h: 0.5, fontSize: 19, color: SAND_DIM,
  }))

  // جوّال يسكنه الوعل: النموذج كله في الجيب
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.95, y: 2.2, w: 2.35, h: 4.3, rectRadius: 0.3,
    fill: { color: CARD }, line: { color: TERRA, width: 2 },
  })
  s.addText('أثر', mark({
    x: 1.15, y: 2.62, w: 1.95, h: 0.62, align: 'center', fontSize: 30, color: TERRA_BRIGHT,
  }))
  s.addImage({ data: IBEX, x: 1.18, y: 3.55, w: 1.9, h: 1.21 })
  s.addText('يعمل والجهاز\nفي وضع الطيران', ar({
    x: 1.15, y: 5.15, w: 1.95, h: 0.8, align: 'center', fontSize: 12, color: SAND_DIM, lineSpacing: 18,
  }))

  // الصفران متجاوران في الصف الأسفل، فيُقرآن معًا لا قطريًّا
  const stats = [
    ['٢٢', 'ميغابايت: حجم النموذج كاملا', TERRA_BRIGHT],
    ['١٠٠٪', 'يعمل بلا اتصال', GOLD],
    ['صفر', 'خوادم نديرها', GOLD],
    ['صفر', 'تكلفة لكل زائر: واحد أو مليون', TERRA_BRIGHT],
  ]
  stats.forEach(([n, l, c], i) => {
    const col = i % 2, row = (i - col) / 2
    const x = W - M - 4.32 - col * 4.6
    const y = 2.2 + row * 2.2
    card(s, { x, y, w: 4.32, h: 1.9 })
    s.addText(n, hd({ x, y: y + 0.28, w: 4.32, h: 0.85, align: 'center', fontSize: 40, color: c }))
    s.addText(l, ar({ x: x + 0.35, y: y + 1.22, w: 3.62, h: 0.45, align: 'center', fontSize: 13, color: SAND_DIM }))
  })

  s.addText('أغلب المشاريع تتوقف إذا انقطعت الشبكة أو انتهى رصيد الخدمة المدفوعة. وهذا يعمل في وسط النفود.', ar({
    x: M, y: 6.65, w: CW, h: 0.45, fontSize: 16, italic: true, color: GOLD,
  }))
  s.addNotes('هذه نقطة التميز. قُلها بوضوح وامضِ — لا تُطِل فيها.')
}

/* ── ٦ · يتعلّم ───────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  title(s, 'ويتعلّم داخل جهازك')
  s.addText('كل تصحيح من الزائر مثال جديد يدخل النموذج، فيتغير قراره فورا.', ar({
    x: M, y: 1.5, w: CW, h: 0.5, fontSize: 16.5, color: SAND_DIM,
  }))

  const flow = [
    ['يمسح', 'فيسمي اللوحة'],
    ['تصحّح', 'تضغط: ليست هذه'],
    ['يتعلّم', 'يبقى في جوالك'],
    ['يصيب', 'في المسح التالي'],
  ]
  flow.forEach(([h, b], i) => {
    const x = W - M - 2.77 - i * 3.02
    card(s, { x, y: 2.2, w: 2.77, h: 1.6 })
    s.addText(h, hd({ x: x + 0.28, y: 2.45, w: 2.21, h: 0.45, fontSize: 20, color: TERRA_BRIGHT }))
    s.addText(b, ar({ x: x + 0.28, y: 3.0, w: 2.21, h: 0.6, fontSize: 13, color: SAND_DIM, lineSpacing: 19 }))
  })

  card(s, { x: 6.95, y: 4.1, w: 5.65, h: 2.3 })
  s.addText('لماذا يهم هذا', hd({ x: 7.3, y: 4.35, w: 4.95, h: 0.45, fontSize: 19, color: SAND }))
  s.addText('كل صورنا المرجعية من زيارة واحدة: يوم واحد، وجوال واحد، وإضاءة واحدة. وتصحيح الزائر صورة من يوم آخر وجهاز آخر، وهذا بالضبط ما ينقص الفهرس.', ar({
    x: 7.3, y: 4.9, w: 4.95, h: 1.35, fontSize: 14, color: SAND_DIM, lineSpacing: 23,
  }))

  card(s, { x: M, y: 4.1, w: 5.65, h: 2.3, fill: CARD_HI })
  s.addText('ويتعلّم ما ليس نقشا', hd({ x: M + 0.35, y: 4.35, w: 4.95, h: 0.45, fontSize: 19, color: GOLD }))
  s.addText('صوّب الكاميرا على حاسوبك واضغط: ليست نقشا. فيصير الرفض جوابا تعلّمه منك، لا مجرد فشل في المطابقة.', ar({
    x: M + 0.35, y: 4.9, w: 4.95, h: 1.35, fontSize: 14, color: SAND_DIM, lineSpacing: 23,
  }))
  s.addNotes('اعرضه حيا: امسح، صحّح، امسح مرة أخرى. عشر ثوان يرون فيها التعلم يقع. وإن سُئلت: النموذج غير بارامتري (k-NN)، وأوزان الشبكة لا تتغير — الذي يتغير هو ما يعرفه عن لوحات جبة.')
}

/* ── ٧ · الرحلة ───────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  title(s, 'كيف بنينا أثر')
  s.addText('من زيارة ميدانية إلى تطبيق يعمل في يد الزائر', ar({
    x: M, y: 1.5, w: CW, h: 0.5, fontSize: 18, color: SAND_DIM,
  }))

  framed(s, FIELD, 0.75, 2.25, 3.6, 2.7)
  s.addText('جبة: من هنا جاءت كل صورة في الفهرس', ar({
    x: 0.75, y: 5.15, w: 3.6, h: 0.4, align: 'center', fontSize: 12, color: SAND_FAINT,
  }))

  const facts = [
    ['٢٠١', 'صورة مرجعية من الموقع'],
    ['٦٥٨', 'اختبارا آليا يعمل مع كل تعديل'],
    ['٢٩', 'لغة، ولكل لغة صوتها'],
  ]
  facts.forEach(([n, l], i) => {
    const y = 5.65 + i * 0.42
    s.addText(n, hd({ x: 3.35, y, w: 1.0, h: 0.36, fontSize: 16, color: TERRA_BRIGHT }))
    s.addText(l, ar({ x: 0.75, y: y + 0.03, w: 2.5, h: 0.32, fontSize: 12.5, color: SAND_DIM }))
  })

  const steps = [
    ['الميدان', 'زرنا جبة، وصوّرنا لوحاتها، وكتبنا قصصها.'],
    ['الترجمة', 'نقلنا كل قصة إلى تسع وعشرين لغة.'],
    ['الصوت', 'ولّدنا الرواية المسموعة بنماذج نطق مفتوحة، لكل لغة صوتها.'],
    ['التعرّف', 'شغّلنا المسح داخل المتصفح نفسه: لا خادم ولا إنترنت.'],
    ['التعلّم', 'أضفنا تصحيح الزائر، فصار يتحسن كلما استعمله أحد.'],
  ]
  steps.forEach(([h, b], i) => {
    const y = 2.25 + i * 0.87
    card(s, { x: 4.75, y, w: 7.83, h: 0.75 })
    s.addText(h, hd({ x: 10.35, y: y + 0.19, w: 2.05, h: 0.37, fontSize: 16, color: TERRA_BRIGHT }))
    s.addText(b, ar({ x: 4.98, y: y + 0.21, w: 5.15, h: 0.34, fontSize: 12.5, color: SAND_DIM }))
  })
  s.addNotes('شريحة الرحلة، والترتيب مقصود: الميدان أولا ثم المحتوى ثم التقنية. والصوت مولّد لا مسجّل — بنماذج نطق مفتوحة: Supertonic لثماني عشرة لغة، وKokoro للصينية، وMMS-TTS لتسع. قُل ذلك صراحة إن سُئلت، فهو عمل ذكاء اصطناعي آخر لا عيب فيه. ولو سأل محكّم عن أرقام الدقة فالجواب جاهز عندك شفهيا.')
}

/* ── ٨ · الختام ───────────────────────────────────────────────── */
{
  const s = pres.addSlide(); dark(s)
  s.addText('أثر', mark({ x: 7.0, y: 1.0, w: 5.63, h: 1.6, fontSize: 92, color: TERRA }))
  s.addText('جرّبه على جوالك', hd({ x: 4.9, y: 2.78, w: 7.73, h: 0.7, fontSize: 32, color: SAND }))
  s.addText('w-electro.github.io/athr', {
    x: 4.9, y: 3.5, w: 7.73, h: 0.55, align: 'right',
    fontFace: LAT, fontSize: 20, color: TERRA_BRIGHT, margin: 0,
  })
  s.addText('افتحه مرة واحدة على الشبكة، ثم يعمل والجوال في وضع الطيران', ar({
    x: 4.9, y: 4.1, w: 7.73, h: 0.5, fontSize: 14, color: SAND_DIM,
  }))

  const closers = [
    ['بدون إنترنت', 'النموذج داخل الجوال'],
    ['٢٩ لغة', 'لكل زائر لغته'],
    ['يتعلّم', 'يقوى بكل تصحيح'],
  ]
  closers.forEach(([h, b], i) => {
    const x = W - M - 2.45 - i * 2.64
    card(s, { x, y: 4.85, w: 2.45, h: 1.35 })
    s.addText(h, hd({ x: x + 0.22, y: 5.05, w: 2.0, h: 0.42, fontSize: 16, color: TERRA_BRIGHT }))
    s.addText(b, ar({ x: x + 0.22, y: 5.51, w: 2.0, h: 0.5, fontSize: 12, color: SAND_DIM, lineSpacing: 16 }))
  })

  card(s, { x: M, y: 1.5, w: 3.7, h: 3.7, fill: 'FFFFFF' })
  s.addImage({ data: QR, x: M + 0.35, y: 1.85, w: 3.0, h: 3.0 })
  s.addText('امسح الرمز', ar({ x: M, y: 5.3, w: 3.7, h: 0.4, align: 'center', fontSize: 14, color: SAND_DIM }))
  s.addNotes('اختم بأن تعطي أحد المحكّمين جوالك، أو اتركهم يمسحون الرمز فيفتحوه على أجهزتهم.')
}

pres.writeFile({ fileName: process.argv[2] || path.join(REPO, 'athr-pitch-ar.pptx') }).then(() => console.log('deck written'))
