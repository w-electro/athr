import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { recognizeSite, getActiveProviderName, ANALYSIS_STAGES } from '../lib/recognition.js'
import { getSiteById, getAllSites } from '../data/sites.js'
import SiteArt from '../components/SiteArt.jsx'
import Petroglyph from '../components/Petroglyph.jsx'
import { useI18n } from '../i18n/index.jsx'

/**
 * شاشة المسح — التعرّف على الموقع من الكاميرا.
 *
 * ما هو حقيقي هنا (وليس محاكاة):
 *   • فتح كاميرا الجهاز الخلفية عبر getUserMedia
 *   • التقاط إطار فعلي ورسمه على canvas وتحويله إلى base64
 *   • مسار بديل برفع صورة (يعمل على الحاسوب وعند رفض الإذن)
 *
 * المحاكى خطوة واحدة فقط: النموذج الذي يحوّل الصورة إلى هوية موقع.
 * انظر src/lib/recognition.js — استبدالها لا يمسّ هذا الملف.
 */

const STATES = {
  idle: 'idle',
  starting: 'starting',
  live: 'live',
  analyzing: 'analyzing',
  result: 'result',
  denied: 'denied',
}

export default function ScanScreen() {
  const { t, language } = useI18n()
  const [state, setState] = useState(STATES.idle)
  const [stageIndex, setStageIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [demoTarget, setDemoTarget] = useState('auto')
  const [showDemo, setShowDemo] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  const provider = getActiveProviderName()

  // إيقاف الكاميرا عند مغادرة الشاشة — وإلا بقي ضوء الكاميرا مضاءً
  useEffect(() => stopCamera, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function startCamera() {
    setState(STATES.starting)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState(STATES.live)
    } catch {
      // رفض الإذن أو غياب الكاميرا — شائع على أجهزة لجان التحكيم
      setState(STATES.denied)
    }
  }

  function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null

    const width = video.videoWidth || 720
    const height = video.videoHeight || 960
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { dataUrl, base64: dataUrl.split(',')[1] }
  }

  async function analyze(image) {
    setSnapshot(image?.dataUrl ?? null)
    setState(STATES.analyzing)
    setStageIndex(0)

    let elapsed = 0
    const timers = ANALYSIS_STAGES.map((stage, index) => {
      elapsed += stage.ms
      return setTimeout(() => setStageIndex(index + 1), elapsed)
    })

    const outcome = await recognizeSite({
      imageBase64: image?.base64,
      siteId: demoTarget === 'auto' ? undefined : demoTarget,
    })

    timers.forEach(clearTimeout)
    setResult(outcome)
    setState(STATES.result)
    stopCamera()
  }

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      analyze({ dataUrl, base64: dataUrl.split(',')[1] })
    }
    reader.readAsDataURL(file)
  }

  function reset() {
    setResult(null)
    setSnapshot(null)
    setState(STATES.idle)
  }

  const matchedSite = result?.siteId ? getSiteById(result.siteId, language === 'en' ? 'en' : 'ar') : null

  return (
    <div className="screen-pad">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-hero text-sand">{t('scan.title')}</h1>
          <p className="mt-1.5 text-body text-sand-dim">{t('scan.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDemo((value) => !value)}
          aria-label={t('scan.settings')}
          className="chip-quiet shrink-0"
        >
          <GearIcon />
        </button>
      </header>

      {showDemo && (
        <DemoPanel provider={provider} target={demoTarget} onChange={setDemoTarget} language={language} />
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
        aria-label={t('scan.pick')}
      />

      {(state === STATES.idle || state === STATES.starting || state === STATES.denied) && (
        <IdlePanel
          state={state}
          onStart={startCamera}
          onPickFile={() => fileInputRef.current?.click()}
        />
      )}

      {(state === STATES.live || state === STATES.analyzing) && (
        <div className="relative overflow-hidden rounded-2xl border border-night-600 bg-basalt">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-[26rem] w-full object-cover transition-opacity duration-500 ${
              state === STATES.analyzing ? 'opacity-25' : ''
            }`}
          />
          {state === STATES.live && <Viewfinder hint={t('scan.hint')} />}
          {state === STATES.analyzing && <AnalysisOverlay snapshot={snapshot} stageIndex={stageIndex} t={t} />}
        </div>
      )}

      {state === STATES.live && (
        <div className="mt-6 flex items-center justify-center gap-7">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('scan.gallery')}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-night-500 text-sand-dim"
          >
            <ImageIcon />
          </button>
          <button
            type="button"
            onClick={() => analyze(captureFrame())}
            aria-label={t('scan.shutter')}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-terracotta
                       transition-transform duration-200 ease-athr active:scale-95"
          >
            <span className="h-[52px] w-[52px] rounded-full bg-terracotta" />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label={t('scan.close')}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-night-500 text-sand-dim"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {state === STATES.result && result && (
        <ResultPanel result={result} site={matchedSite} snapshot={snapshot} onRetry={reset} t={t} />
      )}
    </div>
  )
}

/* ───────────────────────────── الأجزاء الفرعية ───────────────────────────── */

function IdlePanel({ state, onStart, onPickFile }) {
  const { t } = useI18n()
  const denied = state === STATES.denied

  return (
    <div className="surface grain overflow-hidden">
      <div className="relative flex h-56 items-center justify-center bg-gradient-to-b from-night-700 to-basalt">
        <Petroglyph shape="camel" className="h-24 w-36 text-terracotta" loop duration={2.6} />
      </div>

      <div className="space-y-3 border-t border-night-600 p-5">
        {denied ? (
          <>
            <p className="font-display text-[1.0625rem] text-sand">{t('scan.failed')}</p>
            <p className="text-body text-sand-dim">{t('scan.failedHint')}</p>
          </>
        ) : (
          <p className="text-body text-sand-dim">{t('scan.privacy')}</p>
        )}

        <button type="button" onClick={onStart} disabled={state === STATES.starting} className="btn-primary">
          {state === STATES.starting ? t('scan.opening') : t('scan.open')}
        </button>
        <button type="button" onClick={onPickFile} className="btn-quiet">
          {t('scan.upload')}
        </button>
      </div>
    </div>
  )
}

function Viewfinder({ hint }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-9 inset-y-16 rounded-2xl border border-sand/20">
          <Corner className="-top-px -start-px border-s-2 border-t-2 rounded-ss-2xl" />
          <Corner className="-top-px -end-px border-e-2 border-t-2 rounded-se-2xl" />
          <Corner className="-bottom-px -start-px border-s-2 border-b-2 rounded-es-2xl" />
          <Corner className="-bottom-px -end-px border-e-2 border-b-2 rounded-ee-2xl" />
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-4 text-center text-micro text-sand/70">{hint}</p>
    </>
  )
}

function Corner({ className }) {
  return <span className={`absolute h-6 w-6 border-terracotta ${className}`} aria-hidden="true" />
}

/**
 * شاشة الانتظار.
 *
 * لا دائرة تحميل. نرسم وعلًا من نقوش جبة بالطريقة التي نُقر بها أصلًا،
 * بينما تُعرض مراحل التحليل الحقيقية تحته. الانتظار يصبح جزءًا من الموضوع
 * لا فاصلًا عنه.
 */
function AnalysisOverlay({ snapshot, stageIndex, t }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-basalt/75 backdrop-blur-[2px]">
      {snapshot && (
        <img src={snapshot} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
      )}
      {/* ضوء مائل يمر على السطح — كشروق يكشف النقش */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 w-1/3 animate-raking-light bg-gradient-to-r from-transparent via-terracotta/15 to-transparent" />
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <Petroglyph shape="ibex" className="h-28 w-40 text-terracotta-bright" loop duration={2.4} />
      </div>

      <div className="relative space-y-2 p-5">
        {ANALYSIS_STAGES.map((stage, index) => {
          const done = index < stageIndex
          const active = index === stageIndex
          return (
            <div
              key={stage.id}
              className={`flex items-center gap-2.5 text-micro transition-colors duration-300 ${
                done ? 'text-sand-dim' : active ? 'text-sand' : 'text-sand-faint/40'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                  done
                    ? 'bg-terracotta text-basalt'
                    : active
                      ? 'border border-terracotta'
                      : 'border border-night-500'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              {t(`scan.stage.${stage.id}`)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultPanel({ result, site, snapshot, onRetry, t }) {
  const percent = Math.round(result.confidence * 100)

  if (!site) {
    return (
      <div className="surface animate-rise-in space-y-4 p-5">
        <p className="font-display text-title text-sand">{t('scan.unknown')}</p>
        <p className="num text-micro text-sand-faint">
          {t('scan.confidence')}: {percent}%
        </p>
        <ul className="space-y-1.5 text-body text-sand-dim">
          {result.evidence.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
        <button type="button" onClick={onRetry} className="btn-primary">
          {t('scan.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-rise-in space-y-4">
      <div className="surface overflow-hidden">
        <SiteArt site={site} height="h-44" priority>
          {snapshot && (
            <img
              src={snapshot}
              alt=""
              className="absolute bottom-3 end-3 h-20 w-16 rounded-lg border border-sand/25 object-cover"
            />
          )}
          <span className="absolute top-3 start-3 chip border border-terracotta/50 bg-basalt/70 text-terracotta-bright backdrop-blur-sm">
            ✓ {t('scan.matched')}
          </span>
        </SiteArt>

        <div className="space-y-5 border-t border-night-600 p-5">
          <div>
            <span className="eyebrow block">{result.label}</span>
            <h2 className="mt-1.5 font-display text-title text-sand">{site.name}</h2>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[0.6875rem]">
              <span className="text-sand-faint">{t('scan.confidence')}</span>
              <span className="num font-semibold text-terracotta-bright">{percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-night-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-terracotta to-gold transition-[width] duration-1000 ease-athr"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2.5">{t('scan.evidence')}</p>
            <ul className="space-y-2">
              {result.evidence.map((item) => (
                <li key={item} className="flex gap-2.5 text-body text-sand-dim">
                  <span className="mt-1 shrink-0 text-terracotta" aria-hidden="true">
                    ◆
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Link to={`/site/${site.id}`} className="btn-primary">
            {t('scan.readMore')}
          </Link>
          <button type="button" onClick={onRetry} className="btn-quiet">
            {t('scan.again')}
          </button>
        </div>
      </div>

      <p className="text-center text-[0.625rem] text-sand-faint">
        {t('scan.provider')}: {result.provider} · {t('scan.elapsed')}{' '}
        <span className="num">{Math.round(result.elapsedMs)}</span> ms
      </p>
    </div>
  )
}

/**
 * لوحة العرض التوضيحي.
 *
 * في وضع المحاكاة تدور النتائج بالترتيب. أثناء العرض أمام اللجنة قد تريد
 * تثبيت النتيجة على موقع بعينه (توجيه الكاميرا نحو صورة مطبوعة مثلًا).
 * اللوحة تجعل ذلك خيارًا صريحًا معلنًا، وتُبطل نفسها مع مزوّد حقيقي.
 */
function DemoPanel({ provider, target, onChange, language }) {
  const { t } = useI18n()
  const sites = getAllSites(language === 'en' ? 'en' : 'ar')

  return (
    <div className="mb-5 rounded-xl border border-dashed border-night-500 bg-night-900 p-4">
      <p className="eyebrow mb-2">{t('scan.demo')}</p>
      <p className="mb-3 text-micro text-sand-faint">
        {t('scan.provider')}: <span className="text-terracotta">{provider}</span> ·{' '}
        {provider === 'mock' ? t('scan.demoHint') : t('scan.demoLive')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Target id="auto" label={t('scan.demoAuto')} on={target === 'auto'} onSelect={onChange} />
        {sites.map((site) => (
          <Target
            key={site.id}
            id={site.id}
            label={site.shortName}
            on={target === site.id}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  )
}

function Target({ id, label, on, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(id)} aria-pressed={on} className={on ? 'chip-on' : 'chip-quiet'}>
      {label}
    </button>
  )
}

/* أيقونات */

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 008 19.4a1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H2a2 2 0 110-4h.1A1.7 1.7 0 003.6 8a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H8a1.7 1.7 0 001-1.5V2a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V8a1.7 1.7 0 001.5 1H22a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 16l-5-5-5 5-2-2-6 6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}
