/**
 * أيقونة أثر: وعل من نقوش جبة، منحوت على قرص شمس الصحراء.
 *
 *   node tools/icon/icon.cjs   # ← public/favicon.svg + public/icons/icon-{192,512}.png
 *
 * الرسم كلّه داخل دائرة الأمان (80%) فتصلح الأيقونة أن تكون maskable.
 */
const sharp = require('sharp')
const fs = require('node:fs')
const path = require('node:path')

const PUB = path.join(__dirname, '..', '..', 'public')

// الوعل متّجه يمينًا: جسم مشدود، قرنان يلتفّان فوق الظهر كما في نقوش جبة
const ibex = `
  <path d="M150 292 C150 268 172 256 206 254 L292 250 C304 249 312 244 320 236
           L338 214 C342 206 350 202 358 204 L376 214 C382 218 381 226 374 229
           L356 232 C350 246 344 262 338 280 C334 298 326 310 310 314
           C270 326 220 328 184 320 C164 316 150 306 150 292 Z"/>
  <path d="M360 212 C352 150 302 112 244 120 C194 126 164 160 164 208
           C174 172 204 146 246 144 C292 142 324 172 330 226 Z"/>
  <path d="M156 278 L144 256 C142 250 150 248 153 253 L168 270 Z"/>
  <path d="M352 230 L346 254 L336 236 Z"/>
  <g stroke-width="15" stroke-linecap="round" fill="none">
    <path d="M176 306 L164 368"/><path d="M204 310 L200 370"/>
    <path d="M294 306 L300 370"/><path d="M320 298 L334 366"/>
  </g>`

const svg = size => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="أثر">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#232D42"/><stop offset="1" stop-color="#0B0F17"/>
    </linearGradient>
    <radialGradient id="sun" cx=".42" cy=".36" r=".7">
      <stop offset="0" stop-color="#E9A866"/><stop offset=".6" stop-color="#D98E4A"/><stop offset="1" stop-color="#B9693C"/>
    </radialGradient>
    <clipPath id="disc"><circle cx="256" cy="262" r="178"/></clipPath>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="262" r="178" fill="url(#sun)"/>
  <g fill="#111726" stroke="#111726" transform="translate(4 6)">${ibex}</g>
  <rect x="60" y="374" width="392" height="12" fill="#111726" clip-path="url(#disc)"/>
</svg>`

// الأيقونة الصغيرة تحتاج زوايا مدوّرة لأنها لا تُقصّ كأيقونة التطبيق
fs.writeFileSync(path.join(PUB, 'favicon.svg'),
  svg(64).replace('<rect width="512" height="512"', '<rect width="512" height="512" rx="112"') + '\n')

Promise.all([192, 512].map(s =>
  sharp(Buffer.from(svg(s))).png().toFile(path.join(PUB, 'icons', `icon-${s}.png`))
)).then(() => console.log('icons written'))
