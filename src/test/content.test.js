import { describe, it, expect } from 'vitest'
import { loadedContentMap, loadedPanelsMap } from '../data/content/index.js'
import { PANELS } from '../data/panels.js'
import { SITES, getSiteById, getAllSites } from '../data/sites.js'
import { LANGUAGES, FULL_CONTENT_LANGUAGES } from '../i18n/languages.js'

// الذاكرة مملوءة مسبقًا في src/test/setup.js
const CONTENT_BY_LANGUAGE = loadedContentMap()
const PANEL_CONTENT = loadedPanelsMap()

/**
 * حارس المحتوى التراثي المترجم.
 *
 * ستّة مواقع × 29 لغة = محتوى كثير يسهل أن يتشقّق فيه شيء بصمت: فصل ناقص،
 * توقيت سرد مختلف، نصيحة ضائعة. هذه الاختبارات تكشف ذلك قبل المستخدم.
 */

const CONTENT_LANGUAGES = Object.keys(CONTENT_BY_LANGUAGE)
const SITE_IDS = SITES.map((site) => site.id)

/** كل نصّ داخل محتوى لغةٍ ما، مسطَّحًا في سلسلة واحدة. */
function allText(content) {
  const parts = []
  const walk = (value) => {
    if (typeof value === 'string') parts.push(value)
    else if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === 'object') Object.values(value).forEach(walk)
  }
  walk(content)
  return parts.join(' ')
}

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

  it.each(CONTENT_LANGUAGES)('اللغة %s تغطّي كل المواقع', (code) => {
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
      // العدد يُشتقّ من البيانات لا يُكتب رقمًا، وإلا تقادم مع كل موقع جديد
      expect(sites).toHaveLength(getAllSites('ar').length)

      for (const site of sites) {
        expect(site.name.trim()).not.toBe('')
        expect(site.story).toHaveLength(4)

        /*
          تسرّب اللغة: حين يُضاف موقع ولا يُترجم، يُرجع localize الأساسَ
          العربي فيظهر نصّ عربي في واجهة يابانية. نقارن بالاسم العربي لكل
          موقع لا بموقع واحد — فالعلّة قد تصيب أيًّا منها.
        */
        if (!['ar', 'fa', 'ur', 'he'].includes(code)) {
          const arabicName = getAllSites('ar').find((s) => s.id === site.id).name
          expect(site.name, `${code}/${site.id}: تسرّب نص عربي`).not.toBe(arabicName)
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

/**
 * تغطية اللوحات.
 *
 * شُحنت الميزة بالعربية أولًا، ثم تُرجمت لغةً بلغة. وهذا الحارس هو ما
 * يُثبت أنّ الدَّين سُدِّد: لو نقصت لوحةٌ في لغةٍ واحدة لعادت تلك اللغة
 * إلى التعرّف على مستوى الموقع بصمت — بلا خطأ ولا تحذير.
 */
describe('تغطية اللوحات في كل اللغات', () => {
  const PANEL_IDS = PANELS.map((panel) => panel.id)

  it('يترجم اللوحات العشر في كل لغة', () => {
    for (const code of CONTENT_LANGUAGES) {
      const translated = PANEL_CONTENT[code]
      expect(translated, `لا لوحات في ${code}`).toBeDefined()
      expect(Object.keys(translated).sort(), `لوحات ناقصة في ${code}`).toEqual(
        [...PANEL_IDS].sort(),
      )
    }
  })

  it.each(CONTENT_LANGUAGES)('اللغة %s تعطي كل لوحة اسمًا وقصّة وإرشادًا', (code) => {
    for (const id of PANEL_IDS) {
      const panel = PANEL_CONTENT[code][id]
      expect(Object.keys(panel).sort(), `${code}/${id}: حقول زائدة`).toEqual([
        'look',
        'name',
        'story',
      ])
      expect(panel.name.trim(), `${code}/${id}`).not.toBe('')
      expect(panel.story.length, `${code}/${id}: قصّة قصيرة`).toBeGreaterThan(60)
      expect(panel.look.trim(), `${code}/${id}`).not.toBe('')
    }
  })

  /** لا لغة تعرض اسم لوحةٍ بالعربية — وهو ما كان يحدث قبل الترجمة. */
  it.each(CONTENT_LANGUAGES.filter((code) => !['fa', 'ur', 'he'].includes(code)))(
    'اللغة %s لا تُبقي اسم لوحة عربيًّا',
    (code) => {
      for (const panel of PANELS) {
        expect(PANEL_CONTENT[code][panel.id].name, `${code}/${panel.id}`).not.toBe(panel.name)
      }
    },
  )
})

/**
 * سلامة الكتابة في المحتوى نفسه لا في الواجهة وحدها.
 *
 * i18n.test.js يحرس نصوص الواجهة، وهي عشرات الكلمات. أمّا المحتوى التراثي
 * فآلاف الكلمات لكل لغة — وهو الأولى بالحراسة لا الأحقّ بالإهمال.
 */
describe('سلامة الكتابات في المحتوى التراثي', () => {
  /**
   * العربية والفارسية والأردية تتشارك الأبجدية لا كلّ الحروف: الفارسية
   * والأردية تكتبان ی (U+06CC) و ک (U+06A9). ووضع الياء أو الكاف العربية
   * مكانهما خطأ إملائيّ يراه القارئ فورًا — وهو أشيع أخطاء التعريب.
   */
  it.each(['fa', 'ur'])('اللغة %s لا تستعمل الياء أو الكاف العربية', (code) => {
    const text = allText(CONTENT_BY_LANGUAGE[code])
    expect(text.match(/[يك]/g) ?? []).toEqual([])
  })

  it('الأردية تكتب بحروفها لا بحروف العربية', () => {
    const text = allText(CONTENT_BY_LANGUAGE.ur)
    expect(text).toContain('ہ') // ہائے مدور
    expect(text).toContain('ے') // بڑی ے
    expect(text).not.toContain('ة') // التاء المربوطة عربية لا أردية
  })

  it('الفارسية تكتب بحروفها', () => {
    const text = allText(CONTENT_BY_LANGUAGE.fa)
    expect(text).toContain('ی')
    expect(text).toContain('ک')

    /*
      التاء المربوطة خطأ في الفارسية إلا في مركّبات عربية ثابتة تُكتب كما
      هي، وأشهرها «جزیرةالعرب». فنستثنيها ثم نتحقّق أنّ ما بقي خالٍ منها
      — الاستثناء المسمّى أدقّ من إلغاء الفحص كلّه.
    */
    expect(text.replaceAll('جزیرةالعرب', '')).not.toContain('ة')
  })

  /**
   * المبسّطة والتقليدية ليستا تحويلَ حروفٍ فحسب، والفرق يجب أن يظهر في
   * النصّ. لو تطابق الملفّان فقد نُسخ أحدهما عن الآخر.
   */
  it('تختلف الصينية المبسّطة عن التقليدية فعلًا', () => {
    const hans = allText(CONTENT_BY_LANGUAGE['zh-Hans'])
    const hant = allText(CONTENT_BY_LANGUAGE['zh-Hant'])
    expect(hans).not.toBe(hant)
    expect(hant).toMatch(/[國學萬鐵歷觀邊車開關實點]/) // حروف تقليدية
  })

  /**
   * الإندونيسية والملايوية متقاربتان جدًّا، وأسهل «ترجمة» بينهما هي النسخ.
   * لا نطلب اختلافًا في كل جملة، بل ألّا يكون الملفّان نسخةً واحدة.
   */
  it('تختلف الملايوية عن الإندونيسية', () => {
    expect(allText(CONTENT_BY_LANGUAGE.ms)).not.toBe(allText(CONTENT_BY_LANGUAGE.id))
  })

  /**
   * اسم القلعة كما يسمّيه أهل حائل: «أَعَيْرِف»، وهي الصورة المسجَّلة في
   * OpenStreetMap أيضًا («قلعة أعيرف»).
   *
   * وقد شاع في الكتابة «قصر عارف»، وهي الصورة التي كان التطبيق يحملها.
   * تصحيحُ اسمٍ عبر تسعٍ وعشرين لغة يسهل أن يعود بعضُه بصمت مع أول تعديل
   * لاحق، فنحرسه هنا بدل أن نكتشفه من زائرٍ محليّ.
   */
  it.each(CONTENT_LANGUAGES)('اللغة %s لا تحمل «عارف» اسمًا للقلعة', (code) => {
    const text = allText(CONTENT_BY_LANGUAGE[code])

    /*
      الكلمة كاملةً لا كجزءٍ منها. الخطّ العربي يصل الكلمات ببعضها، فكلمة
      «تعارفي» الأردية تحتوي حروف «عارف» وهي كلمة أخرى تمامًا — ومطابقةُ
      الجزء تُسقط اختبارًا صحيحًا على نصٍّ سليم.
    */
    const ARABIC_LETTER = '؀-ۿ'
    expect(text, `${code}: عادت «عارف»`).not.toMatch(
      new RegExp(`(?<![${ARABIC_LETTER}])عارف(?![${ARABIC_LETTER}])`),
    )
  })

  it('يسمّي العربيةُ القلعةَ بصيغتها المحلّية', () => {
    const aarif = getAllSites('ar').find((site) => site.id === 'aarif')
    expect(aarif.name).toBe('قلعة أَعَيْرِف')
    expect(aarif.shortName).toBe('أَعَيْرِف')
  })

  /** ولا يبقى أثرٌ للصيغة الوسيطة «عَيْرِف» التي مرّ بها التصحيح. */
  it.each(CONTENT_LANGUAGES)('اللغة %s تحمل اسم القلعة كاملًا', (code) => {
    const name = CONTENT_BY_LANGUAGE[code].aarif.name
    expect(name.trim()).not.toBe('')
    expect(name).not.toMatch(/\bAyrif\b/)
  })

  /** لا لغة تترك نصًّا عربيًّا مسرَّبًا في وسط محتواها. */
  it.each(CONTENT_LANGUAGES.filter((code) => !['fa', 'ur'].includes(code)))(
    'اللغة %s لا تحمل جملةً عربية مسرَّبة',
    (code) => {
      const text = allText(CONTENT_BY_LANGUAGE[code])
      // كلمات عربية بعينها وردت في الأصل، ولا موضع لها في لغةٍ أخرى
      for (const word of ['ولمّا', 'وإذا', 'الذي', 'حتى إنّ']) {
        expect(text, `${code}: تسرّب «${word}»`).not.toContain(word)
      }
    },
  )
})
