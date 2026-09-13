import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatTimecode, PLAYBACK_RATES } from '../lib/narration.js'
import { findClip, locateSegment } from '../lib/audioAssets.js'
import {
  isSpeechSupported,
  loadVoices,
  listVoices,
  pickVoice,
  toSpeechLang,
  cancelSpeech,
} from '../lib/speech.js'
import { useI18n } from '../i18n/index.jsx'

/**
 * الدليل الصوتي.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  ثلاثة أوضاع، مرتّبة بالجودة
 * ══════════════════════════════════════════════════════════════════════
 *
 *  ♪ وضع الملف (file) — الأفضل، وهو المعتاد.
 *     مقطع مولّد مسبقًا بأفضل نموذج مفتوح لكل لغة (انظر
 *     scripts/build-narration-audio.py). صوت واحد متّصل بلا تقطيع بين
 *     الجمل، وبدايات الجمل مقيسة وقت التوليد فالإبراز مطابق لا مقدَّر،
 *     وتغيير السرعة يتولّاه المتصفح نفسه بلا إعادة نطق.
 *
 *  🔊 وضع النطق (speech) — حين لا يوجد ملف لهذه اللغة بعد.
 *     المتصفح ينطق السرد عبر Web Speech API. مجاني وبلا إنترنت، لكن
 *     جودته رهن ما ثبّته صانع الهاتف: آليّة غالبًا، ومتقطّعة بين الجمل،
 *     وفي العربية تنطق بلا تشكيل فتخطئ الحركات.
 *
 *  ▶︎ وضع المؤقّت (timer) — حين لا صوت للغة أصلًا.
 *     يتقدّم النص متزامنًا دون صوت، فيبقى الدليل مفيدًا لا معطوبًا.
 *
 * التراجع تلقائي وصامت: الزائر لا يرى رسالة خطأ، يرى دليلًا يعمل.
 *
 * ── لماذا يبقى التقسيم إلى جمل في وضع الملف ──────────────────────────
 * ليس للتشغيل بل للقراءة: الزائر يقفز إلى أي جملة، ويقرأ ما يُنطق الآن.
 * وفي وضع النطق يضيف سببًا ثالثًا: بعض المتصفحات تقطع النطق الطويل بعد
 * نحو خمس عشرة ثانية، وجملنا أقصر من ذلك.
 */

const BAR_COUNT = 44

const MODES = { file: 'file', speech: 'speech', timer: 'timer' }

