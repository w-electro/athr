/**
 * تسليم هاكاثون AJA AI — القالب الموحد مبنيا بوربوينت ومملوءا.
 *
 * القالب الأصلي ملف Keynote، ولا تكتب الـkey برمجيا: صيغة مغلقة نصها
 * بروتوبف مضغوط، وأنماط حروفها مربوطة بمواضع الأحرف. فأعيد بناء مظهره
 * من أصوله نفسها (art/aja-backgrounds.py)، بترتيب شرائحه وأقسامه.
 *
 * وكل قسم يجيب عن أجزاء معيار تحكيمه واحدا واحدا، لا بكلام عام.
 *
 * ── قيود تعلمناها بالثمن ──────────────────────────────────────────────
 * لا تعداد أصليا ولا محرف نقطة: الأول يكتب إزاحة معلقة لا يعكسها
 * باوربوينت في الفقرة اليمينية فتقع العلامة وسط النص، والثاني يقرأ
 * نقطة نهاية. ولا أقواس زاوية: تنعكس اختلافا بين عارض وآخر. ولا أرقام
 * عربية-هندية: تقرأ حروفا في خط تجوال. ولا تشكيل: يقرأ ركاما في العرض.
 * وكل فقرة rtlMode مع marL صفر وindent صفر.
 *
 *   python tools/deck/art/aja-backgrounds.py
 *   node   tools/deck/aja.cjs
 */
const pptxgen = require('pptxgenjs')
const fs = require('node:fs')
const path = require('node:path')

const HERE = __dirname
const REPO = path.resolve(HERE, '..', '..')
const A = path.join(HERE, 'assets')

const media = (...p) => {
  const f = path.join(A, ...p)
  const mime = f.endsWith('.png') ? 'image/png' : 'image/jpeg'
  return mime + ';base64,' + fs.readFileSync(f).toString('base64')
}

/** صور المواقع من مجلد التطبيق نفسه */
const sitePhoto = (f) =>
  'image/jpeg;base64,' + fs.readFileSync(path.join(REPO, 'public', 'photos', f)).toString('base64')

const BG_DARK = media('aja', 'bg-dark.jpg')
const BG_LIGHT = media('aja', 'bg-light.jpg')
const LOGO_AJA = media('aja', 'logo-aja.png')
const LOGO_YEAR = media('aja', 'logo-year.png')

const W = 13.333
const H = 7.5
const M = 0.85

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — تسليم هاكاثون AJA AI'

/* ألوان مقيسة من القالب، لا مخمنة */
const SLATE = '255174'
const INK = '2B3A4C'
const BODYC = '4B5B6E'
const GHOST = 'DCE5F0'
const VIOLET = '8357F6'
const TINT = 'EEF3F9'
const LINE = 'D9E2EC'
const WHITE = 'FFFFFF'

const BODY = 'Tajawal'
const LAT = 'Calibri'

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })

/** أسطر متعددة بلا تعداد: كل سطر فقرة يمينية مسطحة */
const lines = (arr, gap = 10) => arr.map((t, i) => ({
  text: t,
  options: { rtlMode: true, breakLine: i < arr.length - 1, paraSpaceAfter: gap },
}))

function darkPage() {
  const s = pres.addSlide()
  s.background = { color: '061223' }
  s.addImage({ data: BG_DARK, x: 0, y: 0, w: W, h: H })
  s.addImage({ data: LOGO_YEAR, x: 0.5, y: 0.42, w: 1.5, h: 0.56 })
  s.addImage({ data: LOGO_AJA, x: W - 1.75, y: 0.35, w: 1.25, h: 1.23 })
  return s
}

function lightPage(title) {
  const s = pres.addSlide()
  s.background = { color: 'F9FAFC' }
  s.addImage({ data: BG_LIGHT, x: 0, y: 0, w: W, h: H })
  if (title) {
    s.addText(title, ar({
      x: M, y: 0.6, w: W - M * 2, h: 0.55, fontSize: 26, bold: true, color: SLATE,
    }))
  }
  return s
}

