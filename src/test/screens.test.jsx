import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App.jsx'
import { resetMockCursor } from '../lib/recognition.js'

/** يشغّل التطبيق كاملًا على مسار محدد — اختبار تكامل لا وحدة. */
function renderApp(route = '/explore') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  resetMockCursor()
})

describe('شاشة الاستكشاف', () => {
  it('تعرض العنوان وكل المواقع الأربعة', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'أثر', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('نقوش جبة الصخرية')).toBeInTheDocument()
    expect(screen.getByText('قصر عارف والقشلة')).toBeInTheDocument()
    expect(screen.getByText('جبال أجا')).toBeInTheDocument()
    expect(screen.getByText('متحف حائل الإقليمي')).toBeInTheDocument()
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

    expect(screen.getByText(/لا توجد نتائج مطابقة/)).toBeInTheDocument()
  })

  it('تنتقل إلى تفاصيل الموقع عند الضغط على البطاقة', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByText('نقوش جبة الصخرية'))

    expect(screen.getByRole('heading', { name: 'نقوش جبة الصخرية' })).toBeInTheDocument()
    expect(screen.getByText('القصة')).toBeInTheDocument()
  })
})

describe('شاشة تفاصيل الموقع', () => {
  it('تعرض القصة والحقائق والنصائح', () => {
    renderApp('/site/jubbah')

    expect(screen.getByText('حين كانت الصحراء بحيرة')).toBeInTheDocument()
    expect(screen.getByText('الإدراج في اليونسكو')).toBeInTheDocument()
    expect(screen.getByText('نصائح الزيارة')).toBeInTheDocument()
  })

  it('تعرض مشغّل السرد الصوتي مع النص المتزامن', () => {
    renderApp('/site/aja')

    const player = screen.getByLabelText('السرد الصوتي')
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

    // الانتقال يبدأ التشغيل تلقائيًا
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
    expect(screen.getByRole('button', { name: /افتح الكاميرا/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ارفع صورة/ })).toBeInTheDocument()
  })

  it('تنتقل إلى مسار الرفع عند رفض إذن الكاميرا', async () => {
    const user = userEvent.setup()
    // محاكاة جهاز يرفض الإذن — وهو أكثر ما يحدث على أجهزة لجنة التحكيم
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    })

    renderApp('/scan')
    await user.click(screen.getByRole('button', { name: /افتح الكاميرا/ }))

    expect(await screen.findByText('تعذّر فتح الكاميرا')).toBeInTheDocument()
  })

  it('تحلّل صورة مرفوعة وتعرض نتيجة تعرّف كاملة', async () => {
    const user = userEvent.setup()
    renderApp('/scan')

    const file = new File(['fake-image-bytes'], 'jubbah.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('اختر صورة'), file)

    // التحليل يستغرق ~3 ثوانٍ في المحاكاة
    const heading = await screen.findByRole('heading', { name: /نقوش جبة الصخرية/ }, { timeout: 8000 })
    expect(heading).toBeInTheDocument()
    expect(screen.getByText('تعرّفنا عليه')).toBeInTheDocument()
    expect(screen.getByText('درجة الثقة')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /اقرأ القصة كاملة/ })).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: /ابنِ مساري/ }))

    // مرحلة الفحص تظهر أولًا
    expect(screen.getByText('نبني مسارك…')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/مسارك جاهز/)).toBeInTheDocument(), {
      timeout: 8000,
    })

    expect(screen.getByText('اليوم الأول')).toBeInTheDocument()
    expect(screen.getAllByText(/فحص الطقس:/).length).toBeGreaterThan(0)
  }, 15000)

  it('تسمح بالعودة لتعديل التفضيلات', async () => {
    const user = userEvent.setup()
    renderApp('/trip')

    await user.click(screen.getByRole('button', { name: /ابنِ مساري/ }))
    await waitFor(() => expect(screen.getByText(/مسارك جاهز/)).toBeInTheDocument(), {
      timeout: 8000,
    })

    await user.click(screen.getByRole('button', { name: 'تعديل' }))
    expect(screen.getByText('ما الذي يهمّك؟')).toBeInTheDocument()
  }, 15000)
})

describe('التنقّل بين الشاشات', () => {
  it('يعرض الشريط السفلي بثلاث تبويبات وينتقل بينها', async () => {
    const user = userEvent.setup()
    renderApp()

    const nav = screen.getByLabelText('التنقّل الرئيسي')
    expect(within(nav).getAllByRole('link')).toHaveLength(3)

    await user.click(within(nav).getByRole('link', { name: 'رحلتي' }))
    expect(screen.getByRole('heading', { name: 'رحلتي' })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'مسح' }))
    expect(screen.getByRole('heading', { name: 'المسح الذكي' })).toBeInTheDocument()

    await user.click(within(nav).getByRole('link', { name: 'استكشاف' }))
    expect(screen.getByRole('heading', { name: 'أثر', level: 1 })).toBeInTheDocument()
  })

  it('يحوّل المسار الجذري إلى شاشة الاستكشاف', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: 'أثر', level: 1 })).toBeInTheDocument()
  })

  it('يخفي الشريط السفلي في شاشة التفاصيل', () => {
    renderApp('/site/jubbah')
    expect(screen.queryByLabelText('التنقّل الرئيسي')).not.toBeInTheDocument()
  })
})
