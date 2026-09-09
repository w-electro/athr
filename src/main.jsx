import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { I18nProvider, resolveInitialLanguage } from './i18n/index.jsx'
import { loadContent } from './data/content/index.js'
import './index.css'

/**
 * لماذا HashRouter لا BrowserRouter؟
 *
 * GitHub Pages استضافة ساكنة بلا إعادة توجيه من الخادم. مع BrowserRouter
 * يعطي فتح /scan مباشرةً أو تحديث الصفحة خطأ 404 حقيقيًا. HashRouter يضع
 * المسار بعد # — والخادم لا يراه أصلًا، فكل الروابط تصل إلى index.html.
 */
function mount() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <I18nProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </I18nProvider>
    </React.StrictMode>,
  )
}

/**
 * نُحمّل محتوى لغة المستخدم قبل أول عرض.
 *
 * المحتوى مقسّم إلى حزمة لكل لغة، فلولا هذا الانتظار القصير لظهرت القصص
 * بالعربية للحظة ثم انقلبت — وميضٌ يبدو كخلل. والتحميل يفشل بأمان: إن
 * تعذّر، يعرض التطبيق الأساس العربي بدل أن يتوقف.
 */
loadContent(resolveInitialLanguage()).catch(() => {}).finally(mount)
