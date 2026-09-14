/**
 * ما يتعلّمه التطبيق من تصحيحات الزائرين.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  لماذا هذا تعلُّمٌ حقيقي لا زينة
 * ══════════════════════════════════════════════════════════════════════
 * العلّة المقيسة في التعرّف ليست في النموذج: الترتيب صحيحٌ 96–98% من
 * المرّات. العلّة أنّ **كلّ** الصور المرجعية من زيارةٍ ميدانية واحدة —
 * يومٌ واحد، جوّالٌ واحد، إضاءةٌ واحدة. فحين تأتي صورةٌ من يومٍ آخر
 * وجوّالٍ آخر، تنزل درجتها وإن كانت للّوحة نفسها.
 *
 * وكلّ تصحيحٍ من زائر هو بالضبط ما ينقص: صورةٌ للّوحة نفسها من يومٍ
 * آخر وزاويةٍ أخرى وجهازٍ آخر. فالتعلّم هنا يعالج العلّة في جذرها، لا
 * يزيد رقمًا في عرضٍ تقديمي.
 *
 * ── أيّ نوعٍ من التعلّم ────────────────────────────────────────────────
 * تعلُّمٌ بالأمثلة (exemplar / k-NN learning): نضيف متجه الصورة المصحّحة
 * إلى الفهرس تحت اسم اللوحة الصحيحة. لا انحدارَ تدرّجي ولا أوزانَ
 * تُعدَّل — والنتيجة فورية: أوّل تصحيحٍ يعمل في المسح التالي مباشرةً.
 *
 * وهذا هو المناسب هنا: ضبطُ أوزان شبكةٍ على عشرات الأمثلة يُفرِط في
 * التخصيص (overfitting)، أمّا توسيع مجموعة الأمثلة فيقوى بكلّ مثال.
 *
 * ── بلا إنترنت ────────────────────────────────────────────────────────
 * التعلّم كلّه داخل الجهاز. لا خادمَ ولا حساب، فيعمل في وسط النفود كما
 * يعمل في المقهى. والمشاركة بين الأجهزة هي وحدها ما يحتاج خادمًا — ولها
 * مسارٌ مجّاني: تُصدَّر التصحيحات وتُضَمّ إلى الفهرس المشحون.
 *
 * ── والتخزين رخيص ─────────────────────────────────────────────────────
 * المتجه 384 رقمًا. نخزّنه int8 (بايتٌ للرقم) فيصير 384 بايتًا للتصحيح
 * الواحد — ألفُ تصحيحٍ أقلّ من نصف ميغابايت.
 */

const DB_NAME = 'athr-learning'
const DB_VERSION = 1
const STORE = 'corrections'

/**
 * حدٌّ أعلى للمتجهات المحفوظة (لا للتصحيحات: كلّ تصحيحٍ عدّة مشاهد).
 *
 * ليس للمساحة — بل لأنّ تصحيحًا خاطئًا يبقى في الفهرس يضلّل كلّ مسحٍ
 * بعده. فحين يمتلئ نُسقط الأقدم، ويبقى للمستخدم زرُّ محوٍ كامل.
 */
export const MAX_CORRECTIONS = 400

/**
 * التكميم بمقياسٍ لكلّ متجه، لا بمقياسٍ ثابت.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  علّةٌ كشفتها التجربة في متصفّح
 * ══════════════════════════════════════════════════════════════════════
 * كان المقياس ثابتًا (×127) على أساس أنّ المتجه مطبَّع فقيمه بين -1 و1.
 * وهذا صحيحٌ نظريًّا ومضلّلٌ عمليًّا: في متجهٍ من 384 بعدًا مطبَّع، وسيط
 * المركّبات 0.032 وأكبرها 0.216 — أي أنّ ×127 يعطي الوسيطَ **أربعة
 * مستويات** لا غير. فيُخزَّن المتجه فاسدًا، ويفشل التصحيح في العمل.
 *
 * وقد ظهر ذلك حين صُحّحت صورةٌ إلى لوحةٍ أخرى ثم أُعيد مسحها: تغيّر
 * الحكم من «يقين» إلى «ترجيح» — أي أنّ المتجه المتعلَّم دخل الفهرس فعلًا
 * وأثّر — لكنه لم يرقَ إلى تجاوز مراجع اللوحة الأصلية، وكان يجب أن
 * يتطابق مع نفسه تطابقًا شبه تامّ.
 *
 * فصار لكلّ متجهٍ مقياسه: نقسم على أكبر مركّبة فنستعمل مدى int8 كاملًا،
 * ويصير للوسيط تسعة عشر مستوًى بدل أربعة.
 */
function quantize(vector) {
  let max = 0
  for (const x of vector) { const a = Math.abs(x); if (a > max) max = a }
  const scale = max || 1
  const bytes = new Int8Array(vector.length)
  for (let i = 0; i < vector.length; i += 1) {
    bytes[i] = Math.max(-127, Math.min(127, Math.round((vector[i] / scale) * 127)))
  }
  return { bytes, scale }
}

