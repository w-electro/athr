import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  roadKm,
  driveMinutes,
  legBetween,
  mapsPlaceUrl,
  mapsDirectionsUrl,
  mapsRouteUrl,
  HAIL_CENTER,
} from '../lib/geo.js'
import { getSiteById, getAllSites } from '../data/sites.js'

/**
 * اختبارات المسافات وروابط الخرائط.
 *
 * سبب وجودها: كان إحداثي جبة يبعد نحو سبعة كيلومترات عن جبل أُمّ سِنمان،
 * فكان زرّ الخريطة يفتح رملًا خاليًا — وهو عطبٌ لا تكشفه الشاشة لأنها
 * تعرض زرًّا يعمل. الرقم وحده يكشفه.
 */

describe('حساب المسافة', () => {
  it('يعطي صفرًا للنقطة نفسها', () => {
    expect(haversineKm(HAIL_CENTER, HAIL_CENTER)).toBe(0)
  })

  it('يتعامل مع النقص بلا انهيار', () => {
    expect(haversineKm(null, HAIL_CENTER)).toBe(0)
    expect(haversineKm(HAIL_CENTER, undefined)).toBe(0)
  })

  it('متماثل في الاتجاهين', () => {
    const a = { lat: 28.005, lng: 40.915 }
    const b = { lat: 27.511, lng: 41.691 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6)
  })

  /** درجة عرض واحدة تساوي نحو 111 كم في كل مكان على الأرض. */
  it('يطابق المعيار المعروف لدرجة العرض', () => {
    const km = haversineKm({ lat: 27, lng: 41 }, { lat: 28, lng: 41 })
    expect(km).toBeGreaterThan(110)
    expect(km).toBeLessThan(112)
  })

  it('يجعل مسافة الطريق أطول من الخطّ المستقيم', () => {
    const a = { lat: 28.005, lng: 40.915 }
    expect(roadKm(HAIL_CENTER, a)).toBeGreaterThan(haversineKm(HAIL_CENTER, a))
  })
})

describe('زمن القيادة', () => {
  it('لا يقلّ عن عشر دقائق ما دام هناك انتقال', () => {
    expect(driveMinutes(0.4)).toBe(10)
  })

  it('صفر لمسافة صفر', () => {
    expect(driveMinutes(0)).toBe(0)
  })

  it('يبطئ على الطريق الترابي', () => {
    expect(driveMinutes(200, true)).toBeGreaterThan(driveMinutes(200, false))
  })

  it('يبطئ داخل المدينة عنه على الطريق السريع', () => {
    // نفس المسافة لا تُقارن؛ نقارن السرعة الضمنية لكل نطاق
    const cityPace = driveMinutes(10) / 10
    const highwayPace = driveMinutes(100) / 100
    expect(cityPace).toBeGreaterThan(highwayPace)
  })
})

describe('المسافات الحقيقية بين مواقع حائل', () => {
  /**
   * حارس للعلّة الأصلية: جبل أُمّ سِنمان يبعد عن حائل نحو 95 كم برًّا.
   * الإحداثي الخاطئ السابق كان يعطي رقمًا مختلفًا ويقع في الرمل.
   */
  it('تبعد جبة عن حائل ما يقارب المسافة المعلنة', () => {
    const jubbah = getSiteById('jubbah')
    const km = roadKm(HAIL_CENTER, jubbah.coords)
    expect(km).toBeGreaterThan(80)
    expect(km).toBeLessThan(120)
  })

  it('تفصل أَعَيْرِف عن القشلة مسافةُ مشيٍ قصيرة لا صفر', () => {
    const leg = legBetween(getSiteById('aarif'), getSiteById('qishlah'))
    expect(leg.km).toBeGreaterThanOrEqual(1)
    expect(leg.km).toBeLessThan(4)
  })

  it('تبعد الشويمس مسافةً تستحقّ يومًا كاملًا', () => {
    const km = roadKm(HAIL_CENTER, getSiteById('shuwaymis').coords)
    expect(km).toBeGreaterThan(200)
  })

  it('يبطئ الطريق إلى الشويمس لأنه ترابي', () => {
    const shuwaymis = getSiteById('shuwaymis')
    const jubbah = getSiteById('jubbah')
    const hail = { coords: HAIL_CENTER, access: {} }

    // مسافة أطول وسرعة أقلّ: لا بدّ أن يتجاوز الزمن ثلاث ساعات
    expect(legBetween(hail, shuwaymis).minutes).toBeGreaterThan(180)
    expect(legBetween(hail, jubbah).minutes).toBeLessThan(120)
  })
})

describe('روابط الخرائط', () => {
  const jubbah = getSiteById('jubbah')

  /**
   * الإحداثيات لا الأسماء. البحث بالاسم يفشل بصمت: «جبة» اسم شائع،
   * و«قصر أعيرف» يُكتب بصور عدّة — وقد يُنزل الزائرَ في مدينة أخرى.
   */
  it('يبني رابط موقع بالإحداثيات لا بالاسم', () => {
    const url = mapsPlaceUrl(jubbah.coords)
    expect(url).toContain('google.com/maps/search/')
    expect(url).toContain(`query=${jubbah.coords.lat},${jubbah.coords.lng}`)
    expect(url).not.toMatch(/[؀-ۿ]/)
  })

  it('يبني رابط ملاحة في وضع القيادة', () => {
    const url = mapsDirectionsUrl(jubbah.coords, HAIL_CENTER)
    expect(url).toContain('travelmode=driving')
    expect(decodeURIComponent(url)).toContain(`origin=${HAIL_CENTER.lat},${HAIL_CENTER.lng}`)
  })

  it('يعيد null بلا إحداثيات بدل رابطٍ معطوب', () => {
    expect(mapsPlaceUrl(null)).toBeNull()
    expect(mapsRouteUrl([])).toBeNull()
  })

  it('يبني مسار يوم كامل بالمحطّات مرتّبة', () => {
    const stops = [
      { site: getSiteById('aarif') },
      { site: getSiteById('qishlah') },
      { site: getSiteById('museum') },
    ]
    const url = decodeURIComponent(mapsRouteUrl(stops))

    expect(url).toContain('maps/dir/')
    // الأخيرة وجهة، وما قبلها محطّات وسيطة بالترتيب نفسه
    const museum = getSiteById('museum')
    expect(url).toContain(`destination=${museum.coords.lat},${museum.coords.lng}`)
    expect(url).toContain('waypoints=')

    const aarif = getSiteById('aarif')
    const qishlah = getSiteById('qishlah')
    const waypoints = url.split('waypoints=')[1].split('&')[0]
    expect(waypoints).toBe(`${aarif.coords.lat},${aarif.coords.lng}|${qishlah.coords.lat},${qishlah.coords.lng}`)
  })

  it('ينطلق المسار من حائل افتراضيًا', () => {
    const url = decodeURIComponent(mapsRouteUrl([{ site: jubbah }]))
    expect(url).toContain(`origin=${HAIL_CENTER.lat},${HAIL_CENTER.lng}`)
  })

  it('يبني رابطًا صالحًا لكل موقع في القائمة', () => {
    for (const site of getAllSites()) {
      const url = mapsPlaceUrl(site.coords)
      expect(() => new URL(url)).not.toThrow()
      expect(url).toMatch(/query=-?\d+\.\d+,-?\d+\.\d+$/)
    }
  })
})