/** بطاقة بأرضية خفيفة — الفاصل الوحيد بين الكتل */
function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: fill || TINT }, line: { color: LINE, width: 0.75 },
  })
}

/** رقم كبير فوق وصفه */
function stat(s, x, y, w, num, label, color) {
  card(s, x, y, w, 1.34)
  s.addText(num, {
    x, y: y + 0.16, w, h: 0.6, align: 'center',
    fontFace: LAT, fontSize: 28, bold: true, color: color || SLATE, margin: 0,
  })
  s.addText(label, ar({
    x: x + 0.12, y: y + 0.8, w: w - 0.24, h: 0.44, align: 'center',
    fontSize: 11, color: BODYC, lineSpacing: 15,
  }))
}

/* ══ ١ · الغلاف ═════════════════════════════════════════════════ */
{
  const s = darkPage()
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
  s.addText('فريق أثر', ar({
    x: W / 2 - 0.5, y: 4.06, w: 2.92, h: 0.5, fontSize: 21, color: WHITE,
  }))
}

/* ══ ٢ · نبذة عنا ═══════════════════════════════════════════════ */
{
  const s = lightPage('نبذة عنا')

  const ph = 3.4
  const pw = ph * (412 / 860)
  s.addImage({ data: media('screens', '04-scan.jpg'), x: M, y: 1.5, w: pw, h: ph })
  s.addImage({ data: media('screens', '03-site.jpg'), x: M + pw + 0.3, y: 1.5, w: pw, h: ph })

  const tx = M + pw * 2 + 0.9
  s.addText(lines([
    'أثر دليل تراثي ذكي لمنطقة حائل، يعمل دون اتصال بالإنترنت',
    'يشمل مسارا كاملا لرحلة السائح، إضافة إلى ماسح ذكي يعمل بنموذج الذكاء الاصطناعي DINOv3',
    'يوجه السائح كاميرا جواله إلى النقش الصخري، فيتعرف عليه الماسح بعينه، ويروي له قصته بصوت مسموع وبلغته',
  ], 16), ar({
    x: tx, y: 1.6, w: W - M - tx, h: 2.5, fontSize: 15, color: BODYC, lineSpacing: 27,
  }))

  const sw = (W - M - tx - 0.24 * 2) / 3
  stat(s, W - M - sw, 4.32, sw, '29', 'لغة، ولكل لغة\nرواية مسموعة')
  stat(s, W - M - sw * 2 - 0.24, 4.32, sw, '10', 'نقوش موثقة\nفي جبة')
  stat(s, W - M - sw * 3 - 0.48, 4.32, sw, '0', 'خوادم، وصفر تكلفة\nلكل سائح', VIOLET)

  /* الفريق — بعرض الشريحة كله، فيوازن الفراغ تحت اللقطتين */
  const team = [
    ['وليد الشمري', 'قائد الفريق'],
    ['فالح الغسلان', 'مؤرخ'],
  ]
  const tgap = 0.26
  const tw2 = (W - M * 2 - tgap) / 2
  team.forEach(([name, role], i) => {
    const x = W - M - tw2 - i * (tw2 + tgap)
    card(s, x, 5.92, tw2, 0.92)
    s.addText(name, ar({
      x: x + 0.3, y: 6.06, w: tw2 - 0.6, h: 0.36, fontSize: 16, bold: true, color: SLATE,
    }))
    s.addText(role, ar({
      x: x + 0.3, y: 6.44, w: tw2 - 0.6, h: 0.3, fontSize: 12.5, color: BODYC,
    }))
  })
}

function divider(num, title) {
  const d = lightPage()
  d.addText(num, {
    x: 0.7, y: 2.1, w: 5.2, h: 3.3, align: 'left',
    fontFace: LAT, fontSize: 170, bold: true, color: GHOST, margin: 0,
  })
  d.addText(title, ar({
    x: 5.6, y: 3.05, w: W - 5.6 - M, h: 1.4, fontSize: 36, bold: true, color: SLATE,
  }))
  return d
}

