/**
 * محرّك بناء مسار الرحلة.
 *
 * دوال خالصة (pure) بلا أي اعتماد على React أو على لغة معيّنة — لذلك
 * تُختبر مباشرة، وتعمل مع الـ28 لغة دون نسخة لكل واحدة.
 *
 * القاعدة: هذا الملف لا يُنتج نصًا بشريًا. يُرجع مفاتيح ترجمة، والواجهة تترجم.
 */

import { getAllSites } from '../data/sites.js'
import { legBetween, haversineKm, HAIL_CENTER } from './geo.js'

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

/**
 * بداية مبكّرة للأيام البعيدة (6:00 صباحًا).
 *
 * الشويمس على بعد ثلاث ساعات قيادة: الانطلاق الثامنة يعني الوصول بعد
 * الظهر، والنقوش لا تُقرأ في ضوءٍ عموديّ — تحتاج ضوءًا مائلًا يُبرز عمق
 * النقر. فيومٌ مثل هذا يبدأ قبل الفجر عند أهل الميدان، لا في الثامنة.
 */
const EARLY_START_MINUTES = 6 * 60
const EARLY_START_DRIVE_HOURS = 2

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

/**
 * زمن التنقّل بين محطتين.
 *
 * ── ما كان خطأً هنا ──────────────────────────────────────────────────
 * كانت النسخة السابقة تطرح بُعد كل موقع عن حائل: |95 − 2| ثم تقسم.
 * وهذا يعطي نتائج خاطئة بنيويًا، لأن موقعين يبعد كلٌّ منهما عشرين
 * كيلومترًا عن حائل في اتجاهين متضادّين يظهران «متجاورين» وبينهما أربعون
 * كيلومترًا فعلًا. الآن نحسب من الإحداثيات مباشرةً — الإحداثيات نفسها
 * التي تُبنى منها روابط الخرائط، فلا يمكن أن يتناقض الرقم مع الدبّوس.
 */
export function travelMinutesBetween(fromSite, toSite) {
  if (!fromSite || !toSite) return 0
  return legBetween(fromSite, toSite).minutes
}

/** المسافة والزمن معًا — تعرضهما الواجهة كما هما. */
export function legFor(fromSite, toSite) {
  return legBetween(fromSite, toSite)
}

/**
 * يرتّب محطات اليوم الواحد.
 *
 * المعيار الأول هو وقت الزيارة الأنسب (القشلة تفتح مساءً، والنقوش تُقرأ
 * في ضوء الصباح المائل)، وداخل كل مجموعة نسلك أقرب محطة تالية — وهي
 * خوارزمية الجار الأقرب: ليست مثالية رياضيًا، لكنها مع ثلاث أو أربع
 * محطات تعطي الترتيب الأمثل عمليًا وتوفّر على الزائر عشرات الكيلومترات.
 *
 * وفي يوم حارّ أو مغبر تتقدّم المواقع المكشوفة إلى الصباح.
 */
export function orderStopsForDay(sites, weather) {
  const shiftOutdoor = Boolean(weather?.avoidMiddayOutdoor || weather?.windyWarning)

  const grouped = [...sites].sort((a, b) => {
    if (shiftOutdoor && a.outdoor !== b.outdoor) return a.outdoor ? -1 : 1
    return (TIME_ORDER[a.bestTime] ?? 1) - (TIME_ORDER[b.bestTime] ?? 1)
  })

  // الجار الأقرب داخل كل مجموعة وقت، انطلاقًا من حائل
  const ordered = []
  const remaining = [...grouped]
  let cursor = { coords: HAIL_CENTER }

  while (remaining.length > 0) {
    const rank = (site) => TIME_ORDER[site.bestTime] ?? 1
    const earliest = Math.min(...remaining.map(rank))
    const pool = remaining.filter((site) => rank(site) === earliest)

    const next = pool.reduce((best, site) =>
      haversineKm(cursor.coords, site.coords) < haversineKm(cursor.coords, best.coords)
        ? site
        : best,
    )

    ordered.push(next)
    remaining.splice(remaining.indexOf(next), 1)
    cursor = next
  }

  return ordered
}

/**
 * تحذيرات الوصول — مفاتيح ترجمة لا نصّ.
 *
 * سببها الشويمس: 250 كم جنوب حائل وآخر الطريق ترابي. مخطّطٌ يضعها بين
 * محطّتين داخل المدينة يبني يومًا مستحيلًا وهو واثق.
 */
