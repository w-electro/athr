import { describe, it, expect } from 'vitest'
import {
  buildItinerary,
  scoreSite,
  orderStopsForDay,
  travelMinutesBetween,
  formatClock,
} from '../lib/itinerary.js'
import { getAllSites, getSiteById, formatDuration } from '../data/sites.js'

describe('محرّك بناء الرحلة', () => {
  it('يعطي أولوية للمواقع المطابقة للاهتمامات', () => {
    const aja = getSiteById('aja') // طبيعة + تصوير + تاريخ
    const museum = getSiteById('museum') // تاريخ + ثقافة + عائلي

    expect(scoreSite(aja, ['nature'])).toBeGreaterThan(scoreSite(museum, ['nature']))
  })

  it('يمنح مواقع اليونسكو دفعة حتى لا تسقط من الرحلات القصيرة', () => {
    const jubbah = getSiteById('jubbah')
    expect(scoreSite(jubbah, [])).toBeGreaterThan(scoreSite(getSiteById('museum'), []))
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

  it('يذكر المواقع التي لم تتسع في قائمة المستبعدات', () => {
    const plan = buildItinerary({ interests: [], days: 1, pace: 'relaxed' })

    const planned = plan.days.flatMap((day) => day.stops.length)
    const totalPlanned = planned.reduce((a, b) => a + b, 0)
    expect(totalPlanned + plan.excluded.length).toBe(getAllSites().length)
  })

  it('يحسب أوقات بداية ونهاية متسلسلة بلا تداخل', () => {
    const plan = buildItinerary({ interests: ['history'], days: 2, pace: 'packed' })

    for (const day of plan.days) {
      for (let i = 1; i < day.stops.length; i += 1) {
        expect(day.stops[i].startMinutes).toBeGreaterThanOrEqual(day.stops[i - 1].endMinutes)
      }
    }
  })
})

describe('التفاعل مع الطقس', () => {
  const hotDay = { avoidMiddayOutdoor: true, windyWarning: false, highC: 42 }

  it('يقدّم المواقع المكشوفة على المغلقة في اليوم الحار', () => {
    const sites = [getSiteById('museum'), getSiteById('jubbah')] // مغلق ثم مكشوف
    const ordered = orderStopsForDay(sites, hotDay)

    expect(ordered[0].outdoor).toBe(true)
    expect(ordered[ordered.length - 1].outdoor).toBe(false)
  })

  it('لا يبدأ موقعًا مكشوفًا داخل نافذة الظهيرة في يوم حار', () => {
    const forecast = [{ ...hotDay, day: 1, dayLabel: 'اليوم الأول' }]
    const plan = buildItinerary({ interests: [], days: 1, pace: 'packed' }, forecast)

    for (const stop of plan.days[0].stops) {
      if (stop.site.outdoor) {
        const insideMidday = stop.startMinutes >= 12 * 60 && stop.startMinutes < 16 * 60
        expect(insideMidday).toBe(false)
      }
    }
  })

  it('يشرح سبب اختيار كل محطة', () => {
    const plan = buildItinerary({ interests: ['nature'], days: 2, pace: 'balanced' })
    for (const day of plan.days) {
      for (const stop of day.stops) {
        expect(stop.reason.length).toBeGreaterThan(5)
      }
    }
  })
})

describe('أدوات مساعدة', () => {
  it('يحسب زمن تنقّل معقولًا بحد أدنى 15 دقيقة', () => {
    const inCity = travelMinutesBetween(getSiteById('museum'), getSiteById('qishlah'))
    const toJubbah = travelMinutesBetween(getSiteById('qishlah'), getSiteById('jubbah'))

    expect(inCity).toBe(15)
    expect(toJubbah).toBeGreaterThan(60)
  })

  it('لا يحسب تنقّلًا للمحطة الأولى', () => {
    expect(travelMinutesBetween(null, getSiteById('jubbah'))).toBe(0)
  })

  it('يصيغ الوقت بنظام 12 ساعة عربيًا', () => {
    expect(formatClock(8 * 60)).toBe('8:00 ص')
    expect(formatClock(13 * 60 + 30)).toBe('1:30 م')
    expect(formatClock(12 * 60)).toBe('12:00 م')
    expect(formatClock(0)).toBe('12:00 ص')
  })

  it('يصيغ المدة بالعربية', () => {
    expect(formatDuration(150)).toBe('ساعتان ونصف')
    expect(formatDuration(90)).toBe('ساعة ونصف')
    expect(formatDuration(45)).toBe('45 دقيقة')
    expect(formatDuration(180)).toBe('3 ساعات')
  })
})