/** بطاقات معنونة في صف — كل بطاقة جزء من المعيار */
function criteriaRow(s, y, h, items, fs) {
  const n = items.length
  const gap = 0.26
  const w = (W - M * 2 - gap * (n - 1)) / n
  items.forEach(([label, body], i) => {
    const x = W - M - w - i * (w + gap)
    card(s, x, y, w, h)
    s.addText(label, ar({
      x: x + 0.26, y: y + 0.2, w: w - 0.52, h: 0.34, fontSize: 14, bold: true, color: VIOLET,
    }))
    s.addText(Array.isArray(body) ? lines(body, 12) : body, ar({
      x: x + 0.26, y: y + 0.62, w: w - 0.52, h: h - 0.82,
      fontSize: fs || 12.5, color: BODYC, lineSpacing: 20, valign: 'top',
    }))
  })
}

/* ── ٠١ الابتكار والأصالة ── */
divider('01', 'الابتكار والأصالة')
{
  const s = lightPage('الابتكار والأصالة')
  criteriaRow(s, 1.35, 1.95, [
    ['تميز الفكرة',
      'دليل يقرأ النقش نفسه، لا لافتة عامة عند المدخل، فيسمي النقش الذي أمامك من بين مئات النقوش على الصخرة الواحدة'],
    ['مستوى الابتكار',
      'نموذج الرؤية يعمل كاملا داخل المتصفح بحجم 22 ميغابايت، ويتعلم من تصحيح السائح على جهازه فيصيب في المسح التالي'],
    ['الاختلاف عن البدائل',
      'لكل بديل حد يقف عنده، فاللافتة عامة، والمرشد يحتاج إلى موعد، والتطبيق السحابي يتوقف حيث لا شبكة'],
  ])

  const ty = 3.62
  const colR = 5.0
  const colL = 6.6
  s.addText('البدائل الحالية', ar({
    x: W - M - colR, y: ty, w: colR - 0.3, h: 0.32, fontSize: 13, bold: true, color: BODYC,
  }))
  s.addText('أثر', ar({
    x: M, y: ty, w: colL - 0.3, h: 0.32, fontSize: 13, bold: true, color: SLATE,
  }))
  const rows = [
    ['لافتة واحدة عند مدخل الموقع', 'يسمي النقش الذي أمامك بعينه'],
    ['مرشد بحجز مسبق وبلغات محدودة', 'تسع وعشرون لغة، ولكل لغة صوت'],
    ['تطبيق سحابي يتوقف بلا تغطية', 'يعمل كاملا بلا إنترنت'],
    ['بحث بالصور يعطي نتيجة عامة', 'مبني على 201 صورة من جبة نفسها'],
    ['تصور الصخرة في ChatGPT فيقول: نقوش صخرية، وبإنترنت فقط', 'تصورها بماسح أثر فيقول: هذا نقش الأسد ومروضه، ويروي قصته بلا شبكة'],
  ]
  rows.forEach(([alt, ours], i) => {
    const y = ty + 0.44 + i * 0.56
    const star = i === rows.length - 1
    card(s, W - M - colR, y, colR, 0.46, 'F4F6F9')
    s.addText(alt, ar({
      x: W - M - colR + 0.24, y: y + 0.09, w: colR - 0.48, h: 0.28, fontSize: 12, color: BODYC,
    }))
    card(s, M, y, colL, 0.46, star ? 'E9E2FB' : undefined)
    s.addText(ours, ar({
      x: M + 0.24, y: y + 0.09, w: colL - 0.48, h: 0.28, fontSize: 12, bold: true,
      color: star ? '4B2E9E' : INK,
    }))
  })
}