function dequantize(bytes, scale) {
  // المتجهات القديمة بلا مقياس: نقرؤها بالسلوك السابق فلا تضيع
  const factor = (scale ?? 1) / 127
  const out = new Float32Array(bytes.length)
  let sum = 0
  for (let i = 0; i < bytes.length; i += 1) {
    out[i] = bytes[i] * factor
    sum += out[i] * out[i]
  }
  // نعيد التطبيع بعد التكميم كي يبقى الضرب النقطي تشابهَ جيب تمام
  const mag = Math.sqrt(sum) || 1
  for (let i = 0; i < out.length; i += 1) out[i] /= mag
  return out
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB غير متاح'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const result = fn(store)
    transaction.oncomplete = () => resolve(result?.result ?? result)
    transaction.onerror = () => reject(transaction.error)
  })
}

/**
 * يحفظ تصحيحًا: هذه الصورة هي هذه اللوحة.
 *
 * يُستدعى في الحالتين — حين يؤكّد الزائر أنّ الجواب صحيح (فيقوى الفهرس
 * بمثالٍ جديد)، وحين يصحّحه إلى لوحةٍ أخرى (فيتعلّم النظام من خطئه).
 */
export async function rememberCorrection({ vectors, siteId }) {
  const list = (vectors ?? []).filter((v) => v?.length)
  if (!list.length || !siteId) return false
  try {
    const db = await openDb()
    const at = Date.now()
    await tx(db, 'readwrite', (store) => {
      /*
        نحفظ متجهات كلّ المشاهد لا أقواها وحده.

        القرار يُتّخذ بالهيمنة على نافذةٍ من عشرة مشاهد. فلو حفظنا مشهدًا
        واحدًا، طابقه مشهدٌ واحد عند إعادة المسح وبقيت التسعة الأخرى
        تصوّت للجواب القديم — تسعةٌ إلى واحد، فلا يتغيّر شيء ويبدو
        التصحيح بلا أثر. وقد وقع هذا فعلًا في أوّل تجربة.

        وحفظُ الكلّ يجعل التصحيح يغطّي النافذة كما غطّاها الأصل، وهو
        أنفع لسببٍ ثانٍ: المشاهد قصّاتٌ بمقاساتٍ ومواضع مختلفة، فتدخل
        الفهرس أمثلةٌ متنوّعة لا نسخةٌ واحدة.
      */
      for (const vector of list) {
        const { bytes, scale } = quantize(vector)
        store.add({ siteId, bytes, scale, at })
      }
    })

    // نُبقي الأحدث ونُسقط ما تجاوز الحدّ
    const all = await tx(db, 'readonly', (store) => store.getAll())
    if (all.length > MAX_CORRECTIONS) {
      const excess = all
        .sort((a, b) => a.at - b.at)
        .slice(0, all.length - MAX_CORRECTIONS)
      await tx(db, 'readwrite', (store) => {
        excess.forEach((row) => store.delete(row.id))
      })
    }
    db.close()
    return true
  } catch {
    // التخزين قد يكون محجوبًا (تصفّحٌ خاصّ). التعرّف يبقى يعمل بلا تعلّم.
    return false
  }
}

/** يُرجع التصحيحات بصيغة مدخلات الفهرس: [{ siteId, vector }] */
export async function loadLearned() {
  try {
    const db = await openDb()
    const rows = await tx(db, 'readonly', (store) => store.getAll())
    db.close()
    return rows.map((row) => ({
      siteId: row.siteId,
      vector: dequantize(row.bytes, row.scale),
      learned: true,
    }))
  } catch {
    return []
  }
}

/** عدد ما تعلّمه الجهاز — يُعرض للمستخدم فيرى أثر تصحيحاته */
export async function countLearned() {
  try {
    const db = await openDb()
    const rows = await tx(db, 'readonly', (store) => store.getAll())
    db.close()
    return rows.length
  } catch {
    return 0
  }
}

/**
 * محوٌ كامل.
 *
 * ضروريّ لا تجميلي: تصحيحٌ خاطئ — بضغطةٍ عن غير قصد، أو بعبثٍ من زائر —
 * يبقى يضلّل كلّ مسحٍ بعده. فلا بدّ من بابٍ للخروج.
 */
export async function forgetLearned() {
  try {
    const db = await openDb()
    await tx(db, 'readwrite', (store) => store.clear())
    db.close()
    return true
  } catch {
    return false
  }
}

/**
 * تصدير التصحيحات نصًّا.
 *
 * الجسر المجّاني إلى المشاركة: ما يتعلّمه جهازٌ واحد يُصدَّر ويُضَمّ إلى
 * الفهرس المشحون، فيصل إلى كلّ زائرٍ في النشرة التالية — بلا خادم.
 */
export async function exportLearned() {
  const rows = await loadLearned()
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    count: rows.length,
    entries: rows.map((r) => ({
      siteId: r.siteId,
      vector: Array.from(r.vector, (x) => Number(x.toFixed(5))),
    })),
  })
}
