import { useState } from 'react'
import { Banknote, BadgeCheck, CalendarClock, Copy, Check, MessageCircle, ChevronRight, Users } from 'lucide-react'
import { BottomSheet } from './ui'
import {
  DIA_LIMITE, diasVencida, fechaCorta, formatARS, mesDe, recargoAcumulado, semanasDeAtraso,
  type PagoConfig, type PagoGrupo, type PagoInfo,
} from '../lib/pagos'

/** La cuota en Inicio y en Perfil.
 *
 *  Tres reglas fijas (docs/PLAN-PAGOS.md §1):
 *   1. Nunca bloquea Entrenar. Avisa y nada más.
 *   2. Nunca acusa: la planilla se carga a mano, así que "pendiente" puede estar
 *      viejo. Todo estado sin pago ofrece avisar, y el pie dice hasta cuándo
 *      está actualizada la planilla.
 *   3. Nadie ve la cuota de otro: esto no va a ningún tablero compartido.
 *
 *  Cuánto lugar ocupa cada estado lo decide `visibilidadEnInicio()`, no esta
 *  tarjeta: al día no aparece en Inicio (está en Perfil) y del 1 al 4 tampoco.
 */
export function PagoCard({ pago, config }: { pago: PagoInfo; config: PagoConfig }) {
  const [comoPagar, setComoPagar] = useState(false)
  const mes = mesDe(pago.periodo)
  const monto = pago.monto != null ? formatARS(pago.monto) : null
  const atraso = diasVencida()

  // El pagador de un grupo no tiene "su" cuota: tiene las del grupo. La tarjeta
  // habla en plural para que sepa que con un pago cubre a todos.
  const g = pago.grupo?.soyPagador ? pago.grupo : null
  const cuotas = g ? `${g.cuotasTotales} cuotas` : 'la cuota'

  const titulo =
    pago.estado === 'por_vencer' ? <>Tenés hasta el {DIA_LIMITE} para abonar {cuotas} de {mes}.</>
      : pago.estado === 'ultimo_dia' ? <>Hoy es el último día para abonar {cuotas} sin recargo.</>
        : g ? <>Las {g.cuotasTotales} cuotas de {mes} están pendientes.</>
          : <>La cuota de {mes} está pendiente.</>

  return (
    <>
      <div className="rounded-card p-4 mb-4 border border-gold/40 bg-gold/[0.10]">
        <div className="flex items-start gap-3">
          {g ? <Users size={20} className="text-gold shrink-0 mt-0.5" />
            : pago.estado === 'vencida'
              ? <CalendarClock size={20} className="text-gold shrink-0 mt-0.5" />
              : <Banknote size={20} className="text-gold shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="kicker mb-1">{g ? 'Tu grupo familiar' : 'Tu cuota'}</div>
            <p className="text-white font-bold text-sm leading-snug">{titulo}</p>
            {monto && (
              <p className="text-white/70 text-xs mt-1">
                {monto}
                {pago.estado === 'vencida' && ` · ${atraso} día${atraso === 1 ? '' : 's'} de atraso`}
                {pago.estado === 'por_vencer' && ` · vence el ${DIA_LIMITE} de ${mes}`}
              </p>
            )}
            {g && <p className="text-white/50 text-xs mt-1">{listaMiembros(g)}</p>}
            <Recargo pago={pago} config={config} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setComoPagar(true)}
            className="rounded-full bg-gold-fill text-ink text-xs font-black uppercase tracking-wide px-4 py-2.5 active:scale-95">
            Cómo pagar
          </button>
          <YaLaPague config={config} mes={mes} />
        </div>

        {/* Hasta cuándo está cargada la planilla: sin esto, el socio que pagó ayer
            no tiene forma de saber si su fila todavía no se cargó. */}
        <p className="text-white/35 text-[0.68rem] mt-2">
          Actualizado al {fechaCorta(pago.actualizadoAl)}.
        </p>
      </div>

      <ComoPagar open={comoPagar} onClose={() => setComoPagar(false)} config={config} monto={monto} />
    </>
  )
}

/** Días 5 a 9: todavía no hay nada que reclamar, así que pesa lo mismo que el
 *  recordatorio de peso corporal y va abajo, lejos del slot de atención. */