/* ── ٠٢ توظيف الذكاء الاصطناعي ── */
divider('02', 'توظيف الذكاء الاصطناعي')
{
  const s = lightPage('توظيف الذكاء الاصطناعي')

  const dw = 2.55
  const dx = W - M - dw
  const tw = 1.35
  const th = tw * 0.75
  const tcx = dx + (dw - tw) / 2
  card(s, dx, 1.35, dw, 4.7, 'F4F6F9')

  s.addImage({ data: media('thumb-camera.jpg'), x: tcx, y: 1.62, w: tw, h: th })
  s.addText('السائح يصور النقش', ar({
    x: dx, y: 2.68, w: dw, h: 0.26, align: 'center', fontSize: 10, color: BODYC,
  }))
  s.addText('▼', { x: dx, y: 2.98, w: dw, h: 0.24, align: 'center', fontFace: LAT, fontSize: 12, color: VIOLET, margin: 0 })
  card(s, tcx, 3.26, tw, 0.58, WHITE)
  s.addText('0.417   0.902', {
    x: tcx, y: 3.33, w: tw, h: 0.24, align: 'center',
    fontFace: 'Courier New', fontSize: 9.5, color: SLATE, margin: 0,
  })
  s.addText('0.773   0.264', {
    x: tcx, y: 3.55, w: tw, h: 0.24, align: 'center',
    fontFace: 'Courier New', fontSize: 9.5, color: SLATE, margin: 0,
  })
  s.addText('النموذج يلخص شكله في أرقام', ar({
    x: dx, y: 3.88, w: dw, h: 0.26, align: 'center', fontSize: 10, color: BODYC,
  }))
  s.addText('▼', { x: dx, y: 4.18, w: dw, h: 0.24, align: 'center', fontFace: LAT, fontSize: 12, color: VIOLET, margin: 0 })
  s.addShape(pres.ShapeType.roundRect, {
    x: tcx - 0.06, y: 4.48, w: tw + 0.12, h: th + 0.12, rectRadius: 0.05,
    fill: { color: VIOLET }, line: { width: 0 },
  })
  s.addImage({ data: media('thumb-index.jpg'), x: tcx, y: 4.54, w: tw, h: th })
  s.addText('يطابقها بنقوش جبة فيعرف اسمه', ar({
    x: dx, y: 5.72, w: dw, h: 0.26, align: 'center', fontSize: 10, color: BODYC,
  }))

  const cw = W - M * 2 - dw - 0.35
  const blocks = [
    ['جوهرية الذكاء الاصطناعي في الحل', 1.34,
      'التعرف على النقش هو المنتج نفسه لا ميزة مضافة إليه، فلا منتج دون النموذج، ونموذج الرؤية DINOv3 من Meta مفتوح المصدر، تعلم أشكال الأشياء من ملايين الصور دون وسم بشري'],
    ['ملاءمة استخدامه للمشكلة', 1.72,
      'المشكلة بصرية لا نصية، فأمام السائح صخرة لا نص، والموقع بلا تغطية، فاخترنا نموذجا يعمل داخل الجهاز لا على السحابة، وبنينا فوقه طبقة القرار: فهرس بصمات من الميدان، وسلم قص يعالج اختلاف الإطار، وحكم يقول لا أعرف بدل أن يخمن'],
    ['القيمة الحقيقية المضافة', 1.24,
      'يتعلم من تصحيح السائح على جهازه فيتحسن كلما استعمل، ونوظف الذكاء الاصطناعي مرة ثانية في توليد الرواية المسموعة بتسع وعشرين لغة بنماذج نطق مفتوحة المصدر'],
  ]
  let by = 1.35
  blocks.forEach(([label, h, text]) => {
    card(s, M, by, cw, h)
    s.addText(label, ar({
      x: M + 0.26, y: by + 0.16, w: cw - 0.52, h: 0.32, fontSize: 13.5, bold: true, color: VIOLET,
    }))
    s.addText(text, ar({
      x: M + 0.26, y: by + 0.54, w: cw - 0.52, h: h - 0.7,
      fontSize: 12.5, color: BODYC, lineSpacing: 20, valign: 'top',
    }))
    by += h + 0.2
  })
}

