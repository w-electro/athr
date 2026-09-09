import { describe, it, expect, beforeEach } from 'vitest'
import { recognizeSite, resetMockCursor, ANALYSIS_STAGES } from '../lib/recognition.js'
import { getAllSites } from '../data/sites.js'

describe('طبقة التعرّف على الصور', () => {
  beforeEach(() => {
    resetMockCursor()
  })

  it('يعيد نتيجة بالشكل الموحّد المتفق عليه', async () => {
    const result = await recognizeSite({ instant: true }, { provider: 'mock' })

    expect(result).toMatchObject({
      status: expect.stringMatching(/^(match|no-match)$/),
      siteId: expect.any(String),
      confidence: expect.any(Number),
      provider: 'mock',
    })
  })

  /**
   * حارس لعلّة حقيقية وقعت: كانت المحاكاة تُرجع اسم الموقع وأدلّته نصًّا
   * عربيًا جاهزًا، فتظهر نتيجة المسح بالعربية مهما كانت لغة الواجهة.
   * القاعدة الآن: هذه الطبقة تُرجع معرّفًا لا نصًّا، والواجهة هي التي تترجم.
   */
  it('لا يُرجع نصًا بشريًا — المعرّف فقط، لتترجمه الواجهة', async () => {
    const result = await recognizeSite({ instant: true, siteId: 'jubbah' }, { provider: 'mock' })

    expect(result.label).toBeUndefined()
    expect(result.evidence).toBeUndefined()
  })

  it('يتعرّف على الموقع المطلوب حين يُمرَّر siteId صراحة', async () => {
    const result = await recognizeSite({ instant: true, siteId: 'jubbah' }, { provider: 'mock' })

    expect(result.status).toBe('match')
    expect(result.siteId).toBe('jubbah')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('يطابق بالكلمات المفتاحية', async () => {
    const result = await recognizeSite(
      { instant: true, hint: 'صورة قصر طيني قديم' },
      { provider: 'mock' },
    )

    expect(result.siteId).toBe('qishlah')
  })

  it('يقرّ بعدم التعرّف بدل التخمين', async () => {
    const result = await recognizeSite({ instant: true, hint: '__none__' }, { provider: 'mock' })

    expect(result.status).toBe('no-match')
    expect(result.siteId).toBeNull()
    expect(result.confidence).toBeLessThan(0.5)
    expect(result.label).toBeUndefined()
  })

  it('يدور على المواقع بالتتابع حتى لا تتكرر النتيجة', async () => {
    const first = await recognizeSite({ instant: true }, { provider: 'mock' })
    const second = await recognizeSite({ instant: true }, { provider: 'mock' })

    expect(first.siteId).not.toBe(second.siteId)
  })

  it('لا ينهار عند فشل مزوّد حقيقي بل يعيد نتيجة واضحة', async () => {
    // claudeProvider يرمي حين لا توجد صورة — والغلاف يجب أن يلتقط الخطأ
    const result = await recognizeSite({}, { provider: 'claude' })

    expect(result.error).toBe(true)
    expect(result.status).toBe('no-match')
  })

  it('يمنح كل موقع بيانات مسح صالحة', () => {
    for (const site of getAllSites()) {
      expect(site.scan.keywords.length).toBeGreaterThan(0)
      expect(site.scan.confidence).toBeGreaterThan(0.5)
      expect(site.scan.confidence).toBeLessThanOrEqual(1)
      expect(site.scan.evidence.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('يعرّف مراحل تحليل مرئية للمستخدم', () => {
    expect(ANALYSIS_STAGES.length).toBeGreaterThanOrEqual(3)
    for (const stage of ANALYSIS_STAGES) {
      expect(stage.label).toBeTruthy()
      expect(stage.ms).toBeGreaterThan(0)
    }
  })
})
