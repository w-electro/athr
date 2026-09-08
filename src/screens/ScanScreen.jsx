import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  recognizeSite,
  getActiveProviderName,
  ANALYSIS_STAGES,
} from '../lib/recognition.js'
import { getSiteById, getAllSites } from '../data/sites.js'
import SiteArt from '../components/SiteArt.jsx'

/**
 * شاشة المسح — تعرّف على الموقع من الكاميرا.
 *
 * ما هو حقيقي هنا (وليس محاكاة):
 *   • فتح كاميرا الجهاز الخلفية عبر getUserMedia
 *   • التقاط إطار فعلي ورسمه على canvas وتحويله إلى base64
 *   • مسار بديل برفع صورة من المعرض (يعمل على الحاسوب وعند رفض الإذن)
 *
 * المحاكى هو خطوة واحدة فقط: النموذج الذي يحوّل الصورة إلى هوية موقع.
 * انظر src/lib/recognition.js — استبدالها بنموذج حقيقي لا يمسّ هذا الملف.
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
  const [state, setState] = useState(STATES.idle)
  const [stageIndex, setStageIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [demoTarget, setDemoTarget] = useState('auto')
  const [showDemoPanel, setShowDemoPanel] = useState(false)

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
      // رفض الإذن أو عدم وجود كاميرا (شائع على أجهزة اللجنة) → مسار الرفع
      setState(STATES.denied)
    }
  }

  /** يلتقط إطارًا من الفيديو ويعيده كـ base64 بلا بادئة data:. */
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

    // تقدّم مراحل التحليل — يجعل الانتظار مفهومًا بدل دائرة تدور
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

  function handleShutter() {
    analyze(captureFrame())
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

  const matchedSite = result?.siteId ? getSiteById(result.siteId) : null

  return (
    <div className="screen-pad">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-night-700">المسح الذكي</h1>
          <p className="mt-1 text-sm text-night-400">
            وجّه الكاميرا نحو النقش أو المبنى، وسيتعرّف "أثر" عليه ويروي قصته.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDemoPanel((value) => !value)}
          aria-label="إعدادات العرض التوضيحي"
          className="chip shrink-0 border border-night-100 bg-white text-night-400"
        >
          ⚙︎
        </button>
      </header>

      {showDemoPanel && (
        <DemoPanel
          provider={provider}
          demoTarget={demoTarget}
          onChangeTarget={setDemoTarget}
        />
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
        aria-label="اختر صورة"
      />

      {(state === STATES.idle || state === STATES.starting || state === STATES.denied) && (
        <IdlePanel
          state={state}
          onStart={startCamera}
          onPickFile={() => fileInputRef.current?.click()}
        />
      )}

      {(state === STATES.live || state === STATES.analyzing) && (
        <div className="relative overflow-hidden rounded-3xl bg-night-900 shadow-lift">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-[26rem] w-full object-cover ${state === STATES.analyzing ? 'opacity-40' : ''}`}
          />

          {state === STATES.live && <ViewfinderFrame />}

          {state === STATES.analyzing && (
            <AnalysisOverlay snapshot={snapshot} stageIndex={stageIndex} />
          )}
        </div>
      )}

      {state === STATES.live && (
        <div className="mt-5 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="اختر صورة من المعرض"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-night-100 bg-white text-xl"
          >
            🖼
          </button>
          <button
            type="button"
            onClick={handleShutter}
            aria-label="التقط وحلّل"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-terracotta bg-white
                       shadow-lift transition active:scale-95"
          >
            <span className="h-14 w-14 rounded-full bg-terracotta" />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="إغلاق الكاميرا"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-night-100 bg-white text-xl"
          >
            ✕
          </button>
        </div>
      )}

      {state === STATES.result && result && (
        <ResultPanel result={result} site={matchedSite} snapshot={snapshot} onRetry={reset} />
      )}
    </div>
  )
}

/* ───────────────────────────── الأجزاء الفرعية ───────────────────────────── */

function IdlePanel({ state, onStart, onPickFile }) {
  return (
    <div className="card overflow-hidden">
      <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-night-700 to-night-900">
        <div className="absolute h-28 w-28 animate-pulse-ring rounded-full border-2 border-terracotta" />
        <span className="text-5xl" aria-hidden="true">
          📷
        </span>
      </div>

      <div className="space-y-3 p-5">
        {state === STATES.denied ? (
          <>
            <p className="text-sm font-bold text-night-700">تعذّر فتح الكاميرا</p>
            <p className="text-sm leading-relaxed text-night-400">
              قد يكون الإذن مرفوضًا، أو الجهاز بلا كاميرا، أو الصفحة مفتوحة عبر رابط غير آمن
              (الكاميرا تحتاج HTTPS). يمكنك رفع صورة بدلًا من ذلك.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-night-400">
            سنستخدم الكاميرا الخلفية لالتقاط إطار واحد وتحليله. لا تُرفع الصورة إلى أي خادم في
            وضع المحاكاة.
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={state === STATES.starting}
          className="btn-primary"
        >
          <span aria-hidden="true">📸</span>
          {state === STATES.starting ? 'جارٍ فتح الكاميرا…' : 'افتح الكاميرا'}
        </button>

        <button type="button" onClick={onPickFile} className="btn-ghost w-full">
          <span aria-hidden="true">🖼</span>
          ارفع صورة بدلًا من ذلك
        </button>
      </div>
    </div>
  )
}

function ViewfinderFrame() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-10 inset-y-16 rounded-3xl border-2 border-white/35">
          <span className="absolute -top-1 -start-1 h-7 w-7 rounded-ss-2xl border-s-4 border-t-4 border-terracotta" />
          <span className="absolute -top-1 -end-1 h-7 w-7 rounded-se-2xl border-e-4 border-t-4 border-terracotta" />
          <span className="absolute -bottom-1 -start-1 h-7 w-7 rounded-es-2xl border-b-4 border-s-4 border-terracotta" />
          <span className="absolute -bottom-1 -end-1 h-7 w-7 rounded-ee-2xl border-b-4 border-e-4 border-terracotta" />
        </div>
      </div>
      <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/80">
        اجعل النقش داخل الإطار ثم اضغط الالتقاط
      </p>
    </>
  )
}

function AnalysisOverlay({ snapshot, stageIndex }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-night-900/70 backdrop-blur-sm">
      {snapshot && (
        <img
          src={snapshot}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="absolute inset-x-0 top-0 h-1 animate-scan-sweep bg-gradient-to-b from-transparent via-terracotta to-transparent" />

      <div className="relative space-y-2.5 p-5">
        {ANALYSIS_STAGES.map((stage, index) => {
          const done = index < stageIndex
          const active = index === stageIndex
          return (
            <div
              key={stage.id}
              className={`flex items-center gap-3 text-sm transition ${
                done ? 'text-white/60' : active ? 'text-white' : 'text-white/25'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  done ? 'bg-terracotta text-white' : active ? 'border-2 border-terracotta' : 'border border-white/25'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              {stage.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultPanel({ result, site, snapshot, onRetry }) {
  const confidencePercent = Math.round(result.confidence * 100)

  if (!site) {
    return (
      <div className="card animate-fade-up space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">
            🤔
          </span>
          <div>
            <p className="font-bold text-night-700">{result.label}</p>
            <p className="text-xs text-night-400">
              درجة الثقة: <span className="num">{confidencePercent}</span>%
            </p>
          </div>
        </div>
        <ul className="space-y-1.5 text-sm text-night-400">
          {result.evidence.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
        <button type="button" onClick={onRetry} className="btn-primary">
          حاول مرة أخرى
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div className="card overflow-hidden">
        <SiteArt site={site} height="h-40">
          {snapshot && (
            <img
              src={snapshot}
              alt="الصورة الملتقطة"
              className="absolute bottom-3 end-3 h-20 w-16 rounded-xl border-2 border-white/70 object-cover shadow-lift"
            />
          )}
          <span className="absolute top-3 start-3 chip bg-emerald-500 text-white shadow">
            <span aria-hidden="true">✓</span>
            تعرّفنا عليه
          </span>
        </SiteArt>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs text-night-400">{result.label}</p>
            <h2 className="mt-0.5 text-xl font-extrabold text-night-700">{site.name}</h2>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-night-400">درجة الثقة</span>
              <span className="num font-bold text-terracotta-700">{confidencePercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sand-200">
              <div
                className="h-full rounded-full bg-gradient-to-l from-gold to-terracotta transition-[width] duration-700"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-night-500">على ماذا اعتمد التحليل:</p>
            <ul className="space-y-1.5">
              {result.evidence.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-night-400">
                  <span className="text-terracotta" aria-hidden="true">
                    ◆
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-2xl bg-sand-100 p-3.5 text-sm leading-relaxed text-night-600">
            {site.story[0].body.slice(0, 150)}…
          </p>

          <Link to={`/site/${site.id}`} className="btn-primary">
            <span aria-hidden="true">🎧</span>
            اقرأ القصة كاملة واستمع للسرد
          </Link>
          <button type="button" onClick={onRetry} className="btn-ghost w-full">
            مسح موقع آخر
          </button>
        </div>
      </div>

      <p className="text-center text-[11px] text-night-300">
        المزوّد: {result.provider} · زمن التحليل{' '}
        <span className="num">{Math.round(result.elapsedMs)}</span> مللي ثانية
      </p>
    </div>
  )
}

/**
 * لوحة التحكّم بالعرض التوضيحي.
 *
 * سبب وجودها: في وضع المحاكاة تدور النتائج بالترتيب. أثناء العرض أمام
 * اللجنة قد تريد تثبيت النتيجة على موقع بعينه (مثلًا توجّه الكاميرا نحو
 * صورة مطبوعة لنقوش جبة). هذه اللوحة تجعل ذلك خيارًا صريحًا ومعلنًا،
 * وتختفي تلقائيًا حين يعمل التطبيق بمزوّد تعرّف حقيقي.
 */
function DemoPanel({ provider, demoTarget, onChangeTarget }) {
  return (
    <div className="mb-4 rounded-2xl border border-dashed border-night-200 bg-white p-4">
      <p className="mb-2 text-xs font-bold text-night-600">وضع العرض التوضيحي</p>
      <p className="mb-3 text-[11px] leading-relaxed text-night-400">
        مزوّد التعرّف الحالي: <span className="font-bold text-terracotta-700">{provider}</span>.
        {provider === 'mock'
          ? ' النتائج محاكاة — يمكنك تثبيتها على موقع محدد أثناء العرض.'
          : ' التعرّف حقيقي، ولا أثر لهذا الخيار.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <TargetChip id="auto" label="تلقائي" active={demoTarget === 'auto'} onSelect={onChangeTarget} />
        {getAllSites().map((site) => (
          <TargetChip
            key={site.id}
            id={site.id}
            label={site.shortName}
            active={demoTarget === site.id}
            onSelect={onChangeTarget}
          />
        ))}
      </div>
    </div>
  )
}

function TargetChip({ id, label, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={active}
      className={`chip border ${
        active ? 'border-terracotta bg-terracotta text-white' : 'border-night-100 text-night-500'
      }`}
    >
      {label}
    </button>
  )
}
