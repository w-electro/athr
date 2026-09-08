/**
 * محاكاة السرد الصوتي المولّد بالذكاء الاصطناعي.
 *
 * لا يوجد ملف صوتي في هذه النسخة؛ نحاكي مشغّلًا حقيقيًا بمؤقّت يتقدّم
 * ويُبرز المقطع النصي الحالي. هذا يعطي تجربة "الدليل الصوتي" كاملة
 * (تشغيل/إيقاف/تقديم/سرعة + نص متزامن) بدون أصول صوتية.
 *
 * ── للتوسّع لاحقًا ──
 * الشكل نفسه ينطبق على صوت حقيقي:
 *   1) ولّد الصوت بـ TTS واحفظه في /public/audio/<siteId>.mp3
 *   2) استبدل المؤقّت بعنصر Audio واقرأ currentTime بدل tick
 *   3) أبقِ segments كما هي — المزامنة النصية تعمل دون تغيير
 */

/** يعيد المقطع الفعّال عند لحظة زمنية معيّنة. */
export function segmentAt(segments, seconds) {
  let active = segments[0] ?? null
  for (const segment of segments) {
    if (segment.at <= seconds) active = segment
    else break
  }
  return active
}

/** فهرس المقطع الفعّال، أو -1 إن كانت القائمة فارغة. */
export function segmentIndexAt(segments, seconds) {
  const active = segmentAt(segments, seconds)
  return active ? segments.indexOf(active) : -1
}

/** 96 → "1:36" */
export function formatTimecode(seconds) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/** نسبة التقدّم 0..1 (محميّة من القسمة على صفر). */
export function progressRatio(current, total) {
  if (!total || total <= 0) return 0
  return Math.min(1, Math.max(0, current / total))
}

export const PLAYBACK_RATES = [1, 1.25, 1.5]
