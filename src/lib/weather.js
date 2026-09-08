/**
 * محاكاة فحص الطقس لمنطقة حائل.
 *
 * الغرض ليس دقة الأرصاد، بل إثبات فكرة: مخطّط الرحلة يجب أن يتفاعل مع
 * الظروف الخارجية لا أن يعطي جدولًا جامدًا. عندما تتجاوز حرارة الظهيرة
 * حدًا معيّنًا، ينقل المخطّط المواقع المكشوفة إلى الصباح ويؤجل المغلقة للظهر.
 *
 * ── للتوسّع لاحقًا ──
 * استبدل `fetchForecast` بنداء حقيقي (OpenWeather / الأرصاد السعودية)
 * بشرط أن يُرجع نفس الشكل: { day, highC, lowC, condition, windKph, advice }
 */

/** توقّعات ثابتة (deterministic) — تجعل الاختبارات ونتائج العرض قابلة للتكرار. */
const FORECAST_TEMPLATE = [
  { condition: 'sunny', highC: 38, lowC: 22, windKph: 12 },
  { condition: 'hot', highC: 42, lowC: 26, windKph: 9 },
  { condition: 'dusty', highC: 36, lowC: 21, windKph: 34 },
]

export const CONDITION_META = {
  sunny: { label: 'مشمس', icon: '☀️' },
  hot: { label: 'حار جدًا', icon: '🔥' },
  dusty: { label: 'رياح وأتربة', icon: '🌬️' },
  cloudy: { label: 'غائم جزئيًا', icon: '⛅' },
}

/** الحد الذي يُعتبر بعده وقت الظهيرة غير مناسب للمواقع المكشوفة. */
export const HEAT_THRESHOLD_C = 40

/** سرعة الرياح التي تُفسد التصوير والمشي في المواقع المفتوحة. */
export const WIND_THRESHOLD_KPH = 30

const DAY_LABELS = ['اليوم الأول', 'اليوم الثاني', 'اليوم الثالث']

/**
 * يجلب توقّعات لعدد أيام الرحلة.
 * @param {number} days - 1..3
 * @param {{ delayMs?: number }} options
 * @returns {Promise<Array>}
 */
export async function fetchForecast(days, options = {}) {
  const wait = options.delayMs ?? 1100
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))

  return Array.from({ length: days }, (_, index) => {
    const base = FORECAST_TEMPLATE[index % FORECAST_TEMPLATE.length]
    return {
      day: index + 1,
      dayLabel: DAY_LABELS[index] || `اليوم ${index + 1}`,
      ...base,
      ...CONDITION_META[base.condition],
      advice: buildAdvice(base),
      avoidMiddayOutdoor: base.highC >= HEAT_THRESHOLD_C,
      windyWarning: base.windKph >= WIND_THRESHOLD_KPH,
    }
  })
}

function buildAdvice(day) {
  if (day.windKph >= WIND_THRESHOLD_KPH) {
    return 'رياح مثيرة للأتربة — قدّمنا المواقع المكشوفة إلى الصباح الباكر، والرؤية قد تتأثر في التصوير.'
  }
  if (day.highC >= HEAT_THRESHOLD_C) {
    return `الحرارة تصل إلى ${day.highC}° ظهرًا — نقلنا الأنشطة الخارجية إلى الصباح، والظهيرة لموقع مغلق.`
  }
  return 'الطقس مناسب — رتّبنا المسار حسب الوقت المثالي لكل موقع.'
}
