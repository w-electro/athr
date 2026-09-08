import { describe, it, expect } from 'vitest'
import {
  buildItinerary,
  scoreSite,
  orderStopsForDay,
  travelMinutesBetween,
  renderReason,
  bestTimeKey,
  formatClock,
  formatClock24,
  formatClockFor,
} from '../lib/itinerary.js'
import { getAllSites, getSiteById, formatDuration } from '../data/sites.js'
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

  it('يشمل المواقع الأربعة في رحلة يومين بإيقاع متوازن', () => {
    // الإيقاع المتوازن رُفع إلى 360 دقيقة تحديدًا ليتسع لكل المواقع في يومين
    const plan = buildItinerary({ interests: ['history', 'nature'], days: 2, pace: 'balanced' })
    const scheduled = plan.days.reduce((sum, day) => sum + day.stops.length, 0)
    expect(scheduled).toBe(4)
    expect(plan.excluded).toHaveLength(0)
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
  it('يحسب زمن تنقّل معقولًا بحد أدنى 15 دقيقة', () => {
    expect(travelMinutesBetween(getSiteById('museum'), getSiteById('qishlah'))).toBe(15)
    expect(travelMinutesBetween(getSiteById('qishlah'), getSiteById('jubbah'))).toBeGreaterThan(60)
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
