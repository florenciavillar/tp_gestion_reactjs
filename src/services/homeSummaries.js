import { getEligibleEvents, getPendingApprovals } from './attendance.js'
import { formatDateTime, formatRemaining, toDateTimeInputs } from './eventFormat.js'
import { getPendingEvents, getUpcomingEvents } from './events.js'
import { getEventHistory } from './eventHistory.js'
import { getFormulas, getRankingExplanation, getScoreBreakdown } from './formula.js'
import { formatPosition, formatScore, getCurrentScore } from './memberScore.js'
import { getLatestRun, getPreflight, isNoRunError } from './ranking.js'
import { getSegmentableEvents } from './segmentation.js'
import { formatLevel, getSimulatorSettings, getSimulatorStatus } from './simulator.js'

// Resúmenes de las tarjetas del inicio. Cada uno devuelve la misma forma para que la tarjeta los muestre igual:
// { badge?: { text, tone }, stats?: [{ value, label, tone? }], rows?: [{ value, label, tone? }], lines?: [{ text, tone? }] }
// stats van en recuadros con el número grande; rows, en una lista con la etiqueta a la izquierda (para etiquetas largas).
// tone: 'ok' | 'warn' | 'alert'; sin tone, neutro.
// chart?: el gráfico de la tarjeta, según `kind` (ver HomeCharts.jsx).
// tasks?: [{ text, tone, to, action }]: lo que hay que hacer en esa sección; el admin las ve juntas en "Para hacer hoy".

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

  const tasks = []
  if (expired.length > 0) {
    tasks.push({
      text: `${expired.length} ${plural(expired.length, 'evento con el plazo vencido', 'eventos con el plazo vencido')}`,
      tone: 'alert',
      to: '/events',
      action: 'Publicar',
    })
  }
  if (waiting.length > 0) {
    tasks.push({
      text: `${waiting.length} ${plural(waiting.length, 'evento para publicar', 'eventos para publicar')}`,
      tone: soon.length > 0 ? 'warn' : undefined,
      to: '/events',
      action: 'Publicar',
    })
  }

  return {
    badge,
    tasks,
    chart: {
      kind: 'timeline',
      expired: expired.length,
      points: waiting.map((e) => ({ id: e.id_interno, title: e.titulo, seconds: e.segundos_restantes_deadline })),
    },
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
      tasks: [{ text: 'No hay una fórmula vigente', tone: 'alert', to: '/admin/formula', action: 'Elegir' }],
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
      tasks: [{ text: 'Todavía no se calculó el ranking', tone: 'alert', to: '/admin/ranking', action: 'Calcular' }],
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

  const tasks = []
  if (run.status === 'failed') {
    tasks.push({ text: 'Falló el último cálculo del ranking', tone: 'alert', to: '/admin/ranking', action: 'Revisar' })
  }
  if (outdated) {
    tasks.push({
      text: 'El ranking usa una versión vieja de las reglas',
      tone: 'warn',
      to: '/admin/ranking',
      action: 'Recalcular',
    })
  }

  return {
    tasks,
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
  const ready = list.length - pending
  const task = (count, singular, pluralForm, action) =>
    count > 0
      ? [{ text: `${count} ${plural(count, singular, pluralForm)}`, tone: 'warn', to: '/admin/segmentation', action }]
      : []

  return {
    tasks: [
      ...task(noWaves.length, 'partido sin olas', 'partidos sin olas', 'Generar'),
      ...task(noSchedule.length, 'partido sin cronograma', 'partidos sin cronograma', 'Armar'),
      ...task(draft.length, 'cronograma sin confirmar', 'cronogramas sin confirmar', 'Confirmar'),
    ],
    chart: {
      kind: 'segments',
      total: list.length,
      unit: plural(list.length, 'partido', 'partidos'),
      segments: [
        { label: 'Sin olas', value: noWaves.length, tone: 'alert' },
        { label: 'Sin cronograma', value: noSchedule.length, tone: 'warn' },
        { label: 'Sin confirmar', value: draft.length, tone: 'pending' },
        { label: 'Listos', value: ready, tone: 'ok' },
      ],
    },
    badge: pending > 0 ? { text: `${pending} por resolver`, tone: 'warn' } : { text: 'Al día', tone: 'ok' },
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
    tasks:
      approvals.length > 0
        ? [
            {
              text: `${approvals.length} ${plural(approvals.length, 'reemplazo de asistencias por aprobar', 'reemplazos de asistencias por aprobar')}`,
              tone: 'warn',
              to: '/admin/attendance',
              action: 'Revisar',
            },
          ]
        : [],
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
  const others = eventos.length - 1
  return {
    chart: { kind: 'date', iso: next.fecha_hora, title: next.titulo, place: next.lugar, type: next.tipo },
    lines: [
      {
        text:
          others > 0
            ? `Y ${others} ${plural(others, 'evento más', 'eventos más')} en el calendario.`
            : 'Es el único evento publicado por ahora.',
      },
    ],
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
    chart:
      d.score == null
        ? undefined
        : {
            kind: 'gauge',
            value: Number(d.score),
            display: formatScore(d.score),
            position: d.position,
            total: d.ranked_total,
          },
    lines,
  }
}

export async function breakdownSummary() {
  const d = await getScoreBreakdown()
  if (!d.has_ranking) return { lines: [{ text: d.message }] }
  // Las cuatro partes que más mueven el puntaje, sumen o resten; las que dan 0 no se muestran.
  const top = d.components
    .filter((c) => c.key !== 'total' && Number(c.points) !== 0)
    .sort((a, b) => Math.abs(Number(b.points)) - Math.abs(Number(a.points)))
    .slice(0, 4)
  return {
    chart: {
      kind: 'bars',
      items: top.map((c) => {
        const points = Number(c.points)
        return {
          label: c.name,
          value: points,
          display: points < 0 ? formatScore(c.points) : `+${formatScore(c.points)}`,
        }
      }),
    },
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

const monthLabel = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })

// Eventos a los que fue el socio en los últimos seis meses, contados por mes (en hora de Buenos Aires).
export async function historySummary() {
  const d = await getEventHistory()
  if (d.status !== 'ok') return { lines: [{ text: d.message }] }

  const [year, month] = toDateTimeInputs(new Date().toISOString()).date.split('-').map(Number)
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - i), 1))
    const key = date.toISOString().slice(0, 7)
    return { key, label: monthLabel.format(date).replace('.', ''), value: 0 }
  })
  const byKey = new Map(months.map((m) => [m.key, m]))
  for (const e of d.events) {
    const bucket = byKey.get(toDateTimeInputs(e.fecha_hora).date.slice(0, 7))
    if (bucket) bucket.value += 1
  }
  const recent = months.reduce((sum, m) => sum + m.value, 0)

  return {
    chart: { kind: 'months', months },
    stats: [
      { value: integer.format(d.total), label: plural(d.total, 'evento en total', 'eventos en total') },
      { value: recent, label: 'en los últimos 6 meses' },
    ],
  }
}
