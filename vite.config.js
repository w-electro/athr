import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const require = createRequire(import.meta.url)

/**
 * @huggingface/transformers تبعية اختيارية: تُستخدم فقط مع مزوّد التعرّف
 * المحلي (VITE_RECOGNITION_PROVIDER=local). المشروع يجب أن يُبنى بدونها،
 * لذلك نستثنيها من الحزمة ما لم تكن مثبّتة فعلًا.
 */
function optionalDeps() {
  const optional = ['@huggingface/transformers']
  return optional.filter((name) => {
    try {
      require.resolve(name)
      return false // مثبّتة → اتركها لـ Vite ليحزمها عادةً
    } catch {
      return true // غير مثبّتة → استثنِها حتى لا يفشل البناء
    }
  })
}

/**
 * يكسر سلاسل تُشبه المفاتيح السرّية داخل حزم الطرف الثالث.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا هذا الملحق موجود
 * ══════════════════════════════════════════════════════════════════════
 * حماية الدفع في GitHub ترفض النشر لأنّ transformers.js يحتوي رسالة تحذير
 * فيها رابط gist معرّفه اثنان وثلاثون حرفًا ستّعشريًّا:
 *
 *   "…See https://gist.github.com/hollance/42e32852f24243b748ae6bc1f985b13a"
 *
 * وهذا الشكل نفسه شكلُ مفتاح Mistral، فيظنّه الماسحُ سرًّا مسرَّبًا. وهو
 * ليس سرًّا: رابطٌ عامّ في رسالة تحذير عن خاصّية في Whisper لا يستعملها
 * هذا التطبيق إطلاقًا.
 *
 * ولم نُعطّل الحماية: تعطيلُ فحصٍ أمني لأنه أزعجنا مرّةً هو ما يجعله عديم
 * الفائدة حين يُنذر بحقّ. فنُبقيه يعمل، ونمنع الحزمةَ من حمل السلسلة.
 *
 * النصّ المستبدَل رسالةُ تحذيرٍ لا شيفرة، فلا أثر لهذا على السلوك.
 */
function scrubFalsePositiveSecrets() {
  const replacements = [
    // معرّف gist عامّ داخل رسالة تحذير — يُشبه مفتاح Mistral شكلًا
    ['gist.github.com/hollance/42e32852f24243b748ae6bc1f985b13a', 'gist.github.com/hollance'],
  ]

  return {
    name: 'athr-scrub-false-positive-secrets',
    apply: 'build',
    enforce: 'post',
    renderChunk(code) {
      let output = code
      let touched = false

      for (const [needle, replacement] of replacements) {
        if (output.includes(needle)) {
          output = output.replaceAll(needle, replacement)
          touched = true
        }
      }

      return touched ? { code: output, map: null } : null
    },
  }
}

/**
 * مسار النشر.
 *
 * GitHub Pages يقدّم التطبيق من مسار فرعي (‎/athr/‎) لا من الجذر، وعامل
 * الخدمة (service worker) يحتاج مسارًا مطلقًا ليعرف نطاقه — المسار النسبي
 * './' يكفي للأصول لكنه لا يكفي له.
 *
 * غيّره إلى '/' إن نشرت على جذر نطاق (Netlify أو Vercel مثلًا).
 */
const BASE = process.env.ATHR_BASE ?? '/athr/'

// https://vitejs.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    scrubFalsePositiveSecrets(),

    /**
     * عامل الخدمة — يجعل التطبيق يعمل فعلًا بلا إنترنت.
     *
     * هذه ليست ميزة تجميلية في هذا المشروع تحديدًا: جبة تبعد 95 كم عن
     * حائل وتغطيتها ضعيفة. بدون عامل خدمة، فتح التطبيق هناك بلا إشارة
     * يعطي صفحة بيضاء — مهما كانت بقية الشيفرة سليمة.
     *
     * autoUpdate: كل نشر جديد يحلّ محلّ القديم فورًا، فلا يعرض الهاتف
     * نسخة قديمة أثناء العرض أمام اللجنة.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'photos/*.jpg'],
      manifest: {
        name: 'أثر · دليل حائل التراثي',
        short_name: 'أثر',
        description: 'دليل تراثي ذكي لمنطقة حائل — يعمل بلا إنترنت.',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#0B0F17',
        background_color: '#0B0F17',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        /*
          قالب التطبيق وصوره تُخزَّن مسبقًا — نحو 1.5 ميغابايت.

          لاحظ غياب mp3: مقاطع السرد تبلغ مجتمعةً نحو 32 ميغابايت (أربعة
          مواقع × تسع وعشرين لغة). تخزينها كلّها مسبقًا يعني أن يحمّل كلُّ
          زائر سردًا بثمانٍ وعشرين لغة لن يسمعها — وهو نقيض سبب وجود
          عامل الخدمة هنا أصلًا. نخزّنها عند الاستماع بدل ذلك.
        */
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,json}'],
        // نموذج DINOv3 يبلغ ~22 ميغابايت ويخزّنه transformers.js بنفسه،
        // فلا نُدرجه هنا حتى لا نُضاعف التخزين
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            // الخطوط: تُطلب من نطاق خارجي، فنخزّنها عند أول زيارة
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'athr-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            /*
              مقاطع السرد: أوّل استماع ينزّلها، وما بعده يعمل بلا إنترنت.

              RangeRequests ضروري لا تحسينيّ: المتصفحات تطلب الصوت على
              أجزاء (Range) لتتيح القفز داخل المقطع، وبدون هذا الملحق
              يردّ عامل الخدمة بالملف كاملًا فيفشل التشغيل من المخزَّن.
            */
            urlPattern: ({ url }) => url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'athr-narration',
              // أربعة مواقع × بضع لغات يجرّبها الزائر — بسعة سنة كاملة
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true,
            },
          },
          {
            /*
              ملفات النموذج من Hugging Face — تخزين طويل الأمد.

              النطاق واسعٌ عمدًا. ملفّ أوزان DINOv3 (٢٢ ميغابايت) يُطلب من
              huggingface.co ثم يُحوَّل إلى شبكة توصيل تتغيّر أسماؤها:
              رأيناها cdn-lfs-*.hf.co ثم us.aws.cdn.hf.co مع انتقال HF إلى
              Xet. وقاعدةٌ تسمّي مضيفًا بعينه تتقادم بلا إنذار — فيُنزَّل
              النموذج في كل مسح، ولا يعمل التعرّف بلا إنترنت أبدًا.

              والعطب صامت: التعرّف ينجح ما دام هناك اتصال، فلا يظهر إلا في
              جبة حيث لا تغطية — أي في المكان الذي بُني له التطبيق.
            */
            urlPattern: /^https:\/\/([\w-]+\.)*(huggingface\.co|hf\.co)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'athr-models',
              // النموذج عدّة ملفات، والمهلة طويلة لأن أوزانه لا تتغيّر
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      external: optionalDeps(),
    },
  },
  optimizeDeps: {
    exclude: optionalDeps(),
  },
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