export function PagoLinea({ pago, config }: { pago: PagoInfo; config: PagoConfig }) {
  const [comoPagar, setComoPagar] = useState(false)
  const mes = mesDe(pago.periodo)
  const monto = pago.monto != null ? formatARS(pago.monto) : null
  return (
    <>
      <button onClick={() => setComoPagar(true)}
        className="rounded-card border border-gold/25 bg-white/[0.03] p-3.5 mb-2 w-full text-left flex items-center gap-3 active:scale-[0.99]">
        <Banknote size={20} className="text-gold/80 shrink-0" />
        <p className="text-white/75 text-sm flex-1">
          Tenés hasta el {DIA_LIMITE} para abonar {pago.grupo?.soyPagador
            ? `las ${pago.grupo.cuotasTotales} cuotas`
            : 'la cuota'} de {mes}{monto ? ` (${monto})` : ''}.
        </p>
        <ChevronRight size={16} className="text-white/40 shrink-0" />
      </button>
      <ComoPagar open={comoPagar} onClose={() => setComoPagar(false)} config={config} monto={monto} />
    </>
  )
}

/** La fila de Perfil. Es el único lugar donde "al día" se muestra: ahí lo mirás
 *  cuando querés, en vez de ocupar Inicio todos los días para no decir nada. */
