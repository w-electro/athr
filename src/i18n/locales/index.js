/**
 * سجلّ ملفات اللغات.
 *
 * الاستيراد ثابت (static) لا ديناميكي عن قصد: كل الملفات صغيرة (نصوص فقط)
 * ومجموعها أقل من حجم صورة واحدة. التحميل الديناميكي هنا كان سيضيف وميضًا
 * عند تبديل اللغة مقابل توفير لا يُذكر.
 */
import ar from './ar.js'
import en from './en.js'
import fr from './fr.js'
import es from './es.js'
import de from './de.js'
import it from './it.js'
import pt from './pt.js'
import nl from './nl.js'
import pl from './pl.js'
import ru from './ru.js'
import uk from './uk.js'
import el from './el.js'
import tr from './tr.js'
import fa from './fa.js'
import ur from './ur.js'
import he from './he.js'
import hi from './hi.js'
import bn from './bn.js'
import ta from './ta.js'
import zhHans from './zh-Hans.js'
import zhHant from './zh-Hant.js'
import ja from './ja.js'
import ko from './ko.js'
import id from './id.js'
import ms from './ms.js'
import th from './th.js'
import vi from './vi.js'
import tl from './tl.js'
import sw from './sw.js'

export const LOCALES = {
  ar,
  en,
  fr,
  es,
  de,
  it,
  pt,
  nl,
  pl,
  ru,
  uk,
  el,
  tr,
  fa,
  ur,
  he,
  hi,
  bn,
  ta,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ja,
  ko,
  id,
  ms,
  th,
  vi,
  tl,
  sw,
}
