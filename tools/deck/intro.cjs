/**
 * النبذة السريعة — ورقةٌ تُحفظ قبل العرض.
 *
 * كانت ملفّ txt، وهو لا يصلح للعربية: محرّرات النصّ الصِّرف تخلط ترتيب
 * الأسطر حين تجتمع فيها أرقامٌ ولاتينيّةٌ وخطوطُ تأطير — فيخرج النصّ
 * مبعثرًا مهما كان صحيحًا في الملفّ. والـPDF يحفظ الاتجاه والتشكيل معًا.
 *
 *   node tools/deck/intro.cjs                  # يكتب pptx مؤقّتًا
 *   soffice --headless --convert-to pdf …      # ثمّ athr-intro-ar.pdf
 *
 * أو دفعةً واحدة:  python tools/deck/build-intro.py
 */
const pptxgen = require('pptxgenjs')
const path = require('node:path')

const REPO = path.resolve(__dirname, '..', '..')

// A4 قائمة: ورقةٌ تُطبع أو تُقرأ على الجوّال
const W = 8.27
const H = 11.69
const M = 0.62
const CW = W - M * 2

const pres = new pptxgen()
pres.defineLayout({ name: 'A4_PORTRAIT', width: W, height: H })
pres.layout = 'A4_PORTRAIT'
pres.rtlMode = true
pres.author = 'أثر'
pres.title = 'أثر — الشرح السريع'

/* ورقةٌ فاتحة لا داكنة: تُقرأ تحت أيّ إضاءة، وتُطبع بلا إسرافٍ في الحبر */
const INK = '16202E'
const MUTED = '5D6678'
const FAINT = '8E97A6'
const TERRA = 'B4663A'
const TINT = 'F4EFE8'
const RULE = 'DFDAD2'

/* الأرقام عربية-هندية كبقية الورقة، وتُكتب داخل النصّ لا في صندوقٍ
   مستقلّ — فيسقط معها كلُّ خطرٍ في موضع الرقم داخل سطرٍ يمينيّ */
const D = ['١', '٢', '٣', '٤', '٥', '٦']

const DISP = 'Reem Kufi'
const BODY = 'Tajawal'

const ar = (o = {}) => ({ fontFace: BODY, rtlMode: true, align: 'right', margin: 0, ...o })

function page() {
  const s = pres.addSlide()
  s.background = { color: 'FFFFFF' }
  return s
}

function rule(s, y) {
  s.addShape(pres.ShapeType.rect, {
    x: M, y, w: CW, h: 0.014, fill: { color: RULE }, line: { width: 0 },
  })
}

/** عنوان قسم: نصٌّ بلون التراكوتا فوق خطٍّ رفيع */
function section(s, y, text) {
  s.addText(text, ar({ x: M, y, w: CW, h: 0.34, fontSize: 15, bold: true, color: TERRA }))
  rule(s, y + 0.42)
}

