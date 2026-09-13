import { describe, it, expect } from 'vitest'
import {
  PANELS,
  SUBJECTS,
  ERAS,
  getAllPanels,
  getPanelById,
  getPanelsForSite,
  hasPanelContent,
  isPanelId,
  siteIdOfPanel,
} from '../data/panels.js'
import { getSiteById } from '../data/sites.js'
import ar from '../i18n/locales/ar.js'

/**
 * حارس طبقة اللوحات.
 *
 * اللوحة أدقّ من الموقع: «أنت في جبة» يعرفه الزائر سلفًا، أمّا «هذه اللوحة
 * وما فيها» فهو ما جاء من أجله. وهذه الطبقة جديدة، فأخطاؤها لم تظهر بعد.
 */

describe('بنية اللوحات', () => {
  it('لكل لوحة معرّف فريد يتبع نمط الموقع', () => {
    const ids = PANELS.map((panel) => panel.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const panel of PANELS) {
      expect(isPanelId(panel.id), `${panel.id} لا يطابق النمط`).toBe(true)
      // الموقع يُستخرج من الاسم لا من جدول ربط
      expect(siteIdOfPanel(panel.id)).toBe(panel.siteId)
    }
  })

  it('ينتمي كل معرّف إلى موقع موجود فعلًا', () => {
    for (const panel of PANELS) {
      expect(getSiteById(panel.siteId), `موقع مجهول: ${panel.siteId}`).toBeDefined()
    }
  })

  it('يعطي كل لوحة الحقول التي تحتاجها الشاشة', () => {
    for (const panel of PANELS) {
      expect(panel.name.trim()).not.toBe('')
      expect(panel.story.length).toBeGreaterThan(80)
      expect(panel.look.trim()).not.toBe('')
      expect(SUBJECTS[panel.subject], `موضوع مجهول: ${panel.subject}`).toBeDefined()
      expect(ERAS[panel.era], `حقبة مجهولة: ${panel.era}`).toBeDefined()
      expect(typeof panel.hasInscriptions).toBe('boolean')
    }
  })

  it('يميّز معرّف اللوحة من معرّف الموقع', () => {
    expect(isPanelId('jubbah-p2')).toBe(true)
    expect(isPanelId('jubbah-p10')).toBe(true)
    expect(isPanelId('jubbah')).toBe(false)
    expect(isPanelId('shuwaymis')).toBe(false)
    expect(isPanelId(null)).toBe(false)
    expect(siteIdOfPanel('jubbah')).toBeNull()
  })

  it('يجمع لوحات الموقع الواحد', () => {
    const jubbah = getPanelsForSite('jubbah')
    expect(jubbah.length).toBe(PANELS.length)
    expect(getPanelsForSite('qishlah')).toEqual([])
  })

  /** مفاتيح الحِقب والمواضيع تُترجم في الواجهة، فلا بدّ أن توجد فعلًا. */
  it('لكل حقبة مفتاح ترجمة عربي', () => {
    for (const era of Object.keys(ERAS)) {
      expect(ar.era[era], `مفقود: era.${era}`).toBeTruthy()
      expect(ar.era[`${era}Short`], `مفقود: era.${era}Short`).toBeTruthy()
    }
  })
})

describe('تراجع اللوحات قبل اكتمال الترجمة', () => {
  /**
   * الميزة عربية أولًا عن قصد. والمطلوب أن تغيب عن بقيّة اللغات لا أن
   * تظهر فيها بنصّ عربي — فقصّةٌ عربية داخل واجهة يابانية عطبٌ مرئيّ،
   * بينما غيابُها يُعيد الشاشة إلى سلوكها السابق تمامًا.
   */
  it('تعرض اللوحات بالعربية', () => {
    expect(hasPanelContent('ar')).toBe(true)
    expect(getAllPanels('ar')).toHaveLength(PANELS.length)
    expect(getPanelById('jubbah-p2', 'ar').name).toBe('مَلِك جبة')
  })

  /*
    نستعمل رمزًا لا ملفَ محتوى له إطلاقًا، لا لغةً حقيقية: اللغات الحقيقية
    تُترجم واحدةً بعد أخرى، فاختبارٌ مبنيٌّ على بقاء إحداها بلا ترجمة
    ينقلب فاشلًا لحظةَ نجاح الترجمة — وهو يفحص حالةَ المشروع لا المنطق.
  */
  it('تُخفي اللوحات في لغة بلا ترجمة بدل تسريب العربية', () => {
    const untranslated = 'zz'
    expect(getAllPanels(untranslated)).toEqual([])
    expect(getPanelById('jubbah-p2', untranslated)).toBeUndefined()
    expect(hasPanelContent(untranslated)).toBe(false)
  })

  it('يعيد undefined لمعرّف مجهول', () => {
    expect(getPanelById('jubbah-p99', 'ar')).toBeUndefined()
    expect(getPanelById('nope', 'ar')).toBeUndefined()
  })
})

describe('دقّة المحتوى', () => {
  /** «ملك جبة» أشهر ما في الموقع، ويُقصد من خارج البلاد. */
  it('يعلّم ملك جبة بأنه الأشهر', () => {
    const king = getPanelById('jubbah-p2', 'ar')
    expect(king.famous).toBe(true)
    expect(king.subject).toBe('human')
    expect(king.era).toBe('neolithic')
  })

  /**
   * التسمية «ملك» تفسيرٌ شعبيّ لا حقيقة أثرية، والنصّ يجب أن يقولها
   * تفسيرًا. ادّعاءُ اليقين في نقشٍ لا نصّ معه خطأٌ يكشفه أول مختصّ.
   */
  it('يعرض تسمية الملك تفسيرًا لا حقيقة مقرّرة', () => {
    const story = getPanelById('jubbah-p2', 'ar').story
    expect(story).toMatch(/سمّاه|يصفه|قرأه/)
  })

  it('يسم اللوحات التي تحمل كتابات ثمودية', () => {
    const withText = PANELS.filter((panel) => panel.hasInscriptions).map((panel) => panel.id)
    expect(withText).toEqual(['jubbah-p7', 'jubbah-p9', 'jubbah-p10'])
  })

  /** الجِمال متأخّرة لأنها لم تُدجَّن إلا قبل نحو ثلاثة آلاف عام. */
  it('يضع الجِمال في الحقبة المتأخّرة لا الحجرية', () => {
    for (const panel of PANELS.filter((entry) => entry.subject === 'camel')) {
      expect(['later', 'thamudic'], `${panel.id} في حقبة خاطئة`).toContain(panel.era)
    }
  })
})
