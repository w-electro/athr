import { describe, it, expect } from 'vitest'
import { toSpeechLang, pickVoice, listVoices } from '../lib/speech.js'
import { LANGUAGES } from '../i18n/languages.js'

/** يبني صوتًا وهميًا بشكل SpeechSynthesisVoice. */
function voice(lang, name, localService = true) {
  return { lang, name, localService }
}

describe('رموز لغات النطق', () => {
  it('يمرّر الرموز القياسية كما هي', () => {
    expect(toSpeechLang('ar')).toBe('ar')
    expect(toSpeechLang('ja')).toBe('ja')
    expect(toSpeechLang('sw')).toBe('sw')
  })

  /**
   * المتصفحات لا تعرف رموز الكتابة (zh-Hans) بل رموز البلد (zh-CN).
   * بدون هذه الترجمة يفشل اختيار الصوت الصيني صمتًا.
   */
  it('يحوّل رموز الكتابة الصينية إلى رموز البلد', () => {
    expect(toSpeechLang('zh-Hans')).toBe('zh-CN')
    expect(toSpeechLang('zh-Hant')).toBe('zh-TW')
  })

  it('يعطي رمزًا غير فارغ لكل لغة مدعومة', () => {
    for (const language of LANGUAGES) {
      expect(toSpeechLang(language.code)).toBeTruthy()
    }
  })
})

describe('اختيار الصوت', () => {
  const voices = [
    voice('en-US', 'Samantha'),
    voice('ar-SA', 'Maged'),
    voice('ar-EG', 'Laila'),
    voice('ja-JP', 'Kyoko'),
    voice('fr-FR', 'Thomas', false),
  ]

  it('يطابق باللغة الأساسية حتى مع اختلاف البلد', () => {
    expect(pickVoice(voices, 'ar').lang).toMatch(/^ar/)
    expect(pickVoice(voices, 'ja').name).toBe('Kyoko')
  })

  it('يفضّل المطابقة التامة للبلد حين تتوفّر', () => {
    expect(pickVoice(voices, 'ar-EG').name).toBe('Laila')
  })

  /**
   * حارس لعلّة مسموعة: كانت النسخة الأولى تُفضّل الصوت المحلي دائمًا،
   * فتختار الصوت المضغوط الرديء بينما يقف بجانبه صوت عصبيّ أفضل بكثير.
   */
  it('يفضّل الصوت عالي الجودة على المضغوط الافتراضي', () => {
    const mixed = [
      voice('de-DE', 'German Compact', true),
      voice('de-DE', 'Anna (Premium)', true),
    ]
    expect(pickVoice(mixed, 'de').name).toBe('Anna (Premium)')
  })

  it('يتعرّف على دلائل الجودة في أسماء الأنظمة المختلفة', () => {
    for (const name of ['Google العربية', 'Siri Voice 2', 'Microsoft Neural', 'Zira Enhanced']) {
      const pool = [voice('ar-SA', 'Compact Basic'), voice('ar-SA', name)]
      expect(pickVoice(pool, 'ar').name).toBe(name)
    }
  })

  /**
   * بلا اتصال يصبح الصوت الشبكي عديم الفائدة مهما كانت جودته — وهذه هي
   * الحالة الفعلية في جبة.
   */
  it('يقصر الاختيار على الأصوات المحلية حين لا يوجد اتصال', () => {
    const mixed = [voice('de-DE', 'Cloud Premium', false), voice('de-DE', 'Local Hans', true)]
    expect(pickVoice(mixed, 'de', { requireOffline: true }).name).toBe('Local Hans')
    // ومع الاتصال تتقدّم الجودة
    expect(pickVoice(mixed, 'de').name).toBe('Cloud Premium')
  })

  it('يقبل صوتًا شبكيًا بلا اتصال بدل الصمت إن لم يوجد محلي', () => {
    const onlyCloud = [voice('fr-FR', 'Cloud Thomas', false)]
    expect(pickVoice(onlyCloud, 'fr', { requireOffline: true }).name).toBe('Cloud Thomas')
  })

  it('يقبل الصوت الشبكي إن لم يوجد محلي', () => {
    expect(pickVoice(voices, 'fr').name).toBe('Thomas')
  })

  it('يُرجع كل أصوات اللغة مرتّبة ليختار المستخدم', () => {
    const pool = [
      voice('ar-SA', 'Compact Basic'),
      voice('ar-EG', 'Laila Premium'),
      voice('en-US', 'Samantha'),
    ]
    const options = listVoices(pool, 'ar')
    expect(options).toHaveLength(2)
    expect(options[0].name).toBe('Laila Premium')
    expect(options.map((entry) => entry.name)).not.toContain('Samantha')
  })

  it('يتعامل مع الشرطة السفلية في رموز أندرويد', () => {
    expect(pickVoice([voice('ta_IN', 'Tamil')], 'ta').name).toBe('Tamil')
  })

  /**
   * حين لا يملك الجهاز صوتًا للغة، يجب أن نُرجع null بوضوح ليتراجع
   * المشغّل إلى العرض النصّي — لا أن ننطق بلكنة خاطئة.
   */
  it('يُرجع null بدل صوت بلغة خاطئة', () => {
    expect(pickVoice(voices, 'ta')).toBeNull()
    expect(pickVoice(voices, 'sw')).toBeNull()
  })

  /**
   * حارس: الرداءة تُنزِّل الترتيب ولا تُخرج من القائمة. جهازٌ لا يملك إلا
   * صوتًا مضغوطًا يجب أن ينطق بصوتٍ متواضع، لا أن يصمت.
   */
  it('يستخدم الصوت المضغوط إن كان الوحيد المتاح', () => {
    const only = [voice('ar-SA', 'Arabic Compact')]
    expect(pickVoice(only, 'ar')?.name).toBe('Arabic Compact')
    expect(listVoices(only, 'ar')).toHaveLength(1)
  })

  it('يتحمّل قائمة فارغة أو رمزًا مفقودًا', () => {
    expect(pickVoice([], 'ar')).toBeNull()
    expect(pickVoice(voices, '')).toBeNull()
    expect(pickVoice(undefined, 'ar')).toBeNull()
  })
})