export function accessWarnings(site) {
  const access = site.access ?? {}
  const warnings = []

  if (access.offRoad) warnings.push({ key: 'access.offRoad' })
  if (access.guideRequired) warnings.push({ key: 'access.guide' })
  if (access.drivingHours >= 2) {
    warnings.push({ key: 'access.farDrive', hours: Math.round(access.drivingHours) })
  }

  return warnings
}

/**
 * يوزّع المواقع المختارة على الأيام حسب السعة الزمنية لكل يوم.
 *
 * المواقع الموسومة fullDay تحتجز يومًا كاملًا لنفسها: الشويمس تبعد 250 كم
 * والذهاب والإياب وحدهما نحو ستّ ساعات، فوضعها بجانب محطّةٍ أخرى يبني
 * يومًا لا يمكن تنفيذه فعلًا مهما بدا مرتّبًا على الشاشة.
 */
function distributeAcrossDays(sites, days, capacity) {
  const buckets = Array.from({ length: days }, () => ({ sites: [], used: 0, locked: false }))
  const leftovers = []

  // نبدأ بالمواقع التي تحتاج يومًا كاملًا حتى تأخذ أيامها قبل الازدحام
  const ordered = [...sites].sort(
    (a, b) => Number(Boolean(b.access?.fullDay)) - Number(Boolean(a.access?.fullDay)),
  )

  for (const site of ordered) {
    if (site.access?.fullDay) {
      const free = buckets.find((bucket) => bucket.sites.length === 0)
      if (free) {
        free.sites.push(site)
        free.used = capacity
        free.locked = true
      } else {
        leftovers.push(site)
      }
      continue
    }

    const candidate = buckets
      .filter((bucket) => !bucket.locked && bucket.used + site.durationMinutes + 30 <= capacity)
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

    // يومٌ أوّلُ محطّاته بعيدة يبدأ مبكّرًا، وإلا ضاع الصباح في الطريق
    const needsEarlyStart = ordered.some(
      (site) => site.access?.fullDay || (site.access?.drivingHours ?? 0) >= EARLY_START_DRIVE_HOURS,
    )
    let clock = needsEarlyStart ? EARLY_START_MINUTES : DAY_START_MINUTES
    // اليوم يبدأ من حائل لا من العدم: الطريق إلى المحطّة الأولى وقتٌ
    // حقيقيّ يقضيه الزائر، وإغفاله يجعل كلّ ساعات اليوم متفائلةً كذبًا
    let previous = { coords: HAIL_CENTER, access: {} }

    const stops = ordered.map((site) => {
      const leg = legBetween(previous, site)
      const travel = leg.minutes
      clock += travel

      // موقع مكشوف في يوم حار لا يبدأ داخل نافذة الظهيرة
      if (weather?.avoidMiddayOutdoor && site.outdoor && clock >= MIDDAY_START && clock < MIDDAY_END) {
        clock = MIDDAY_END
      }

      const start = clock
      const end = start + site.durationMinutes
      clock = end

      // نلتقط المصدر قبل إزاحة المؤشّر، وإلا صار «من» هو الموقعَ نفسه
      const cameFromHail = previous.coords === HAIL_CENTER
      const originCoords = previous.coords
      previous = site

      return {
        site,
        travelMinutes: travel,
        travelKm: leg.km,
        // من أين جاء الزائر إلى هنا — «من حائل» أو المحطّة السابقة.
        // fromCoords تُبنى منها الملاحة: من حيث سيكون فعلًا، لا من موقعه الآن.
        fromHail: cameFromHail,
        fromCoords: originCoords,
        startMinutes: start,
        endMinutes: end,
        startLabel: formatClock(start),
        endLabel: formatClock(end),
        reason: buildReason(site, interests, weather),
        warnings: accessWarnings(site),
      }
    })

    return {
      day: index + 1,
      weather,
      stops,
      totalMinutes: stops.reduce((sum, stop) => sum + stop.site.durationMinutes, 0),
      // مجموع الطريق: يشمل رجلة الخروج من حائل، لا ما بين المحطّات فقط
      totalKm: stops.reduce((sum, stop) => sum + stop.travelKm, 0),
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
