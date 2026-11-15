import { getEligibleEvents, getPendingApprovals } from './attendance.js'
import { formatDateTime, formatRemaining } from './eventFormat.js'
import { getPendingEvents, getUpcomingEvents } from './events.js'
import { getFormulas, getRankingExplanation, getScoreBreakdown } from './formula.js'
import { formatPosition, formatScore, getCurrentScore } from './memberScore.js'
import { getLatestRun, getPreflight, isNoRunError } from './ranking.js'
import { getSegmentableEvents } from './segmentation.js'
import { formatLevel, getSimulatorSettings, getSimulatorStatus } from './simulator.js'

// Resúmenes de las tarjetas del inicio. Cada uno devuelve la misma forma para que la tarjeta los muestre igual:
// { badge?: { text, tone }, stats?: [{ value, label, tone? }], rows?: [{ value, label, tone? }], lines?: [{ text, tone? }] }
// stats van en recuadros con el número grande; rows, en una lista con la etiqueta a la izquierda (para etiquetas largas).
// tone: 'ok' | 'warn' | 'alert'; sin tone, neutro.

const DAY_SECONDS = 86_400
const integer = new Intl.NumberFormat('es-AR')

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm
}

export async function pendingEventsSummary() {
  // El backend acepta hasta 500 por página: alcanza para contar los pendientes de un club.
  const { items, total } = await getPendingEvents({ limit: 500, offset: 0 })
  const isExpired = (e) => e.plazo_expirado || e.segundos_restantes_deadline <= 0
  const expired = items.filter(isExpired)
  const waiting = items
    .filter((e) => !isExpired(e))
    .sort((a, b) => a.segundos_restantes_deadline - b.segundos_restantes_deadline)
  const soon = waiting.filter((e) => e.segundos_restantes_deadline <= DAY_SECONDS)
  const next = waiting[0]

  let badge = { text: 'Al día', tone: 'ok' }
  if (expired.length > 0) badge = { text: 'Plazo vencido', tone: 'alert' }
  else if (total > 0) badge = { text: 'Para publicar', tone: 'warn' }

  return {
    badge,
    stats: [
      { value: total, label: plural(total, 'pendiente', 'pendientes') },
      { value: soon.length, label: 'se publican en 24 h', tone: soon.length > 0 ? 'warn' : undefined },
      {
        value: expired.length,
        label: plural(expired.length, 'vencido', 'vencidos'),
        tone: expired.length > 0 ? 'alert' : undefined,
      },
    ],
    lines: next
      ? [
          {
            text: `Próximo: ${next.titulo} · en ${formatRemaining(next.segundos_restantes_deadline)}`,
          },
        ]
      : total === 0
        ? [{ text: 'No hay eventos esperando publicación.' }]
        : [],
  }
}

export async function formulaSummary() {
  const { in_force: inForce, lock, season_cutoff: cutoff } = await getFormulas()
  const locked = lock.state === 'locked'

  if (!inForce) {
    return {
      badge: { text: 'Sin fórmula vigente', tone: 'alert' },
      lines: [{ text: 'Elegí una fórmula del catálogo y publicala para poder calcular el ranking.' }],
    }
  }

  const lines = [{ text: `${inForce.formula_name}, publicada por ${inForce.published_by}.` }]
  if (locked) lines.push({ text: `Bloqueada${lock.reason ? `: ${lock.reason}` : ''}`, tone: 'warn' })
  if (cutoff.reached && cutoff.message) lines.push({ text: cutoff.message, tone: 'warn' })

  return {
    badge: locked ? { text: 'Bloqueada', tone: 'warn' } : { text: 'Vigente', tone: 'ok' },
    stats: [
      { value: `N° ${inForce.number}`, label: 'versión de reglas' },
      {
        value: formatDateTime(inForce.published_at)
          .split(' ')[0]
          .replace(/\/(\d{2})(\d{2})$/, '/$2'),
        label: 'última publicación',
      },
    ],
    lines,
  }
}

const RUN_STATUS = {
  completed: { text: 'Completo', tone: 'ok' },
  running: { text: 'Calculando', tone: 'warn' },
  failed: { text: 'Falló', tone: 'alert' },
}

export async function rankingSummary() {
  const [run, preflight, formulas] = await Promise.all([
    getLatestRun().catch((err) => {
      if (isNoRunError(err)) return null
      throw err
    }),
    getPreflight().catch(() => ({ warnings: [] })),
    getFormulas().catch(() => null),
  ])

  if (!run) {
    return {
      badge: { text: 'Sin calcular', tone: 'alert' },
      lines: [{ text: 'Todavía no se calculó ningún ranking.' }],
    }
  }

  const inForce = formulas?.in_force
  const outdated = run.status === 'completed' && inForce && inForce.number !== run.rules_version
  const lines = [
    {
      text: run.completed_at
        ? `Rige desde el ${formatDateTime(run.completed_at)}.`
        : `Se empezó a calcular el ${formatDateTime(run.calculated_at)}.`,
    },
  ]
  if (run.status === 'failed' && run.error) lines.push({ text: run.error, tone: 'alert' })
  if (outdated) {
    lines.push({
      text: `Se calculó con la versión ${run.rules_version} de las reglas; la vigente es la ${inForce.number}.`,
      tone: 'warn',
    })
  }
  const warnings = preflight.warnings.length
  if (warnings > 0) {
    lines.push({
      text: `${warnings} ${plural(warnings, 'advertencia', 'advertencias')} antes de recalcular`,
      tone: 'warn',
    })
  }

  return {
    badge: outdated ? { text: 'Desactualizado', tone: 'warn' } : RUN_STATUS[run.status],
    stats: [
      { value: `N° ${run.rules_version}`, label: 'versión de reglas' },
      { value: integer.format(run.population_size), label: 'socios rankeados' },
    ],
    lines,
  }
}

