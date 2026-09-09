import { describe, it, expect } from 'vitest'
import { toSpeechLang, pickVoice } from '../lib/speech.js'
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
   * الصوت المحلي يعمل بلا إنترنت — وهذا شرط جوهري لتطبيق يُستخدم في
   * موقع أثري بلا تغطية، لا مجرد تفضيل أداء.
   */
  it('يفضّل الصوت المحلي على الصوت الشبكي', () => {
    const mixed = [voice('de-DE', 'Cloud Anna', false), voice('de-DE', 'Local Hans', true)]
    expect(pickVoice(mixed, 'de').name).toBe('Local Hans')
  })

  it('يقبل الصوت الشبكي إن لم يوجد محلي', () => {
    expect(pickVoice(voices, 'fr').name).toBe('Thomas')
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

  it('يتحمّل قائمة فارغة أو رمزًا مفقودًا', () => {
    expect(pickVoice([], 'ar')).toBeNull()
    expect(pickVoice(voices, '')).toBeNull()
    expect(pickVoice(undefined, 'ar')).toBeNull()
  })
})
