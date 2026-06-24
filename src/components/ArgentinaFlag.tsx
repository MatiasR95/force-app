// Small waving Argentina flag, shown beside the FORCE emblem on Home. Celeste /
// white / celeste with a stylized Sol de Mayo rendered as a radiant gold disc —
// NO face, per the brand rule on imagery. The cloth waves via a light CSS skew
// (see `.flag-wave` in index.css); respects prefers-reduced-motion.

const CELESTE = '#74ACDF'
const SUN = '#C6AE78' // brand gold instead of the traditional yellow, to tie it to FORCE

export function ArgentinaFlag({ h = 26 }: { h?: number }) {
  const rays = Array.from({ length: 16 }, (_, i) => (i * 360) / 16)
  return (
    <span className="inline-block align-middle" style={{ height: h, width: h * 1.5 }} aria-label="Bandera argentina">
      <svg viewBox="0 0 60 40" className="h-full w-full overflow-visible">
        <g className="flag-wave">
          <rect x="0" y="0" width="60" height="40" rx="2.5" fill="#fff" />
          <rect x="0" y="0" width="60" height="13.33" rx="2.5" fill={CELESTE} />
          <rect x="0" y="26.67" width="60" height="13.33" rx="2.5" fill={CELESTE} />
          {/* Sol de Mayo — radiant disc, no face */}
          <g transform="translate(30 20)">
            {rays.map((a, i) => (
              <line key={i} x1="0" y1="0" x2={6.6 * Math.cos((a * Math.PI) / 180)} y2={6.6 * Math.sin((a * Math.PI) / 180)}
                stroke={SUN} strokeWidth={i % 2 ? 0.7 : 1.3} strokeLinecap="round" />
            ))}
            <circle cx="0" cy="0" r="3.6" fill={SUN} />
            <circle cx="0" cy="0" r="3.6" fill="none" stroke="#8A6A38" strokeWidth="0.5" />
          </g>
        </g>
      </svg>
    </span>
  )
}
