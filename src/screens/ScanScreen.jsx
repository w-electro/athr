import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createRecognitionSession, recognizeSite, getActiveProviderName, ANALYSIS_STAGES } from '../lib/recognition.js'
import { getSiteById, getAllSites } from '../data/sites.js'
import { getPanelById, isPanelId, SUBJECTS } from '../data/panels.js'
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
  scanning: 'scanning',   // مسحٌ متّصل: الكاميرا تلتقط والمستخدم يحرّك يده
  analyzing: 'analyzing',
  result: 'result',
  denied: 'denied',
}

/**
 * حدّ المحاولة: بعده نتوقّف ونقول «لم أتعرّف».
 *
 * بلا حدٍّ يظلّ المسح دائرًا إلى أن تفرغ البطارية، ويظنّ الواقف أمام
 * صخرةٍ خطأ أنّ التطبيق يفكّر. أربعون إطارًا ≈ من عشرين إلى ثلاثين ثانية
 * على جوّالٍ متوسّط — وهي مهلةٌ يحرّك فيها المستخدم يده كثيرًا.
 */
const MAX_SCAN_FRAMES = 40

/** كم محاولة التقاطٍ فاشلة نحتمل قبل أن نُقرّ بأنّ الكاميرا لا تسلّم إطارًا */
const MAX_STALLED_FRAMES = 40

