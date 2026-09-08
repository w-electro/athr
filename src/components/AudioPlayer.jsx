import { useEffect, useRef, useState } from 'react'
import {
  segmentIndexAt,
  formatTimecode,
  progressRatio,
  PLAYBACK_RATES,
} from '../lib/narration.js'

/**
 * مشغّل السرد الصوتي (محاكاة).
 *
 * يقدّم تجربة دليل صوتي كاملة: تشغيل/إيقاف، تقديم وتأخير 10 ثوانٍ،
 * تغيير السرعة، شريط تقدّم قابل للسحب، ونص متزامن يُبرز الجملة الحالية.
 *
 * المؤقّت هو المصدر الوحيد للزمن هنا. عند إضافة صوت حقيقي لاحقًا،
 * استبدل `setInterval` بحدث `timeupdate` من عنصر <audio> واترك الباقي كما هو.
 */
export default function AudioPlayer({ narration, siteName }) {
  const { segments, totalSeconds } = narration
  const [seconds, setSeconds] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const timerRef = useRef(null)

  // حلقة التشغيل: خطوة كل 250 مللي ثانية لتقدّم سلس بلا استهلاك زائد
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

  function seekTo(event) {
    setSeconds(Number(event.target.value))
  }

  function jumpToSegment(index) {
    setSeconds(segments[index].at)
    setPlaying(true)
  }

  return (
    <section
      aria-label="السرد الصوتي"
      className="overflow-hidden rounded-3xl bg-night-700 text-white shadow-lift"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracotta text-xl ${
            playing ? 'shadow-[0_0_0_6px_rgba(201,122,74,0.18)]' : ''
          }`}
        >
          <span aria-hidden="true">🎧</span>
          {playing && (
            <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-terracotta" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">الدليل الصوتي · {siteName}</p>
          <p className="truncate text-[11px] text-white/55">{narration.voice}</p>
        </div>
        <button
          type="button"
          onClick={() => setRate(PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length])}
          aria-label="تغيير سرعة التشغيل"
          className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"
        >
          <span className="num">{rate}</span>×
        </button>
      </div>

      <div className="space-y-3 px-5 pt-4">
        <input
          type="range"
          min="0"
          max={totalSeconds}
          step="1"
          value={Math.floor(seconds)}
          onChange={seekTo}
          aria-label="موضع التشغيل"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-terracotta"
          style={{
            background: `linear-gradient(to left, #C97A4A ${ratio * 100}%, rgba(255,255,255,0.15) ${
              ratio * 100
            }%)`,
          }}
        />
        <div className="flex justify-between text-[11px] text-white/50">
          <span className="num">{formatTimecode(seconds)}</span>
          <span className="num">{formatTimecode(totalSeconds)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-5 pb-4 pt-1">
        <button
          type="button"
          onClick={() => seekBy(-10)}
          aria-label="رجوع عشر ثوانٍ"
          className="text-white/70 transition active:scale-90"
        >
          <SeekIcon direction="back" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل السرد'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta shadow-lift transition active:scale-95"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          type="button"
          onClick={() => seekBy(10)}
          aria-label="تقديم عشر ثوانٍ"
          className="text-white/70 transition active:scale-90"
        >
          <SeekIcon direction="forward" />
        </button>
      </div>

      <ol className="max-h-56 space-y-1 overflow-y-auto border-t border-white/10 px-3 py-3">
        {segments.map((segment, index) => (
          <li key={segment.at}>
            <button
              type="button"
              onClick={() => jumpToSegment(index)}
              className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-start text-sm leading-relaxed transition ${
                index === activeIndex ? 'bg-white/10 text-white' : 'text-white/45'
              }`}
            >
              <span className="num mt-0.5 shrink-0 text-[11px] text-white/40">
                {formatTimecode(segment.at)}
              </span>
              <span>{segment.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 001.53.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 008 5.5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white" aria-hidden="true">
      <rect x="7" y="5" width="4" height="14" rx="1.2" />
      <rect x="13" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

function SeekIcon({ direction }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-7 w-7 ${direction === 'forward' ? '' : 'scale-x-[-1]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 12a8 8 0 108-8" />
      <path d="M12 1.5L15 4l-3 2.5" />
      <text x="7.5" y="16" fontSize="7" fill="currentColor" stroke="none">
        10
      </text>
    </svg>
  )
}
