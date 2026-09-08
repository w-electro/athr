/** @type {import('tailwindcss').Config} */

/**
 * نظام تصميم "أثر"
 *
 * الفكرة: الليل هو الأرضية، والتراكوتا هو الضوء.
 *
 * السبب ليس ذوقًا عامًا بل الموضوع نفسه: نقوش جبة لا تُقرأ إلا في الضوء
 * المائل عند الفجر والغروب، والتطبيق يُستخدم في العراء تحت وهج الشمس حيث
 * تريح الواجهة الداكنة العين، وسماء النفود ليلًا هي الصورة الذهنية للمنطقة.
 * ألوان العميل الثلاثة كما هي — لكن بأوزان مقلوبة.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // الأرضيات — من الأعمق إلى المرتفع
        basalt: '#0B0F17', // بازلت: أعمق طبقة، خلفية التطبيق
        night: {
          DEFAULT: '#1A2233', // لون العميل — أسطح البطاقات
          900: '#111726',
          800: '#151D2C',
          700: '#1A2233',
          600: '#232D42',
          500: '#2E3A52', // "طلاء الصحراء" — الأسطح المرتفعة
          400: '#465470',
          300: '#6B7897',
        },
        // الأضواء
        terracotta: {
          DEFAULT: '#C97A4A', // لون العميل — الإجراء الأساسي
          bright: '#DD8C58',
          deep: '#9E5B33',
        },
        gold: {
          DEFAULT: '#D98E4A', // لون العميل — التمييز واليونسكو
          bright: '#EFAE6E',
        },
        // النصوص على الداكن
        sand: {
          DEFAULT: '#E8DCC8', // نص أساسي: أبيض دافئ لا ناصع
          dim: '#A2977F', // نص ثانوي
          faint: '#6E6757', // نص خافت
        },
      },
      fontFamily: {
        // Noto Sans اختيار مقصود لا افتراضي: اسمها من "no more tofu"،
        // وهي العائلة الوحيدة التي تغطي الـ28 لغة دون مربعات فارغة.
        sans: ['Noto Sans', 'Tajawal', 'system-ui', 'sans-serif'],
        // Tajawal للعربية (طلب العميل)
        arabic: ['Tajawal', 'Noto Sans Arabic', 'sans-serif'],
        // الكوفي زاويّ ومحفور — صدى مباشر لنقوش الصخر
        display: ['Reem Kufi', 'Noto Sans', 'sans-serif'],
        // الأرقام والبيانات بخط آلة: قراءة "جهاز ميداني"
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // سلّم مضبوط — لا مقاسات عشوائية
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em' }],
        micro: ['0.75rem', { lineHeight: '1.5' }],
        body: ['0.9375rem', { lineHeight: '1.75' }],
        read: ['1rem', { lineHeight: '1.9' }], // نص القصص الطويل
        title: ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        hero: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        monument: ['2.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        raise: '0 2px 24px -8px rgba(0, 0, 0, 0.6)',
        lift: '0 24px 48px -24px rgba(0, 0, 0, 0.85)',
        glow: '0 0 0 1px rgba(201, 122, 74, 0.35), 0 8px 32px -8px rgba(201, 122, 74, 0.3)',
      },
      keyframes: {
        // ── التوقيع: النقش يُحفر أمامك ──
        // stroke-dashoffset يرسم الخط تدريجيًا، تمامًا كما نُقر الحجر ضربة ضربة
        peck: {
          '0%': { strokeDashoffset: 'var(--peck-len, 400)', opacity: '0.25' },
          '100%': { strokeDashoffset: '0', opacity: '1' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'raking-light': {
          // ضوء مائل يمر على السطح — كشروق يكشف النقش
          '0%': { transform: 'translateX(-120%) skewX(-12deg)', opacity: '0' },
          '35%': { opacity: '0.5' },
          '100%': { transform: 'translateX(220%) skewX(-12deg)', opacity: '0' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        'ring-out': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        peck: 'peck 1.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        rise: 'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'rise-in': 'rise-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'raking-light': 'raking-light 2.4s ease-in-out infinite',
        breathe: 'breathe 3s ease-in-out infinite',
        'ring-out': 'ring-out 2s ease-out infinite',
        'slide-up-fade': 'slide-up-fade 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionTimingFunction: {
        // منحنى واحد لكل الحركات — الاتساق يصنع الإحساس بالجودة
        athr: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
