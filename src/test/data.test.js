import { describe, it, expect } from 'vitest'
import { getAllSites, getSiteById, CATEGORIES, INTERESTS } from '../data/sites.js'

/**
 * حارس سلامة البيانات.
 *
 * هذه الاختبارات هي شبكة الأمان حين تضيف مواقع جديدة بعد زيارتك الميدانية:
 * أي موقع ناقص حقلًا تعتمد عليه إحدى الشاشات سيسقط هنا لا أمام اللجنة.
 */
describe('بيانات المواقع', () => {
  const sites = getAllSites()

  it('يحتوي المواقع التراثية الأربعة', () => {
    expect(sites).toHaveLength(4)
    expect(sites.map((site) => site.id)).toEqual(['jubbah', 'qishlah', 'aja', 'museum'])
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

  it('يعلّم جبة وحدها كموقع تراث عالمي', () => {
    const unesco = sites.filter((site) => site.unesco)
    expect(unesco.map((site) => site.id)).toEqual(['jubbah'])
  })
})
