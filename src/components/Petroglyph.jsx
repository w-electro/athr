import { useEffect, useRef, useState } from 'react'

/**
 * التوقيع البصري لـ"أثر": نقش يُحفر أمام عينيك.
 *
 * ── لماذا هذا العنصر تحديدًا ──────────────────────────────────────────
 * نقوش جبة لم تُرسم دفعةً واحدة. نُقرت بالحجر على الحجر، ضربة ضربة، على
 * مدى آلاف السنين. فبدل دائرة تحميل عامة تصلح لأي تطبيق في العالم،
 * يرسم التطبيق شكلًا من أشكال جبة نفسها بالطريقة التي صُنع بها:
 * الخط يظهر تدريجيًا من بدايته إلى نهايته.
 *
 * تقنيًا: نستخدم stroke-dasharray/stroke-dashoffset. نجعل طول الشرطة
 * مساويًا لطول المسار كله، ثم نحرّك الإزاحة من الطول إلى الصفر — فيبدو
 * الخط كأنه يُرسم. لا مكتبة رسوم، لا صور، بضعة بايتات فقط.
 *
 * الأشكال مستوحاة من الأنماط الموثّقة في جبل أم سنمان:
 *   ibex   — وعل بقرون مقوّسة إلى الخلف
 *   camel  — جمل، أكثر الأشكال تكرارًا في نقوش المنطقة
 *   human  — شكل بشري فارع بأكتاف عريضة، النمط المميّز لجبة
 */

const SHAPES = {
  // ترتيب المسارات مقصود: الجسم أولًا ثم الرأس ثم القوائم.
  // لو بدأت القوائم لظهرت خطوطًا معلّقة بلا معنى في أول ثانية من الحركة.
  ibex: {
    viewBox: '0 0 100 70',
    paths: [
      'M18 44 Q20 32 34 30 L62 30 Q74 31 76 44', // الجسم
      'M76 38 L86 26', // الرقبة
      'M86 26 L92 20', // الرأس
      'M86 24 Q78 10 66 12', // القرن الأول
      'M89 23 Q82 8 70 9', // القرن الثاني
      'M22 44 L22 60', // القوائم
      'M34 44 L34 60',
      'M58 44 L58 60',
      'M70 44 L70 60',
      'M18 42 L10 50', // الذيل
    ],
  },
  camel: {
    viewBox: '0 0 100 70',
    paths: [
      'M20 42 Q24 30 34 32 Q40 20 50 30 Q58 20 66 31 Q76 30 78 42', // الجسم بسنامين
      'M78 36 L86 20', // الرقبة
      'M86 20 Q94 16 95 24', // الرأس
      'M26 42 L24 62',
      'M36 42 L38 62',
      'M62 42 L60 62',
      'M72 42 L74 62',
      'M20 40 L12 44', // الذيل
    ],
  },
  human: {
    viewBox: '0 0 100 70',
    paths: [
      'M50 22 L50 44', // الجذع
      'M50 20 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0', // الرأس
      'M36 26 L64 26', // الأكتاف العريضة — توقيع أسلوب جبة
      'M50 28 L34 36', // ذراع
      'M50 28 L66 36',
      'M50 44 L40 64', // ساق
      'M50 44 L60 64',
    ],
  },
}

/**
 * @param {'ibex'|'camel'|'human'} shape
 * @param {boolean} loop - يعيد الرسم باستمرار (لحالات الانتظار)
 * @param {boolean} play - يبدأ الرسم (وإلا بقي مخفيًا حتى يُطلب)
 * @param {number} duration - مدة رسم الشكل كاملًا بالثواني
 */
export default function Petroglyph({
  shape = 'ibex',
  className = '',
  strokeWidth = 2.4,
  loop = false,
  play = true,
  duration = 2.2,
  title,
}) {
  const { viewBox, paths } = SHAPES[shape] ?? SHAPES.ibex
  const [cycle, setCycle] = useState(0)
  // الشكل يبدأ غير مرسوم، ثم "يُسلَّح" بعد التركيب حتى ينطلق الانتقال.
  // بدون هذه الخطوة يظهر النقش مكتملًا فورًا ولا تُرى الحركة إطلاقًا.
  const [armed, setArmed] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!play) {
      setArmed(false)
      return undefined
    }
    const frame = requestAnimationFrame(() => setArmed(true))
    return () => cancelAnimationFrame(frame)
  }, [play, cycle])

  // إعادة التشغيل الدورية: تغيير المفتاح يعيد إنشاء المسارات من الصفر
  useEffect(() => {
    if (!loop || !play) return undefined
    timerRef.current = setInterval(() => {
      setArmed(false)
      setCycle((value) => value + 1)
    }, (duration + 0.9) * 1000)
    return () => clearInterval(timerRef.current)
  }, [loop, play, duration])

  const perPath = duration / paths.length

  return (
    <svg
      key={cycle}
      viewBox={viewBox}
      className={className}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      {paths.map((d, index) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          // pathLength يوحّد طول كل مسار إلى 100 بغض النظر عن طوله الحقيقي،
          // فنستطيع استخدام قيم dash ثابتة دون قياس كل مسار بالجافاسكربت.
          pathLength="100"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: armed ? 0 : 100,
            opacity: armed ? 1 : 0.15,
            transition: armed
              ? `stroke-dashoffset ${perPath}s linear ${index * perPath}s, opacity 0.2s linear ${index * perPath}s`
              : 'none',
          }}
        />
      ))}
    </svg>
  )
}