/* ══ الورقة الأولى ══════════════════════════════════════════════ */
{
  const s = page()

  s.addText('أثر', ar({
    fontFace: DISP, x: M, y: 0.52, w: CW, h: 0.8, fontSize: 34, bold: true, color: TERRA,
  }))
  s.addText('الشرح السريع', ar({
    x: M, y: 1.3, w: CW, h: 0.42, fontSize: 19, bold: true, color: INK,
  }))
  s.addText('احفظ الأول. الباقي للأسئلة.', ar({
    x: M, y: 1.76, w: CW, h: 0.32, fontSize: 12, italic: true, color: MUTED,
  }))

  /* ── جملة واحدة ── */
  section(s, 2.25, 'جملة واحدة — عشر ثوانٍ')
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 2.82, w: CW, h: 1.58, rectRadius: 0.08,
    fill: { color: TINT }, line: { width: 0 },
  })
  s.addText(
    'أثر دليل لنقوش حائل الصخرية.\n'
    + 'توجّه كاميرا جوالك على النقش، فيقول لك أي نقش هو،\n'
    + 'ويروي قصتها بصوت وبلغتك.\n'
    + 'ويعمل بدون إنترنت — لأنه في جبة لا توجد شبكة.',
    ar({ x: M + 0.32, y: 2.98, w: CW - 0.64, h: 1.3, fontSize: 14.5, color: INK, lineSpacing: 25 }),
  )

  /* ── ثلاثون ثانية ── */
  section(s, 4.62, 'ثلاثون ثانية')
  const beats = [
    ['المشكلة',
      'في جبل أم سنمان بجبة مئات النقوش، ولكل واحد منها قصته وزمنه.\n'
      + 'والسائح يقف أمام الصخرة ولا يعرف أيها هذه ولا كم عمرها.\n'
      + 'والموقع في الصحراء المفتوحة، فلا شبكة.'],
    ['الحل',
      'تفتح التطبيق وتوجّه الكاميرا. يتعرّف على النقش بعينه،\n'
      + 'ثم يروي قصتها مسموعة بلغة السائح — تسع وعشرين لغة.'],
    ['التميّز',
      'كل شيء داخل الجوال. لا خادم، ولا اشتراك، ولا إنترنت بعد أول تحميل.\n'
      + 'وتكلفته لسائح واحد هي نفسها لمليون سائح.'],
  ]
  let y = 5.18
  beats.forEach(([label, text], i) => {
    const lines = text.split('\n').length
    s.addText(D[i] + '  ' + label, ar({
      x: M, y, w: CW, h: 0.3, fontSize: 13, bold: true, color: INK,
    }))
    s.addText(text, ar({
      x: M, y: y + 0.32, w: CW, h: lines * 0.265 + 0.08,
      fontSize: 12, color: MUTED, lineSpacing: 19,
    }))
    y += 0.32 + lines * 0.265 + 0.2
  })

  /* ── الأرقام ── */
  section(s, 8.70, 'أرقام تحفظها')
  const stats = [
    ['٢٩', 'لغة، ولكل\nلغة صوت'],
    ['10', 'نقوش موثّقة\nفي جبة'],
    ['٢٠١', 'صورة مرجعية\nمن تصويرنا'],
    ['٢٢', 'ميغابايت —\nالنموذج كاملاً'],
    ['صفر', 'خوادم، وصفر\nتكلفة لكل سائح'],
  ]
  const cw = (CW - 4 * 0.14) / 5
  stats.forEach(([n, l], i) => {
    const x = W - M - cw - i * (cw + 0.14)
    s.addShape(pres.ShapeType.roundRect, {
      x, y: 9.26, w: cw, h: 1.32, rectRadius: 0.07,
      fill: { color: TINT }, line: { width: 0 },
    })
    s.addText(n, ar({
      x, y: 9.42, w: cw, h: 0.48, align: 'center', fontSize: 24, bold: true, color: TERRA,
    }))
    s.addText(l, ar({
      x: x + 0.08, y: 9.94, w: cw - 0.16, h: 0.56, align: 'center',
      fontSize: 9.5, color: MUTED, lineSpacing: 14,
    }))
  })

  s.addText('١ / ٢', ar({
    x: M, y: 11.12, w: CW, h: 0.3, align: 'center', fontSize: 10, color: FAINT,
  }))
}

