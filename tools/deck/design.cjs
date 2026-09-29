/**
 * التصميم الأولي — ورقتا A4.
 *
 * «تصميم أولي» في تسليم الهاكاثونات يعني تصميم الواجهة: الشاشات ونظام
 * الألوان والخطوط ومسار المستخدم. وهو غير «نموذج أولي» الذي يعني بناءً
 * يعمل.
 *
 * وهذه الشاشات ليست رسومًا تُحاكي التطبيق — هي لقطاتٌ من التطبيق نفسه
 * وهو يعمل، التُقطت آليًّا من البناء المشحون.
 *
 *   node tools/deck/design.cjs          # pptx مؤقّت
 *   python tools/deck/build-design.py   # ثمّ athr-design-ar.pdf
 */
const pptxgen = require('pptxgenjs')
const fs = require('node:fs')
const path = require('node:path')

const HERE = __dirname
const REPO = path.resolve(HERE, '..', '..')
const A = path.join(HERE, 'assets')

const jpg = (f) => 'image/jpeg;base64,' + fs.readFileSync(path.join(A, 'screens', f)).toString('base64')

const W = 8.27
const H = 11.69
const M = 0.62
const CW = W - M * 2

const pres = new pptxgen()
pres.defineLayout({ name: 'A4_PORTRAIT', width: W, height: H })
pres.layout = 'A4_PORTRAIT'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — التصميم الأولي'

const INK = '16202E'
const MUTED = '5D6678'
const FAINT = '8E97A6'
const TERRA = 'B4663A'
const TINT = 'F4EFE8'
const RULE = 'DFDAD2'

const DISP = 'Reem Kufi'
const BODY = 'Tajawal'
const LAT = 'Calibri'

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })

function page() {
  const s = pres.addSlide()
  s.background = { color: 'FFFFFF' }
  return s
}

function section(s, y, text) {
  s.addText(text, ar({ x: M, y, w: CW, h: 0.34, fontSize: 15, bold: true, color: TERRA }))
  s.addShape(pres.ShapeType.rect, {
    x: M, y: y + 0.42, w: CW, h: 0.014, fill: { color: RULE }, line: { width: 0 },
  })
}

/* ══ الورقة الأولى — الشاشات ════════════════════════════════════ */
{
  const s = page()

  s.addText('أثر', ar({
    fontFace: DISP, x: M, y: 0.45, w: CW, h: 0.72, fontSize: 30, bold: true, color: TERRA,
  }))
  s.addText('التصميم الأولي', ar({
    x: M, y: 1.14, w: CW, h: 0.4, fontSize: 18, bold: true, color: INK,
  }))
  s.addText(
    'دليل تراثي لمنطقة حائل يعمل بدون إنترنت. الشاشات أدناه لقطات من التطبيق وهو يعمل،\n'
    + 'لا رسوم تحاكيه.',
    ar({ x: M, y: 1.56, w: CW, h: 0.52, fontSize: 11.5, color: MUTED, lineSpacing: 18 }),
  )

  section(s, 2.2, 'الشاشات')

  const shots = [
    ['01-welcome.jpg', 'اختيار اللغة', 'تسع وعشرون لغة، ولكلٍّ تحيّتها'],
    ['02-explore.jpg', 'الاستكشاف', 'المواقع مع تصفية بالاهتمام'],
    ['03-site.jpg', 'تفاصيل الموقع', 'القصة ودليل صوتي متزامن'],
    ['04-scan.jpg', 'المسح', 'الكاميرا تتعرّف على اللوحة'],
    ['05-trip.jpg', 'رحلتي', 'مسار يُبنى على الطقس والوقت'],
    ['06-explore-en.jpg', 'الاتجاه يتبع اللغة', 'الواجهة نفسها يسار-يمين'],
  ]
  const iw = 1.60
  const ih = iw * (860 / 412)
  const gap = (CW - iw * 3) / 2

  shots.forEach(([file, title, note], i) => {
    const col = i % 3
    const row = (i - col) / 3
    const x = W - M - iw - col * (iw + gap)
    const y = 2.72 + row * (ih + 0.92)

    s.addShape(pres.ShapeType.rect, {
      x: x - 0.02, y: y - 0.02, w: iw + 0.04, h: ih + 0.04,
      fill: { color: RULE }, line: { width: 0 },
    })
    s.addImage({ data: jpg(file), x, y, w: iw, h: ih })
    s.addText(title, ar({
      x, y: y + ih + 0.08, w: iw, h: 0.26, fontSize: 11, bold: true, color: INK,
    }))
    s.addText(note, ar({
      x, y: y + ih + 0.33, w: iw, h: 0.4, fontSize: 9, color: MUTED, lineSpacing: 13,
    }))
  })

  s.addText('١ / ٢', ar({
    x: M, y: 11.25, w: CW, h: 0.26, align: 'center', fontSize: 10, color: FAINT,
  }))
}