export function PagoPerfil({ pago, config }: { pago: PagoInfo; config: PagoConfig }) {
  const [comoPagar, setComoPagar] = useState(false)
  const mes = mesDe(pago.periodo)
  const monto = pago.monto != null ? formatARS(pago.monto) : null
  const g = pago.grupo

  // A quien le pagan la cuota no se le reclama nada, ni acá. Se le cuenta quién la
  // paga y si ya figura registrada, sin monto, sin botón y sin días de atraso: la
  // plata no pasa por sus manos.
  if (g && !g.soyPagador) {
    const cubierto = pago.estado === 'al_dia'
    return (
      <div className="flex items-start gap-2.5">
        <Users size={18} className="text-gold shrink-0 mt-0.5" />
        <p className="text-white/80 text-sm min-w-0">
          Tu cuota de {mes} la paga {g.pagador}.{' '}
          {cubierto
            ? <span className="text-gold font-bold">Al día</span>
            : <span className="text-white/45">Todavía no figura registrada.</span>}
        </p>
      </div>
    )
  }

  if (pago.estado === 'al_dia') {
    return (
      <div className="flex items-start gap-2.5">
        <BadgeCheck size={18} className="text-gold shrink-0 mt-0.5" />
        <p className="text-white/80 text-sm min-w-0">
          {g?.soyPagador ? <>Las {g.cuotasTotales} cuotas de {mes} ({listaMiembros(g)})</> : <>Cuota de {mes}</>}{' '}
          <span className="text-gold font-bold">al día</span>.
          {pago.pagadoEl && (
            <span className="text-white/45"> Pagaste el {fechaCorta(pago.pagadoEl)}
              {pago.medio ? ` · ${pago.medio.toLowerCase()}` : ''}.</span>
          )}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-start gap-2.5">
        <Banknote size={18} className="text-gold shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-white/85 text-sm">
            Cuota de {mes} pendiente{monto ? ` · ${monto}` : ''}.
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={() => setComoPagar(true)} className="text-gold text-xs font-black uppercase tracking-wide">
              Cómo pagar
            </button>
            <YaLaPague config={config} mes={mes} />
          </div>
        </div>
      </div>
      <ComoPagar open={comoPagar} onClose={() => setComoPagar(false)} config={config} monto={monto} />
    </>
  )
}

/** El recargo, dicho como un dato y no como un reto: cuánto corre por semana y
 *  cuánto lleva hoy. Solo cuando ya está vencida y hay recargo configurado. */
function Recargo({ pago, config }: { pago: PagoInfo; config: PagoConfig }) {
  if (pago.estado !== 'vencida' || !config.recargoSemanal) return null
  const semanas = semanasDeAtraso()
  const total = recargoAcumulado(config)
  return (
    <p className="text-white/55 text-xs mt-1.5">
      Se suma {formatARS(config.recargoSemanal)} por cada semana de atraso pasado el {DIA_LIMITE}:
      {' '}{semanas === 1 ? 'va 1 semana' : `van ${semanas} semanas`} ({formatARS(total)}).
    </p>
  )
}

/** "vos, Mica y Cintia" — el grupo escrito como lo diría una persona. */
function listaMiembros(g: PagoGrupo): string {
  const otros = g.miembros.filter((m) => m !== g.pagador)
  if (!otros.length) return 'vos'
  if (otros.length === 1) return `vos y ${otros[0]}`
  return `vos, ${otros.slice(0, -1).join(', ')} y ${otros[otros.length - 1]}`
}

/** La salida cuando la planilla está atrasada: el socio que ya pagó avisa en vez
 *  de quedarse mirando un cartel que dice que debe. */
function YaLaPague({ config, mes }: { config: PagoConfig; mes: string }) {
  return (
    <a href={`https://wa.me/${config.whatsapp ?? ''}?text=${encodeURIComponent(
      `¡Hola! Ya aboné la cuota de ${mes}. Les aviso para que lo registren.`)}`}
      target="_blank" rel="noreferrer"
      className="text-white/60 text-xs font-bold px-2 py-2.5 active:scale-95">
      Ya la pagué
    </a>
  )
}

/** Efectivo primero, que es lo que el gym prefiere, y transferencia como alternativa
 *  cómoda. Ninguna de las dos con culpa. */
function ComoPagar({ open, onClose, config, monto }: {
  open: boolean; onClose: () => void; config: PagoConfig; monto: string | null
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Cómo pagar">
      <div className="px-4 pb-2">
        <div className="kicker mb-1">Cómo pagar</div>
        {monto && <div className="text-gold text-2xl font-black tabular-nums">{monto}</div>}

        <div className="rounded-card border border-gold/40 bg-gold/[0.10] p-4 mt-4">
          <div className="flex items-start gap-3">
            <Banknote size={20} className="text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-bold text-sm leading-snug">
                Si podés, preferimos efectivo en el local. Nos da una mano enorme.
              </p>
              <p className="text-white/70 text-xs mt-1">Se lo dejás a Matías o a Fer cuando venís a entrenar.</p>
            </div>
          </div>
        </div>

        <div className="card p-4 mt-3">
          <p className="text-white/70 text-xs mb-3">Si te queda más cómodo, transferí:</p>
          <CopiaCampo label="Alias" valor={config.alias} />
          {config.cvu && <CopiaCampo label="CVU" valor={config.cvu} />}
          {config.titular && (
            <div className="flex items-center justify-between gap-3 py-2">
              <span className="text-white/45 text-xs uppercase tracking-wide font-bold">Titular</span>
              <span className="text-white text-sm font-bold truncate">{config.titular}</span>
            </div>
          )}
        </div>

        <a href={`https://wa.me/${config.whatsapp ?? ''}`} target="_blank" rel="noreferrer"
          className="mt-3 w-full rounded-card border border-white/10 bg-white/[0.03] p-3.5 flex items-center gap-3 active:scale-[0.99]">
          <MessageCircle size={18} className="text-gold shrink-0" />
          <span className="text-white/80 text-sm">¿Alguna duda con la cuota? Escribinos.</span>
        </a>
      </div>
    </BottomSheet>
  )
}

/** Un dato + copiar. El alias se tipea mal siempre; copiarlo es el camino corto. */
function CopiaCampo({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = () => {
    navigator.clipboard?.writeText(valor).then(() => {
      setCopiado(true)
      try { navigator.vibrate?.(8) } catch { /* no-op */ }
      window.setTimeout(() => setCopiado(false), 1600)
    }).catch(() => { /* sin permiso de portapapeles: el valor está a la vista igual */ })
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/10 last:border-0">
      <span className="text-white/45 text-xs uppercase tracking-wide font-bold shrink-0">{label}</span>
      <button onClick={copiar}
        className="flex items-center gap-2 min-w-0 min-h-[44px] active:scale-95"
        aria-label={`Copiar ${label}`}>
        <span className="text-white text-sm font-bold truncate">{valor}</span>
        {copiado
          ? <Check size={16} className="text-gold shrink-0" />
          : <Copy size={16} className="text-white/40 shrink-0" />}
      </button>
    </div>
  )
}
