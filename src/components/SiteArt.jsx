/**
 * غلاف الموقع.
 *
 * إن وُجدت صورة حقيقية عُرضت كما هي — بلا فلاتر ثنائية اللون. الصور التي
 * جمعناها (نقوش جبة، برج القشلة، جرانيت أجا) ألوانها الطبيعية دافئة أصلًا
 * وتنسجم مع لوحة التطبيق؛ معالجتها كانت ستُتلفها لا تُوحّدها.
 *
 * ما يوحّدها فعلًا هو الحجاب المتدرّج (scrim): يضمن أن النص فوق أي صورة
 * يبقى مقروءًا مهما اختلفت إضاءتها.
 *
 * وإن لم توجد صورة، يُرسم تدرّج لوني مع نقش هندسي — فيبقى التطبيق مكتملًا.
 */
export default function SiteArt({ site, className = '', height = 'h-44', priority = false, children }) {
  const photo = site.photos?.[0]

  return (
    <div
      className={`relative overflow-hidden ${height} ${className}`}
      style={
        photo
          ? undefined
          : { backgroundImage: `linear-gradient(140deg, ${site.art.from}, ${site.art.to})` }
      }
    >
      {photo ? (
        <img
          src={photo}
          alt={site.name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <PatternLayer pattern={site.art.pattern} />
          <span
            aria-hidden="true"
            className="absolute bottom-2 start-3 select-none text-6xl leading-none text-sand/10"
          >
            {site.art.glyph}
          </span>
        </>
      )}

      <div className="scrim absolute inset-0" />
      {children}
    </div>
  )
}

/** نقوش خلفية مختلفة لكل تصنيف — تمنح كل موقع هوية بصرية بلا صور. */
function PatternLayer({ pattern }) {
  const common = 'absolute inset-0 h-full w-full opacity-[0.16]'

  if (pattern === 'peaks') {
    return (
      <svg className={common} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 100 L35 38 L60 66 L95 20 L130 70 L160 45 L200 100 Z" fill="#E8DCC8" />
        <path d="M0 100 L45 60 L80 85 L120 55 L200 100 Z" fill="#E8DCC8" opacity="0.5" />
      </svg>
    )
  }

  if (pattern === 'brick') {
    return (
      <svg className={common} viewBox="0 0 200 100" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, row) =>
          Array.from({ length: 9 }).map((__, col) => (
            <rect
              key={`${row}-${col}`}
              x={col * 24 + (row % 2 ? 12 : 0)}
              y={row * 15 + 3}
              width="20"
              height="10"
              rx="2"
              fill="#E8DCC8"
            />
          )),
        )}
      </svg>
    )
  }

  if (pattern === 'grid') {
    return (
      <svg className={common} viewBox="0 0 200 100" aria-hidden="true">
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 22} y1="0" x2={i * 22} y2="100" stroke="#E8DCC8" strokeWidth="1.5" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 25} x2="200" y2={i * 25} stroke="#E8DCC8" strokeWidth="1.5" />
        ))}
      </svg>
    )
  }

  // 'rock' — أشكال مستوحاة من نقوش جبة
  return (
    <svg className={common} viewBox="0 0 200 100" aria-hidden="true">
      <g stroke="#E8DCC8" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M28 62 h26 v14 M28 62 v14 M54 62 l8-7 M62 55 q6-6 10 0" />
        <path d="M100 45 v22 M100 50 l-9 8 M100 50 l9 8 M100 67 l-7 12 M100 67 l7 12 M100 45 a4 4 0 110-8 4 4 0 010 8" />
        <path d="M140 66 h22 v12 M140 66 v12 M162 66 l7-6 M169 60 q5-5 9 0" />
      </g>
    </svg>
  )
}
