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
        // قالب التطبيق وصوره تُخزَّن مسبقًا — نحو 1.5 ميغابايت
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
            // ملفات النموذج من Hugging Face — تخزين طويل الأمد
            urlPattern: /^https:\/\/(huggingface\.co|cdn-lfs.*\.hf\.co)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'athr-models',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 180 },
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
