import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.jsx'
import './index.css'

/**
 * لماذا HashRouter لا BrowserRouter؟
 *
 * GitHub Pages استضافة ساكنة بلا إعادة توجيه من الخادم. مع BrowserRouter
 * يعطي فتح /scan مباشرةً أو تحديث الصفحة خطأ 404 حقيقيًا. HashRouter يضع
 * المسار بعد # — والخادم لا يراه أصلًا، فكل الروابط تصل إلى index.html.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </I18nProvider>
  </React.StrictMode>,
)
