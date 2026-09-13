import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { I18nProvider } from '../i18n/index.jsx'
import { locateSegment, clearAudioManifest, findClip, clipKey } from '../lib/audioAssets.js'

/**
 * اختبارات الدليل الصوتي في وضع الملف المولّد مسبقًا.
 *
 * هذا المسار لا يمكن اختباره بالنظر: jsdom لا يشغّل صوتًا. فنختبر العقد
 * الذي بين المشغّل والمتصفح — هل طُلب الملف الصحيح؟ هل استُدعي play؟
 * هل تبع النصُّ الصوتَ؟ — لأن العلّة التي أعمَت الكاميرا كانت من هذا
 * النوع بالضبط: مسارٌ شُحن دون أن يُنفَّذ مرة واحدة في اختبار.
 */

const MANIFEST = {
  version: 1,
  clips: {
    'ar/jubbah': {
      file: 'ar/jubbah.mp3',
      seconds: 90,
      offsets: [0, 12, 25, 40, 55, 70, 82],
      engine: 'supertonic-3',
      voice: 'ar-hail',
    },
  },
}

function renderSite(route = '/site/jubbah', language = 'ar') {
  return render(
    <I18nProvider initialLanguage={language}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  clearAudioManifest()
  window.localStorage.clear()
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearAudioManifest()
})

/* ───────────────────────── تحديد الجملة من الزمن ───────────────────────── */

describe('مطابقة الزمن بالجملة', () => {
  const offsets = [0, 10, 25, 40]

  it('يجد الجملة التي يقع فيها الزمن', () => {
    expect(locateSegment(0, offsets, 50).index).toBe(0)
    expect(locateSegment(9.9, offsets, 50).index).toBe(0)
    expect(locateSegment(10, offsets, 50).index).toBe(1)
    expect(locateSegment(39.9, offsets, 50).index).toBe(2)
    expect(locateSegment(40, offsets, 50).index).toBe(3)
  })

  it('يحسب التقدّم داخل الجملة', () => {
    // منتصف الجملة الثانية: من 10 إلى 25، فمنتصفها 17.5
    expect(locateSegment(17.5, offsets, 50).fraction).toBeCloseTo(0.5, 5)
  })

  it('يستعمل المدّة الكلّية لإنهاء الجملة الأخيرة', () => {
    expect(locateSegment(45, offsets, 50).fraction).toBeCloseTo(0.5, 5)
  })

  it('لا ينهار حين لا توجد أزمنة', () => {
    expect(locateSegment(12, [], 50)).toEqual({ index: 0, fraction: 0 })
  })

  it('يحصر التقدّم بين صفر وواحد مهما كان الزمن شاذًّا', () => {
    expect(locateSegment(-5, offsets, 50).fraction).toBe(0)
    expect(locateSegment(9999, offsets, 50).fraction).toBe(1)
  })
})

/* ──────────────────────────── قراءة الفهرس ──────────────────────────── */

describe('فهرس المقاطع', () => {
  it('يبني مفتاحًا من اللغة والموقع', () => {
    expect(clipKey('ar', 'jubbah')).toBe('ar/jubbah')
  })

  it('يجد المقطع ويبني مساره الكامل', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MANIFEST }))

    const clip = await findClip('ar', 'jubbah')
    expect(clip.url).toContain('audio/ar/jubbah.mp3')
    expect(clip.seconds).toBe(90)
    expect(clip.offsets).toHaveLength(7)
  })

  it('يعيد null للغة لم تُولَّد بعد — لا خطأ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MANIFEST }))
    expect(await findClip('sw', 'jubbah')).toBeNull()
  })

  /**
   * الحالة الطبيعية قبل تشغيل المولّد: لا فهرس أصلًا. يجب أن تمرّ بصمت،
   * لأن المشغّل حينها يتراجع إلى نطق المتصفح كما كان يفعل دائمًا.
   */
  it('يمرّ بسلام حين لا يوجد فهرس', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    expect(await findClip('ar', 'jubbah')).toBeNull()
  })

  it('يمرّ بسلام حين ينقطع الاتصال', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await findClip('ar', 'jubbah')).toBeNull()
  })

  it('يقرأ الفهرس مرّة واحدة مهما تكرّر الطلب', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => MANIFEST })
    vi.stubGlobal('fetch', fetchSpy)

    await Promise.all([findClip('ar', 'jubbah'), findClip('ar', 'qishlah'), findClip('en', 'aja')])
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

/* ─────────────────────── المشغّل في وضع الملف ─────────────────────── */

describe('المشغّل حين يوجد مقطع مولّد', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => MANIFEST }))
  })

  it('يعلّق الصوت المولّد لا نطق المتصفح', async () => {
    const { container } = renderSite()

    await waitFor(() => {
      const audio = container.querySelector('audio')
      expect(audio).toBeTruthy()
      expect(audio.getAttribute('src')).toContain('ar/jubbah.mp3')
    })
  })

  it('يشغّل الملف عند الضغط على تشغيل', async () => {
    const user = userEvent.setup()
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play')

    // jsdom لا يوفّر speechSynthesis؛ نضع بديلًا لنثبت أنه لم يُستدعَ
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [] })

    const { container } = renderSite()
    await waitFor(() => expect(container.querySelector('audio')).toBeTruthy())

    await user.click(screen.getByLabelText('تشغيل السرد'))

    expect(play).toHaveBeenCalled()
    // والأهم: لا نطق آليًّا بالتوازي مع الملف
    expect(speak).not.toHaveBeenCalled()
  })

  /** إبراز النص يتبع الصوت فعلًا، لا مؤقّتًا يقدّر بطول الحروف. */
  it('يتبع النصُّ زمنَ الصوت', async () => {
    const { container } = renderSite()
    const audio = await waitFor(() => {
      const found = container.querySelector('audio')
      expect(found).toBeTruthy()
      return found
    })

    // الجملة الرابعة تبدأ عند الثانية 40 حسب الفهرس
    Object.defineProperty(audio, 'currentTime', { configurable: true, value: 42 })
    audio.dispatchEvent(new Event('timeupdate'))

    await waitFor(() => {
      const active = container.querySelector('[aria-label="موضع التشغيل"]')
      expect(Number(active.value)).toBe(3)
    })
  })

  /**
   * أهمّ تراجع: ملف مفقود أو صيغة لا يدعمها المتصفح. يجب أن ينتقل
   * المشغّل إلى نطق المتصفح بدل أن يصمت — وهذا ما يحمي العرض التقديمي.
   */
  it('يتراجع إلى نطق المتصفح إن تعذّر تشغيل الملف', async () => {
    const { container } = renderSite()
    const audio = await waitFor(() => {
      const found = container.querySelector('audio')
      expect(found).toBeTruthy()
      return found
    })

    audio.dispatchEvent(new Event('error'))

    await waitFor(() => expect(container.querySelector('audio')).toBeNull())
  })

  it('يعرض المدّة المقيسة للمقطع لا المدّة المكتوبة يدويًا', async () => {
    const { container } = renderSite()
    await waitFor(() => expect(container.querySelector('audio')).toBeTruthy())
    // 90 ثانية = 1:30
    expect(screen.getByText('1:30')).toBeInTheDocument()
  })
})

describe('المشغّل حين لا يوجد مقطع', () => {
  it('يبقى على نطق المتصفح كما كان', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    const { container } = renderSite()
    await waitFor(() => expect(screen.getByLabelText('تشغيل السرد')).toBeInTheDocument())
    expect(container.querySelector('audio')).toBeNull()
  })
})
