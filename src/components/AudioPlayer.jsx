import { useEffect, useMemo, useRef, useState } from 'react'
import { segmentIndexAt, formatTimecode, progressRatio, PLAYBACK_RATES } from '../lib/narration.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * مشغّل السرد الصوتي (محاكاة).
 *
 * التجربة كاملة: تشغيل/إيقاف، تقديم وتأخير، سرعة، شريط قابل للسحب،
 * ونص متزامن يُبرز الجملة الحالية ويسمح بالقفز إليها.
 *
 * ── الموجة الصوتية ──
 * ليست صورة ولا مكتبة. أعمدة مولّدة بدالة حتمية من نص كل مقطع، فتبدو
 * الموجة مختلفة لكل موقع لكنها ثابتة لا تقفز عند كل رسم. الأعمدة التي
 * مرّ عليها التشغيل تُضاء — فيصبح الشريط مؤشّر تقدّم ورسمًا في آنٍ واحد.
 *
 * ── عند إضافة صوت حقيقي لاحقًا ──
 * استبدل المؤقّت بحدث timeupdate من عنصر <audio> واترك الباقي كما هو:
 *   1) ولّد الصوت بـ TTS واحفظه في public/audio/<siteId>-<lang>.mp3
 *   2) اقرأ currentTime بدل seconds
 *   3) segments تبقى كما هي — المزامنة النصية تعمل دون تغيير
 */

const BAR_COUNT = 44

export default function AudioPlayer({ narration, siteName }) {
  const { t } = useI18n()
  const { segments, totalSeconds } = narration
  const [seconds, setSeconds] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const timerRef = useRef(null)

  // إعادة الضبط عند تغيير اللغة أو الموقع
  useEffect(() => {
    setSeconds(0)
    setPlaying(false)
  }, [narration])

  useEffect(() => {
    if (!playing) return undefined
    timerRef.current = setInterval(() => {
      setSeconds((current) => {
        const next = current + 0.25 * rate
        if (next >= totalSeconds) {
          setPlaying(false)
          return totalSeconds
        }
        return next
      })
    }, 250)
    return () => clearInterval(timerRef.current)
  }, [playing, rate, totalSeconds])

  const bars = useMemo(() => buildWaveform(segments), [segments])
  const activeIndex = segmentIndexAt(segments, seconds)
  const ratio = progressRatio(seconds, totalSeconds)
  const finished = seconds >= totalSeconds

  function toggle() {
    if (finished) setSeconds(0)
    setPlaying((value) => !value)
  }

  function seekBy(delta) {
    setSeconds((current) => Math.min(totalSeconds, Math.max(0, current + delta)))
  }

  return (
    <section
      aria-label={t('audio.title')}
      className="overflow-hidden rounded-2xl border border-night-600 bg-night-900"
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15">
          <span className="text-base" aria-hidden="true">
            ◉
          </span>
          {playing && (
            <span className="absolute inset-0 animate-ring-out rounded-full border border-terracotta" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-semibold text-sand">
            {t('audio.title')} · {siteName}
          </p>
          <p className="truncate text-[0.6875rem] text-sand-faint">{narration.voice}</p>
        </div>
        <button
          type="button"
          onClick={() => setRate(PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length])}
          aria-label={t('audio.speed')}
          className="rounded-lg border border-night-500 px-2.5 py-1 text-[0.6875rem] font-semibold text-sand-dim"
        >
          <span className="num">{rate}</span>×
        </button>
      </div>

      {/* الموجة: عرض وتحكّم معًا */}
      <div className="relative px-4">
        <div className="flex h-14 items-center gap-[3px]" aria-hidden="true">
          {bars.map((height, index) => {
            const passed = index / BAR_COUNT <= ratio
            return (
              <span
                key={index}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  passed ? 'bg-terracotta' : 'bg-night-500'
                }`}
                style={{ height: `${height}%` }}
              />
            )
          })}
        </div>
        <input
          type="range"
          min="0"
          max={totalSeconds}
          step="1"
          value={Math.floor(seconds)}
          onChange={(event) => setSeconds(Number(event.target.value))}
          aria-label={t('audio.position')}
          className="absolute inset-x-4 inset-y-0 h-full w-[calc(100%-2rem)] cursor-pointer opacity-0"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-1 pt-1.5 text-[0.6875rem] text-sand-faint">
        <span className="num">{formatTimecode(seconds)}</span>
        <span className="num">{formatTimecode(totalSeconds)}</span>
      </div>

      <div className="flex items-center justify-center gap-7 px-4 pb-4 pt-1">
        <button
          type="button"
          onClick={() => seekBy(-10)}
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
          onClick={() => seekBy(10)}
          aria-label={t('audio.forward10')}
          className="text-sand-dim transition active:scale-90"
        >
          <SeekIcon />
        </button>
      </div>

      <ol className="max-h-52 space-y-0.5 overflow-y-auto border-t border-night-700 p-2">
        {segments.map((segment, index) => {
          const on = index === activeIndex
          return (
            <li key={segment.at}>
              <button
                type="button"
                onClick={() => {
                  setSeconds(segment.at)
                  setPlaying(true)
                }}
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
 * يبني ارتفاعات الأعمدة من نص المقاطع.
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
