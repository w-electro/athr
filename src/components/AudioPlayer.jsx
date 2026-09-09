import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatTimecode, PLAYBACK_RATES } from '../lib/narration.js'
import { isSpeechSupported, loadVoices, pickVoice, toSpeechLang, cancelSpeech } from '../lib/speech.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * الدليل الصوتي.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  وضعان، والفرق بينهما جوهري
 * ══════════════════════════════════════════════════════════════════════
 *
 *  🔊 وضع النطق (speech) — الافتراضي متى توفّر صوت للغة المستخدم.
 *     المتصفح ينطق السرد فعلًا عبر Web Speech API: مجانًا، بلا مفاتيح،
 *     وبلا إنترنت على أغلب الأجهزة. هذا دليل صوتي حقيقي لا محاكاة.
 *
 *  ▶︎ وضع المؤقّت (timer) — احتياطي حين لا يملك الجهاز صوتًا لتلك اللغة.
 *     يتقدّم النص متزامنًا كما كان، دون صوت.
 *
 * التراجع تلقائي وصامت: الزائر لا يرى رسالة خطأ، يرى دليلًا يعمل.
 *
 * ── لماذا نُقسّم النطق إلى مقاطع بدل جملة واحدة طويلة ─────────────────
 * 1) التزامن يصبح مضمونًا: نُبرز المقطع الذي يُنطق الآن، لا تخمينًا زمنيًا.
 * 2) بعض المتصفحات تقطع النطق الطويل بعد ~15 ثانية. مقاطعنا أقصر من ذلك.
 * 3) يمكن للزائر القفز إلى أي جملة والاستماع منها.
 */

const BAR_COUNT = 44

