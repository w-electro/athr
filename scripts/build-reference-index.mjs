/**
 * يبني فهرس التعرّف — بنفس المحرّك الذي يستعمله المتصفح.
 *
 *     npx vite-node scripts/build-reference-index.mjs
 *     npx vite-node scripts/build-reference-index.mjs -- --dry-run
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا جافاسكربت لا بايثون
 * ══════════════════════════════════════════════════════════════════════
 * كان هذا السكربت بايثون يستعمل AutoImageProcessor من transformers، وكان
 * يعطي دقّةً ممتازة في قياسه الخاصّ — ثمّ يفشل في المتصفح.
 *
 * السبب أنّ المعالِجَين مختلفان. جرّبنا الصورة نفسها في المسارين فكان
 * التشابه **0.82** حيث يجب أن يكون 1.00: قصٌّ وتحجيمٌ وتطبيعٌ مختلف قليلًا،
 * فيخرج متجهٌ مختلف. والفهرس حينها يقيس بمسطرة والمتصفّح بأخرى.
 *
 * وهذا عطبٌ صامت مثاليّ: البناء ينجح، والدقّة المطبوعة 98%، والاختبارات
 * تمرّ — ولا شيء يفشل إلا الزائر الواقف أمام الصخرة.
 *
 * فالعلاج بنيويّ لا معايرة: نبني الفهرس بالمحرّك نفسه، ونستورد toVector
 * و normalize من recognition.local.js مباشرةً. نسخةٌ واحدة من المنطق، فلا
 * مجال لانحرافٍ بين ما يُبنى وما يُطابَق.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import {
  MODEL_ID,
  MODEL_DTYPE,
  getExtractor,
  toVector,
  normalize,
} from '../src/lib/recognition.local.js'

const ROOT = resolve('.')
const PHOTOS_DIR = join(ROOT, 'photos-inbox')
const OUT_PATH = join(ROOT, 'public', 'reference-index.json')

const SITE_IDS = ['jubbah', 'aarif', 'qishlah', 'aja', 'museum', 'shuwaymis']
const PANEL_RE = new RegExp(`^(${SITE_IDS.join('|')})-p\\d+$`)
const NEGATIVES = '_negatives'
const IMAGE_RE = /\.(jpe?g|png|webp)$/i

const dryRun = process.argv.includes('--dry-run')

function listImages(folder) {
  if (!existsSync(folder)) return []
  return readdirSync(folder)
    .filter((name) => IMAGE_RE.test(name))
    .sort()
    .map((name) => join(folder, name))
}

/** اللوحات تُكتشف من المجلّدات، فلا قائمةَ تتقادم. */
function discoverPanels() {
  if (!existsSync(PHOTOS_DIR)) return []
  return readdirSync(PHOTOS_DIR)
    .filter((name) => statSync(join(PHOTOS_DIR, name)).isDirectory() && PANEL_RE.test(name))
    .sort((a, b) => {
      const [siteA, numA] = a.split('-p')
      const [siteB, numB] = b.split('-p')
      return siteA.localeCompare(siteB) || Number(numA) - Number(numB)
    })
}

const panels = discoverPanels()
const labels = [...SITE_IDS, ...panels]

console.log('لوحات مكتشَفة:', panels.join('، ') || 'لا شيء', '\n')
console.log(`المسار: ${PHOTOS_DIR}\n`)

let total = 0
for (const label of labels) {
  const images = listImages(join(PHOTOS_DIR, label))
  if (!images.length) continue
  total += images.length
  const flag = images.length >= 15 ? '✓' : '⚠ أقلّ من ١٥'
  console.log(`  ${label.padEnd(14)} ${String(images.length).padStart(3)} صورة   ${flag}`)
}
const negatives = listImages(join(PHOTOS_DIR, NEGATIVES))
console.log(
  `  ${NEGATIVES.padEnd(14)} ${String(negatives.length).padStart(3)} صورة   ` +
    (negatives.length >= 20 ? '✓' : '⚠ أضف المزيد'),
)
console.log(`\n  المجموع: ${total + negatives.length} صورة`)

if (dryRun) process.exit(0)
if (total === 0) {
  console.log('\n✗ لا صور مرجعية. راجع photos-inbox/README.md')
  process.exit(1)
}

console.log(`\nنحمّل ${MODEL_ID} (${MODEL_DTYPE})…`)
const extractor = await getExtractor((p) => {
  if (p.status === 'progress' && p.progress === 100) console.log(`  نزّل ${p.file}`)
})

/**
 * الصورة ← متجه، بنفس دالّتي التطبيق حرفيًّا.
 *
 * المسار يُمرَّر كما هو: transformers.js في Node يقرأ من القرص مباشرةً،
 * أمّا file:// فيحاول جلبه عبر الشبكة فيردّ 404.
 */
async function embed(path) {
  return toVector(await extractor(path))
}

console.log('\nنحسب المتجهات…')
const started = Date.now()
const entries = []

for (const label of labels) {
  const images = listImages(join(PHOTOS_DIR, label))
  if (!images.length) continue
  let done = 0
  for (const path of images) {
    try {
      entries.push({ siteId: label, photo: basename(path), vector: await embed(path) })
      done += 1
    } catch (error) {
      console.log(`  ⚠ تخطّينا ${basename(path)}: ${error.message}`)
    }
  }
  // نطبع ما نجح لا ما حاولنا: علامة ✓ بجانب عددٍ لم يتحقّق تُخفي فشلًا كاملًا
  const mark = done === images.length ? '✓' : '⚠'
  console.log(`  ${label.padEnd(14)} ${mark} ${done}/${images.length}`)
}

