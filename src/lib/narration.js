/**
 * أدوات السرد الصوتي.
 *
 * المزامنة نفسها لا تحدث هنا: المشغّل يتتبّع المقطع الحالي بفهرسه، لأن
 * النطق الحقيقي (Web Speech API) يُعلمنا بانتهاء كل مقطع فعليًا — وهذا
 * أدقّ من أي تقدير زمني. انظر src/lib/speech.js و components/AudioPlayer.jsx
 *
 * ── عند إضافة ملفات صوت مسجّلة لاحقًا ──
 * الشكل نفسه يصلح: ولّد الصوت بـ TTS واحفظه في public/audio/<siteId>-<lang>.mp3،
 * ثم اقرأ currentTime من عنصر <audio> بدل حدث انتهاء المقطع. حقول segments
 * تبقى كما هي.
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
