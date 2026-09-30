/**
 * شعار أثر كما يظهر في شاشة الترحيب: الوعل المنقور فوق الكلمة بالخط الكوفي.
 *
 * يرسم ملفًّا واحدًا بالصورة لا بالنصّ، لأنّ Reem Kufi قد يغيب عن جهاز
 * من يفتح العرض، فيسقط الشعار إلى خطٍّ آخر. ومسارات الوعل منسوخة من
 * src/components/Petroglyph.jsx نفسه، فلا يختلف شعار العرض عن التطبيق.
 *
 *   node tools/deck/art/logo.cjs   # ← tools/deck/assets/athr-logo.png
 *
 * يحتاج خطّ Reem Kufi مثبّتًا على الجهاز الذي يبني الصورة فقط.
 */
const sharp = require('sharp')
const path = require('node:path')

const OUT = path.join(__dirname, '..', 'assets', 'athr-logo.png')

const IBEX = [
  'M18 44 Q20 32 34 30 L62 30 Q74 31 76 44',
  'M76 38 L86 26',
  'M86 26 L92 20',
  'M86 24 Q78 10 66 12',
  'M89 23 Q82 8 70 9',
  'M22 44 L22 60',
  'M34 44 L34 60',
  'M58 44 L58 60',
  'M70 44 L70 60',
  'M18 42 L10 50',
]

const S = 800
// الوعل في مربّع viewBox 100×70 — يوضع فوق الكلمة ويُكبَّر ×4.6
const k = 4.6
const gx = (S - 100 * k) / 2 + 10
const gy = 90

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <rect width="${S}" height="${S}" rx="120" fill="#0B0F17"/>
  <g transform="translate(${gx} ${gy}) scale(${k})" fill="none" stroke="#DD8C58"
     stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    ${IBEX.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <text x="${S / 2}" y="655" text-anchor="middle" font-family="Reem Kufi" font-weight="700"
        font-size="250" fill="#E8DCC8">أثر</text>
</svg>`

sharp(Buffer.from(svg)).png().toFile(OUT).then(() => console.log('logo written:', OUT))
