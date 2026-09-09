/**
 * سجلّ المحتوى التراثي المترجم — بتحميل كسول لكل لغة على حدة.
 *
 * ── لماذا كسول ──────────────────────────────────────────────────────────
 * قصص المواقع الأربعة بـ28 لغة تزن نحو 700 كيلوبايت. لو استوردناها كلها
 * دفعةً واحدة لحمّل كلُّ زائر محتوى 27 لغة لن يقرأها أبدًا — وهذا تحديدًا
 * ما لا يُحتمل في الموقع الذي بُني له التطبيق: جبة تبعد 95 كم عن حائل
 * والتغطية فيها ضعيفة.
 *
 * import.meta.glob بلا eager يحوّل كل ملف لغة إلى حزمة مستقلة، فلا يُنزَّل
 * منها إلا ما يختاره المستخدم فعلًا.
 *
 * ما ليس هنا: البنية. الإحداثيات والمدد والتصنيفات والصور وتوقيتات مقاطع
 * السرد كلّها في sites.js، فلا يمكن أن تتباعد بين اللغات مهما تُرجمت.
 *
 * العربية ليست في هذه القائمة لأنها لغة الأساس المكتوبة داخل sites.js نفسه.
 */

const loaders = import.meta.glob(['./*.js', '!./index.js'])

/** رموز اللغات التي لها ملف محتوى (كل شيء عدا العربية). */
export const CONTENT_LANGUAGE_CODES = Object.keys(loaders).map((path) => path.slice(2, -3))

const cache = new Map()

/**
 * المحتوى المحمَّل لهذه اللغة، أو null إن لم يُحمَّل بعد.
 * متزامنة عمدًا: تناديها sites.js أثناء العرض ولا يمكنها الانتظار.
 */
export function getLoadedContent(code) {
  return cache.get(code) ?? null
}

/** يحمّل محتوى لغة واحدة ويخزّنه. آمن للاستدعاء المتكرر. */
export async function loadContent(code) {
  if (!code || code === 'ar') return null
  if (cache.has(code)) return cache.get(code)

  const load = loaders[`./${code}.js`]
  if (!load) return null

  const module = await load()
  cache.set(code, module.default)
  return module.default
}

/**
 * يحمّل كل اللغات دفعةً واحدة.
 * للاختبارات فقط — لا تستدعها في الإنتاج، فهي تُبطل فائدة التقسيم كاملة.
 */
export async function primeContentCache() {
  await Promise.all(CONTENT_LANGUAGE_CODES.map((code) => loadContent(code)))
  return loadedContentMap()
}

/** لقطة مما هو محمَّل الآن — تستخدمها الاختبارات للفحص. */
export function loadedContentMap() {
  return Object.fromEntries(cache)
}
