/**
 * محرّك بناء مسار الرحلة.
 *
 * دوال خالصة (pure) بلا أي اعتماد على React أو على لغة معيّنة — لذلك
 * تُختبر مباشرة، وتعمل مع الـ28 لغة دون نسخة لكل واحدة.
 *
 * القاعدة: هذا الملف لا يُنتج نصًا بشريًا. يُرجع مفاتيح ترجمة، والواجهة تترجم.
 */

import { getAllSites } from '../data/sites.js'

/** إيقاع الرحلة → الدقائق المتاحة للزيارة في اليوم الواحد. */
export const PACES = {
  relaxed: { id: 'relaxed', capacity: 240 },
  balanced: { id: 'balanced', capacity: 360 },
  packed: { id: 'packed', capacity: 460 },
}

export const DURATION_OPTIONS = [
  { days: 1, labelKey: 'days.one' },
  { days: 2, labelKey: 'days.two' },
  { days: 3, labelKey: 'days.three' },
]

/** ترتيب أفضلية الوقت خلال اليوم. */
const TIME_ORDER = { morning: 0, afternoon: 1, evening: 2 }

/** بداية اليوم بالدقائق من منتصف الليل (8:00 صباحًا). */
const DAY_START_MINUTES = 8 * 60

/** الظهيرة الحارة: من 12:00 إلى 16:00. */
const MIDDAY_START = 12 * 60
const MIDDAY_END = 16 * 60

/**
 * يحسب درجة ملاءمة الموقع لاهتمامات المستخدم.
 * مواقع اليونسكو تأخذ دفعة صغيرة لأنها الأثر الأهم في المنطقة ولا يليق
 * أن تسقط من رحلة قصيرة.
 */
export function scoreSite(site, interests = []) {
  const overlap = site.interests.filter((interest) => interests.includes(interest)).length
  const unescoBoost = site.unesco ? 1.5 : 0
  const coverageBoost = interests.length === 0 ? 1 : 0
  return overlap * 2 + unescoBoost + coverageBoost
}

/** تقدير زمن التنقّل بين محطتين انطلاقًا من بُعد كل منهما عن مركز حائل. */
export function travelMinutesBetween(fromSite, toSite) {
  if (!fromSite) return 0
  const deltaKm = Math.abs(toSite.distanceFromHailKm - fromSite.distanceFromHailKm)
  return Math.max(15, Math.round(deltaKm / 1.1))
}

/**
 * يرتّب محطات اليوم الواحد.
 * في يوم حار أو مغبر تُدفع المواقع المكشوفة إلى الصباح والمغلقة إلى الظهيرة.
 */
export function orderStopsForDay(sites, weather) {
  const shiftOutdoor = Boolean(weather?.avoidMiddayOutdoor || weather?.windyWarning)

  return [...sites].sort((a, b) => {
    if (shiftOutdoor && a.outdoor !== b.outdoor) return a.outdoor ? -1 : 1
    const orderDiff = (TIME_ORDER[a.bestTime] ?? 1) - (TIME_ORDER[b.bestTime] ?? 1)
    if (orderDiff !== 0) return orderDiff
    return b.distanceFromHailKm - a.distanceFromHailKm
  })
}

/** يوزّع المواقع المختارة على الأيام حسب السعة الزمنية لكل يوم. */
function distributeAcrossDays(sites, days, capacity) {
  const buckets = Array.from({ length: days }, () => ({ sites: [], used: 0 }))
  const leftovers = []

  for (const site of sites) {
    const candidate = buckets
      .filter((bucket) => bucket.used + site.durationMinutes + 30 <= capacity)
      .sort((a, b) => a.used - b.used)[0]

    if (candidate) {
      candidate.sites.push(site)
      candidate.used += site.durationMinutes + 30
    } else {
      leftovers.push(site)
    }
  }

  return { buckets, leftovers }
}

/**
 * يبني الرحلة الكاملة.
 *
 * @param {{ interests?: string[], days?: number, pace?: string, language?: string }} prefs
 * @param {Array|null} forecast - ناتج fetchForecast
 */