/* ── ٠٣ حاجة السوق والقيمة المقدمة ── */
divider('03', 'حاجة السوق والقيمة المقدمة')
{
  const s = lightPage('حاجة السوق والقيمة المقدمة')
  const gap = 0.3
  const cw = (W - M * 2 - gap) / 2
  const ch = 1.95
  const quad = [
    ['المشكلة', media('ic-whichpanel.png'), 201 / 164,
      'جبة مسجلة في قائمة التراث العالمي لليونسكو وفيها مئات النقوش، لكن السائح يقف أمام الصخرة فلا يعرف ما أمامه ولا كم عمره، ولا تغطية للشبكة في الموقع'],
    ['الفئة المستهدفة', media('ic-languages.png'), 188 / 174,
      'سياح جبة والشويمس من داخل المملكة وخارجها، والرحلات المدرسية والجامعية، وهيئة التراث ومركز الزوار، والمنشآت المحلية التي تريد الوصول إلى السائح'],
    ['الحاجة الفعلية', media('ic-nonet.png'), 160 / 187,
      'سياح من كل مكان وبكل لغة، وموقع في الصحراء المفتوحة، فكل حل يعتمد على السحابة يتوقف هناك، وكل حل بلغة واحدة لا يخدم أكثر السياح'],
    ['القيمة المقدمة', media('glyph-ibex.png'), 760 / 482,
      'للسائح أن يفهم ما أمامه بلغته وبصوت مسموع، وللجهة المشغلة تجربة سائح أفضل دون أي تكلفة تشغيل ولا بنية تحتية تحتاج إلى إدارة'],
  ]
  quad.forEach(([label, icon, ratio, text], i) => {
    const col = i % 2
    const row = (i - col) / 2
    const x = W - M - cw - col * (cw + gap)
    const y = 1.35 + row * (ch + 0.28)
    card(s, x, y, cw, ch)
    const ih = 0.5
    s.addImage({ data: icon, x: x + 0.28, y: y + 0.24, w: ih * ratio, h: ih })
    s.addText(label, ar({
      x: x + 0.3, y: y + 0.26, w: cw - 0.6 - ih * ratio - 0.2, h: 0.36,
      fontSize: 15, bold: true, color: SLATE,
    }))
    s.addText(text, ar({
      x: x + 0.3, y: y + 0.86, w: cw - 0.6, h: ch - 1.04,
      fontSize: 12.5, color: BODYC, lineSpacing: 20, valign: 'top',
    }))
  })
}

/* ── ٠٤ جودة الحل والنموذج الأولي ── */
divider('04', 'جودة الحل والنموذج الأولي MVP')
{
  const s = lightPage('جودة الحل والنموذج الأولي MVP')
  s.addText('تطبيق يعمل الآن على الويب، يفتح من الرابط بلا تنزيل:   w-electro.github.io/athr', ar({
    x: M, y: 1.22, w: W - M * 2, h: 0.34, fontSize: 13, color: BODYC,
  }))

  const shots = ['01-welcome.jpg', '02-explore.jpg', '03-site.jpg', '04-scan.jpg', '05-trip.jpg']
  const caps = ['اختيار اللغة', 'الاستكشاف', 'القصة والصوت', 'المسح', 'بناء الرحلة']
  const ih = 2.55
  const iw = ih * (412 / 860)
  const gap = (W - M * 2 - iw * 5) / 4
  shots.forEach((f, i) => {
    const x = W - M - iw - i * (iw + gap)
    s.addImage({ data: media('screens', f), x, y: 1.68, w: iw, h: ih })
    s.addText(caps[i], ar({
      x: x - 0.12, y: 1.68 + ih + 0.08, w: iw + 0.24, h: 0.28,
      align: 'center', fontSize: 10.5, color: BODYC,
    }))
  })

  const sw = (W - M * 2 - 0.26 * 3) / 4
  const sy = 4.92
  stat(s, W - M - sw, sy, sw, '96.5%', 'تعرف صحيح على\nصور الموقع')
  stat(s, W - M - sw * 2 - 0.26, sy, sw, '0', 'إجابة خاطئة على 175\nصورة من خارج الفهرس', VIOLET)
  stat(s, W - M - sw * 3 - 0.52, sy, sw, '663', 'اختبارا آليا تعمل\nمع كل تعديل')
  stat(s, W - M - sw * 4 - 0.78, sy, sw, '174', 'مقطعا صوتيا\nفي 29 لغة')

  s.addText('قراءة النقوش الثمودية قيد التطوير، ولن نخترع ترجمة لا نملك أصلها الموثق، فنعرض الآن جدول الحروف الرسمي ليقارن السائح بنفسه', ar({
    x: M, y: 6.44, w: W - M * 2, h: 0.36, align: 'center', fontSize: 12, italic: true, color: BODYC,
  }))
}

