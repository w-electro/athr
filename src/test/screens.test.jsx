import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { I18nProvider, STORAGE_KEY } from '../i18n/index.jsx'
import { resetMockCursor } from '../lib/recognition.js'

/**
 * يشغّل التطبيق كاملًا — اختبار تكامل لا وحدة.
 *
 * تمرير initialLanguage يتخطّى شاشة اختيار اللغة (لأن اللغة أصبحت مختارة).
 * لاختبار الشاشة نفسها نُسقط هذا المعامل.
 */
function renderApp(route = '/explore', language = 'ar') {
  return render(
    <I18nProvider initialLanguage={language}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </I18nProvider>,
  )
}

beforeEach(() => {
  resetMockCursor()
  window.localStorage.clear()
})

describe('شاشة اختيار اللغة', () => {
  it('تظهر أولًا عندما لا توجد لغة محفوظة', () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/explore']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )
    // العلامة معروضة بالعربية دائمًا، لكن اسمها الميسَّر بلغة المستخدم
    // (لغة الجهاز في بيئة الاختبار إنجليزية)
    expect(screen.getByRole('heading', { name: 'Athr', level: 1 })).toHaveTextContent('أثر')
    expect(screen.getByRole('button', { name: /Start|ابدأ/ })).toBeInTheDocument()
  })

  it('ينطق قارئ الشاشة اسم العلامة بلغة المستخدم', () => {
    renderApp('/explore', 'ja')
    // النص المعروض عربي، والاسم الميسَّر بلغة الواجهة
    const wordmark = screen.getByRole('heading', { name: 'Athr', level: 1 })
    expect(wordmark).toHaveTextContent('أثر')
  })

  it('تعرض كل اللغات الـ28 باسمها الأصلي', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )
    expect(screen.getByRole('button', { name: /日本語/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kiswahili/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /العربية/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /தமிழ்/ })).toBeInTheDocument()
  })

  it('تصفّي اللغات بالبحث', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    const search = screen.getAllByRole('searchbox')[0]
    await user.type(search, 'türk')
    expect(screen.getByRole('button', { name: /Türkçe/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /日本語/ })).not.toBeInTheDocument()
  })

  it('تبدّل الواجهة فور اختيار لغة، ثم تدخل التطبيق', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/explore']}>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )

    await user.click(screen.getByRole('button', { name: /Français/ }))
    // النص تحوّل إلى الفرنسية قبل مغادرة الشاشة
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Commencer' }))
    expect(screen.getByRole('heading', { name: 'Sites patrimoniaux' })).toBeInTheDocument()
  })

  it('تحفظ الاختيار فلا تظهر مرة أخرى', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </I18nProvider>,
    )
    await user.click(screen.getByRole('button', { name: /日本語/ }))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('ja')
  })
})

describe('شاشة الاستكشاف', () => {
  it('تعرض المواقع الأربعة', () => {
    renderApp()
    expect(screen.getByText('نقوش جبة الصخرية')).toBeInTheDocument()
    expect(screen.getByText('قصر عارف والقشلة')).toBeInTheDocument()
    expect(screen.getByText('جبال أجا')).toBeInTheDocument()
    expect(screen.getByText('متحف حائل الإقليمي')).toBeInTheDocument()
  })

  it('تعرض المواقع بالإنجليزية عند اختيار الإنجليزية', () => {
    renderApp('/explore', 'en')
    expect(screen.getByText('The Jubbah Petroglyphs')).toBeInTheDocument()
    expect(screen.getByText('The Aja Mountains')).toBeInTheDocument()
    expect(screen.queryByText('نقوش جبة الصخرية')).not.toBeInTheDocument()
  })

  /**
   * حارس لصنفٍ كامل من العلل: وقع تسرّب العربية إلى لغاتٍ أخرى في ثلاث
   * شاشات مستقلة. الآن أن كل اللغات لها محتوى مترجم، يجب أن يظهر اسم
   * الموقع بلغة المستخدم نفسها — لا بالعربية ولا بالإنجليزية.
   */
  it.each([
    ['ur', 'جُبّہ کے چٹانی نقوش'],
    ['ja', 'ジュッバの岩絵'],
    ['fa', 'سنگ‌نگاره‌های جُبّه'],
    ['sw', 'Michoro ya Miamba ya Jubbah'],
    ['th', 'ภาพสลักหินแห่งญุบบะฮ์'],
  ])('تعرض محتوى المواقع بلغة %s نفسها', (code, expectedName) => {
    renderApp('/explore', code)
    expect(screen.getByText(expectedName)).toBeInTheDocument()
    expect(screen.queryByText('نقوش جبة الصخرية')).not.toBeInTheDocument()
    expect(screen.queryByText('The Jubbah Petroglyphs')).not.toBeInTheDocument()
  })

  it('تصفّي القائمة بالبحث', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(screen.getByLabelText('بحث في المواقع'), 'أجا')
    expect(screen.getByText('جبال أجا')).toBeInTheDocument()
    expect(screen.queryByText('نقوش جبة الصخرية')).not.toBeInTheDocument()
  })

  it('تصفّي القائمة بالتصنيف', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /متاحف/ }))
    expect(screen.getByText('متحف حائل الإقليمي')).toBeInTheDocument()
    expect(screen.queryByText('جبال أجا')).not.toBeInTheDocument()
  })

  it('تُظهر رسالة واضحة عند غياب النتائج', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.type(screen.getByLabelText('بحث في المواقع'), 'زززز')
    expect(screen.getByText('لا نتائج مطابقة')).toBeInTheDocument()
  })

  it('تنتقل إلى تفاصيل الموقع عند الضغط على البطاقة', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByText('نقوش جبة الصخرية'))
    expect(screen.getByRole('heading', { name: 'نقوش جبة الصخرية' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'القصة' })).toBeInTheDocument()
  })

  it('تتيح الوصول إلى تغيير اللغة', () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'تغيير اللغة' })).toBeInTheDocument()
  })
})

