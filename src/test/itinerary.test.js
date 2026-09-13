import { describe, it, expect } from 'vitest'
import {
  buildItinerary,
  scoreSite,
  orderStopsForDay,
  travelMinutesBetween,
  legFor,
  accessWarnings,
  renderReason,
  bestTimeKey,
  formatClock,
  formatClock24,
  formatClockFor,
} from '../lib/itinerary.js'
import { getAllSites, getSiteById, formatDuration } from '../data/sites.js'
import { HAIL_CENTER } from '../lib/geo.js'
import ar from '../i18n/locales/ar.js'
import en from '../i18n/locales/en.js'

/** مترجم مبسّط للاختبارات — نفس منطق الاستبدال في i18n/index.jsx. */
function makeT(locale) {
  return (key, vars) => {
    const value = key.split('.').reduce((acc, part) => acc?.[part], locale)
    if (typeof value !== 'string') return key
    return vars
      ? value.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match))
      : value
  }
}

const tAr = makeT(ar)
const tEn = makeT(en)

describe('محرّك بناء الرحلة', () => {
  it('يعطي أولوية للمواقع المطابقة للاهتمامات', () => {
    expect(scoreSite(getSiteById('aja'), ['nature'])).toBeGreaterThan(
      scoreSite(getSiteById('museum'), ['nature']),
    )
  })

  it('يمنح مواقع اليونسكو دفعة حتى لا تسقط من الرحلات القصيرة', () => {
    expect(scoreSite(getSiteById('jubbah'), [])).toBeGreaterThan(
      scoreSite(getSiteById('museum'), []),
    )
  })

  it('يبني يومًا واحدًا برحلة يوم واحد ولا يتجاوز السعة', () => {
    const plan = buildItinerary({ interests: ['history'], days: 1, pace: 'relaxed' })
    expect(plan.days).toHaveLength(1)
    const used = plan.days[0].stops.reduce((sum, stop) => sum + stop.site.durationMinutes, 0)
    expect(used).toBeLessThanOrEqual(240)
  })

  it('يوزّع المواقع على ثلاثة أيام دون تكرار موقع', () => {
    const plan = buildItinerary({ interests: ['history', 'nature'], days: 3, pace: 'balanced' })
    const ids = plan.days.flatMap((day) => day.stops.map((stop) => stop.site.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('يحسب كل موقع إما مجدولًا أو مستبعدًا — لا يضيع أي موقع', () => {
    const plan = buildItinerary({ interests: [], days: 1, pace: 'relaxed' })
    const scheduled = plan.days.reduce((sum, day) => sum + day.stops.length, 0)
    expect(scheduled + plan.excluded.length).toBe(getAllSites().length)
  })

  it('يشمل مواقع المدينة كلّها في رحلة ثلاثة أيام', () => {
    const plan = buildItinerary({ interests: ['history', 'nature'], days: 3, pace: 'packed' })
    const scheduled = plan.days.reduce((sum, day) => sum + day.stops.length, 0)
    expect(scheduled).toBeGreaterThanOrEqual(5)
  })

  /**
   * الشويمس تبعد 250 كم وآخر طريقها ترابي: الذهاب والإياب وحدهما نحو ستّ
   * ساعات. مخطّطٌ يضعها بجانب محطّةٍ أخرى يبني يومًا لا يُنفَّذ.
   */
  it('يفرد يومًا كاملًا للشويمس وحدها', () => {
    const plan = buildItinerary({ interests: ['history'], days: 3, pace: 'packed' })
    const day = plan.days.find((d) => d.stops.some((s) => s.site.id === 'shuwaymis'))

    if (day) expect(day.stops).toHaveLength(1)
    else expect(plan.excluded.map((s) => s.id)).toContain('shuwaymis')
  })

  it('يحذّر من الطريق الترابي والمرشد المطلوب في الشويمس', () => {
    expect(accessWarnings(getSiteById('shuwaymis')).map((w) => w.key)).toEqual(
      expect.arrayContaining(['access.offRoad', 'access.guide', 'access.farDrive']),
    )
    expect(accessWarnings(getSiteById('qishlah'))).toHaveLength(0)
  })

  /**
   * يومٌ فيه ثلاث ساعات قيادة لا يبدأ في الثامنة: الانطلاق المتأخّر يعني
   * الوصول بعد الظهر، والنقوش لا تُقرأ في ضوءٍ عموديّ.
   */
  it('يبدأ اليوم البعيد مبكّرًا', () => {
    const plan = buildItinerary({ interests: ['history'], days: 3, pace: 'packed' })
    const remote = plan.days.find((d) => d.stops.some((s) => s.site.id === 'shuwaymis'))
    const near = plan.days.find((d) => d.stops.every((s) => !s.site.access?.fullDay))

    if (remote) {
      // البداية 6:00 لا 8:00 — نستدلّ عليها من زمن أول محطّة ناقصًا الطريق
      expect(remote.stops[0].startMinutes - remote.stops[0].travelMinutes).toBe(6 * 60)
    }
    if (near) {
      expect(near.stops[0].startMinutes - near.stops[0].travelMinutes).toBe(8 * 60)
    }
  })

  it('يحتسب الطريق من حائل إلى المحطّة الأولى', () => {
    const plan = buildItinerary({ interests: ['history'], days: 1, pace: 'balanced' })
    const first = plan.days[0].stops[0]
    expect(first.fromHail).toBe(true)
    expect(first.travelMinutes).toBeGreaterThan(0)
  })

  /**
   * الملاحة تنطلق من المحطّة السابقة لا من حائل دائمًا.
   *
   * الزائر يضغط الزرّ وهو واقفٌ عند المحطّة السابقة، لا في فندقه. ورابطٌ
   * ينطلق من حائل يعطيه مسارًا يعود به إلى المدينة ثم يخرج منها ثانية.
   */
  it('يسلسل نقطة الانطلاق من محطّة إلى التي تليها', () => {
    const plan = buildItinerary({ interests: ['history', 'culture'], days: 3, pace: 'packed' })
    // الشويمس تحتجز يومًا لنفسها، فنأخذ أطول يومٍ متعدّد المحطّات
    const stops = plan.days
      .map((day) => day.stops)
      .sort((a, b) => b.length - a.length)[0]
    expect(stops.length).toBeGreaterThan(1)

    expect(stops[0].fromCoords).toEqual(HAIL_CENTER)
    for (let i = 1; i < stops.length; i += 1) {
      expect(stops[i].fromCoords).toEqual(stops[i - 1].site.coords)
      expect(stops[i].fromHail).toBe(false)
    }
  })

  it('يحسب أوقات بداية ونهاية متسلسلة بلا تداخل', () => {
    const plan = buildItinerary({ interests: ['history'], days: 2, pace: 'packed' })
    for (const day of plan.days) {
      for (let i = 1; i < day.stops.length; i += 1) {
        expect(day.stops[i].startMinutes).toBeGreaterThanOrEqual(day.stops[i - 1].endMinutes)
      }
    }
  })

  it('يبني المسار بأسماء المواقع بلغة المستخدم', () => {
    const plan = buildItinerary({ interests: ['history'], days: 2, pace: 'balanced', language: 'en' })
    const names = plan.days.flatMap((day) => day.stops.map((stop) => stop.site.name))
    expect(names.join(' ')).toMatch(/[A-Za-z]/)
    expect(names.join(' ')).not.toMatch(/[؀-ۿ]/)
  })
})

describe('التفاعل مع الطقس', () => {
  const hotDay = { avoidMiddayOutdoor: true, windyWarning: false, highC: 42 }

  it('يقدّم المواقع المكشوفة على المغلقة في اليوم الحار', () => {
    const ordered = orderStopsForDay([getSiteById('museum'), getSiteById('jubbah')], hotDay)
    expect(ordered[0].outdoor).toBe(true)
    expect(ordered[ordered.length - 1].outdoor).toBe(false)
  })

  it('لا يبدأ موقعًا مكشوفًا داخل نافذة الظهيرة في يوم حار', () => {
    const plan = buildItinerary({ interests: [], days: 1, pace: 'packed' }, [{ ...hotDay, day: 1 }])
    for (const stop of plan.days[0].stops) {
      if (stop.site.outdoor) {
        const insideMidday = stop.startMinutes >= 12 * 60 && stop.startMinutes < 16 * 60
        expect(insideMidday).toBe(false)
      }
    }
  })

  it('يعطي كل محطة سببًا بمفتاح ترجمة صالح', () => {
    const plan = buildItinerary({ interests: ['nature'], days: 2, pace: 'balanced' })
    for (const day of plan.days) {
      for (const stop of day.stops) {
        expect(stop.reason.key).toMatch(/^reason\./)
        // السبب يُترجم فعليًا ولا يعود كمفتاح خام
        expect(renderReason(stop.reason, tAr)).not.toBe(stop.reason.key)
        expect(renderReason(stop.reason, tEn)).not.toBe(stop.reason.key)
      }
    }
  })

  it('يترجم سبب الاهتمام بأسماء الاهتمامات لا برموزها', () => {
    const reason = { key: 'reason.interest', interests: ['history', 'nature'] }
    expect(renderReason(reason, tEn)).toBe('Matches your interest in history and nature.')
    expect(renderReason(reason, tAr)).toContain('التاريخ')
    expect(renderReason(reason, tAr)).not.toContain('history')
  })

  it('يترجم سبب الوقت المثالي', () => {
    expect(renderReason({ key: 'reason.bestTime', time: 'morning' }, tEn)).toBe(
      'Best visited in the Morning.',
    )
  })
})

describe('أدوات مساعدة', () => {
  it('يحسب زمن تنقّل معقولًا بحد أدنى عشر دقائق', () => {
    // داخل المدينة: قصيرٌ لكن ليس صفرًا — ركوبٌ ووقوفٌ ومشي
    expect(travelMinutesBetween(getSiteById('museum'), getSiteById('qishlah'))).toBe(10)
    expect(travelMinutesBetween(getSiteById('qishlah'), getSiteById('jubbah'))).toBeGreaterThan(60)
  })

  /**
   * حارس لعلّة بنيوية في النسخة السابقة: كانت تطرح بُعد كل موقع عن حائل،
   * فموقعان على البعد نفسه في اتجاهين متضادّين يظهران متلاصقين.
   * أَعَيْرِف والمتحف يبعدان عن حائل بالقدر نفسه تقريبًا لكنهما متباعدان.
   */
  it('يقيس المسافة بين الموقعين لا فرق بعدهما عن حائل', () => {
    // موقعان على بُعدٍ متساوٍ من حائل لكن في اتجاهين متضادّين. الحساب
    // القديم (طرح البعدين) كان يعطي صفرًا، والحقيقة نحو أربعين كيلومترًا.
    const north = { coords: { lat: 27.69, lng: 41.6907 }, distanceFromHailKm: 20, access: {} }
    const south = { coords: { lat: 27.33, lng: 41.6907 }, distanceFromHailKm: 20, access: {} }

    expect(Math.abs(north.distanceFromHailKm - south.distanceFromHailKm)).toBe(0)
    expect(legFor(north, south).km).toBeGreaterThan(40)
  })

  it('لا يحسب تنقّلًا للمحطة الأولى', () => {
    expect(travelMinutesBetween(null, getSiteById('jubbah'))).toBe(0)
  })

  it('يصيغ الوقت بنظام 12 ساعة للعربية', () => {
    expect(formatClock(8 * 60)).toBe('8:00 ص')
    expect(formatClock(13 * 60 + 30)).toBe('1:30 م')
    expect(formatClock(12 * 60)).toBe('12:00 م')
    expect(formatClock(0)).toBe('12:00 ص')
  })

  it('يصيغ الوقت بنظام 24 ساعة لبقية اللغات', () => {
    expect(formatClock24(8 * 60)).toBe('08:00')
    expect(formatClock24(13 * 60 + 30)).toBe('13:30')
    expect(formatClockFor(13 * 60, 'ar')).toBe('1:00 م')
    expect(formatClockFor(13 * 60, 'ja')).toBe('13:00')
    expect(formatClockFor(13 * 60, 'fa')).toBe('1:00 م')
  })

  it('يصيغ المدة بالعربية', () => {
    expect(formatDuration(150, tAr)).toBe('ساعتان ونصف')
    expect(formatDuration(90, tAr)).toBe('ساعة ونصف')
    expect(formatDuration(45, tAr)).toBe('45 دقيقة')
    expect(formatDuration(180, tAr)).toBe('3 ساعات')
  })

  it('يصيغ المدة بالإنجليزية', () => {
    expect(formatDuration(150, tEn)).toBe('2 hours 30 min')
    expect(formatDuration(90, tEn)).toBe('1 hour 30 min')
    expect(formatDuration(45, tEn)).toBe('45 min')
    expect(formatDuration(180, tEn)).toBe('3 hours')
  })

  it('يعطي مفتاح ترجمة صالحًا لأفضل وقت', () => {
    expect(bestTimeKey('morning')).toBe('time.morning')
    expect(bestTimeKey('whenever')).toBe('time.any')
  })
})