const negVectors = []
for (const path of negatives) {
  try {
    negVectors.push(await embed(path))
  } catch {
    /* صورة تالفة لا توقف الباقي */
  }
}

console.log(`\n  ${entries.length} متجهًا مرجعيًا + ${negVectors.length} سلبيًا`)
console.log(`  الزمن: ${((Date.now() - started) / 1000).toFixed(0)} ثانية`)

/* ─────────────────────── الدقّة بترك واحدة ─────────────────────── */

const dot = (a, b) => {
  let sum = 0
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i]
  return sum
}

/** أعلى درجة لكل تسمية — منطق التطبيق نفسه. */
function bestPerLabel(query, skipIndex) {
  const best = new Map()
  for (let j = 0; j < entries.length; j += 1) {
    if (j === skipIndex) continue
    const score = dot(query, entries[j].vector)
    const label = entries[j].siteId
    if (!best.has(label) || score > best.get(label)) best.set(label, score)
  }
  return [...best.entries()].sort((a, b) => b[1] - a[1])
}

let correct = 0
const positives = []
const perLabel = new Map()
const confusion = []

for (let i = 0; i < entries.length; i += 1) {
  const ranked = bestPerLabel(entries[i].vector, i)
  const [predicted, top] = ranked[0]
  const actual = entries[i].siteId

  const tally = perLabel.get(actual) ?? { right: 0, total: 0 }
  tally.total += 1
  if (predicted === actual) {
    tally.right += 1
    correct += 1
    positives.push(top)
  } else {
    confusion.push(`${actual} → ${predicted}`)
  }
  perLabel.set(actual, tally)
}

const accuracy = correct / entries.length
console.log(`\nالدقّة الكلّية: ${(accuracy * 100).toFixed(1)}%  (${correct} من ${entries.length})\n`)

console.log('  الدقّة لكل لوحة:')
for (const label of labels) {
  const tally = perLabel.get(label)
  if (!tally) continue
  const share = tally.right / tally.total
  const bar = '█'.repeat(Math.round(share * 20))
  console.log(
    `    ${label.padEnd(14)} ${String(tally.right).padStart(3)}/${String(tally.total).padEnd(3)} ` +
      `${(share * 100).toFixed(0).padStart(4)}% ${bar}${share < 0.7 ? '  ⚠' : ''}`,
  )
}

if (confusion.length) {
  const counts = new Map()
  for (const pair of confusion) counts.set(pair, (counts.get(pair) ?? 0) + 1)
  console.log('\n  أين يلتبس:')
  for (const [pair, count] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pair}  ${count} مرّة`)
  }
}

/* ──────────────────────────── العتبة ──────────────────────────── */

let suggested = null
if (negVectors.length) {
  const negScores = negVectors.map((v) => Math.max(...entries.map((e) => dot(v, e.vector))))
  const sortedNeg = [...negScores].sort((a, b) => a - b)
  const p99 = sortedNeg[Math.floor(sortedNeg.length * 0.99) - 1] ?? sortedNeg.at(-1)
  const median = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)]

  console.log(
    `\n  الصحيحة (${String(positives.length).padStart(3)}): ` +
      `أدنى ${Math.min(...positives).toFixed(3)} · وسيط ${median(positives).toFixed(3)}`,
  )
  console.log(
    `  السلبية (${String(negScores.length).padStart(3)}): ` +
      `أعلى ${Math.max(...negScores).toFixed(3)} · وسيط ${median(negScores).toFixed(3)}`,
  )

  suggested = Number((p99 + 0.02).toFixed(3))
  const kept = positives.filter((s) => s >= suggested).length / positives.length
  console.log(`\n  ➜ العتبة المقترحة: ${suggested.toFixed(2)}`)
  console.log(`    تقبل ${(kept * 100).toFixed(0)}% من الصحيحة وترفض ~٩٩٪ من السلبية.`)
  console.log('\n    ضعها في SIMILARITY_THRESHOLD داخل src/lib/recognition.local.js')
} else {
  console.log('\n  ⚠ لا صور سلبية — لا يمكن ضبط العتبة بثقة.')
}

/* ──────────────────────────── الكتابة ──────────────────────────── */

if (entries.length === 0) {
  console.log('\n✗ لم يُمثَّل أي صورة — لا نكتب فهرسًا فارغًا.')
  process.exit(1)
}

mkdirSync(join(ROOT, 'public'), { recursive: true })
writeFileSync(
  OUT_PATH,
  JSON.stringify({
    model: MODEL_ID,
    dtype: MODEL_DTYPE,
    dims: entries[0].vector.length,
    createdAt: new Date().toISOString().slice(0, 10),
    accuracy: Number(accuracy.toFixed(4)),
    suggestedThreshold: suggested,
    // builtWith يوثّق أنّ الفهرس بُني بمحرّك المتصفح لا بمسارٍ آخر
    builtWith: 'transformers.js',
    entries: entries.map((e) => ({
      siteId: e.siteId,
      photo: e.photo,
      vector: e.vector.map((x) => Number(x.toFixed(5))),
    })),
  }),
  'utf8',
)

const sizeKb = statSync(OUT_PATH).size / 1024
console.log(`\n✓ public/reference-index.json`)
console.log(`  ${entries.length} متجهًا · ${sizeKb.toFixed(0)} كيلوبايت`)