/* ── ٠٥ نموذج العمل والجدوى ── */
divider('05', 'نموذج العمل والجدوى')
{
  const s = lightPage('نموذج العمل والجدوى')
  criteriaRow(s, 1.35, 2.95, [
    ['العملاء', [
      'الجهة المشغلة: هيئة التراث ومركز الزوار',
      'والمنشآت المحلية: مطاعم ومقاهي وفنادق حائل، والمحميات السياحية',
      'وشركات السياحة وفنادق حائل',
      'والسائح نفسه، والتطبيق مجاني له دائما',
    ]],
    ['مصادر الإيرادات', [
      'رسوم إدراج محددة للمطاعم والمقاهي والفنادق والمحميات السياحية في مسار رحلتي',
      'وترخيص سنوي للجهة المشغلة عن كل موقع، ورسوم إعداد لكل موقع جديد، ونسخة بيضاء لمتاحف أخرى',
    ]],
    ['الاستدامة', [
      'لا يكلفنا السائح الإضافي شيئا، فلا خوادم ولا واجهات برمجية مدفوعة',
      'والتكلفة كلها إعداد لمرة واحدة عن كل موقع: تصوير وفهرسة ومحتوى وترجمة',
    ]],
  ])

  card(s, M, 4.5, W - M * 2, 0.92, 'E9E2FB')
  s.addText('سائح واحد ومليون سائح كلهم سواء في الكلفة، لأن التعرف والصوت والمحتوى كلها داخل جهاز السائح لا على خادم نملكه', ar({
    x: M + 0.34, y: 4.74, w: W - M * 2 - 0.68, h: 0.46, align: 'center',
    fontSize: 14.5, bold: true, color: '4B2E9E',
  }))

  /* الصفر يمينا، ثم مصادر الدخل الثلاثة */
  const sw = 2.0
  stat(s, W - M - sw, 5.62, sw, '0$', 'تكلفة تشغيل\nشهرية', VIOLET)
  const streams = [
    ['خصم مقابل المسح', 'يمسح السائح النقش فيحصل على رمز خصم، ويدفع المقهى أو المحمية رسما ثابتا عند استخدام الرمز فقط'],
    ['عمولة الحجوزات', 'يحجز السائح من مسار رحلتي جولة مرشدة أو تخييما في محمية أو رحلة برية، ونأخذ نسبة من كل حجز'],
    ['ترخيص لشركات السياحة', 'تشترك شركات السياحة وفنادق حائل شهريا، فتحصل مجموعاتها على رواية بلغاتها دون مرشد لكل لغة'],
  ]
  const g = 0.26
  const iw = (W - M * 2 - sw - g * 3) / 3
  streams.forEach(([t, d], k) => {
    const x = W - M - sw - g - iw - k * (iw + g)
    card(s, x, 5.62, iw, 1.34, 'E9E2FB')
    s.addText(t, ar({
      x: x + 0.24, y: 5.74, w: iw - 0.48, h: 0.32, fontSize: 13.5, bold: true, color: '4B2E9E',
    }))
    s.addText(d, ar({
      x: x + 0.24, y: 6.08, w: iw - 0.48, h: 0.8, fontSize: 11.5, color: BODYC, lineSpacing: 17, valign: 'top',
    }))
  })
}

