/**
 * غلاف بصري للموقع.
 *
 * إن وُجدت صورة حقيقية في site.photos[0] عُرضت. وإلا رُسم تدرّج لوني
 * مع نقش هندسي مولّد بـ SVG. هذا يعني أن التطبيق يبدو مكتملًا اليوم
 * بلا صور، وحين تضيف صورك من جبة يتبدّل الغلاف تلقائيًا بلا أي تعديل كود.
 */
export default function SiteArt({ site, className = '', height = 'h-44', children }) {
  const photo = site.photos?.[0]

  return (
    <div
      className={`relative overflow-hidden ${height} ${className}`}
      style={
        photo
          ? undefined
          : { backgroundImage: `linear-gradient(135deg, ${site.art.from}, ${site.art.to})` }
      }
    >
      {photo ? (
        <img
          src={photo}
          alt={site.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <PatternLayer pattern={site.art.pattern} />
          <span
            aria-hidden="true"
            className="absolute bottom-2 start-3 select-none text-6xl leading-none text-white/15"
          >
            {site.art.glyph}
          </span>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-night-900/70 via-night-900/10 to-transparent" />
      {children}
    </div>
  )
}

/** نقوش خلفية مختلفة لكل تصنيف — تمنح كل موقع هوية بصرية بلا صور. */
function PatternLayer({ pattern }) {
  const common = 'absolute inset-0 h-full w-full opacity-[0.18]'

  if (pattern === 'peaks') {
    return (
      <svg className={common} viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 100 L35 38 L60 66 L95 20 L130 70 L160 45 L200 100 Z" fill="#fff" />
        <path d="M0 100 L45 60 L80 85 L120 55 L200 100 Z" fill="#fff" opacity="0.5" />
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
              fill="#fff"
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
          <line key={`v${i}`} x1={i * 22} y1="0" x2={i * 22} y2="100" stroke="#fff" strokeWidth="1.5" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 25} x2="200" y2={i * 25} stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
    )
  }

  // 'rock' — أشكال مستوحاة من نقوش جبة: ماشية وأشكال بشرية مبسّطة
  return (
    <svg className={common} viewBox="0 0 200 100" aria-hidden="true">
      <g stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M28 62 h26 v14 M28 62 v14 M54 62 l8-7 M62 55 q6-6 10 0" />
        <path d="M100 45 v22 M100 50 l-9 8 M100 50 l9 8 M100 67 l-7 12 M100 67 l7 12 M100 45 a4 4 0 110-8 4 4 0 010 8" />
        <path d="M140 66 h22 v12 M140 66 v12 M162 66 l7-6 M169 60 q5-5 9 0" />
      </g>
    </svg>
  )
}
