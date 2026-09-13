import { describe, it, expect } from 'vitest'
import { getAllSites, getSiteById, CATEGORIES, INTERESTS } from '../data/sites.js'
import { haversineKm, HAIL_CENTER } from '../lib/geo.js'

/**
 * حارس سلامة البيانات.
 *
 * هذه الاختبارات هي شبكة الأمان حين تضيف مواقع جديدة بعد زيارتك الميدانية:
 * أي موقع ناقص حقلًا تعتمد عليه إحدى الشاشات سيسقط هنا لا أمام اللجنة.
 */
describe('بيانات المواقع', () => {
  const sites = getAllSites()

  it('يحتوي المواقع التراثية الستّة', () => {
    expect(sites).toHaveLength(6)
    expect(sites.map((site) => site.id)).toEqual([
      'jubbah',
      'aarif',
      'qishlah',
      'aja',
      'museum',
      'shuwaymis',
    ])
  })

  /**
   * أَعَيْرِف والقشلة معلمان منفصلان يفصل بينهما نحو كيلومتر ونصف. كانا
   * مدمجين في مدخل واحد، فكان دبّوس الخريطة يصل إلى أحدهما فقط.
   */
  it('يفصل أَعَيْرِف عن القشلة بإحداثيين مختلفين', () => {
    const aarif = getSiteById('aarif')
    const qishlah = getSiteById('qishlah')
    expect(aarif.coords).not.toEqual(qishlah.coords)
    expect(haversineKm(aarif.coords, qishlah.coords)).toBeGreaterThan(0.5)
    expect(haversineKm(aarif.coords, qishlah.coords)).toBeLessThan(3)
  })

  /**
   * حارس لعلّة حقيقية: كان إحداثي جبة يبعد نحو سبعة كيلومترات عن جبل
   * أُمّ سِنمان، فينزل الزائرَ في رملٍ خالٍ. نتحقّق أنّ كل موقع قريب من
   * مدينته المعلنة بما يتّسق مع distanceFromHailKm.
   */
  it('تتّسق الإحداثيات مع المسافة المعلنة عن حائل', () => {
    for (const site of sites) {
      const actual = haversineKm(HAIL_CENTER, site.coords)
      // نسمح بفارقٍ معقول لأن المعلن مسافة طريق والمحسوب خطّ مستقيم
      expect(actual).toBeLessThanOrEqual(site.distanceFromHailKm + 15)
      expect(actual).toBeGreaterThanOrEqual(site.distanceFromHailKm * 0.5 - 5)
    }
  })

  it('يجلب موقعًا بالمعرّف ويعيد undefined للمجهول', () => {
    expect(getSiteById('jubbah').name).toBe('نقوش جبة الصخرية')
    expect(getSiteById('unknown')).toBeUndefined()
  })

  it('يعطي كل موقع الحقول التي تحتاجها الشاشات', () => {
    for (const site of sites) {
      expect(site.id).toBeTruthy()
      expect(site.name).toBeTruthy()
      expect(site.tagline).toBeTruthy()
      expect(CATEGORIES[site.category]).toBeDefined()
      expect(site.durationMinutes).toBeGreaterThan(0)
      expect(['morning', 'afternoon', 'evening']).toContain(site.bestTime)
      expect(typeof site.outdoor).toBe('boolean')
      expect(Array.isArray(site.photos)).toBe(true)
    }
  })

  it('يعطي كل موقع قصة تفصيلية ونصائح وحقائق', () => {
    for (const site of sites) {
      expect(site.story.length).toBeGreaterThanOrEqual(3)
      for (const chapter of site.story) {
        expect(chapter.heading).toBeTruthy()
        expect(chapter.body.length).toBeGreaterThan(120)
      }
      expect(site.facts.length).toBeGreaterThanOrEqual(3)
      expect(site.tips.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('يربط اهتمامات كل موقع بقائمة الاهتمامات المعرّفة', () => {
    const known = new Set(INTERESTS.map((interest) => interest.id))
    for (const site of sites) {
      expect(site.interests.length).toBeGreaterThan(0)
      for (const interest of site.interests) {
        expect(known.has(interest)).toBe(true)
      }
    }
  })

  it('يبني سردًا صوتيًا بمقاطع مرتّبة زمنيًا داخل المدة الكلية', () => {
    for (const site of sites) {
      const { segments, totalSeconds } = site.narration
      expect(segments.length).toBeGreaterThanOrEqual(4)
      expect(segments[0].at).toBe(0)

      for (let i = 1; i < segments.length; i += 1) {
        expect(segments[i].at).toBeGreaterThan(segments[i - 1].at)
      }
      expect(segments[segments.length - 1].at).toBeLessThan(totalSeconds)
    }
  })

  it('يضع إحداثيات ضمن نطاق منطقة حائل', () => {
    for (const site of sites) {
      expect(site.coords.lat).toBeGreaterThan(26)
      expect(site.coords.lat).toBeLessThan(29)
      expect(site.coords.lng).toBeGreaterThan(40)
      expect(site.coords.lng).toBeLessThan(43)
    }
  })

  /**
   * إدراج اليونسكو عام 2015م شمل موقعين لا موقعًا واحدًا: جبل أُمّ سِنمان
   * في جبة، وجبلَي المنجور وراط في الشويمس. كان التطبيق يعرض نصفه فقط.
   */
  it('يعلّم جبة والشويمس كموقعَي تراث عالمي', () => {
    const unesco = sites.filter((site) => site.unesco)
    expect(unesco.map((site) => site.id)).toEqual(['jubbah', 'shuwaymis'])
  })
})
