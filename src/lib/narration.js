/**
 * أدوات السرد الصوتي.
 *
 * المزامنة نفسها لا تحدث هنا. انظر:
 *   • src/lib/audioAssets.js      — فهرس المقاطع المولّدة ومطابقة الزمن بالجملة
 *   • src/components/AudioPlayer.jsx — الأوضاع الثلاثة وأيّها يُختار
 *   • scripts/build-narration-audio.py — توليد المقاطع وقياس أزمنتها
 *
 * حقل at في المحتوى تقديرٌ كُتب قبل وجود صوت، ويبقى للتراجع وحده: متى
 * وُجد مقطع مولّد استُعملت أزمنته المقيسة بدلًا منه.
 */

/** 96 → "1:36" */
export function formatTimecode(seconds) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/**
 * سرعات التشغيل.
 *
 * نبدأ من 0.9 لا من 1: أصوات التركيب تميل إلى التسرّع في السرد الطويل،
 * وإبطاؤها قليلًا يجعلها أقرب إلى صوت مرشد يشرح لا آلة تقرأ.
 */
export const PLAYBACK_RATES = [0.9, 1, 1.25, 1.5]
