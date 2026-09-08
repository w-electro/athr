/**
 * محرّك بناء مسار الرحلة.
 *
 * دوال خالصة (pure) بلا أي اعتماد على React — لذلك تُختبر مباشرة وتُعاد
 * كتابتها لاحقًا بنموذج ذكاء اصطناعي دون لمس الواجهة.
 *
 * المدخلات: تفضيلات المستخدم + توقّعات الطقس.
 * المخرجات: أيام مرتّبة، كل يوم فيه محطات لها وقت بداية ونهاية وسبب اختيار.
 */

import { getAllSites, formatDuration } from '../data/sites.js'

/** إيقاع الرحلة → الدقائق المتاحة للزيارة في اليوم الواحد. */
export const PACES = {
  relaxed: { id: 'relaxed', label: 'متأنٍّ', hint: 'موقع أو اثنان في اليوم', capacity: 240 },
  balanced: { id: 'balanced', label: 'متوازن', hint: 'يوم مليء بلا إرهاق', capacity: 340 },
  packed: { id: 'packed', label: 'مكثّف', hint: 'أقصى تغطية ممكنة', capacity: 460 },
}

export const DURATION_OPTIONS = [
  { days: 1, label: 'يوم واحد' },
  { days: 2, label: 'يومان' },
  { days: 3, label: 'ثلاثة أيام' },
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
 * التقاطع الأكبر = أولوية أعلى. مواقع اليونسكو تأخذ دفعة صغيرة لأنها
 * الأثر الأهم في المنطقة ولا يليق أن تسقط من رحلة قصيرة.
 */
export function scoreSite(site, interests = []) {
  const overlap = site.interests.filter((i) => interests.includes(i)).length
  const unescoBoost = site.unesco ? 1.5 : 0
  const coverageBoost = interests.length === 0 ? 1 : 0 // بلا اهتمامات: الكل متساوٍ
  return overlap * 2 + unescoBoost + coverageBoost
}

/** تقدير زمن التنقّل بين محطتين انطلاقًا من بُعد كل منهما عن مركز حائل. */
export function travelMinutesBetween(fromSite, toSite) {
  if (!fromSite) return 0
  const deltaKm = Math.abs(toSite.distanceFromHailKm - fromSite.distanceFromHailKm)
  // متوسط 1.1 كم/دقيقة على طرق المنطقة، مع حد أدنى 15 دقيقة للتنقل داخل المدينة
  return Math.max(15, Math.round(deltaKm / 1.1))
}

/**
 * يرتّب محطات اليوم الواحد.
 * القاعدة: في يوم حار أو مغبر، تُدفع المواقع المكشوفة إلى الصباح
 * والمواقع المغلقة إلى الظهيرة. غير ذلك نحترم الوقت المثالي لكل موقع.
 */
export function orderStopsForDay(sites, weather) {
  const shiftOutdoor = Boolean(weather?.avoidMiddayOutdoor || weather?.windyWarning)

  return [...sites].sort((a, b) => {
    if (shiftOutdoor && a.outdoor !== b.outdoor) {
      return a.outdoor ? -1 : 1 // المكشوف أولًا (صباحًا)
    }
    const orderDiff = (TIME_ORDER[a.bestTime] ?? 1) - (TIME_ORDER[b.bestTime] ?? 1)
    if (orderDiff !== 0) return orderDiff
    // الأبعد أولًا لتجنّب الذهاب والعودة مرتين
    return b.distanceFromHailKm - a.distanceFromHailKm
  })
}

/** يوزّع المواقع المختارة على الأيام حسب السعة الزمنية لكل يوم. */
function distributeAcrossDays(sites, days, capacity) {
  const buckets = Array.from({ length: days }, () => ({ sites: [], used: 0 }))
  const leftovers = []

  for (const site of sites) {
    // نضعه في اليوم الأقل امتلاءً الذي يتسع له
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
 * @param {object} prefs
 * @param {string[]} prefs.interests
 * @param {number} prefs.days
 * @param {string} prefs.pace
 * @param {Array} forecast - ناتج fetchForecast (قد يكون null قبل الفحص)
 */
export function buildItinerary(prefs, forecast = null) {
  const { interests = [], days = 2, pace = 'balanced' } = prefs
  const capacity = (PACES[pace] || PACES.balanced).capacity

  const ranked = getAllSites()
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

      // إن كان الموقع مكشوفًا والطقس يحذّر، لا نبدأه داخل نافذة الظهيرة
      if (
        weather?.avoidMiddayOutdoor &&
        site.outdoor &&
        clock >= MIDDAY_START &&
        clock < MIDDAY_END
      ) {
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
        durationLabel: formatDuration(site.durationMinutes),
        reason: buildReason(site, interests, weather),
      }
    })

    return {
      day: index + 1,
      dayLabel: weather?.dayLabel || `اليوم ${index + 1}`,
      weather,
      stops,
      totalMinutes: stops.reduce((sum, s) => sum + s.durationMinutes || 0, 0),
    }
  })

  return {
    days: plannedDays.filter((day) => day.stops.length > 0),
    excluded: leftovers,
    prefs: { interests, days, pace },
  }
}

/** جملة قصيرة تشرح لماذا وُضع هذا الموقع في هذا الوقت. */
function buildReason(site, interests, weather) {
  const matched = site.interests.filter((i) => interests.includes(i))

  if (weather?.windyWarning && site.outdoor) {
    return 'قدّمناه إلى الصباح الباكر تفاديًا للرياح والأتربة بعد الظهر.'
  }
  if (weather?.avoidMiddayOutdoor && !site.outdoor) {
    return 'موقع مغلق ومكيّف — وضعناه في أحرّ ساعات اليوم.'
  }
  if (weather?.avoidMiddayOutdoor && site.outdoor) {
    return 'موقع مكشوف، جدولناه خارج نافذة الظهيرة الحارة.'
  }
  if (matched.length > 0) {
    return `يناسب اهتمامك بـ${matched.map(interestLabel).join(' و')}.`
  }
  if (site.unesco) {
    return 'موقع تراث عالمي — لا تكتمل زيارة حائل بدونه.'
  }
  return `أفضل وقت لزيارته: ${bestTimeLabel(site.bestTime)}.`
}

const INTEREST_LABELS = {
  history: 'التاريخ',
  nature: 'الطبيعة',
  photography: 'التصوير',
  culture: 'الثقافة',
  family: 'الأنشطة العائلية',
}

function interestLabel(id) {
  return INTEREST_LABELS[id] || id
}

export function bestTimeLabel(bestTime) {
  return { morning: 'الصباح', afternoon: 'بعد الظهر', evening: 'قبل الغروب' }[bestTime] || 'أي وقت'
}

/** 510 → "8:30 ص" */
export function formatClock(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours24 = Math.floor(normalized / 60)
  const minutes = normalized % 60
  const period = hours24 < 12 ? 'ص' : 'م'
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}
