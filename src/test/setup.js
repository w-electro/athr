import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { primeContentCache } from '../data/content/index.js'

/**
 * في الإنتاج يُحمّل محتوى كل لغة كسولًا (حزمة مستقلة لكل لغة).
 * في الاختبارات نحمّلها كلها مرة واحدة قبل أي اختبار، فتبقى فحوص الشاشات
 * متزامنة ولا تحتاج انتظارًا في كل تأكيد.
 */
await primeContentCache()

afterEach(() => {
  cleanup()
})

// jsdom لا يوفّر هذه الواجهات؛ نضع بدائل بسيطة حتى لا تنهار الكومبوننتات.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

if (!window.HTMLMediaElement.prototype.play) {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
}

if (!window.HTMLCanvasElement.prototype.getContext) {
  window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }))
}