export default function AudioPlayer({ narration, siteName, siteId }) {
  const { t, contentLanguage } = useI18n()
  const { segments, totalSeconds } = narration

  const [clip, setClip] = useState(null)
  const [clipFailed, setClipFailed] = useState(false)
  // ينتظر بايتات من الشبكة. النطق كان فوريًا، والملف قد لا يكون — فنقولها
  const [buffering, setBuffering] = useState(false)
  const [voice, setVoice] = useState(null)
  const [voiceOptions, setVoiceOptions] = useState([])
  const [showVoices, setShowVoices] = useState(false)
  const [speechReady, setSpeechReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [segIndex, setSegIndex] = useState(0)
  const [segFraction, setSegFraction] = useState(0)
  const [rate, setRate] = useState(0.9)

  // مراجع لتفادي الإغلاقات القديمة داخل مؤقّتات ونداءات النطق
  const indexRef = useRef(0)
  const rateRef = useRef(0.9)
  const playingRef = useRef(false)
  const tickRef = useRef(null)
  const audioRef = useRef(null)

  indexRef.current = segIndex
  rateRef.current = rate
  playingRef.current = playing

  const speechLang = toSpeechLang(contentLanguage)

  const useFile = Boolean(clip) && !clipFailed
  const useSpeech = !useFile && speechReady && Boolean(voice)
  const mode = useFile ? MODES.file : useSpeech ? MODES.speech : MODES.timer

  /* ─────────────────────── اختيار الصوت المناسب ─────────────────────── */

  useEffect(() => {
    let cancelled = false
    if (!isSpeechSupported()) {
      setSpeechReady(true)
      return undefined
    }

    loadVoices().then((voices) => {
      if (cancelled) return

      // بلا اتصال نقصر الاختيار على الأصوات المثبّتة في الجهاز؛ ومع
      // الاتصال تتقدّم الجودة، لأن أفضل الأصوات على أغلب الأنظمة ليست
      // هي الأصوات المضغوطة الافتراضية.
      const requireOffline = typeof navigator !== 'undefined' && navigator.onLine === false
      const options = listVoices(voices, speechLang, { requireOffline })

      setVoiceOptions(options)

      // نحترم اختيار المستخدم السابق لهذه اللغة إن كان الصوت ما زال موجودًا
      let chosen = null
      try {
        const savedName = window.localStorage.getItem(`athr.voice.${speechLang}`)
        chosen = options.find((entry) => entry.name === savedName) ?? null
      } catch {
        /* التخزين غير متاح */
      }

      setVoice(chosen ?? pickVoice(voices, speechLang, { requireOffline }))
      setSpeechReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [speechLang])

  /* ─────────────────────────── مدد المقاطع ─────────────────────────── */

  /*
    بدايات الجمل. حين يوجد مقطع مولّد نستعمل الأزمنة المقيسة وقت التوليد
    بدل الأزمنة المكتوبة يدويًا في المحتوى — فتلك تقديرات كُتبت قبل وجود
    صوت، وهذه قياسات للصوت نفسه.
  */
  const offsets = useMemo(() => {
    if (useFile && clip.offsets.length === segments.length) return clip.offsets
    return segments.map((segment) => segment.at)
  }, [useFile, clip, segments])

  const duration = useFile && clip.seconds > 0 ? clip.seconds : totalSeconds

  const durations = useMemo(
    () => offsets.map((at, index) => Math.max(1, (offsets[index + 1] ?? duration) - at)),
    [offsets, duration],
  )

  const stop = useCallback(() => {
    setPlaying(false)
    playingRef.current = false
    setBuffering(false)
    cancelSpeech()
    audioRef.current?.pause()
    clearInterval(tickRef.current)
  }, [])

  /* ───────────────────── البحث عن مقطع مولّد مسبقًا ───────────────────── */

  useEffect(() => {
    let cancelled = false
    setClip(null)
    setClipFailed(false)

    findClip(contentLanguage, siteId).then((found) => {
      if (cancelled) return
      // لو وصل المقطع بينما المتصفح ينطق (ضغط الزائر تشغيل قبل أن يُقرأ
      // الفهرس) أوقفنا النطق، وإلا سُمع الصوتان معًا
      if (found && playingRef.current) stop()
      setClip(found)
    })

    return () => {
      cancelled = true
    }
  }, [contentLanguage, siteId, stop])

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
    // في وضع الملف يقود الصوتُ النصَّ عبر timeupdate، فلا تقدير ولا مؤقّت
    if (!playing || useFile) return undefined

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
  }, [playing, useFile, useSpeech, segments, durations, stop])

  /* ────────────────── وضع الملف: الصوت يقود النص ────────────────── */

  /** يشغّل الملف من ثانية بعينها، ويتراجع إلى النطق إن تعذّر التشغيل. */
  const playFileAt = useCallback((seconds) => {
    const audio = audioRef.current
    if (!audio) return

    if (Number.isFinite(seconds)) audio.currentTime = seconds
    audio.playbackRate = rateRef.current

    const started = audio.play?.()
    if (started && typeof started.catch === 'function') {
      // تعذّر التشغيل (ملف ناقص أو صيغة غير مدعومة): ننتقل إلى النطق
      started.catch(() => setClipFailed(true))
    }
  }, [])

  function handleTimeUpdate(event) {
    const { index, fraction } = locateSegment(event.target.currentTime, offsets, duration)
    setSegIndex(index)
    setSegFraction(fraction)
  }

  function handleEnded() {
    stop()
    setSegIndex(0)
    setSegFraction(0)
  }

  function toggle() {
    if (playing) {
      stop()
      return
    }
    setPlaying(true)
    playingRef.current = true

    // preload="none" يعني أن أوّل ضغطة تبدأ التنزيل — نُظهر ذلك فورًا
    // بدل أن يبدو الزرّ ميّتًا على اتصال بطيء
    if (useFile) {
      if (audioRef.current?.readyState === 0) setBuffering(true)
      playFileAt(undefined)
    }
    else if (useSpeech) speakSegment(segIndex >= segments.length ? 0 : segIndex)
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

    if (useFile) {
      // نحرّك الرأس حتى وهو متوقّف، ليبدأ التشغيل التالي من هنا
      if (audioRef.current) audioRef.current.currentTime = offsets[next]
      if (playing) playFileAt(offsets[next])
    } else if (playing && useSpeech) {
      speakSegment(next)
    }
  }

  function jumpTo(index) {
    setSegIndex(index)
    setSegFraction(0)
    setPlaying(true)
    playingRef.current = true

    if (useFile) playFileAt(offsets[index])
    else if (useSpeech) speakSegment(index)
  }

  /** يبدّل الصوت ويحفظ الاختيار لهذه اللغة، ثم يعيد نطق المقطع الحالي به. */
  function chooseVoice(next) {
    setVoice(next)
    setShowVoices(false)
    try {
      window.localStorage.setItem(`athr.voice.${speechLang}`, next.name)
    } catch {
      /* التخزين غير متاح — الاختيار يبقى لهذه الجلسة */
    }
    if (playing) {
      // نمرّر الصوت مباشرةً لأن الحالة لم تُحدَّث بعد في هذه الدورة
      cancelSpeech()
      const utterance = new SpeechSynthesisUtterance(segments[segIndex].text)
      utterance.lang = speechLang
      utterance.voice = next
      utterance.rate = rateRef.current
      utterance.onend = () => {
        if (playingRef.current) speakSegment(indexRef.current + 1)
      }
      window.speechSynthesis.speak(utterance)
    }
  }

  function changeRate() {
    const next = PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length]
    setRate(next)
    rateRef.current = next

    if (useFile) {
      // المتصفح يغيّر السرعة أثناء التشغيل بلا انقطاع ولا تغيّر في الطبقة
      if (audioRef.current) audioRef.current.playbackRate = next
    } else if (playing && useSpeech) {
      // النطق الجاري لا يقبل تغيير السرعة، فنعيد نطق المقطع الحالي بها
      speakSegment(segIndex)
    }
  }

  const bars = useMemo(() => buildWaveform(segments), [segments])
  const ratio = Math.min(1, (segIndex + segFraction) / segments.length)
  const elapsed = offsets[segIndex] + segFraction * durations[segIndex]

  return (
    <section
      aria-label={t('audio.title')}
      className="overflow-hidden rounded-2xl border border-night-600 bg-night-900"
    >
      {/*
        عنصر الصوت. لا نضع فيه controls: أزرارنا هي الواجهة، وهذا هو
        المحرّك تحتها. preload="none" حتى لا ننزّل مقاطع لن تُسمع.
      */}
      {useFile && (
        <audio
          ref={audioRef}
          src={clip.url}
          preload="none"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onError={() => setClipFailed(true)}
        />
      )}

      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15">
          <span className="text-base" aria-hidden="true">
            {mode === MODES.timer ? '◉' : '🔊'}
          </span>
          {playing && (
            <span className="absolute inset-0 animate-ring-out rounded-full border border-terracotta" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-semibold text-sand">
            {t('audio.title')} · {siteName}
          </p>
          {/* أسماء الأصوات أعلام لا تُترجم، فنعرضها كما هي */}
          <p className="truncate text-[0.6875rem] text-sand-faint">
            {narration.voice}
            {useFile && clip.voice ? ` · ${clip.voice}` : ''}
            {mode === MODES.speech && voice?.name ? ` · ${voice.name}` : ''}
          </p>
        </div>

        {/*
          اختيار الصوت. لا نعرضه إلا حين يملك الجهاز أكثر من صوت لهذه اللغة،
          لأن الحكم النهائي على جودة الصوت أذنُ المستخدم لا خوارزميتنا.
        */}
        {mode === MODES.speech && voiceOptions.length > 1 && (
          <button
            type="button"
            onClick={() => setShowVoices((value) => !value)}
            aria-label={t('audio.voicePick')}
            aria-expanded={showVoices}
            className="rounded-lg border border-night-500 px-2 py-1 text-sand-dim"
          >
            <VoiceIcon />
          </button>
        )}

        <button
          type="button"
          onClick={changeRate}
          aria-label={t('audio.speed')}
          className="rounded-lg border border-night-500 px-2.5 py-1 text-[0.6875rem] font-semibold text-sand-dim"
        >
          <span className="num">{rate}</span>×
        </button>
      </div>

      {showVoices && (
        <ul className="mx-4 mb-2 max-h-40 overflow-y-auto rounded-lg border border-night-600 bg-night-800">
          {voiceOptions.map((option) => (
            <li key={`${option.name}-${option.lang}`}>
              <button
                type="button"
                onClick={() => chooseVoice(option)}
                aria-pressed={option.name === voice?.name}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-micro ${
                  option.name === voice?.name ? 'text-terracotta-bright' : 'text-sand-dim'
                }`}
              >
                <span className="truncate">{option.name}</span>
                <span className="num shrink-0 text-[0.625rem] text-sand-faint">{option.lang}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

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
        <span className="num">{formatTimecode(duration)}</span>
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
          aria-busy={buffering}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-terracotta text-basalt
                     transition-transform duration-200 ease-athr active:scale-95"
        >
          {buffering ? <SpinnerIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
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
                  {formatTimecode(offsets[index] ?? segment.at)}
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

/** ينزّل المقطع الآن. قوسٌ يدور — لا نصّ، فالانتظار عادةً أقصر من قراءته. */
function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
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
