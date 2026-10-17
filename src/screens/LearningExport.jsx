import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countLearned, exportLearned } from '../lib/learning.js'

/**
 * جسر التصحيحات من الجوّال إلى الفهرس المشحون.
 *
 * التصحيحات محفوظة في هذا الجهاز وحده (IndexedDB) — وفي تطبيق الشاشة
 * الرئيسية على iOS تخزينٌ منفصل عن Safari، فلا بدّ أن يُفتح هذا من داخل
 * التطبيق نفسه الذي صُحّح فيه. يُرسَل الملف إلى الحاسوب، ثم:
 *   node scripts/merge-learned.mjs <الملف>
 */
export default function LearningExport() {
  const [count, setCount] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => { countLearned().then(setCount) }, [])

  async function share() {
    const json = await exportLearned()
    const name = `athr-learned-${new Date().toISOString().slice(0, 10)}.json`
    const file = new File([json], name, { type: 'application/json' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name })
        setStatus('أُرسل ✓')
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
    // بلا مشاركة ملفات: ننسخ النصّ فيُلصق في تيليجرام أو بريد
    try {
      await navigator.clipboard.writeText(json)
      setStatus('نُسخ — الصقه في رسالة لنفسك ✓')
    } catch {
      setStatus('تعذّر الإرسال والنسخ')
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-md space-y-4 p-6 text-sand">
      <h1 className="text-xl font-semibold">ما تعلّمه هذا الجهاز</h1>
      <p className="text-sand-dim">
        {count === null ? '…' : <span className="num">{count}</span>} مثالًا من تصحيحاتك.
        أرسلها إلى الحاسوب لتدخل الفهرس فيستفيد منها كلّ زائر.
      </p>
      <button
        type="button"
        onClick={share}
        disabled={!count}
        className="w-full rounded-xl bg-terracotta px-4 py-3 font-semibold text-basalt disabled:opacity-40"
      >
        أرسل التصحيحات
      </button>
      {status && <p className="text-micro text-sand-dim" role="status">{status}</p>}
      <Link to="/scan" className="block text-center text-micro text-sand-faint underline">رجوع</Link>
    </div>
  )
}
