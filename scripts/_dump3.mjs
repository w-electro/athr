/** إطاراتٌ تشبه الكاميرا، لمسحِ حدودٍ أدنى من الحاليّة. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { RawImage } from '@huggingface/transformers'
import { getExtractor, toVector, normalize, matchVector, centerCrop, CROP_LADDER } from '../src/lib/recognition.local.js'

const idx = JSON.parse(readFileSync('public/reference-index.json', 'utf8'))
const E = idx.entries.map((e) => ({
  ...e, vector: normalize(Float32Array.from(e.vector)),
  num: Number((e.photo.match(/(\d+)/) || [0, 0])[1]),
  commons: e.photo.startsWith('commons'),
}))
const extractor = await getExtractor()

function blur(img, px) {
  if (!px) return img
  const { data, width, height, channels } = img
  const out = new Uint8ClampedArray(data.length)
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      for (let c = 0; c < channels; c += 1) {
        let s = 0, n = 0
        for (let k = -px; k <= px; k += 1) {
          const sx = Math.min(width - 1, Math.max(0, x + k))
          s += data[(y * width + sx) * channels + c]; n += 1
        }
        out[(y * width + x) * channels + c] = s / n
      }
  return new RawImage(out, width, height, channels)
}

async function scene(path, pool) {
  const src = await RawImage.read(path)
  const base = await src.resize(720, Math.round((720 / src.width) * src.height))
  const out = []
  for (let i = 0; i < 10; i += 1) {
    const frac = Math.min(1, CROP_LADDER[i % CROP_LADDER.length] * (0.94 + 0.04 * ((i * 7) % 3)))
    const w = Math.round(base.width * frac), h = Math.round(base.height * frac)
    const mx = base.width - w, my = base.height - h
    const x = Math.max(0, Math.min(mx, Math.round(mx / 2 + mx * 0.2 * Math.sin(i * 1.7))))
    const y = Math.max(0, Math.min(my, Math.round(my / 2 + my * 0.2 * Math.cos(i * 2.3))))
    const view = blur(await base.crop([x, y, x + w - 1, y + h - 1]), i % 3 === 0 ? 1 : 0)
    const r = matchVector(normalize(toVector(await extractor(await centerCrop(view, 1)))), pool)
    out.push({ id: r.topSiteId, s: Number(r.topScore.toFixed(4)), m: Number(r.margin.toFixed(4)) })
  }
  return out
}

const positives = []
for (const q of E.filter((_, i) => i % 4 === 0)) {
  const pool = E.filter((r) => r.siteId !== q.siteId || r.commons !== q.commons || Math.abs(r.num - q.num) > 5)
  if (!pool.some((r) => r.siteId === q.siteId)) continue
  positives.push({ truth: q.siteId, frames: await scene(join('photos-inbox', q.siteId, q.photo), pool) })
  process.stdout.write('.')
}

// سوالب: رملٌ وسماء وصخر، **و** 119 صورة جبة من كومنز ليست للوحاتنا
const negatives = []
for (const f of readdirSync('photos-inbox/_negatives').filter((x) => /\.(jpe?g|png)$/i.test(x))) {
  negatives.push({ file: f, kind: 'sand', frames: await scene(join('photos-inbox/_negatives', f), E) })
  process.stdout.write('.')
}
const added = new Set(['Man_with_lion__Jubbah_rock_art_site__Saudi_Arabia.jpg',
  'Petroglyphs__Jubbah_rock_art_site__Saudi_Arabia__5_.jpg',
  'Ostriches__Jubbah_rock_art_site__Saudi_Arabia.jpg',
  'Petroglyphs__Jubbah_rock_art_site__Saudi_Arabia__2_.jpg'])
const cf = readdirSync('photos-inbox/_commons').filter((x) => /\.(jpe?g|png)$/i.test(x) && !added.has(x))
for (const f of cf.filter((_, i) => i % 2 === 0)) {
  negatives.push({ file: f, kind: 'jubbah', frames: await scene(join('photos-inbox/_commons', f), E) })
  process.stdout.write(',')
}
writeFileSync('scripts/_frames3.json', JSON.stringify({ positives, negatives }))
console.log(`\n✓ ${positives.length} صحيح · ${negatives.length} سالب (منها ${negatives.filter(n=>n.kind==='jubbah').length} نقوش جبة أخرى)`)