export async function segmentationSummary() {
  const list = await getSegmentableEvents()
  if (list.length === 0) {
    return {
      badge: { text: 'Sin partidos', tone: undefined },
      lines: [{ text: 'No hay partidos publicados por jugarse.' }],
    }
  }

  const noWaves = list.filter((i) => !i.segmentation)
  const noSchedule = list.filter((i) => i.segmentation && (!i.schedule || i.schedule.status === 'invalidated'))
  const draft = list.filter((i) => i.schedule?.status === 'draft')
  const pending = noWaves.length + noSchedule.length + draft.length
  const next = [...list].sort((a, b) => new Date(a.event.fecha_hora) - new Date(b.event.fecha_hora))[0].event
  const toneIf = (n) => (n > 0 ? 'warn' : undefined)

  return {
    badge: pending > 0 ? { text: `${pending} por resolver`, tone: 'warn' } : { text: 'Al día', tone: 'ok' },
    stats: [
      { value: noWaves.length, label: 'sin olas', tone: toneIf(noWaves.length) },
      { value: noSchedule.length, label: 'sin cronograma', tone: toneIf(noSchedule.length) },
      { value: draft.length, label: 'sin confirmar', tone: toneIf(draft.length) },
    ],
    lines: [{ text: `Próximo partido: ${next.titulo}` }],
  }
}

export async function simulatorSettingsSummary() {
  const s = await getSimulatorSettings()
  return {
    badge: s.position_projection_enabled
      ? { text: 'Posición estimada visible', tone: 'ok' }
      : { text: 'Posición estimada oculta', tone: undefined },
    stats: [
      { value: formatLevel(s.position_range_level), label: 'nivel del rango probable' },
      { value: integer.format(s.position_min_population), label: 'socios mínimos para estimar' },
    ],
  }
}

export async function attendanceSummary() {
  const [approvals, eligible] = await Promise.all([getPendingApprovals(), getEligibleEvents()])
  return {
    badge: approvals.length > 0 ? { text: 'Aprobaciones pendientes', tone: 'warn' } : { text: 'Al día', tone: 'ok' },
    stats: [
      {
        value: approvals.length,
        label: plural(approvals.length, 'reemplazo por aprobar', 'reemplazos por aprobar'),
        tone: approvals.length > 0 ? 'warn' : undefined,
      },
      { value: eligible.length, label: plural(eligible.length, 'evento para cargar', 'eventos para cargar') },
    ],
  }
}

export async function upcomingEventsSummary() {
  const { eventos, mensaje } = await getUpcomingEvents()
  const next = eventos[0]
  if (!next) return { lines: [{ text: mensaje }] }
  return {
    stats: [{ value: eventos.length, label: plural(eventos.length, 'próximo evento', 'próximos eventos') }],
    lines: [{ text: `Próximo: ${next.titulo}` }],
  }
}

export async function myScoreSummary() {
  const d = await getCurrentScore()
  const lines = []
  lines.push({
    text: d.position === null ? 'Sin posición en el ranking.' : `${formatPosition(d.position, d.ranked_total)}.`,
  })
  if (d.message) lines.push({ text: d.message, tone: d.reason === 'FEES_OVERDUE' ? 'alert' : undefined })
  return {
    badge: d.status === 'provisional' ? { text: d.label, tone: 'warn' } : undefined,
    stats: d.score == null ? [] : [{ value: `${formatScore(d.score)} / 100`, label: 'puntaje actual' }],
    lines,
  }
}

export async function breakdownSummary() {
  const d = await getScoreBreakdown()
  if (!d.has_ranking) return { lines: [{ text: d.message }] }
  // Las tres partes que más mueven el puntaje, sumen o resten; las que dan 0 no se muestran.
  const top = d.components
    .filter((c) => c.key !== 'total' && Number(c.points) !== 0)
    .sort((a, b) => Math.abs(Number(b.points)) - Math.abs(Number(a.points)))
    .slice(0, 3)
  return {
    rows: top.map((c) => {
      const negative = Number(c.points) < 0
      return {
        value: negative ? formatScore(c.points) : `+${formatScore(c.points)}`,
        label: c.name,
        tone: negative ? 'alert' : 'ok',
      }
    }),
    lines: [{ text: `Total: ${formatScore(d.total)} puntos` }],
  }
}

export async function explanationSummary() {
  const d = await getRankingExplanation()
  if (d.status !== 'published') return { lines: [{ text: d.message }] }
  return {
    stats: [{ value: `N° ${d.rules_version}`, label: 'versión de reglas' }],
    lines: [{ text: d.formula.name }, ...(d.notice ? [{ text: d.notice.message, tone: 'warn' }] : [])],
  }
}

export async function simulatorSummary() {
  const [status, upcoming] = await Promise.all([getSimulatorStatus(), getUpcomingEvents()])
  if (status.status !== 'available') {
    return { badge: { text: 'No disponible' }, lines: [{ text: status.message }] }
  }
  const count = upcoming.eventos.length
  return {
    badge: { text: 'Disponible', tone: 'ok' },
    stats: [{ value: count, label: plural(count, 'evento para simular', 'eventos para simular') }],
  }
}
