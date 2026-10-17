/**
 * يضمّ تصحيحات جوّالٍ إلى الفهرس المشحون، فيستفيد منها كلّ زائر.
 *
 *   node scripts/merge-learned.mjs athr-learned-2026-10-17.json [--dry-run]
 *
 * الملف من شاشة /learning في التطبيق (يُفتح بلمس رقم «تعلّمنا» بعد تصحيح).
 * ويُحفظ نسخةً في learned/ كي لا يضيع إن أُعيد بناء الفهرس من الصور:
 * build-reference-index.mjs يضمّ ما في learned/ تلقائيًّا.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { mergeLearned } from './learned-lib.mjs'

const ROOT = resolve(import.meta.dirname, '..')
const INDEX = join(ROOT, 'public', 'reference-index.json')
const file = process.argv.slice(2).find((a) => !a.startsWith('--'))
const dryRun = process.argv.includes('--dry-run')
if (!file) { console.error('usage: node scripts/merge-learned.mjs <athr-learned.json> [--dry-run]'); process.exit(1) }

const index = JSON.parse(readFileSync(INDEX, 'utf8'))
const learned = JSON.parse(readFileSync(file, 'utf8'))
const { added, skipped, bySite } = mergeLearned(index, learned, basename(file))

console.log(`+${added} new · ${skipped} skipped (duplicate or unknown site)`)
console.log(bySite)
if (dryRun || !added) process.exit(0)

writeFileSync(INDEX, JSON.stringify(index), 'utf8')
mkdirSync(join(ROOT, 'learned'), { recursive: true })
copyFileSync(file, join(ROOT, 'learned', basename(file)))
console.log(`written: ${INDEX}  (copy kept in learned/)`)
