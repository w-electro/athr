/**
 * محاكاة فحص الطقس لمنطقة حائل.
 *
 * الغرض ليس دقة الأرصاد، بل إثبات فكرة: مخطّط الرحلة يجب أن يتفاعل مع
 * الظروف الخارجية لا أن يعطي جدولًا جامدًا.
 *
 * ── ملاحظة على اللغة ──
 * هذا الملف لا يُنتج نصًا بشريًا إطلاقًا. يُرجع مفاتيح ترجمة ومتغيّرات،
 * والواجهة هي التي تترجم. لولا ذلك لاحتجنا نسخة من المنطق لكل لغة.
 *
 * ── للتوسّع لاحقًا ──
 * استبدل fetchForecast بنداء حقيقي (OpenWeather / الأرصاد السعودية)
 * بشرط أن يُرجع الشكل نفسه.
 */

/** توقّعات ثابتة (deterministic) — تجعل الاختبارات ونتائج العرض قابلة للتكرار. */
const FORECAST_TEMPLATE = [
  { condition: 'sunny', highC: 38, lowC: 22, windKph: 12 },
  { condition: 'hot', highC: 42, lowC: 26, windKph: 9 },
  { condition: 'dusty', highC: 36, lowC: 21, windKph: 34 },
]

/** الأيقونة بنيوية (لا تُترجم)؛ التسمية مفتاح ترجمة. */
export const CONDITION_META = {
  sunny: { icon: '☀️', labelKey: 'weather.sunny' },
  hot: { icon: '🔥', labelKey: 'weather.hot' },
  dusty: { icon: '🌬️', labelKey: 'weather.dusty' },
}

/** الحد الذي يُعتبر بعده وقت الظهيرة غير مناسب للمواقع المكشوفة. */
export const HEAT_THRESHOLD_C = 40

/** سرعة الرياح التي تُفسد التصوير والمشي في المواقع المفتوحة. */
export const WIND_THRESHOLD_KPH = 30

/**
 * يجلب توقّعات لعدد أيام الرحلة.
 * @param {number} days - 1..3
 * @param {{ delayMs?: number }} options
 */
export async function fetchForecast(days, options = {}) {
  const wait = options.delayMs ?? 1100
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))

  return Array.from({ length: days }, (_, index) => {
    const base = FORECAST_TEMPLATE[index % FORECAST_TEMPLATE.length]
    return {
      day: index + 1,
      ...base,
      icon: CONDITION_META[base.condition].icon,
      labelKey: CONDITION_META[base.condition].labelKey,
      advice: buildAdvice(base),
      avoidMiddayOutdoor: base.highC >= HEAT_THRESHOLD_C,
      windyWarning: base.windKph >= WIND_THRESHOLD_KPH,
    }
  })
}

/** يُرجع مفتاح نصيحة ومتغيّراته — لا نصًا جاهزًا. */
function buildAdvice(day) {
  if (day.windKph >= WIND_THRESHOLD_KPH) return { key: 'weather.adviceDusty' }
  if (day.highC >= HEAT_THRESHOLD_C) return { key: 'weather.adviceHot', vars: { temp: day.highC } }
  return { key: 'weather.adviceFine' }
}