export default function ScanScreen() {
  const { t, contentLanguage, contentDir } = useI18n()
  const [state, setState] = useState(STATES.idle)
  const [stageIndex, setStageIndex] = useState(0)
  const [result, setResult] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [demoTarget, setDemoTarget] = useState('auto')
  const [showDemo, setShowDemo] = useState(false)
  // يصير صحيحًا حين تُرسل الكاميرا أول إطار فعلي، لا حين يُمنح الإذن
  const [frameReady, setFrameReady] = useState(false)
  const [scanFrames, setScanFrames] = useState(0)
  const [scanProbe, setScanProbe] = useState(null)
  const scanAbortRef = useRef(false)

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
    // نفكّ الارتباط أيضًا، وإلا بقي آخر إطار معلّقًا على الشاشة
    if (videoRef.current) videoRef.current.srcObject = null
  }

  /**
   * ربط البثّ بعنصر الفيديو.
   *
   * ══════════════════════════════════════════════════════════════════
   *  لماذا في useEffect لا داخل startCamera
   * ══════════════════════════════════════════════════════════════════
   * عنصر <video> لا يُركَّب إلا حين تصير الحالة `live`. وكانت النسخة
   * الأولى تُسند البثّ داخل startCamera بينما الحالة ما زالت `starting`،
   * فيكون videoRef.current قيمته null، فتُتخطّى الإسنادُ بصمت، ثم تصير
   * الحالة live فيظهر عنصر فيديو فارغ.
   *
   * النتيجة التي رآها المستخدم: يمنح الإذن ثم يرى شاشة سوداء.
   *
   * الآن نُسند بعد التركيب فعلًا — وهذا هو الترتيب الصحيح دائمًا مع
   * عنصر يظهر شرطيًا.
   */
  useEffect(() => {
    /*
      حالات العرض الثلاث لا اثنتان.

      نسيان scanning هنا يُعيد العلّة التي أُصلحت من قبل حرفًا بحرف:
      البثّ يُربط والحالة غير معروضة، فيكون المرجع null ويُتخطّى الربط
      بصمت — وتبقى الشاشة سوداء بلا خطأ في الطرفيّة.
    */
    if (
      state !== STATES.live
      && state !== STATES.scanning
      && state !== STATES.analyzing
    ) return undefined
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream || video.srcObject === stream) return undefined

    video.srcObject = stream

    // play() تُرجع وعدًا في المتصفحات الحديثة و undefined في غيرها،
    // فنتحقّق قبل أن نسلسل عليه — وإلا رمى السطرُ نفسُه واختفت الشاشة
    const started = video.play?.()
    if (started && typeof started.catch === 'function') started.catch(() => {})

    return undefined
  }, [state])

  async function startCamera() {
    setState(STATES.starting)
    setFrameReady(false)

    // بعض الأجهزة ترفض قيدًا لا تدعمه، فنطلب الكاميرا الخلفية أولًا ثم
    // نقنع بأي كاميرا بدل أن نُظهر "تعذّر الفتح" ونحن لم نحاول فعلًا
    const attempts = [
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false },
    ]

    for (const constraints of attempts) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints)
        setState(STATES.live)
        return
      } catch {
        // نجرّب القيد التالي
      }
    }

    // رفض الإذن أو غياب الكاميرا — شائع على أجهزة لجان التحكيم
    setState(STATES.denied)
  }

  /*
    المسح المتّصل: نلتقط إطارًا، نسلّمه للجلسة، ونكرّر حتى تتعرّف أو ننفد
    من المحاولات. ولا نستعمل setInterval: الاستدلال قد يطول أكثر من
    الفاصل الزمني فتتراكم النداءات وتخنق الجوّال. نُطلق التالي بعد انتهاء
    السابق فعلًا.
  */
  async function runLiveScan() {
    setState(STATES.scanning)
    setScanFrames(0)
    setScanProbe(null)
    scanAbortRef.current = false

    /*
      تحميل محرّك التعرّف قد يفشل، وأشهر أسبابه ليس نادرًا:

      التطبيق يعمل بلا إنترنت عبر عامل خدمة، فإن نُشرت نسخةٌ جديدة بقيت
      صفحةٌ قديمة تشير إلى حزمةٍ تغيّر اسمها — فيردّ الخادم 404 ويفشل
      الاستيراد الديناميكي. وقد وقع هذا فعلًا في أوّل تجربةٍ في متصفّح.

      وبلا هذا الالتقاط يبقى الوعد مرفوضًا بلا معالج، والحالة scanning
      إلى الأبد: شريطٌ لا يمتلئ وشاشةٌ لا تقول شيئًا.
    */
    let session
    try {
      session = await createRecognitionSession()
    } catch {
      setResult({
        status: 'no-match',
        siteId: null,
        confidence: 0,
        evidence: ['engine-unavailable'],
      })
      setState(STATES.result)
      stopCamera()
      return
    }

    let stalled = 0

    while (!scanAbortRef.current) {
      const image = captureFrame()

      /*
        الكاميرا قد لا تسلّم إطارًا: إذنٌ سُحب، أو لسانٌ آخر أخذ الجهاز،
        أو بثٌّ تجمّد. وبلا حدٍّ هنا تدور الحلقة أبدًا بلا التقاطٍ ولا
        خطأ — فيرى المستخدم شاشةً واقفة ويظنّ التطبيق يفكّر.
      */
      if (!image) {
        stalled += 1
        if (stalled > MAX_STALLED_FRAMES) {
          setState(STATES.live)
          return
        }
        await new Promise((r) => setTimeout(r, 120))
        continue
      }
      stalled = 0

      let outcome
      try {
        outcome = await session.push({ imageBase64: image.base64 })
      } catch {
        break   // فشل النموذج: نخرج إلى مسار اللقطة الواحدة
      }
      if (scanAbortRef.current) return

      setScanFrames(outcome.frames)
      if (outcome.status === 'searching') {
        setScanProbe({ best: outcome.best, id: outcome.bestId, margin: outcome.margin })
      }

      // «الأرجح» نتيجةٌ أيضًا: النظام يعرف، فيقول موسومًا
      if (outcome.status === 'match' || outcome.status === 'probable') {
        setSnapshot(image.dataUrl)
        setResult(outcome)
        setState(STATES.result)
        stopCamera()
        return
      }

      if (outcome.frames >= MAX_SCAN_FRAMES) {
        setSnapshot(image.dataUrl)
        setResult({ status: 'no-match', siteId: null, confidence: outcome.best ?? 0 })
        setState(STATES.result)
        stopCamera()
        return
      }

      // نفس للمتصفّح كي تبقى الواجهة حيّة والفيديو سلسًا
      await new Promise((r) => setTimeout(r, 60))
    }
  }

  function stopLiveScan() {
    scanAbortRef.current = true
    setState(STATES.live)
  }

  function captureFrame() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null

    /*
      الكاميرا تحتاج جزءًا من الثانية قبل أن تُرسل أول إطار، وقبلها تكون
      videoWidth صفرًا. لو عوّضنا الصفر بمقاس افتراضي لرسمنا لقطة سوداء
      تمامًا ثم سلّمناها للنموذج كأنها صورة — فيردّ بنتيجة عن لا شيء.
      نرفض الالتقاط بدل أن نختلق صورة.
    */
    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return null

    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { dataUrl, base64: dataUrl.split(',')[1] }
  }

  async function analyze(image) {
    // لا نحلّل عدمًا — الزرّ معطّل حتى تجهز الكاميرا، وهذا حارس أخير
    if (!image) return

    setSnapshot(image.dataUrl)
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

  // contentLanguage هي لغة المحتوى الفعلية (تتراجع للإنجليزية للغات التي لم
  // يُترجم محتواها بعد) — لا language مباشرة، وإلا ظهر المحتوى بالعربية دائمًا.
  /*
    فهرس التعرّف يخلط المواقع واللوحات في مساحة معرّفات واحدة، فقد يعود
    بـ jubbah أو بـ jubbah-p2. واللوحة تُرجع موقعَها أيضًا: الزائر يريد
    القصّة الدقيقة، لكنه يحتاج أن يعرف أين هو.
  */
  const matchedPanel = isPanelId(result?.siteId)
    ? getPanelById(result.siteId, contentLanguage)
    : null

  const matchedSiteId = matchedPanel ? matchedPanel.siteId : result?.siteId
  const matchedSite = matchedSiteId ? getSiteById(matchedSiteId, contentLanguage) : null

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
        <DemoPanel
          provider={provider}
          target={demoTarget}
          onChange={setDemoTarget}
          contentLanguage={contentLanguage}
        />
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {/*
        بلا capture عمدًا.

        capture="environment" يأمر متصفّح الجوال بفتح الكاميرا مباشرةً
        وتخطّي منتقي الملفّات — فيصير زرّ «اختر صورة» زرَّ كاميرا ثانيًا،
        ولا سبيل إلى صورةٍ من المعرض أو من الحاسوب إطلاقًا.

        وهذا المسار هو الوحيد المتاح حين يُرفض إذن الكاميرا، أو حين يُجرَّب
        التطبيق على حاسوب بلا كاميرا — أي في العرض أمام لجنة التحكيم.
      */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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

      {/*
        عنصر الفيديو يبقى مركَّبًا طوال المسح المتّصل.

        وإسقاط scanning من هذا الشرط لا يُخفي الصورة فحسب: يُفكَّك العنصر
        فيصير videoRef.current معدومًا، فيُرجع captureFrame قيمة null في
        كلّ دورة، فتدور الحلقة أبدًا بلا التقاطٍ ولا خطأ — شاشةٌ فارغة
        وتطبيقٌ يبدو معلّقًا.
      */}
      {(state === STATES.live
        || state === STATES.scanning
        || state === STATES.analyzing) && (
        <div className="relative overflow-hidden rounded-2xl border border-night-600 bg-basalt">
          <video
            ref={videoRef}
            // playsInline يمنع iOS من فتح الفيديو ملء الشاشة،
            // و autoPlay يضمن التشغيل إن رُفض وعد play() لفقد سياق اللمسة
            autoPlay
            playsInline
            muted
            // أول إطار وصل فعلًا: الآن فقط صارت videoWidth حقيقية
            onLoadedMetadata={() => setFrameReady(true)}
            className={`h-[26rem] w-full object-cover transition-opacity duration-500 ${
              state === STATES.analyzing ? 'opacity-25' : ''
            }`}
          />
          {state === STATES.live && <Viewfinder hint={t('scan.hint')} />}
          {state === STATES.scanning && (
            <Viewfinder hint={t('scan.moving')} scanning frames={scanFrames} max={MAX_SCAN_FRAMES} />
          )}
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
            onClick={runLiveScan}
            disabled={!frameReady}
            aria-label={t('scan.shutter')}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-terracotta
                       transition-all duration-200 ease-athr active:scale-95 disabled:scale-90 disabled:opacity-40"
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

      {state === STATES.scanning && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-body text-sand-dim">{t('scan.moving')}</p>
          {/*
            قراءةٌ حيّة لأقرب لوحةٍ ودرجتها.

            ليست زينة: هي الطريقة الوحيدة لمعرفة ما يجري على جهاز المستخدم
            فعلًا. ولا تُقاس اللقطات الحيّة — بما فيها اهتزاز اليد وبحث
            العدسة عن التركيز — إلا على جهازٍ حقيقي أمام صخرةٍ حقيقية.
          */}
          {scanProbe?.id && (
            <p className="font-mono text-micro text-sand-faint" dir="ltr">
              {scanProbe.id} · {scanProbe.best?.toFixed(3)}
              {scanProbe.margin != null && ` · Δ${scanProbe.margin.toFixed(3)}`}
            </p>
          )}
          <button
            type="button"
            onClick={stopLiveScan}
            className="rounded-xl border border-night-500 px-5 py-2.5 text-body text-sand-dim
                       transition-colors duration-200 hover:text-sand"
          >
            {t('scan.stop')}
          </button>
        </div>
      )}

      {state === STATES.result && result && (
        <ResultPanel
          result={result}
          site={matchedSite}
          panel={matchedPanel}
          snapshot={snapshot}
          onRetry={reset}
          t={t}
          contentDir={contentDir}
        />
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

function Viewfinder({ hint, scanning = false, frames = 0, max = 1 }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        {/*
          أثناء المسح المتّصل تنبض الزوايا: إشارةٌ حيّة بأنّ التطبيق يعمل
          الآن، لا ينتظر ضغطة. وبلا نصٍّ إضافي — الحركة وحدها تكفي.
        */}
        <div
          className={`absolute inset-x-9 inset-y-16 rounded-2xl border transition-colors duration-300 ${
            scanning ? 'animate-pulse border-terracotta/40' : 'border-sand/20'
          }`}
        >
          <Corner className="-top-px -start-px border-s-2 border-t-2 rounded-ss-2xl" />
          <Corner className="-top-px -end-px border-e-2 border-t-2 rounded-se-2xl" />
          <Corner className="-bottom-px -start-px border-s-2 border-b-2 rounded-es-2xl" />
          <Corner className="-bottom-px -end-px border-e-2 border-b-2 rounded-ee-2xl" />
        </div>
      </div>
      <p className="absolute inset-x-0 bottom-4 text-center text-micro text-sand/70">{hint}</p>
      {scanning && (
        /* شريطٌ رفيع يوضّح أنّ للمحاولة نهاية، فلا ينتظر الواقف بلا حدّ */
        <div className="absolute inset-x-9 bottom-2 h-px overflow-hidden rounded-full bg-sand/15">
          <div
            className="h-full bg-terracotta transition-[width] duration-300 ease-athr"
            style={{ width: `${Math.min(100, (frames / max) * 100)}%` }}
          />
        </div>
      )}
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

/**
 * جسد اللوحة: حِقبتها، قصّتها، وما يُبحث عنه فيها.
 *
 * «ابحث عن» مقصودٌ في آخره: الزائر واقفٌ أمام الصخر لا جالسٌ يقرأ، فآخر
 * ما يراه قبل أن يرفع عينيه ينبغي أن يكون توجيهًا لعينه لا معلومةً أخرى.
 */
function PanelBody({ panel, t, contentDir }) {
  const subject = SUBJECTS[panel.subject] ?? SUBJECTS.unknown

  return (
    <div className="space-y-4" dir={contentDir}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip-quiet">
          <span aria-hidden="true">{subject.icon}</span>
          {t(`era.${panel.era}Short`)}
        </span>
        {/* الموضوع غير المحسوم يُقال صراحةً: علامةُ استفهامٍ وحدها تبدو
            عطبًا في الواجهة، والتصريح يبدو ما هو — أمانةً علمية */}
        {panel.subject === 'unknown' && (
          <span className="chip-quiet">{t('panel.unknownSubject')}</span>
        )}
        {panel.hasInscriptions && (
          <span className="chip-quiet text-gold-bright">✎ {t('panel.inscriptions')}</span>
        )}
        {panel.famous && (
          <span className="chip border border-terracotta/50 text-terracotta-bright">
            ★ {t('panel.famous')}
          </span>
        )}
      </div>

      <p className="text-body leading-relaxed text-sand-dim">{panel.story}</p>

      <div className="rounded-xl border-s-2 border-terracotta bg-terracotta/[0.07] p-3.5">
        <p className="eyebrow mb-1.5 text-terracotta-bright">{t('panel.look')}</p>
        <p className="text-micro leading-relaxed text-sand-dim">{panel.look}</p>
      </div>
    </div>
  )
}

function ResultPanel({ result, site, panel, snapshot, onRetry, t, contentDir }) {
  const percent = Math.round(result.confidence * 100)

  /*
    النتيجة المرجّحة تُعرض باسمها لا بالصمت.

    فحين تتصدّر لوحةٌ أغلبَ المسح، كان التطبيق يقول «لم نتعرّف» — وهو
    ادّعاء جهلٍ يكذّبه ما يراه المستخدم على شاشته. فنقولها الآن، ونضع
    عليها وسم الترجيح وزرّ إعادة المحاولة: صدقٌ في الاتجاهين.
  */
  const tentative = result.status === 'probable'

  /*
   * من أين يأتي النص؟
   * مزوّد يولّد وصفًا حرًّا بلغة المستخدم نعرض نصّه كما هو. أما المحاكاة
   * والتعرّف المحلي فيُرجعان المعرّف فقط، فنقرأ الاسم والأدلة من بيانات
   * الموقع بلغة المحتوى الحالية.
   */
  const label = result.label ?? site?.scan.matchLabel
  const evidence = result.evidence?.length ? result.evidence : (site?.scan.evidence ?? [])

  if (!site) {
    return (
      <div className="surface animate-rise-in space-y-4 p-5">
        <p className="font-display text-title text-sand">{t('scan.unknown')}</p>
        <p className="text-body text-sand-dim">{t('scan.hint')}</p>
        <p className="num text-micro text-sand-faint">
          {t('scan.confidence')}: {percent}%
        </p>
        {result.error && (
          <ul className="space-y-1.5 text-micro text-sand-faint">
            {evidence.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        )}
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
          {/*
            وسمُ الترجيح بلون الذهب لا الطين، وبعلامة استفهامٍ لا صحّ:
            فرقٌ بصريّ يُدرَك قبل قراءة الكلمة، فلا يُقرأ الظنّ يقينًا.
          */}
          <span
            className={`absolute top-3 start-3 chip border backdrop-blur-sm ${
              tentative
                ? 'border-gold/50 bg-basalt/70 text-gold'
                : 'border-terracotta/50 bg-basalt/70 text-terracotta-bright'
            }`}
          >
            {tentative ? `؟ ${t('scan.tentative')}` : `✓ ${t('scan.matched')}`}
          </span>
        </SiteArt>

        <div className="space-y-5 border-t border-night-600 p-5">
          {/*
            حين تُعرف اللوحة يتقدّم اسمها على اسم الموقع: الزائر يعرف أنه
            في جبة، وما جاء من أجله هو معرفة ما أمامه الآن.
          */}
          <div dir={contentDir}>
            {panel ? (
              <>
                <span className="eyebrow block">{t('panel.atSite', { site: site.shortName })}</span>
                <h2 className="mt-1.5 font-display text-title text-sand">{panel.name}</h2>
              </>
            ) : (
              <>
                <span className="eyebrow block">{label}</span>
                <h2 className="mt-1.5 font-display text-title text-sand">{site.name}</h2>
              </>
            )}
          </div>

          {panel && <PanelBody panel={panel} t={t} contentDir={contentDir} />}

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
            <ul className="space-y-2" dir={contentDir}>
              {evidence.map((item) => (
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
function DemoPanel({ provider, target, onChange, contentLanguage }) {
  const { t } = useI18n()
  const sites = getAllSites(contentLanguage)

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
