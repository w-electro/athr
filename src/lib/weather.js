/**
 * طقس حائل — بيانات حقيقية، مع طريق آمن حين ينقطع الإنترنت.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  المصدر
 * ══════════════════════════════════════════════════════════════════════
 * Open-Meteo: مجاني تمامًا، بلا مفتاح ولا تسجيل ولا حدّ يومي يُذكر
 * للاستخدام غير التجاري، ويسمح بالنداء من المتصفح مباشرة.
 * https://open-meteo.com
 *
 * ══════════════════════════════════════════════════════════════════════
 *  ثلاثة مصادر بالترتيب — ولماذا
 * ══════════════════════════════════════════════════════════════════════
 *
 *  1. live     ← نداء حيّ. الأدقّ.
 *  2. cached   ← آخر نداء ناجح، محفوظ في الجهاز.
 *  3. estimate ← معدّلات حائل المناخية الشهرية.
 *
 * الترتيب ليس تفصيلًا تقنيًا: هذا التطبيق يُستخدم في جبة على بعد 95 كم من
 * حائل حيث التغطية ضعيفة. مخطّط رحلة يتعطّل لأن الطقس لم يُجلب هو مخطّط
 * عديم الفائدة في المكان الذي بُني له.
 *
 * والأهم: كل نتيجة تحمل حقل `source`، والواجهة تقوله للمستخدم. لا نعرض
 * تقديرًا مناخيًا كأنه رصد اليوم.
 */

/** إحداثيات مدينة حائل — مركز المنطقة. */
export const HAIL_COORDS = { lat: 27.5219, lng: 41.6907 }

/** الحد الذي يُعتبر بعده وقت الظهيرة غير مناسب للمواقع المكشوفة. */
export const HEAT_THRESHOLD_C = 40

/** سرعة الرياح التي تُفسد التصوير والمشي في المواقع المفتوحة. */
export const WIND_THRESHOLD_KPH = 30

/** صلاحية النسخة المحفوظة: بعدها نفضّل التقدير المناخي على رصد قديم. */
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const CACHE_KEY = 'athr.forecast'

/**
 * معدّلات حائل المناخية الشهرية (أعلى/أدنى بالدرجة المئوية).
 *
 * حائل على ارتفاع ~1000 م، فصيفها أقلّ وطأة من السواحل وشتاؤها أبرد.
 * هذه المعدّلات ليست رصدًا، وتُعرض موسومة بأنها تقدير.
 */
const CLIMATE_NORMALS = [
  { high: 18, low: 4 },   // يناير
  { high: 21, low: 6 },   // فبراير
  { high: 25, low: 10 },  // مارس
  { high: 30, low: 15 },  // أبريل
  { high: 36, low: 20 },  // مايو
  { high: 40, low: 23 },  // يونيو
  { high: 42, low: 25 },  // يوليو
  { high: 42, low: 25 },  // أغسطس
  { high: 39, low: 21 },  // سبتمبر
  { high: 33, low: 16 },  // أكتوبر
  { high: 25, low: 10 },  // نوفمبر
  { high: 19, low: 5 },   // ديسمبر
]

/** الأيقونة بنيوية (لا تُترجم)؛ التسمية مفتاح ترجمة. */
export const CONDITION_META = {
  sunny: { icon: '☀️', labelKey: 'weather.sunny' },
  hot: { icon: '🔥', labelKey: 'weather.hot' },
  dusty: { icon: '🌬️', labelKey: 'weather.dusty' },
  cloudy: { icon: '⛅', labelKey: 'weather.cloudy' },
  rain: { icon: '🌧️', labelKey: 'weather.rain' },
}

/**
 * يحوّل رمز الطقس العالمي (WMO) وقراءات اليوم إلى حالة نعرضها.
 *
 * الترتيب مقصود: الرياح والحرارة يسبقان الغيم لأنهما ما يُغيّر خطة الرحلة
 * فعلًا. يومٌ غائم في حائل لا يعني شيئًا لمخطّط المسار؛ يومٌ بحرارة 42
 * يعني كل شيء.
 *
 * ولا يوجد رمز WMO للغبار، فنستنتجه من سرعة الرياح — وهو ما يهمّ الزائر
 * عمليًا على أي حال.
 */