export function buildItinerary(prefs, forecast = null) {
  const { interests = [], days = 2, pace = 'balanced', language = 'ar' } = prefs
  const capacity = (PACES[pace] || PACES.balanced).capacity

  const ranked = getAllSites(language)
    .map((site) => ({ site, score: scoreSite(site, interests) }))
    .sort((a, b) => b.score - a.score || a.site.durationMinutes - b.site.durationMinutes)
    .map((entry) => entry.site)

  const { buckets, leftovers } = distributeAcrossDays(ranked, days, capacity)

  const plannedDays = buckets.map((bucket, index) => {
    const weather = forecast?.[index] ?? null
    const ordered = orderStopsForDay(bucket.sites, weather)

    let clock = DAY_START_MINUTES
    let previous = null

    const stops = ordered.map((site) => {
      const travel = travelMinutesBetween(previous, site)
      clock += travel

      // موقع مكشوف في يوم حار لا يبدأ داخل نافذة الظهيرة
      if (weather?.avoidMiddayOutdoor && site.outdoor && clock >= MIDDAY_START && clock < MIDDAY_END) {
        clock = MIDDAY_END
      }

      const start = clock
      const end = start + site.durationMinutes
      clock = end
      previous = site

      return {
        site,
        travelMinutes: travel,
        startMinutes: start,
        endMinutes: end,
        startLabel: formatClock(start),
        endLabel: formatClock(end),
        reason: buildReason(site, interests, weather),
      }
    })

    return {
      day: index + 1,
      weather,
      stops,
      totalMinutes: stops.reduce((sum, stop) => sum + stop.site.durationMinutes, 0),
    }
  })

  return {
    days: plannedDays.filter((day) => day.stops.length > 0),
    excluded: leftovers,
    prefs: { interests, days, pace },
  }
}

/**
 * يُرجع سبب اختيار المحطة كمفتاح ترجمة + بياناته.
 * الواجهة تترجم عبر renderReason أدناه.
 */
function buildReason(site, interests, weather) {
  const matched = site.interests.filter((interest) => interests.includes(interest))

  if (weather?.windyWarning && site.outdoor) return { key: 'reason.wind' }
  if (weather?.avoidMiddayOutdoor && !site.outdoor) return { key: 'reason.indoor' }
  if (weather?.avoidMiddayOutdoor && site.outdoor) return { key: 'reason.outdoor' }
  if (matched.length > 0) return { key: 'reason.interest', interests: matched }
  if (site.unesco) return { key: 'reason.unesco' }
  return { key: 'reason.bestTime', time: site.bestTime }
}

/**
 * يحوّل كائن السبب إلى جملة بلغة المستخدم.
 * @param {object} reason - ناتج buildReason
 * @param {(key: string, vars?: object) => string} t
 */
export function renderReason(reason, t) {
  if (reason.interests) {
    const joined = reason.interests
      .map((interest) => t(`interestShort.${interest}`))
      .join(` ${t('common.and')} `)
    return t(reason.key, { interests: joined })
  }
  if (reason.time) {
    return t(reason.key, { time: t(`time.${reason.time}`) })
  }
  return t(reason.key)
}

/** مفتاح ترجمة أفضل وقت للزيارة. */
export function bestTimeKey(bestTime) {
  return `time.${bestTime in TIME_ORDER ? bestTime : 'any'}`
}

/** 510 → "8:30 ص" (الرمز يأتي من مفاتيح غير مترجمة عمدًا: ص/م عالميّة في السياق). */
export function formatClock(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours24 = Math.floor(normalized / 60)
  const minutes = normalized % 60
  const period = hours24 < 12 ? 'ص' : 'م'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * يختار صيغة الساعة المناسبة للغة.
 * العربية والفارسية والأردية تستخدم ص/م؛ البقية 24 ساعة (الأوضح عالميًا).
 */
export function formatClockFor(totalMinutes, language) {
  return ['ar', 'fa', 'ur'].includes(language)
    ? formatClock(totalMinutes)
    : formatClock24(totalMinutes)
}

/** صيغة 24 ساعة — أوضح للغات غير العربية. */
export function formatClock24(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