/* ══ الورقة الثانية — النظام والمسار ════════════════════════════ */
{
  const s = page()

  section(s, 0.6, 'مسار المستخدم')
  const flow = ['اختيار اللغة', 'الاستكشاف', 'تفاصيل الموقع', 'المسح', 'رحلتي']
  const fw = (CW - 4 * 0.12) / 5
  flow.forEach((label, i) => {
    const x = W - M - fw - i * (fw + 0.12)
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 1.2, w: fw, h: 0.62, rectRadius: 0.07,
      fill: { color: i === 0 ? TERRA : TINT }, line: { width: 0 },
    })
    s.addText(label, ar({
      x: x + 0.06, y: 1.37, w: fw - 0.12, h: 0.3, align: 'center',
      fontSize: 10, bold: true, color: i === 0 ? 'FFFFFF' : INK,
    }))
  })
  s.addText('اللغة تُختار مرة واحدة وتُحفظ، فلا تعود الشاشة. وكل ما بعدها متاح من الشريط السفلي.', ar({
    x: M, y: 1.95, w: CW, h: 0.3, fontSize: 10.5, color: MUTED,
  }))

  /* ── الألوان ── */
  section(s, 2.45, 'الألوان')
  const palette = [
    ['0B0F17', 'بازلت', 'الأرضية'],
    ['1A2233', 'ليل', 'الأسطح'],
    ['C97A4A', 'تراكوتا', 'الإجراء الأساسي'],
    ['EFAE6E', 'ذهبي', 'التمييز واليونسكو'],
    ['E8DCC8', 'رملي', 'النص على الداكن'],
  ]
  const pw = (CW - 4 * 0.12) / 5
  palette.forEach(([hex, name, role], i) => {
    const x = W - M - pw - i * (pw + 0.12)
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 3.06, w: pw, h: 0.72, rectRadius: 0.06,
      fill: { color: hex }, line: { color: RULE, width: 0.5 },
    })
    s.addText(name, ar({ x, y: 3.86, w: pw, h: 0.24, align: 'center', fontSize: 10, bold: true, color: INK }))
    s.addText(role, ar({ x, y: 4.09, w: pw, h: 0.22, align: 'center', fontSize: 8.5, color: MUTED }))
    s.addText('#' + hex, {
      x, y: 4.3, w: pw, h: 0.22, align: 'center',
      fontFace: LAT, fontSize: 8, color: FAINT, margin: 0,
    })
  })

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.72, w: CW, h: 0.82, rectRadius: 0.06, fill: { color: TINT }, line: { width: 0 },
  })
  s.addText(
    'لماذا الداكن: نقوش جبة لا تُقرأ إلا في الضوء المائل عند الفجر والغروب، والتطبيق يُستعمل\n'
    + 'في العراء تحت وهج الشمس — فالواجهة الداكنة تريح العين ولا تنعكس على الشاشة.',
    ar({ x: M + 0.24, y: 4.86, w: CW - 0.48, h: 0.6, fontSize: 10.5, color: INK, lineSpacing: 17 }),
  )

  /* ── الخطوط ── */
  section(s, 5.8, 'الخطوط')
  const fonts = [
    ['ريم كوفي', 'Reem Kufi', 'الشعار والعناوين — كوفي زاوي، صدى لنقش الصخر'],
    ['تجوال', 'Tajawal', 'النص العربي'],
    ['نوتو سانس', 'Noto Sans', 'التسع والعشرون لغة — العائلة الوحيدة التي تغطيها بلا مربعات فارغة'],
  ]
  fonts.forEach(([ab, en, role], i) => {
    const y = 6.42 + i * 0.52
    s.addText(ab, ar({ x: W - M - 1.3, y, w: 1.3, h: 0.28, fontSize: 12, bold: true, color: INK }))
    s.addText(en, {
      x: W - M - 2.5, y: y + 0.03, w: 1.15, h: 0.26, align: 'right',
      fontFace: LAT, fontSize: 10, color: TERRA, margin: 0,
    })
    s.addText(role, ar({ x: M, y: y + 0.03, w: CW - 2.6, h: 0.26, fontSize: 10, color: MUTED }))
  })

  /* ── مبادئ ── */
  section(s, 8.1, 'مبادئ التصميم')
  const ideas = [
    ['الاتجاه يتبع اللغة', 'أربع لغات من التسع والعشرين تُكتب يمينًا-يسارًا: العربية والفارسية والأردية والعبرية. والواجهة تنقلب كاملة، لا النص وحده.'],
    ['لا دائرة تحميل', 'مكان دوّارة الانتظار نقش من جبة يُرسم خطًّا خطًّا — فالانتظار نفسه جزء من الموضوع.'],
    ['الصورة قبل الكلمة', 'كل موقع بصورة حقيقية من ويكيميديا كومنز برخصة حرة، والنسب معروض في الشاشة لا مخفيًّا.'],
    ['يُقرأ بذراع ممدودة', 'أحجام النص والأزرار مبنية على الاستعمال واقفًا في الشمس بيد واحدة، لا جالسًا أمام مكتب.'],
  ]
  let y = 8.55
  ideas.forEach(([t, d]) => {
    s.addText(t, ar({ x: M, y, w: CW, h: 0.26, fontSize: 11.5, bold: true, color: TERRA }))
    s.addText(d, ar({ x: M, y: y + 0.26, w: CW, h: 0.4, fontSize: 10, color: MUTED, lineSpacing: 16 }))
    y += 0.66
  })

  // الرقم والرابط على سطرٍ واحد: لا تزاحم على آخر الورقة
  s.addText('٢ / ٢', ar({
    x: M, y: 11.3, w: 1.2, h: 0.26, align: 'left', fontSize: 10, color: FAINT,
  }))
  s.addText('w-electro.github.io/athr', {
    x: M, y: 11.3, w: CW, h: 0.26, align: 'center',
    fontFace: LAT, fontSize: 10, color: FAINT, margin: 0,
  })
}

const out = process.argv[2] || path.join(REPO, 'athr-design-ar.pptx')
pres.writeFile({ fileName: out }).then(() => console.log('design written:', out))
