import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchForecast,
  clearForecastCache,
  HAIL_COORDS,
  HEAT_THRESHOLD_C,
  WIND_THRESHOLD_KPH,
} from '../lib/weather.js'

/** يبني استجابة Open-Meteo بالشكل الحقيقي. */
function openMeteoResponse(days) {
  return {
    ok: true,
    json: async () => ({
      daily: {
        time: days.map((_, i) => `2026-09-0${i + 1}`),
        temperature_2m_max: days.map((d) => d.high),
        temperature_2m_min: days.map((d) => d.low),
        weather_code: days.map((d) => d.code ?? 0),
        wind_speed_10m_max: days.map((d) => d.wind ?? 10),
      },
    }),
  }
}

beforeEach(() => {
  clearForecastCache()
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('جلب الطقس الحيّ', () => {
  it('ينادي Open-Meteo بإحداثيات حائل وبلا مفتاح', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(openMeteoResponse([{ high: 41, low: 26 }]))
    vi.stubGlobal('fetch', fetchSpy)

    await fetchForecast(1)

    const url = fetchSpy.mock.calls[0][0]
    expect(url).toContain('api.open-meteo.com')
    expect(url).toContain(`latitude=${HAIL_COORDS.lat}`)
    expect(url).toContain(`longitude=${HAIL_COORDS.lng}`)
    // لا مفتاح ولا رمز وصول في العنوان — الخدمة مجانية بلا تسجيل
    expect(url).not.toMatch(/api[_-]?key|token|appid/i)
  })

  it('يعلّم النتيجة بأنها حيّة ويقرّب القراءات', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openMeteoResponse([{ high: 41.1, low: 26.8 }])))

    const [day] = await fetchForecast(1)
    expect(day.source).toBe('live')
    expect(day.highC).toBe(41)
    expect(day.lowC).toBe(27)
  })
})

describe('تصنيف حالة اليوم', () => {
  async function classify(day) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openMeteoResponse([day])))
    const [result] = await fetchForecast(1)
    return result
  }

  it('يعتبر الرياح القوية أتربة مهما كانت الحرارة', async () => {
    const day = await classify({ high: 30, low: 18, wind: WIND_THRESHOLD_KPH + 5 })
    expect(day.condition).toBe('dusty')
    expect(day.windyWarning).toBe(true)
  })

  it('يعتبر ما تجاوز عتبة الحرارة يومًا حارًا', async () => {
    const day = await classify({ high: HEAT_THRESHOLD_C + 2, low: 26, wind: 10 })
    expect(day.condition).toBe('hot')
    expect(day.avoidMiddayOutdoor).toBe(true)
    expect(day.advice.key).toBe('weather.adviceHot')
    expect(day.advice.vars.temp).toBe(HEAT_THRESHOLD_C + 2)
  })

  /**
   * حارس لتناقض ظهر على الشاشة: الشارة تقول 41° والنصيحة تحتها 41.1°.
   * الرقم الواحد يُعرض بصيغة واحدة.
   */
  it('يبني النصيحة على القيمة المقرّبة نفسها المعروضة', async () => {
    const day = await classify({ high: 41.1, low: 26.8, wind: 10 })
    expect(day.highC).toBe(41)
    expect(day.advice.vars.temp).toBe(41)
  })

  it('يقرأ رموز المطر العالمية', async () => {
    const day = await classify({ high: 28, low: 15, wind: 8, code: 61 })
    expect(day.condition).toBe('rain')
  })

  it('يميّز الغائم عن الصافي', async () => {
    expect((await classify({ high: 28, low: 15, wind: 8, code: 3 })).condition).toBe('cloudy')
    expect((await classify({ high: 28, low: 15, wind: 8, code: 0 })).condition).toBe('sunny')
  })

  it('يمنح كل يوم مفتاح تسمية وأيقونة', async () => {
    const day = await classify({ high: 28, low: 15, wind: 8 })
    expect(day.labelKey).toMatch(/^weather\./)
    expect(day.icon).toBeTruthy()
  })
})

describe('التراجع عند انقطاع الإنترنت', () => {
  /**
   * هذا هو السيناريو الفعلي في جبة: لا تغطية. المخطّط يجب أن يستمرّ
   * بأفضل ما لديه، لا أن يتعطّل.
   */
  it('يستخدم آخر نتيجة محفوظة حين يفشل النداء', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(openMeteoResponse([{ high: 39, low: 24 }])))
    await fetchForecast(1) // ينجح ويحفظ

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const [day] = await fetchForecast(1)

    expect(day.source).toBe('cached')
    expect(day.highC).toBe(39)
  })

  it('يعود إلى المعدّلات المناخية إن لم توجد نسخة محفوظة', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const days = await fetchForecast(2)
    expect(days).toHaveLength(2)
    for (const day of days) {
      expect(day.source).toBe('estimate')
      // معدّلات حائل: بين برد الشتاء وحرّ الصيف
      expect(day.highC).toBeGreaterThan(10)
      expect(day.highC).toBeLessThan(50)
      expect(day.lowC).toBeLessThan(day.highC)
    }
  })

  it('لا يرمي أبدًا مهما كانت الاستجابة معطوبة', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    const days = await fetchForecast(3)
    expect(days).toHaveLength(3)
    expect(days[0].source).toBe('estimate')
  })

  it('يُجبر على التقدير عند الطلب', async () => {
    const days = await fetchForecast(1, { source: 'estimate' })
    expect(days[0].source).toBe('estimate')
  })
})
