/**
 * ضمّ تصحيحات الجوّال إلى فهرسٍ مرجعي — مشتركٌ بين merge-learned و
 * build-reference-index كي لا يضيع ما تعلّمناه إذا أُعيد البناء من الصور.
 */
const NOT_A_PANEL = '__not-a-panel__'

/** يعدّل index.entries في مكانه ويُرجع ما أُضيف. */
export function mergeLearned(index, learned, source) {
  const known = new Set([...index.entries.map((e) => e.siteId), NOT_A_PANEL])
  // البصمة تمنع تكرار الملف نفسه إذا ضُمّ مرّتين
  const key = (v) => v.slice(0, 12).map((x) => x.toFixed(3)).join(',')
  const seen = new Set(index.entries.map((e) => key(e.vector)))
  let added = 0
  let skipped = 0
  const bySite = {}
  for (const [i, e] of (learned.entries ?? []).entries()) {
    const ok = known.has(e.siteId) && Array.isArray(e.vector) && e.vector.length === index.dims
      && e.vector.every(Number.isFinite)
    if (!ok || seen.has(key(e.vector))) { skipped += 1; continue }
    seen.add(key(e.vector))
    index.entries.push({ siteId: e.siteId, photo: `learned:${source}#${i}`, learned: true, vector: e.vector })
    bySite[e.siteId] = (bySite[e.siteId] ?? 0) + 1
    added += 1
  }
  return { added, skipped, bySite }
}
