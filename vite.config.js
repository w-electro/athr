import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

// https://vitejs.dev/config/
export default defineConfig({
  // مسارات نسبية للأصول: يعمل على الجذر وعلى مسار فرعي مثل
  // https://<user>.github.io/athr/ دون تعديل.
  base: './',
  plugins: [react()],
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