/* ══ الورقة الثانية ═════════════════════════════════════════════ */
{
  const s = page()

  section(s, 0.6, 'لو سألوك')
  const qa = [
    ['أي نموذج ذكاء اصطناعي؟',
      'DINOv3 من Meta، مفتوح المصدر. نموذج رؤية تعلّم أشكال الأشياء من ملايين\n'
      + 'الصور بدون أي وسم بشري — تعلّم ذاتي الإشراف.'],
    ['وهل درّبتموه؟',
      'لم نغيّر أوزان الشبكة. بنينا فوقها طبقة التعرّف: فهرس بصمات من تصويرنا،\n'
      + 'وسلّم قصّ يعالج اختلاف الإطار، وطبقة قرار تقول «لا أعرف» بدل أن تخمّن،\n'
      + 'وجمع أدلة عدة لقطات في المسح الحي. وهذا تعلّم انتقالي بالأمثلة.'],
    ['وكيف يعمل بدون إنترنت؟',
      'النموذج يُنزَّل مرة واحدة عند أول مسح، ثم يخزّنه المتصفح.\n'
      + 'بعدها يعمل التعرّف والصوت والقصص كلها بلا اتصال.'],
    ['هل يتعلّم؟',
      'نعم، وعلى الجهاز نفسه. إذا أخطأ وصحّحه السائح، يُحفظ التصحيح ويدخل\n'
      + 'الفهرس فورًا — فيصيب في المسح التالي. ويتعلّم الرفض أيضًا:\n'
      + '«هذه ليست نقشًا» جواب يتعلّمه.'],
    ['والصوت؟',
      'مولّد بنماذج نطق مفتوحة المصدر — ليس تسجيلاً بشريًا. وتوليده بتسع\n'
      + 'وعشرين لغة عمل ذكاء اصطناعي ثانٍ في المشروع.'],
    ['ما مدى دقته؟',
      'على صور الموقع: ٩٦٫٥٪. ولا يخطئ في التسمية: صفر إجابة خاطئة على\n'
      + '١٧٥ صورة من خارج الفهرس. نفضّل أن يقول «لا أعرف» على أن يقول\n'
      + 'اسمًا خاطئًا بثقة.'],
  ]
  let y = 1.15
  qa.forEach(([q, a]) => {
    const lines = a.split('\n').length
    s.addText(q, ar({ x: M, y, w: CW, h: 0.3, fontSize: 12.5, bold: true, color: TERRA }))
    s.addText(a, ar({
      x: M, y: y + 0.30, w: CW, h: lines * 0.25 + 0.08,
      fontSize: 11.5, color: MUTED, lineSpacing: 18,
    }))
    y += 0.40 + lines * 0.25 + 0.15
  })

  /* ── العرض العملي ── */
  section(s, 8.42, 'العرض العملي — أسرع طريقة لإقناعهم')
  const steps = [
    'افتح التطبيق على جوالك وأعطه لهم.',
    'وجّه الكاميرا على صورة نقش — شاشة الحاسوب تكفي.',
    'يسمّي النقش ← افتح القصة ← شغّل الصوت ← بدّل اللغة.',
    'إن أخطأ: صحّحه أمامهم، ثم امسح مرة أخرى فيصيب.',
    'فعّل وضع الطيران وكرّر — يعمل كما هو.',
  ]
  steps.forEach((text, i) => {
    s.addText(D[i] + '  ' + text, ar({
      x: M, y: 9.0 + i * 0.35, w: CW, h: 0.28, fontSize: 12, color: INK,
    }))
  })

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 10.82, w: CW, h: 0.52, rectRadius: 0.06,
    fill: { color: TINT }, line: { width: 0 },
  })
  s.addText('تنبيه: افتح التطبيق مرة واحدة وأنت متصل قبل العرض، حتى يُنزَّل النموذج.', ar({
    x: M + 0.24, y: 10.93, w: CW - 0.48, h: 0.32, fontSize: 11.5, bold: true, color: TERRA,
  }))

  s.addText('w-electro.github.io/athr', {
    x: M, y: 11.44, w: CW, h: 0.28, align: 'center',
    fontFace: 'Calibri', fontSize: 10.5, color: FAINT, margin: 0,
  })
}

const out = process.argv[2] || path.join(REPO, 'athr-intro-ar.pptx')
pres.writeFile({ fileName: out }).then(() => console.log('intro written:', out))