function classify({ highC, windKph, weatherCode }) {
  if (windKph >= WIND_THRESHOLD_KPH) return 'dusty'
  if (weatherCode >= 51) return 'rain' // رذاذ فما فوق
  if (highC >= HEAT_THRESHOLD_C) return 'hot'
  if (weatherCode >= 2) return 'cloudy' // غائم جزئيًا فأكثر
  return 'sunny'
}

/** يُرجع مفتاح نصيحة ومتغيّراته — لا نصًا جاهزًا. الواجهة تترجم. */
function buildAdvice(day) {
  if (day.windKph >= WIND_THRESHOLD_KPH) return { key: 'weather.adviceDusty' }
  if (day.highC >= HEAT_THRESHOLD_C) return { key: 'weather.adviceHot', vars: { temp: day.highC } }
  return { key: 'weather.adviceFine' }
}

function decorate(raw, index, source) {
  const condition = classify(raw)
  return {
    day: index + 1,
    highC: Math.round(raw.highC),
    lowC: Math.round(raw.lowC),
    windKph: Math.round(raw.windKph),
    condition,
    source,
    icon: CONDITION_META[condition].icon,
    labelKey: CONDITION_META[condition].labelKey,
    advice: buildAdvice({ highC: raw.highC, windKph: raw.windKph }),
    avoidMiddayOutdoor: raw.highC >= HEAT_THRESHOLD_C,
    windyWarning: raw.windKph >= WIND_THRESHOLD_KPH,
  }
}

/* ───────────────────────────── المصادر ───────────────────────────── */

async function fetchLive(days, coords, signal) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${coords.lat}&longitude=${coords.lng}` +
    '&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max' +
    `&timezone=Asia%2FRiyadh&forecast_days=${Math.min(7, Math.max(1, days))}`

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`)

  const data = await response.json()
  const daily = data?.daily
  if (!daily?.time?.length) throw new Error('استجابة بلا بيانات يومية')

  return daily.time.slice(0, days).map((_, index) => ({
    highC: daily.temperature_2m_max[index],
    lowC: daily.temperature_2m_min[index],
    windKph: daily.wind_speed_10m_max[index],
    weatherCode: daily.weather_code[index],
  }))
}

function readCache(days) {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.at > CACHE_TTL_MS) return null
    if (!Array.isArray(cached.raw) || cached.raw.length < days) return null
    return cached.raw.slice(0, days)
  } catch {
    return null
  }
}

function writeCache(raw) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), raw }))
  } catch {
    // التخزين غير متاح — لا يضرّ، سنعيد الجلب في المرة القادمة
  }
}

function climateEstimate(days) {
  const today = new Date()
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)
    const normals = CLIMATE_NORMALS[date.getMonth()]
    return { highC: normals.high, lowC: normals.low, windKph: 12, weatherCode: 0 }
  })
}

/* ─────────────────────────── نقطة الدخول ─────────────────────────── */

/**
 * توقّعات الطقس لعدد أيام الرحلة.
 *
 * @param {number} days
 * @param {{ coords?: {lat,lng}, signal?: AbortSignal, source?: 'live'|'cache'|'estimate' }} options
 *        `source` يفرض مصدرًا بعينه — للاختبارات فقط.
 */
export async function fetchForecast(days, options = {}) {
  const coords = options.coords ?? HAIL_COORDS

  if (options.source === 'estimate') {
    return climateEstimate(days).map((raw, i) => decorate(raw, i, 'estimate'))
  }

  try {
    const raw = await fetchLive(days, coords, options.signal)
    writeCache(raw)
    return raw.map((entry, index) => decorate(entry, index, 'live'))
  } catch {
    // بلا إنترنت أو الخدمة متوقفة — نتدرّج نزولًا بدل أن نفشل
    const cached = readCache(days)
    if (cached) return cached.map((entry, index) => decorate(entry, index, 'cached'))
    return climateEstimate(days).map((raw, index) => decorate(raw, index, 'estimate'))
  }
}

/** يمسح النسخة المحفوظة — تستخدمه الاختبارات. */
export function clearForecastCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {
    /* لا شيء */
  }
}
