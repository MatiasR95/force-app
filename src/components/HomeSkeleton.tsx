import emblem from '../assets/logo/emblem_gold_t.png'

// Shown while the routine loads: a shimmering skeleton of the Home layout so the
// first paint feels like the app is assembling the member's routine, not stuck on
// a spinner. Pure placeholder — no data. The gold sweep lives in .skel (index.css).
function Bar({ w = 'w-full', h = 'h-4', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`skel rounded-full ${w} ${h} ${className}`} />
}

export function HomeSkeleton() {
  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24" aria-busy="true" aria-label="Cargando tu rutina">
      {/* hero */}
      <div className="hero-card rounded-card p-5 mb-4">
        <div className="flex items-center justify-between">
          <img src={emblem} alt="" className="h-11 w-11 object-contain opacity-90 animate-pulse" />
          <div className="flex gap-2">
            <div className="skel h-9 w-9 rounded-full" />
            <div className="skel h-9 w-9 rounded-full" />
          </div>
        </div>
        <Bar w="w-2/3" h="h-7" className="mt-4" />
        <Bar w="w-1/3" h="h-3" className="mt-2.5" />
      </div>

      {/* today's CTA */}
      <div className="hero-card rounded-card p-4 mb-4">
        <Bar w="w-24" h="h-3" />
        <div className="flex items-center justify-between mt-2">
          <div className="min-w-0 flex-1">
            <Bar w="w-40" h="h-6" />
            <Bar w="w-28" h="h-3" className="mt-2" />
          </div>
          <div className="skel h-11 w-28 rounded-full" />
        </div>
      </div>

      {/* weather-ish card */}
      <div className="card p-4 mb-4">
        <Bar w="w-32" h="h-3" className="mb-3" />
        <div className="flex items-center gap-3">
          <div className="skel h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Bar w="w-24" h="h-5" />
            <Bar w="w-40" h="h-3" className="mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel h-16 rounded-card" />
          ))}
        </div>
      </div>

      {/* tip card */}
      <div className="card p-4 mb-4">
        <Bar w="w-28" h="h-3" className="mb-3" />
        <Bar w="w-full" h="h-3" />
        <Bar w="w-5/6" h="h-3" className="mt-2" />
      </div>

      <p className="text-center text-white/40 text-xs mt-2">Armando tu rutina…</p>
    </div>
  )
}
