import { describe, it, expect } from 'vitest'
import { LOCALES } from '../i18n/locales/index.js'
import { LANGUAGES, matchDeviceLanguage, searchLanguages, getLanguage } from '../i18n/languages.js'
import ar from '../i18n/locales/ar.js'

/** يسطّح كائنًا متداخلًا إلى قائمة مفاتيح منقّطة. */
function flatten(source, prefix = '') {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flatten(value, path)
      : [path]
  })
}

const REFERENCE_KEYS = flatten(ar)

describe('اكتمال الترجمات', () => {
  it('يسجّل ملف ترجمة لكل لغة معلن عنها', () => {
    for (const language of LANGUAGES) {
      expect(LOCALES[language.code], `ملف الترجمة مفقود: ${language.code}`).toBeDefined()
    }
    expect(Object.keys(LOCALES)).toHaveLength(LANGUAGES.length)
  })

  it.each(LANGUAGES.map((language) => language.code))(
    'اللغة %s تحمل كل مفاتيح المرجع دون نقص',
    (code) => {
      const missing = REFERENCE_KEYS.filter((key) => !flatten(LOCALES[code]).includes(key))
      expect(missing, `مفاتيح ناقصة في ${code}`).toEqual([])
    },
  )

  it.each(LANGUAGES.map((language) => language.code))(
    'اللغة %s لا تحتوي مفاتيح زائدة عن المرجع',
    (code) => {
      const extra = flatten(LOCALES[code]).filter((key) => !REFERENCE_KEYS.includes(key))
      expect(extra, `مفاتيح زائدة في ${code}`).toEqual([])
    },
  )

  it('لا يترك أي نص فارغًا', () => {
    for (const [code, locale] of Object.entries(LOCALES)) {
      const walk = (source, path = '') => {
        for (const [key, value] of Object.entries(source)) {
          const full = path ? `${path}.${key}` : key
          if (value && typeof value === 'object') walk(value, full)
          else expect(String(value).trim(), `${code} → ${full}`).not.toBe('')
        }
      }
      walk(locale)
    }
  })

  it('يحافظ على متغيّرات الاستبدال في كل لغة', () => {
    // مفاتيح تحمل {vars} — إن ضاع المتغيّر في الترجمة ظهر نص مكسور للمستخدم
    const withVars = [
      ['explore.showing', ['shown', 'total']],
      ['site.km', ['km']],
      ['trip.travel', ['minutes']],
      ['trip.until', ['time']],
      ['trip.day', ['n']],
      ['reason.interest', ['interests']],
      ['weather.adviceHot', ['temp']],
      ['welcome.count', ['count']],
    ]

    for (const [code, locale] of Object.entries(LOCALES)) {
      for (const [key, vars] of withVars) {
        const value = key.split('.').reduce((acc, part) => acc?.[part], locale)
        for (const variable of vars) {
          expect(value, `${code} → ${key} فقد {${variable}}`).toContain(`{${variable}}`)
        }
      }
    }
  })
})

describe('سجلّ اللغات', () => {
  it('يعرّف 29 لغة برموز فريدة', () => {
    expect(LANGUAGES).toHaveLength(29)
    const codes = LANGUAGES.map((language) => language.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('يعطي كل لغة اسمًا بلغتها واتجاهًا صالحًا', () => {
    for (const language of LANGUAGES) {
      expect(language.native.trim()).not.toBe('')
      expect(language.sample.trim()).not.toBe('')
      expect(['rtl', 'ltr']).toContain(language.dir)
    }
  })

  it('يعلّم اللغات الأربع التي تُكتب من اليمين لليسار', () => {
    const rtl = LANGUAGES.filter((language) => language.dir === 'rtl').map((l) => l.code)
    expect(rtl.sort()).toEqual(['ar', 'fa', 'he', 'ur'])
  })
})

describe('مطابقة لغة الجهاز', () => {
  it('يطابق الرمز تمامًا', () => {
    expect(matchDeviceLanguage(['fr'])).toBe('fr')
  })

  it('يتجاهل رمز البلد: en-GB تعطي الإنجليزية', () => {
    expect(matchDeviceLanguage(['en-GB'])).toBe('en')
    expect(matchDeviceLanguage(['pt-BR'])).toBe('pt')
    expect(matchDeviceLanguage(['ar-SA'])).toBe('ar')
  })

  it('يميّز الصينية بالكتابة لا بالبلد', () => {
    expect(matchDeviceLanguage(['zh-CN'])).toBe('zh-Hans')
    expect(matchDeviceLanguage(['zh-TW'])).toBe('zh-Hant')
    expect(matchDeviceLanguage(['zh-HK'])).toBe('zh-Hant')
  })

  it('يحترم ترتيب تفضيلات المستخدم', () => {
    expect(matchDeviceLanguage(['ja', 'en'])).toBe('ja')
  })

  it('يعيد null للغة غير مدعومة بدل التخمين', () => {
    expect(matchDeviceLanguage(['is-IS'])).toBeNull()
    expect(matchDeviceLanguage([])).toBeNull()
  })
})

describe('البحث في اللغات', () => {
  it('يبحث بالاسم الأصلي', () => {
    expect(searchLanguages('日本').map((l) => l.code)).toEqual(['ja'])
  })

  it('يبحث بالاسم الإنجليزي ولا يفرّق بين الحالات', () => {
    expect(searchLanguages('GERMAN').map((l) => l.code)).toEqual(['de'])
  })

  it('يعيد القائمة كاملة عند بحث فارغ', () => {
    expect(searchLanguages('   ')).toHaveLength(LANGUAGES.length)
  })

  it('يجلب لغة بالرمز', () => {
    expect(getLanguage('sw').native).toBe('Kiswahili')
    expect(getLanguage('nope')).toBeUndefined()
  })
})
