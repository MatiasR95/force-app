import { useState, type ReactNode } from 'react'
import { RECORD_LIFTS, liftLabel, wcLabel, weightClass } from '../lib/records'
import { getGender, getBodyweight, getMyRecords, getSessions, getCheckins, getClientName } from '../lib/store'
import { currentStreakWeeks } from '../lib/metrics'
import {
  type Tier, TIER_LABEL, defaultCat, strengthMedals, ladderState, STREAK_LADDER, SESSION_LADDER,
} from '../lib/medals'
import { medalStory } from '../lib/medalFacts'
import { Medal } from './Medal'
import { BottomSheet } from './ui'
import { ShareCard, type ShareData } from './ShareCard'
import { Sparkles, Flame, Dumbbell, CalendarCheck, Share2, ChevronRight, Quote, Lightbulb } from 'lucide-react'

const TIER_COLOR: Record<Tier, string> = { bronce: '#e0a06a', plata: '#cfd2d8', oro: '#C6AE78', platino: '#cfe0ea' }
const fmt = (n: number) => n.toLocaleString('es-AR')

// Everything the detail sheet needs about one medal (earned or still locked).
interface MedalDetail {
  kind: 'lift' | 'streak' | 'sessions'
  title: string
  icon: ReactNode
  tier: Tier | null
  valueText: string      // "Tu mejor: 100 kg" / "12 semanas seguidas"
  nextText: string | null
  category?: string
  lift?: string
}

