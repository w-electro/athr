import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

/**
 * لماذا HashRouter لا BrowserRouter؟
 *
 * GitHub Pages استضافة ساكنة بلا إعادة توجيه من الخادم. مع BrowserRouter
 * يعطي فتح /scan مباشرةً أو تحديث الصفحة خطأ 404 حقيقيًا، لأن الخادم يبحث
 * عن ملف بهذا المسار. HashRouter يضع المسار بعد # — والخادم لا يراه أصلًا،
 * فكل الروابط تصل إلى index.html.
 *
 * إن انتقلت لاحقًا إلى Vercel أو Netlify (وفيهما إعدادات التوجيه جاهزة في
 * vercel.json و public/_redirects) يمكنك العودة إلى BrowserRouter لروابط أنظف.
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
