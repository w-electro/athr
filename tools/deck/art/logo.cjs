/**
 * كلمة أثر بالخط الكوفي (Reem Kufi) كما في شاشة الترحيب.
 *
 * يرسم ملفًّا واحدًا بالصورة لا بالنصّ، لأنّ Reem Kufi قد يغيب عن جهاز
 * من يفتح العرض، فيسقط الشعار إلى خطٍّ آخر.
 *
 *   node tools/deck/art/logo.cjs   # ← tools/deck/assets/athr-logo.png
 *
 * يحتاج خطّ Reem Kufi مثبّتًا على الجهاز الذي يبني الصورة فقط.
 */
const sharp = require('sharp')
const path = require('node:path')

const OUT = path.join(__dirname, '..', 'assets', 'athr-logo.png')

// الكلمة وحدها بالخط الكوفي، على أرضية شفافة وبلون التطبيق الأساسي
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700">
  <text x="450" y="520" text-anchor="middle" font-family="Reem Kufi" font-weight="700"
        font-size="420" fill="#C97A4A">أثر</text>
</svg>`

sharp(Buffer.from(svg)).trim().png().toFile(OUT).then(() => console.log('logo written:', OUT))