// The member's personal achievements: constancia ladders (endless) + per-lift
// strength medals by gender/category. Personal, so it lives in Panel — not on the
// gym-wide Récords board. Every medal opens a detail sheet: fact + quote + share.
export function Medallero() {
  const [detail, setDetail] = useState<MedalDetail | null>(null)
  const [share, setShare] = useState<ShareData | null>(null)
  const gender = getGender()
  if (!gender) {
    return <p className="text-white/45 text-sm text-center py-6">Elegí tu categoría (Mujeres / Hombres) al entrar para ver tus medallas. 🏅</p>
  }
  const cat = (weightClass(gender, getBodyweight())?.key ?? defaultCat(gender)) as never
  const records = getMyRecords()
  const streakWeeks = currentStreakWeeks(getCheckins())
  const sessions = getSessions().length
  const lifts = strengthMedals(records, gender, cat)
  const streak = ladderState(streakWeeks, STREAK_LADDER)
  const sess = ladderState(sessions, SESSION_LADDER)

  const shareFrom = (d: MedalDetail): ShareData => ({
    kind: 'medal', name: getClientName() ?? 'Vos', tier: d.tier ?? undefined,
    lift: d.title, thresholdText: d.valueText, category: d.category, nextText: d.nextText ?? undefined,
  })

  return (
    <>
      <p className="text-white/45 text-xs mb-4 flex items-center gap-1.5">
        <Sparkles size={12} className="text-gold/70" /> Se desbloquean solas cuando entrenás y rompés tus marcas. Tocá una para conocer su historia. Categoría: <b className="text-white/70">{wcLabel(cat)}</b>.
      </p>

      <Section icon={<Flame size={14} />}>Constancia</Section>
      <div className="space-y-2 mb-6">
        <LadderRow label="Semanas seguidas" icon={<Flame size={22} />} value={streakWeeks} unit="sem" state={streak}
          onOpen={() => setDetail({
            kind: 'streak', title: 'Racha', icon: <Flame size={38} />, tier: streak.step?.tier ?? null,
            valueText: `${fmt(streakWeeks)} semanas seguidas`,
            nextText: streak.next ? `Próxima medalla a ${fmt(streak.next.n)} semanas` : null,
          })} />
        <LadderRow label="Entrenamientos" icon={<CalendarCheck size={20} />} value={sessions} unit="" state={sess}
          onOpen={() => setDetail({
            kind: 'sessions', title: 'Entrenamientos', icon: <CalendarCheck size={36} />, tier: sess.step?.tier ?? null,
            valueText: `${fmt(sessions)} entrenamientos completados`,
            nextText: sess.next ? `Próxima medalla a ${fmt(sess.next.n)}` : null,
          })} />
      </div>

      <Section icon={<Dumbbell size={14} />}>Fuerza · por categoría</Section>
      <div className="space-y-2">
        {lifts.map((m) => {
          const lift = RECORD_LIFTS.find((l) => l.key === m.lift)!
          const isDom = m.lift === 'dominadas'
          const open = () => setDetail({
            kind: 'lift', title: liftLabel(m.lift), icon: <Dumbbell size={38} />, tier: m.tier, lift: m.lift,
            category: wcLabel(cat),
            valueText: m.tier ? `Tu mejor: ${fmt(m.value)}${isDom ? ' kg de lastre' : ' kg'}` : 'Sin medalla todavía',
            nextText: m.nextTier ? `${TIER_LABEL[m.nextTier]} a ${fmt(m.nextAt!)}${isDom ? ' kg lastre' : ' kg'} · faltan ${fmt(Math.max(0, m.nextAt! - m.value))}` : null,
          })
          return (
            <button key={m.lift} onClick={open}
              className="card w-full p-3 flex items-center gap-3 text-left active:scale-[0.99]">
              <Medal tier={m.tier} icon={<Dumbbell size={22} />} size={52} locked={!m.tier} shine />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{lift.emoji} {liftLabel(m.lift)}</div>
                {m.tier
                  ? <div className="text-xs"><span style={{ color: TIER_COLOR[m.tier] }} className="font-black">{TIER_LABEL[m.tier]}</span><span className="text-white/45"> · tu mejor {fmt(m.value)}{isDom ? ' kg lastre' : ' kg'}</span></div>
                  : <div className="text-xs text-white/45">Sin medalla todavía</div>}
                {m.nextTier && (
                  <div className="text-[0.66rem] text-white/40 mt-0.5">
                    {TIER_LABEL[m.nextTier]} a {fmt(m.nextAt!)}{isDom ? ' kg lastre' : ' kg'} · faltan {fmt(Math.max(0, m.nextAt! - m.value))}
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-white/25 shrink-0" />
            </button>
          )
        })}
      </div>
      <p className="mt-5 text-[0.66rem] text-white/35 leading-relaxed text-center">
        Bronce / Plata / Oro según tu género y categoría de peso. La constancia suma Bronce → Platino y sigue contando para siempre.
      </p>

      {detail && (
        <MedalSheet detail={detail} onClose={() => setDetail(null)}
          onShare={() => { setShare(shareFrom(detail)); setDetail(null) }} />
      )}
      {share && <ShareCard data={share} onClose={() => setShare(null)} />}
    </>
  )
}

// The story behind one medal: big animated disc, what it stands for, a fact, a
// line to keep — and the share button to show it off again whenever they want.
function MedalSheet({ detail, onClose, onShare }: {
  detail: MedalDetail; onClose: () => void; onShare: () => void
}) {
  const story = medalStory(detail.kind, detail.lift)
  return (
    <BottomSheet open onClose={onClose} label="Detalle de la medalla">
      <div className="px-6 pb-8 pt-2 text-center">
        <div className="flex justify-center mb-3">
          <Medal tier={detail.tier} icon={detail.icon} size={104} locked={!detail.tier} hero />
        </div>
        {detail.tier && (
          <div className="text-[0.68rem] uppercase tracking-kicker font-black" style={{ color: TIER_COLOR[detail.tier] }}>
            {TIER_LABEL[detail.tier]}
          </div>
        )}
        <h2 className="heading text-2xl text-white mt-0.5">{detail.title}</h2>
        <div className="text-gold font-bold text-sm mt-1">{detail.valueText}</div>
        {detail.category && <div className="text-white/40 text-xs mt-0.5">Categoría {detail.category}</div>}

        <div className="mt-4 rounded-card bg-white/[0.04] border border-white/10 p-3.5 text-left flex gap-2.5">
          <Lightbulb size={15} className="text-gold/80 shrink-0 mt-0.5" />
          <p className="text-white/80 text-[0.82rem] leading-relaxed">{story.fact}</p>
        </div>
        <div className="mt-2.5 rounded-card border border-gold/25 bg-gold/[0.07] p-3.5 text-left flex gap-2.5">
          <Quote size={15} className="text-gold/80 shrink-0 mt-0.5" />
          <p className="text-white/90 text-[0.82rem] leading-relaxed italic">{story.quote}</p>
        </div>

        {detail.nextText && (
          <p className="text-white/45 text-xs mt-3.5">{detail.nextText}</p>
        )}

        {detail.tier ? (
          <button onClick={onShare}
            className="btn-glow mt-5 w-full rounded-full bg-gold-fill text-ink font-black uppercase tracking-wide py-3.5 flex items-center justify-center gap-2 active:scale-[0.98]">
            <Share2 size={17} /> Compartir medalla
          </button>
        ) : (
          <p className="mt-5 text-white/50 text-xs">Todavía no es tuya — pero ya sabés lo que pide. 💪</p>
        )}
      </div>
    </BottomSheet>
  )
}

function LadderRow({ label, icon, value, unit, state, onOpen }: {
  label: string; icon: ReactNode; value: number; unit: string; state: ReturnType<typeof ladderState>; onOpen: () => void
}) {
  const cur = state.step?.tier ?? null
  const prevN = state.step?.n ?? 0
  const nextN = state.next?.n ?? null
  const pct = nextN ? Math.min(100, Math.round(((value - prevN) / (nextN - prevN)) * 100)) : 100
  return (
    <button onClick={onOpen} className="card w-full p-3 flex items-center gap-3 text-left active:scale-[0.99]">
      <Medal tier={cur} icon={icon} size={52} locked={!cur} shine />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white text-sm">{label}: <span className="text-gold">{fmt(value)}</span> {unit}</div>
        {cur && <div className="text-[0.66rem] font-black" style={{ color: TIER_COLOR[cur] }}>{TIER_LABEL[cur]}</div>}
        {nextN
          ? <>
            <div className="h-1.5 rounded-bar bg-white/8 overflow-hidden mt-1.5"><div className="h-full rounded-bar bg-gold-fill" style={{ width: `${pct}%` }} /></div>
            <div className="text-[0.62rem] text-white/40 mt-1">Próxima a {fmt(nextN)} {unit}</div>
          </>
          : <div className="text-[0.62rem] text-gold/80 mt-1">¡Máximo nivel! Y sigue contando 🔥</div>}
      </div>
      <ChevronRight size={16} className="text-white/25 shrink-0" />
    </button>
  )
}

function Section({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-1">
      <span className="text-gold">{icon}</span>
      <h3 className="heading text-sm text-white/85">{children}</h3>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}
