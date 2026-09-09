import { describe, it, expect } from 'vitest'
import { loadedContentMap } from '../data/content/index.js'
import { SITES, getSiteById, getAllSites } from '../data/sites.js'
import { LANGUAGES, FULL_CONTENT_LANGUAGES } from '../i18n/languages.js'

// الذاكرة مملوءة مسبقًا في src/test/setup.js
const CONTENT_BY_LANGUAGE = loadedContentMap()

/**
 * حارس المحتوى التراثي المترجم.
 *
 * أربعة مواقع × 29 لغة = محتوى كثير يسهل أن يتشقّق فيه شيء بصمت: فصل ناقص،
 * توقيت سرد مختلف، نصيحة ضائعة. هذه الاختبارات تكشف ذلك قبل المستخدم.
 */

const CONTENT_LANGUAGES = Object.keys(CONTENT_BY_LANGUAGE)
const SITE_IDS = SITES.map((site) => site.id)

describe('تغطية المحتوى', () => {
  it('يترجم المحتوى لكل لغة معلن أنها كاملة', () => {
    for (const code of FULL_CONTENT_LANGUAGES) {
      // العربية أساس مكتوب داخل sites.js نفسه، فلا ملف طبقة لها
      if (code === 'ar') continue
      expect(CONTENT_BY_LANGUAGE[code], `محتوى مفقود: ${code}`).toBeDefined()
    }
  })

  it('يعلن أن الـ29 لغة كلها تملك محتوى كاملًا', () => {
    expect(FULL_CONTENT_LANGUAGES).toHaveLength(LANGUAGES.length)
    expect(CONTENT_LANGUAGES).toHaveLength(LANGUAGES.length - 1) // ما عدا العربية
  })

  it.each(CONTENT_LANGUAGES)('اللغة %s تغطّي المواقع الأربعة', (code) => {
    expect(Object.keys(CONTENT_BY_LANGUAGE[code]).sort()).toEqual([...SITE_IDS].sort())
  })

  it.each(CONTENT_LANGUAGES)('اللغة %s تحمل كل الحقول النصية المطلوبة', (code) => {
    for (const siteId of SITE_IDS) {
      const site = CONTENT_BY_LANGUAGE[code][siteId]
      for (const field of ['name', 'shortName', 'subtitle', 'tagline', 'era', 'city', 'ticket']) {
        expect(String(site[field] ?? '').trim(), `${code}/${siteId}/${field}`).not.toBe('')
      }
    }
  })

  /**
   * الحد الأدنى لطول الفصل يختلف باختلاف الكتابة.
   *
   * الصينية تكتب المعنى نفسه بعدد حروف أقلّ بكثير من اللغات الأبجدية:
   * فقرة من 109 محارف صينية تعادل نحو 250 محرفًا إنجليزيًا. قياسها بالمسطرة
   * نفسها كان سيرفض نصًّا سليمًا تمامًا.
   */
  const MIN_BODY = { 'zh-Hans': 70, 'zh-Hant': 70, ja: 90, ko: 90, th: 90 }

  it.each(CONTENT_LANGUAGES)('اللغة %s تحمل أربعة فصول لكل موقع', (code) => {
    const minimum = MIN_BODY[code] ?? 120
    for (const siteId of SITE_IDS) {
      const { story } = CONTENT_BY_LANGUAGE[code][siteId]
      expect(story, `${code}/${siteId}`).toHaveLength(4)
      for (const chapter of story) {
        expect(chapter.heading.trim()).not.toBe('')
        // نص قصصي حقيقي لا عبارة قصيرة
        expect(chapter.body.length, `${code}/${siteId}: فصل قصير`).toBeGreaterThan(minimum)
      }
    }
  })

  it.each(CONTENT_LANGUAGES)('اللغة %s تحمل الحقائق والنصائح كاملة', (code) => {
    for (const siteId of SITE_IDS) {
      const site = CONTENT_BY_LANGUAGE[code][siteId]
      expect(site.facts, `${code}/${siteId}/facts`).toHaveLength(4)
      for (const fact of site.facts) {
        expect(String(fact.label).trim()).not.toBe('')
        expect(String(fact.value).trim()).not.toBe('')
      }
      expect(site.tips.length, `${code}/${siteId}/tips`).toBeGreaterThanOrEqual(3)
    }
  })

  /**
   * الأهم: توقيتات السرد بنيوية لا نصية. لو اختلف توقيت في ترجمة، لخرج
   * النص عن التزامن مع شريط التشغيل في تلك اللغة وحدها.
   */
  it.each(CONTENT_LANGUAGES)('اللغة %s تحافظ على توقيتات السرد الأصلية', (code) => {
    for (const siteId of SITE_IDS) {
      const base = SITES.find((site) => site.id === siteId).narration.segments
      const translated = CONTENT_BY_LANGUAGE[code][siteId].narration.segments

      expect(translated, `${code}/${siteId}: عدد المقاطع`).toHaveLength(base.length)
      expect(translated.map((segment) => segment.at)).toEqual(base.map((segment) => segment.at))

      for (const segment of translated) {
        expect(String(segment.text).trim(), `${code}/${siteId}@${segment.at}`).not.toBe('')
      }
    }
  })

  it.each(CONTENT_LANGUAGES)('اللغة %s تحمل تسمية مسح وثلاثة أدلة', (code) => {
    for (const siteId of SITE_IDS) {
      const { scan } = CONTENT_BY_LANGUAGE[code][siteId]
      expect(String(scan.matchLabel).trim(), `${code}/${siteId}`).not.toBe('')
      expect(scan.evidence, `${code}/${siteId}`).toHaveLength(3)
    }
  })
})

describe('دمج المحتوى مع البنية', () => {
  it('يعيد الاسم المترجم مع الاحتفاظ بالبنية المشتركة', () => {
    const ar = getSiteById('jubbah', 'ar')
    const ja = getSiteById('jubbah', 'ja')

    // النص يتغيّر
    expect(ja.name).not.toBe(ar.name)
    // والبنية لا تتغيّر أبدًا
    expect(ja.coords).toEqual(ar.coords)
    expect(ja.durationMinutes).toBe(ar.durationMinutes)
    expect(ja.photos).toEqual(ar.photos)
    expect(ja.unesco).toBe(ar.unesco)
    expect(ja.narration.totalSeconds).toBe(ar.narration.totalSeconds)
    expect(ja.scan.confidence).toBe(ar.scan.confidence)
  })

  it.each(LANGUAGES.map((language) => language.code))(
    'اللغة %s تعطي مواقع كاملة بلا تسرّب لغة أخرى',
    (code) => {
      const sites = getAllSites(code)
      expect(sites).toHaveLength(4)
      for (const site of sites) {
        expect(site.name.trim()).not.toBe('')
        expect(site.story).toHaveLength(4)
        // العربية وحدها يُسمح لها بحروف عربية في الأسماء
        if (!['ar', 'fa', 'ur'].includes(code)) {
          expect(site.name, `${code}: تسرّب نص عربي`).not.toMatch(/نقوش جبة الصخرية/)
        }
      }
    },
  )

  it('لا يترك أي لغة تتراجع إلى الإنجليزية بعد اكتمال الترجمة', () => {
    for (const language of LANGUAGES) {
      const site = getSiteById('museum', language.code)
      if (language.code === 'en') continue
      expect(site.name, `${language.code} يتراجع للإنجليزية`).not.toBe('Hail Regional Museum')
    }
  })
})
