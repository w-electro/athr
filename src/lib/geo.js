/**
 * حساب المسافات وروابط الخرائط.
 *
 * دوال خالصة بلا React وبلا نصّ بشري — تُرجع أرقامًا وعناوين فقط.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا الإحداثيات لا أسماء المواقع في روابط الخرائط
 * ══════════════════════════════════════════════════════════════════════
 * البحث بالاسم يفشل بصمت وبخطورة: «جبة» اسم شائع، و«قصر أعيرف» يُكتب
 * بصور عدّة (أعيرف/اعيرف/عارف)، وخرائط جوجل قد تُنزل الزائر في مدينة
 * أخرى وهو واثق أنه يتبع التطبيق. الإحداثيات لا تلتبس.
 */

/** مركز مدينة حائل — نقطة الانطلاق المفترضة لكل رحلة. */
export const HAIL_CENTER = { lat: 27.5114, lng: 41.6907 }

const EARTH_RADIUS_KM = 6371

/**
 * معامل الطريق: المسافة المقطوعة بالسيارة أطول من الخطّ المستقيم.
 *
 * وليس معاملًا واحدًا، لأن الالتفاف ليس واحدًا: داخل المدينة تلتفّ حول
 * مبانٍ وإشاراتٍ واتجاهاتٍ إجبارية، وعلى طريق الصحراء بين حائل وجبة
 * يمتدّ الأسفلت شبه مستقيم. معاملٌ واحد يبالغ في الطويل أو يقصّر القصير.
 */
const ROAD_FACTOR_CITY = 1.35
const ROAD_FACTOR_HIGHWAY = 1.15

/** متوسّط السرعة بالكيلومتر في الساعة. */
const SPEED_HIGHWAY = 90 // طرق سريعة بين المدن
const SPEED_CITY = 35 // داخل حائل
const SPEED_TRACK = 45 // طرق ترابية تحتاج دفعًا رباعيًا

/** دون هذه المسافة نعدّ التنقّل داخل المدينة. */
const CITY_RADIUS_KM = 15

const toRadians = (degrees) => (degrees * Math.PI) / 180

/**
 * المسافة بين نقطتين على سطح الأرض بالكيلومتر (صيغة هافرساين).
 *
 * نحسبها من الإحداثيات نفسها التي تُبنى منها روابط الخرائط، فلا يمكن
 * أن تتباعد المسافة المعروضة عن الدبّوس الذي يفتحه الزائر.
 */
export function haversineKm(from, to) {
  if (!from || !to) return 0

  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)

  const a =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** مسافة الطريق التقريبية — الخطّ المستقيم مضروبًا بمعامل الطريق. */
export function roadKm(from, to) {
  const direct = haversineKm(from, to)
  return direct * (direct <= CITY_RADIUS_KM ? ROAD_FACTOR_CITY : ROAD_FACTOR_HIGHWAY)
}

/**
 * زمن القيادة بالدقائق.
 *
 * @param {number} km        مسافة الطريق
 * @param {boolean} offRoad  جزء من الطريق ترابي (الشويمس مثلًا)
 */
export function driveMinutes(km, offRoad = false) {
  if (km <= 0) return 0
  const speed = offRoad ? SPEED_TRACK : km <= CITY_RADIUS_KM ? SPEED_CITY : SPEED_HIGHWAY

  // حدٌّ أدنى عشر دقائق: بين أَعَيْرِف والقشلة كيلومترٌ ونصف، لكن الانتقال
  // ليس قيادةً فقط — ركوبٌ ووقوفٌ ومشيٌ إلى المدخل. الرقم الخام يكذب تفاؤلًا.
  return Math.max(10, Math.round((km / speed) * 60))
}

/** المسافة والزمن بين موقعين في كائن واحد. */
export function legBetween(fromSite, toSite) {
  if (!fromSite || !toSite) return { km: 0, minutes: 0 }

  const km = roadKm(fromSite.coords, toSite.coords)
  const offRoad = Boolean(fromSite.access?.offRoad || toSite.access?.offRoad)

  return { km: Math.round(km), minutes: driveMinutes(km, offRoad) }
}

/* ──────────────────────────── روابط الخرائط ──────────────────────────── */

/**
 * يفتح الخرائط على نقطة بعينها.
 *
 * نمرّر الاسم في المعامل الاختياري query_place_id? لا — الصيغة الرسمية
 * تقبل إحداثيات في query مباشرةً، وهي ما نستعمله.
 * https://developers.google.com/maps/documentation/urls/get-started
 */
export function mapsPlaceUrl(coords) {
  if (!coords) return null
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
}

/** يفتح تطبيق الملاحة مباشرةً في وضع القيادة. */
export function mapsDirectionsUrl(coords, origin = null) {
  if (!coords) return null

  const params = new URLSearchParams({
    api: '1',
    destination: `${coords.lat},${coords.lng}`,
    travelmode: 'driving',
  })
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`)

  return `https://www.google.com/maps/dir/?${params}`
}

/**
 * مسار يوم كامل بترتيبه.
 *
 * جوجل يقبل تسع محطات وسيطة كحدّ أقصى، ومحطاتنا في اليوم الواحد أقلّ من
 * ذلك بكثير — لكننا نقصّها صراحةً بدل أن نرسل رابطًا يرفضه الخادم بصمت.
 */
const MAX_WAYPOINTS = 9

export function mapsRouteUrl(stops, origin = HAIL_CENTER) {
  const points = stops.map((stop) => stop.site?.coords ?? stop.coords).filter(Boolean)
  if (points.length === 0) return null

  const destination = points[points.length - 1]
  const waypoints = points.slice(0, -1).slice(0, MAX_WAYPOINTS)

  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
  })
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map((p) => `${p.lat},${p.lng}`).join('|'))
  }

  return `https://www.google.com/maps/dir/?${params}`
}