describe('شاشة تفاصيل الموقع', () => {
  it('تعرض القصة والحقائق والنصائح', () => {
    renderApp('/site/jubbah')
    expect(screen.getByText('حين كانت الصحراء بحيرة')).toBeInTheDocument()
    expect(screen.getByText('الإدراج في اليونسكو')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'نصائح الزيارة' })).toBeInTheDocument()
  })

  it('تعرض القصة الإنجليزية الكاملة بالإنجليزية', () => {
    renderApp('/site/jubbah', 'en')
    expect(screen.getByText('When the desert was a lake')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'The story' })).toBeInTheDocument()
  })

  it('تعرض القصة الكاملة باليابانية بلا ملاحظة تراجع', () => {
    renderApp('/site/jubbah', 'ja')
    expect(screen.getByText('砂漠が湖であったころ')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '物語' })).toBeInTheDocument()
    // لم تعد هناك لغة تتراجع، فالملاحظة يجب ألا تظهر
    expect(screen.queryByText(/アラビア語と英語/)).not.toBeInTheDocument()
  })

  it('تعرض السرد الصوتي بلغة المستخدم أيضًا', () => {
    renderApp('/site/aja', 'ko')
    const player = screen.getByLabelText('오디오 가이드')
    expect(within(player).getByText(/앞에 아자산맥이 펼쳐져 있습니다/)).toBeInTheDocument()
  })

  it('تنسب الصورة إلى مصدرها ورخصتها', () => {
    renderApp('/site/jubbah')
    expect(screen.getByText(/Heritage Commission/)).toBeInTheDocument()
    expect(screen.getByText(/CC BY-SA 4.0/)).toBeInTheDocument()
  })

  it('تعرض مشغّل السرد الصوتي مع النص المتزامن', () => {
    renderApp('/site/aja')
    const player = screen.getByLabelText('الدليل الصوتي')
    expect(within(player).getByLabelText('تشغيل السرد')).toBeInTheDocument()
    expect(within(player).getByLabelText('موضع التشغيل')).toBeInTheDocument()
    expect(within(player).getByText(/أمامك جبال أجا/)).toBeInTheDocument()
  })

  it('يبدّل المشغّل بين التشغيل والإيقاف', async () => {
    const user = userEvent.setup()
    renderApp('/site/museum')
    await user.click(screen.getByLabelText('تشغيل السرد'))
    expect(screen.getByLabelText('إيقاف مؤقت')).toBeInTheDocument()
    await user.click(screen.getByLabelText('إيقاف مؤقت'))
    expect(screen.getByLabelText('تشغيل السرد')).toBeInTheDocument()
  })

  it('ينتقل المشغّل إلى المقطع المضغوط عليه', async () => {
    const user = userEvent.setup()
    renderApp('/site/jubbah')
    await user.click(screen.getByText(/ارفع بصرك قليلًا/))
    expect(screen.getByLabelText('إيقاف مؤقت')).toBeInTheDocument()
  })

  it('يعرض رسالة لطيفة لموقع غير موجود', () => {
    renderApp('/site/does-not-exist')
    expect(screen.getByText('لم نجد هذا الموقع')).toBeInTheDocument()
  })
})

