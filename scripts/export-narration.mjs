/**
 * يستخرج نصّ السرد لكل لغة وموقع إلى ملف JSON واحد.
 *
 * هذه الخطوة الأولى من خطوتين:
 *
 *   1) هذا الملف  ──► scripts/narration.json     (جافاسكربت: يقرأ المحتوى)
 *   2) build-narration-audio.py ──► public/audio/ (بايثون: يولّد الصوت)
 *
 * الفصل مقصود: المحتوى يعيش في وحدات ES ويعرف عنها Vite وحده، والتوليد
 * يحتاج مكتبات بايثون. ملف JSON بينهما يجعل كلّ طرف يعمل في بيئته.
 *
 * يُشغَّل عبر vite-node لا node، لأن سجلّ المحتوى يستعمل import.meta.glob:
 *
 *     npm run narration:export
 *
 * ── حقل speech ──────────────────────────────────────────────────────────
 * بعض اللغات تحتاج نصًّا للنطق يختلف عن النصّ المعروض. العربية أوضح مثال:
 * النصّ المعروض بلا تشكيل ليقرأه الناس مرتاحين، والنصّ المنطوق مشكّل
 * لتخرج الحركات صحيحة. حين يوجد segment.speech نولّد منه، وإلا فمن text.
 */

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { SITES } from '../src/data/sites.js'
import { CONTENT_LANGUAGE_CODES, loadContent } from '../src/data/content/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, 'narration.json')

/** يحوّل مقاطع السرد إلى الشكل الذي يفهمه المولّد. */
function toClip(siteId, narration) {
  return {
    siteId,
    voice: narration.voice,
    segments: narration.segments.map((segment) => ({
      // ما يُعرض على الشاشة — نحتفظ به للمراجعة البشرية فقط
      text: segment.text,
      // ما يُنطق فعلًا. التشكيل العربي يدخل من هنا.
      speech: segment.speech ?? segment.text,
    })),
  }
}

const languages = {}

// العربية أساس مكتوب في sites.js نفسه، لا ملفَ محتوى لها
languages.ar = SITES.map((site) => toClip(site.id, site.narration))

for (const code of CONTENT_LANGUAGE_CODES) {
  const content = await loadContent(code)

  languages[code] = SITES.map((site) => {
    const overlay = content?.[site.id]?.narration
    // لو لم تُترجم لغةٌ سردَ موقعٍ ما نتخطّاه بدل توليد عربية بصوت أجنبي
    return overlay ? toClip(site.id, overlay) : null
  }).filter(Boolean)
}

const total = Object.values(languages).reduce((sum, clips) => sum + clips.length, 0)

await writeFile(
  OUT,
  `${JSON.stringify({ generatedFrom: 'src/data', languages }, null, 2)}\n`,
  'utf8',
)

console.log(`✓ ${total} مقطعًا في ${Object.keys(languages).length} لغة ← ${OUT}`)