/* ── ٠٦ قابلية النمو ── */
divider('06', 'قابلية النمو')
{
  const s = lightPage('قابلية النمو')

  const steps = [
    ['تصوير', 'زيارة ميدانية واحدة للموقع الجديد'],
    ['فهرسة', 'تحويل الصور إلى بصمات — دقائق'],
    ['محتوى', 'كتابة القصص وترجمتها'],
    ['صوت', 'توليد الرواية بتسع وعشرين لغة'],
  ]
  const gap = 0.26
  const cw4 = (W - M * 2 - gap * 3) / 4
  steps.forEach(([t, d], i) => {
    const x = W - M - cw4 - i * (cw4 + gap)
    card(s, x, 1.35, cw4, 1.42)
    s.addText(String(i + 1), {
      x: x + 0.22, y: 1.48, w: 0.4, h: 0.34, align: 'left',
      fontFace: LAT, fontSize: 13, bold: true, color: 'AFC0D4', margin: 0,
    })
    s.addText(t, ar({
      x: x + 0.26, y: 1.5, w: cw4 - 0.9, h: 0.34, fontSize: 15, bold: true, color: SLATE,
    }))
    s.addText(d, ar({
      x: x + 0.26, y: 1.94, w: cw4 - 0.52, h: 0.66, fontSize: 11.5, color: BODYC, lineSpacing: 17,
    }))
  })

  const half = (W - M * 2 - 0.3) / 2
  card(s, W - M - half, 3.02, half, 2.46)
  s.addText('لا إعادة تدريب ولا بنية تحتية', ar({
    x: W - M - half + 0.3, y: 3.24, w: half - 0.6, h: 0.36, fontSize: 15, bold: true, color: SLATE,
  }))
  s.addText(lines([
    'لم ندرب النموذج على جبة، فهو يتعلم أي موقع بالطريقة نفسها',
    'وإضافة موقع جديد لا تغير البرمجة، بل تحتاج إلى صوره فقط',
    'والفهرس يتوسع بلا حد، فكل تصحيح من سائح يزيد دقته لمن بعده',
  ], 13), ar({
    x: W - M - half + 0.3, y: 3.7, w: half - 0.6, h: 1.6,
    fontSize: 12.5, color: BODYC, lineSpacing: 20, valign: 'top',
  }))

  card(s, M, 3.02, half, 2.46)
  s.addText('إلى أين يتوسع', ar({
    x: M + 0.3, y: 3.24, w: half - 0.6, h: 0.36, fontSize: 15, bold: true, color: SLATE,
  }))
  s.addText(lines([
    'بقية مواقع حائل: الشويمس، وجبال أجا، والقشلة، وقلعة أعيرف',
    'ثم الجنوب حيث النقوش بالآلاف: أبها، وعسير، ونجران، وجازان',
    'وكل مدينة غنية بالنقوش: العلا، وتيماء، وتبوك، والجوف',
    'ثم نسخة بيضاء لأي متحف أو موقع تراثي',
  ], 9), ar({
    x: M + 0.3, y: 3.7, w: half - 0.6, h: 1.6,
    fontSize: 12.5, color: BODYC, lineSpacing: 20, valign: 'top',
  }))

  /* المواقع التالية بالصورة: الحجة ترى قبل أن تقرأ */
  const sites = [
    ['shuwaymis-01.jpg', 'الشويمس'],
    ['aja-01.jpg', 'جبال أجا'],
    ['qishlah-01.jpg', 'القشلة'],
    ['aarif-01.jpg', 'قلعة أعيرف'],
  ]
  const siw = 1.9
  const sih = siw / 1.5
  const sgap = 0.24
  sites.forEach(([f, name], i) => {
    const x = W - M - siw - i * (siw + sgap)
    s.addImage({ data: sitePhoto(f), x, y: 5.66, w: siw, h: sih })
    s.addText(name, ar({
      x: x - 0.1, y: 5.66 + sih + 0.08, w: siw + 0.2, h: 0.28,
      align: 'center', fontSize: 11, color: BODYC,
    }))
  })
}

/* ══ ١٥ · الختام ════════════════════════════════════════════════ */
{
  const s = darkPage()
  s.addText('شكرا لكم', ar({
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