describe('شاشة المسح', () => {
  it('تبدأ بحالة خاملة مع زرّي الكاميرا والرفع', () => {
    renderApp('/scan')
    expect(screen.getByRole('heading', { name: 'المسح الذكي' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'افتح الكاميرا' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ارفع صورة/ })).toBeInTheDocument()
  })

  it('تنتقل إلى مسار الرفع عند رفض إذن الكاميرا', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    renderApp('/scan')
    await user.click(screen.getByRole('button', { name: 'افتح الكاميرا' }))
    expect(await screen.findByText('تعذّر فتح الكاميرا')).toBeInTheDocument()
  })

  it('تحلّل صورة مرفوعة وتعرض نتيجة تعرّف كاملة', async () => {
    const user = userEvent.setup()
    renderApp('/scan')

    const file = new File(['fake-image-bytes'], 'jubbah.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('اختر صورة'), file)

    const heading = await screen.findByRole(
      'heading',
      { name: 'نقوش جبة الصخرية' },
      { timeout: 8000 },
    )
    expect(heading).toBeInTheDocument()
    expect(screen.getByText(/تعرّفنا عليه/)).toBeInTheDocument()
    expect(screen.getByText('درجة الثقة')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /اقرأ القصة كاملة/ })).toBeInTheDocument()
  }, 15000)

  /**
   * حارس للعلّة التي أبلغ عنها المستخدم: كانت نتيجة المسح تظهر بالعربية
   * دائمًا لأن طبقة التعرّف كانت تُرجع نصًا عربيًا جاهزًا بدل المعرّف.
   */
  it('تعرض نتيجة المسح بلغة الواجهة لا بالعربية دائمًا', async () => {
    const user = userEvent.setup()
    renderApp('/scan', 'en')

    const file = new File(['x'], 'jubbah.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Choose a photo'), file)

    expect(
      await screen.findByRole('heading', { name: 'The Jubbah Petroglyphs' }, { timeout: 8000 }),
    ).toBeInTheDocument()

    // التسمية والأدلة بالإنجليزية أيضًا، لا العنوان وحده
    expect(screen.getByText('Carved rock face · Jabal Umm Sinman')).toBeInTheDocument()
    expect(screen.getByText(/Pecked technique on dark sandstone/)).toBeInTheDocument()
    expect(screen.queryByText(/واجهة صخرية منقوشة/)).not.toBeInTheDocument()
  }, 15000)

  it('تتيح تثبيت نتيجة العرض التوضيحي على موقع محدد', async () => {
    const user = userEvent.setup()
    renderApp('/scan')

    await user.click(screen.getByLabelText('إعدادات العرض التوضيحي'))
    await user.click(screen.getByRole('button', { name: 'أجا' }))

    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('اختر صورة'), file)

    expect(
      await screen.findByRole('heading', { name: 'جبال أجا' }, { timeout: 8000 }),
    ).toBeInTheDocument()
  }, 15000)
})

describe('شاشة رحلتي', () => {
  it('تعرض الأسئلة الثلاثة', () => {
    renderApp('/trip')
    expect(screen.getByText('ما الذي يهمّك؟')).toBeInTheDocument()
    expect(screen.getByText('كم يومًا لديك؟')).toBeInTheDocument()
    expect(screen.getByText('إيقاع الرحلة')).toBeInTheDocument()
  })

  it('تبني مسارًا بعد فحص الطقس وتعرض المحطات بأوقاتها', async () => {
    const user = userEvent.setup()
    renderApp('/trip')

    await user.click(screen.getByRole('button', { name: /الطبيعة والمغامرة/ }))
    await user.click(screen.getByRole('button', { name: 'يومان' }))
    await user.click(screen.getByRole('button', { name: 'ابنِ مساري' }))

    expect(screen.getByText('نبني مسارك…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('مسارك جاهز')).toBeInTheDocument(), {
      timeout: 8000,
    })

    expect(screen.getByRole('heading', { name: 'اليوم 1' })).toBeInTheDocument()
    expect(screen.getAllByText(/فحص الطقس/).length).toBeGreaterThan(0)
  }, 15000)

  it('تبني المسار بالإنجليزية بلا نص عربي متسرّب', async () => {
    const user = userEvent.setup()
    renderApp('/trip', 'en')

    await user.click(screen.getByRole('button', { name: 'Build my route' }))
    await waitFor(() => expect(screen.getByText('Your route is ready')).toBeInTheDocument(), {
      timeout: 8000,
    })

    expect(screen.getByRole('heading', { name: 'Day 1' })).toBeInTheDocument()
    expect(screen.getByText('The Jubbah Petroglyphs')).toBeInTheDocument()
  }, 15000)

  it('تسمح بالعودة لتعديل التفضيلات', async () => {
    const user = userEvent.setup()
    renderApp('/trip')

    await user.click(screen.getByRole('button', { name: 'ابنِ مساري' }))
    await waitFor(() => expect(screen.getByText('مسارك جاهز')).toBeInTheDocument(), {
      timeout: 8000,
    })

    await user.click(screen.getByRole('button', { name: 'تعديل' }))
    expect(screen.getByText('ما الذي يهمّك؟')).toBeInTheDocument()
  }, 15000)
})

describe('التنقّل والاتجاه', () => {
  it('يعرض الشريط السفلي بثلاث تبويبات وينتقل بينها', async () => {
    const user = userEvent.setup()
    renderApp()

    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link')).toHaveLength(3)

    await user.click(within(nav).getByRole('link', { name: 'رحلتي' }))
    expect(screen.getByRole('heading', { name: 'رحلتي' })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'مسح' }))
    expect(screen.getByRole('heading', { name: 'المسح الذكي' })).toBeInTheDocument()
  })

  it('يضبط اتجاه الصفحة ولغتها حسب اللغة المختارة', async () => {
    const { unmount } = renderApp('/explore', 'ar')
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'))
    expect(document.documentElement.lang).toBe('ar')
    unmount()

    renderApp('/explore', 'ja')
    await waitFor(() => expect(document.documentElement.dir).toBe('ltr'))
    expect(document.documentElement.lang).toBe('ja')
  })

  it('يخفي الشريط السفلي في شاشة التفاصيل', () => {
    renderApp('/site/jubbah')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