export default function AudioPlayer({ narration, siteName }) {
  const { t, contentLanguage } = useI18n()
  const { segments, totalSeconds } = narration

  const [voice, setVoice] = useState(null)
  const [speechReady, setSpeechReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [segIndex, setSegIndex] = useState(0)
  const [segFraction, setSegFraction] = useState(0)
  const [rate, setRate] = useState(1)

  // مراجع لتفادي الإغلاقات القديمة داخل مؤقّتات ونداءات النطق
  const indexRef = useRef(0)
  const rateRef = useRef(1)
  const playingRef = useRef(false)
  const tickRef = useRef(null)

  indexRef.current = segIndex
  rateRef.current = rate
  playingRef.current = playing

  const speechLang = toSpeechLang(contentLanguage)
  const useSpeech = speechReady && Boolean(voice)

  /* ─────────────────────── اختيار الصوت المناسب ─────────────────────── */

  useEffect(() => {
    let cancelled = false
    if (!isSpeechSupported()) {
      setSpeechReady(true)
      return undefined
    }

    loadVoices().then((voices) => {
      if (cancelled) return
      setVoice(pickVoice(voices, speechLang))
      setSpeechReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [speechLang])

  /* ─────────────────────────── مدد المقاطع ─────────────────────────── */

  const durations = useMemo(
    () =>
      segments.map((segment, index) =>
        Math.max(1, (segments[index + 1]?.at ?? totalSeconds) - segment.at),
      ),
    [segments, totalSeconds],
  )

  const stop = useCallback(() => {
    setPlaying(false)
    playingRef.current = false
    cancelSpeech()
    clearInterval(tickRef.current)
  }, [])

  // إيقاف كل شيء عند مغادرة الشاشة أو تغيير الموقع/اللغة
  useEffect(() => {
    setSegIndex(0)
    setSegFraction(0)
    stop()
    return stop
  }, [narration, stop])

  /* ──────────────────────────── التشغيل ──────────────────────────── */

  const speakSegment = useCallback(
    (index) => {
      if (index >= segments.length) {
        stop()
        setSegIndex(0)
        setSegFraction(0)
        return
      }

      setSegIndex(index)
      setSegFraction(0)
      indexRef.current = index

      cancelSpeech()
      const utterance = new SpeechSynthesisUtterance(segments[index].text)
      utterance.lang = speechLang
      if (voice) utterance.voice = voice
      utterance.rate = rateRef.current

      utterance.onend = () => {
        // onend يُطلق أيضًا عند الإلغاء اليدوي، فنتأكّد أننا ما زلنا نعمل
        if (!playingRef.current) return
        speakSegment(indexRef.current + 1)
      }

      window.speechSynthesis.speak(utterance)
    },
    [segments, speechLang, voice, stop],
  )

  /**
   * شريط التقدّم.
   *
   * في وضع النطق لا نعرف المدّة الحقيقية مسبقًا، فنقدّرها من طول النص
   * ونوقف التقدير عند 0.97 — الانتقال الفعلي يتولّاه حدث onend، فلا يسبق
   * الشريطُ الصوتَ أبدًا.
   */
  useEffect(() => {
    if (!playing) return undefined

    tickRef.current = setInterval(() => {
      setSegFraction((fraction) => {
        const index = indexRef.current
        const estimated = useSpeech
          ? Math.max(2, segments[index].text.length / (14 * rateRef.current))
          : durations[index] / rateRef.current

        const next = fraction + 0.1 / estimated

        if (useSpeech) return Math.min(next, 0.97)

        if (next >= 1) {
          if (index + 1 >= segments.length) {
            stop()
            return 1
          }
          setSegIndex(index + 1)
          return 0
        }
        return next
      })
    }, 100)

    return () => clearInterval(tickRef.current)
  }, [playing, useSpeech, segments, durations, stop])

  function toggle() {
    if (playing) {
      stop()
      return
    }
    setPlaying(true)
    playingRef.current = true
    if (useSpeech) speakSegment(segIndex >= segments.length ? 0 : segIndex)
  }

  /**
   * القفز بمقدار مقطع.
   *
   * الأزرار موسومة بعشر ثوانٍ، والمقاطع تفصلها 11–16 ثانية، فالقفزة
   * بمقطع تقارب المعنى المعلن وتبقى مفيدة: تعيدك إلى بداية جملة مفهومة
   * لا إلى منتصف كلمة.
   */
  function step(delta) {
    const next = Math.min(segments.length - 1, Math.max(0, segIndex + delta))
    setSegIndex(next)
    setSegFraction(0)
    if (playing && useSpeech) speakSegment(next)
  }

  function jumpTo(index) {
    setSegIndex(index)
    setSegFraction(0)
    setPlaying(true)
    playingRef.current = true
    if (useSpeech) speakSegment(index)
  }

  function changeRate() {
    const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length]
    setRate(next)
    rateRef.current = next
    // النطق الجاري لا يقبل تغيير السرعة، فنعيد نطق المقطع الحالي بها
    if (playing && useSpeech) speakSegment(segIndex)
  }

  const bars = useMemo(() => buildWaveform(segments), [segments])
  const ratio = Math.min(1, (segIndex + segFraction) / segments.length)
  const elapsed = segments[segIndex].at + segFraction * durations[segIndex]

  return (
    <section
      aria-label={t('audio.title')}
      className="overflow-hidden rounded-2xl border border-night-600 bg-night-900"
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15">
          <span className="text-base" aria-hidden="true">
            {useSpeech ? '🔊' : '◉'}
          </span>
          {playing && (
            <span className="absolute inset-0 animate-ring-out rounded-full border border-terracotta" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-semibold text-sand">
            {t('audio.title')} · {siteName}
          </p>
          {/* اسم الصوت اسم عَلَم لا يُترجم، فنعرضه كما هو */}
          <p className="truncate text-[0.6875rem] text-sand-faint">
            {narration.voice}
            {voice?.name ? ` · ${voice.name}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={changeRate}
          aria-label={t('audio.speed')}
          className="rounded-lg border border-night-500 px-2.5 py-1 text-[0.6875rem] font-semibold text-sand-dim"
        >
          <span className="num">{rate}</span>×
        </button>
      </div>

      <div className="relative px-4">
        <div className="flex h-14 items-center gap-[3px]" aria-hidden="true">
          {bars.map((height, index) => (
            <span
              key={index}
              className={`flex-1 rounded-full transition-colors duration-150 ${
                index / BAR_COUNT <= ratio ? 'bg-terracotta' : 'bg-night-500'
              }`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          min="0"
          max={segments.length - 1}
          step="1"
          value={segIndex}
          onChange={(event) => jumpTo(Number(event.target.value))}
          aria-label={t('audio.position')}
          className="absolute inset-x-4 inset-y-0 h-full w-[calc(100%-2rem)] cursor-pointer opacity-0"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-1.5 text-[0.6875rem] text-sand-faint">
        <span className="num">{formatTimecode(elapsed)}</span>
        <span className="num">{formatTimecode(totalSeconds)}</span>
      </div>

      <div className="flex items-center justify-center gap-7 px-4 pb-4 pt-1">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t('audio.back10')}
          className="text-sand-dim transition active:scale-90"
        >
          <SeekIcon back />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t('audio.pause') : t('audio.play')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-basalt
                     transition-transform duration-200 ease-athr active:scale-95"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label={t('audio.forward10')}
          className="text-sand-dim transition active:scale-90"
        >
          <SeekIcon />
        </button>
      </div>

      <ol className="max-h-52 space-y-0.5 overflow-y-auto border-t border-night-700 p-2">
        {segments.map((segment, index) => {
          const on = index === segIndex
          return (
            <li key={segment.at}>
              <button
                type="button"
                onClick={() => jumpTo(index)}
                className={`flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-start text-body transition-colors duration-200 ${
                  on ? 'bg-terracotta/10 text-sand' : 'text-sand-faint'
                }`}
              >
                <span className="num mt-1 shrink-0 text-[0.625rem] text-sand-faint">
                  {formatTimecode(segment.at)}
                </span>
                <span className="leading-relaxed">{segment.text}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * يبني ارتفاعات أعمدة الموجة من نص المقاطع.
 * حتمية: النص نفسه يعطي الموجة نفسها دائمًا — فلا ترتجف بين عمليات الرسم.
 */
function buildWaveform(segments) {
  const seedText = segments.map((segment) => segment.text).join('')
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const code = seedText.charCodeAt((index * 7) % Math.max(1, seedText.length)) || 65
    const wave = Math.sin(index * 0.55) * 18
    return Math.round(Math.min(100, Math.max(22, 45 + (code % 34) + wave)))
  })
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 translate-x-[1px]" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 001.53.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 008 5.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <rect x="7" y="5" width="4" height="14" rx="1.2" />
      <rect x="13" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

function SeekIcon({ back = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${back ? 'scale-x-[-1]' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 12a8 8 0 108-8" />
      <path d="M12 1.5L15 4l-3 2.5" />
      <text x="7.6" y="16" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">
        10
      </text>
    </svg>
  )
}
